import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Educator, EducatorDocument, EducatorStatus } from './schema/educator.schema';
import { User, UserDocument, UserRole, RoleStatus } from 'src/user/schema/user.schema';
import { Course, CourseDocument } from './schema/course.schema';
import { CourseEnrollment, CourseEnrollmentDocument } from './schema/course-enrollement.schema';
import { DocumentService } from 'src/document/document.service';
import { ApiResponse } from 'src/common/responses/api-response';
import { MediaFolderName } from 'src/constants';
import { OnBoardEducatorDTO, UpdateEducatorDTO } from './dto/educator.dto';
import { notifyAdmins } from 'src/utils/helper';
import { adminPendingRequestNotificationTemplate } from 'src/utils/email.template';

@Injectable()
export class EducatorService {
    constructor(
        @InjectModel(Educator.name) private educatorModel: Model<EducatorDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
        @InjectModel(CourseEnrollment.name) private enrollmentModel: Model<CourseEnrollmentDocument>,
        private readonly documentService: DocumentService,
        @InjectConnection() private connection: Connection,
    ) { }

    // ===================================================
    // Helper: filter out undefined/null/empty-string fields
    // ===================================================
    private filterDto(dto: Record<string, any>): Record<string, any> {
        return Object.fromEntries(
            Object.entries(dto).filter(
                ([_, value]) =>
                    value !== undefined &&
                    value !== null &&
                    !(typeof value === 'string' && value.trim() === ''),
            ),
        );
    }

    // ===================================================
    // Helper: get educator by userId
    // ===================================================
    private async getEducatorByUserId(userId: string): Promise<EducatorDocument> {
        const educator = await this.educatorModel.findOne({
            userId: new Types.ObjectId(userId),
        });
        if (!educator) {
            throw new NotFoundException('Educator profile not found');
        }
        return educator;
    }

    // ===================================================
    // EDUCATOR ONBOARDING
    // Touches: Media (upload) + Educator + User → transaction
    // ===================================================

    async onboardEducator(
        userId: string,
        dto: OnBoardEducatorDTO,
        file?: any,
    ) {
        const session = await this.connection.startSession();
        try {
            session.startTransaction();

            const user = await this.userModel
                .findById(userId)
                .session(session);

            if (!user) {
                throw new NotFoundException('User not found');
            }

            const educatorStatus = user.roleStatus.get(
                UserRole.EDUCATOR,
            );

            if (!educatorStatus) {
                throw new BadRequestException(
                    'You have not applied for educator access.',
                );
            }

            if (educatorStatus !== RoleStatus.NOT_ONBOARDED) {
                throw new BadRequestException(
                    `Educator onboarding is ${educatorStatus.toLowerCase()}.`,
                );
            }
            const existing = await this.educatorModel
                .findOne({ userId: new Types.ObjectId(userId) })
                .session(session);
            if (existing) {
                throw new BadRequestException('You already have an educator profile');
            }

            const educatorData: any = {
                userId: new Types.ObjectId(userId),
                bio: dto.bio,
                expertise: dto.expertise ?? [],
            };

            // Upload profile image → writes to Media table (inside transaction)
            if (file) {
                const uploaded = await this.documentService.upload(
                    file,
                    MediaFolderName.Educator,
                    userId,
                    undefined,
                    session,
                );
                educatorData.profileImage = uploaded._id;
            }

            // Write to Educator table
            const [educator] = await this.educatorModel.create(
                [educatorData],
                { session },
            );

            // Write to User table
            await this.userModel.updateOne(
                { _id: new Types.ObjectId(userId) },
                {
                    $set: {
                        educatorId: educator._id,
                        isEducatorOnboardingCompleted: true,
                        [`roleStatus.${UserRole.EDUCATOR}`]: RoleStatus.PENDING,
                    },
                },
                { session },
            );

            await session.commitTransaction();

            await notifyAdmins(
                this.userModel,
                'New Educator Onboarding Request',
                adminPendingRequestNotificationTemplate('Educator', user.name, user.email, {
                    Bio: educator.bio,
                    Expertise: educator.expertise?.join(', '),
                })
            );

            return ApiResponse.success('Educator profile created successfully', educator);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }
    }

    // ===================================================
    // EDUCATOR PROFILE — MY PROFILE
    // ===================================================

    async getMyProfile(userId: string) {

        const educator = await this.educatorModel
            .findOne({ userId: new Types.ObjectId(userId), isApproved: true, isDeleted: false, isActive: true })
            .populate('userId', 'name email phone avatar')
            .populate('profileImage')
            .lean();

        if (!educator) {
            throw new NotFoundException('Educator profile not found');
        }
        return ApiResponse.success('Educator profile', educator);
    }

    // ===================================================
    // UPDATE PROFILE
    // Touches: Media (upload/delete) + Educator → transaction
    // ===================================================

    async updateProfile(
        userId: string,
        dto: UpdateEducatorDTO,
        file?: any,
    ) {
        // Only open a transaction if a file is involved (Media + Educator writes)
        if (file) {
            const session = await this.connection.startSession();
            let oldImageId: string | null = null;

            try {
                session.startTransaction();

                const educator = await this.educatorModel
                    .findOne({ userId: new Types.ObjectId(userId), isApproved: true, isDeleted: false, isActive: true })
                    .session(session);

                if (!educator) {
                    throw new NotFoundException('Educator profile not found');
                }

                const filtered = this.filterDto(dto as Record<string, any>);

                if (educator.profileImage) {
                    oldImageId = educator.profileImage.toString();
                }

                // Write to Media table (inside transaction)
                const uploaded = await this.documentService.upload(
                    file,
                    MediaFolderName.Educator,
                    userId,
                    undefined,
                    session,
                );
                filtered.profileImage = uploaded._id;

                // Write to Educator table
                Object.assign(educator, filtered);
                await educator.save({ session });

                await session.commitTransaction();

                // Delete old image AFTER successful commit
                if (oldImageId) {
                    try {
                        await this.documentService.deleteMedia(oldImageId);
                    } catch (err) {
                        console.error('Failed to delete old educator profile image:', err);
                    }
                }

                return ApiResponse.success('Educator profile updated successfully', educator);
            } catch (error) {
                await session.abortTransaction();
                throw error;
            } finally {
                await session.endSession();
            }
        }

        // No file — single table write, no transaction needed
        const educator = await this.getEducatorByUserId(userId);
        const filtered = this.filterDto(dto as Record<string, any>);
        Object.assign(educator, filtered);
        await educator.save();

        return ApiResponse.success('Educator profile updated successfully', educator);
    }

    // ===================================================
    // PUBLIC — EDUCATOR DETAILS
    // ===================================================

    async getEducatorDetails(educatorId: string) {
        const educator = await this.educatorModel
            .findById(new Types.ObjectId(educatorId))
            .populate('userId', 'name email avatar')
            .populate('profileImage')
            .lean();

        if (!educator) {
            throw new NotFoundException('Educator not found');
        }

        const courses = await this.courseModel
            .find({ educatorId: new Types.ObjectId(educatorId), isActive: true })
            .select('title subtitle thumbnail costPrice sellingPrice offeredPrice isFree status totalLessons totalDurationInMinutes')
            .populate('thumbnail')
            .lean();

        const totalStudents = await this.enrollmentModel.countDocuments({
            courseId: { $in: courses.map((c) => c._id) },
        });

        return ApiResponse.success('Educator details', {
            ...educator,
            courses,
            totalCourses: courses.length,
            totalStudents,
        });
    }

    async listAllEducators(page?: number, limit?: number, role?: string) {
        const pageNumber = Number(page) || 1;
        const pageSize = Number(limit) || 10;
        const skip = (pageNumber - 1) * pageSize;

        const query: any = {}
        if (!role) {
            query.isDeleted = false,
                query.isActive = true,
                query.isApproved = true
        } else if (role && role !== UserRole.ADMIN) {
            query.isDeleted = false,
                query.isActive = true,
                query.isApproved = true
        }
        const educators = await this.educatorModel
            .find(query)
            .populate('userId', 'name email avatar')
            .populate('profileImage', 'url _id publicId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize)
            .lean();

        return ApiResponse.success('All educators', educators);
    }

    // ===================================================
    // ADMIN — APPROVE / SUSPEND EDUCATOR
    // ===================================================

    async approveEducator(educatorId: string, isApproved: boolean) {
        const educator = await this.educatorModel.findById(
            new Types.ObjectId(educatorId),
        );
        if (!educator) {
            throw new NotFoundException('Educator not found');
        }

        educator.isApproved = isApproved;
        educator.status = isApproved ? EducatorStatus.APPROVED : EducatorStatus.REJECTED;
        await educator.save();



        const user = await this.userModel.findOne({ educatorId: educator._id });
        if (user) {
            if (isApproved) {
                user.roleStatus.set(UserRole.EDUCATOR, RoleStatus.APPROVED);
                if (!user.roles.includes(UserRole.EDUCATOR)) {
                    user.roles.push(UserRole.EDUCATOR);
                }
            } else {
                user.roleStatus.set(UserRole.EDUCATOR, RoleStatus.REJECTED);
            }
            await user.save();
        }

        return ApiResponse.success(
            `Educator ${isApproved ? 'approved' : 'suspended'} successfully`,
        );
    }

    async toggleActiveStatus(educatorId: string, isActive: boolean) {
        const educator = await this.educatorModel.findById(
            new Types.ObjectId(educatorId),
        );
        if (!educator) {
            throw new NotFoundException('Educator not found');
        }

        educator.isActive = !isActive;
        await educator.save();

        return ApiResponse.success(
            `Educator ${isActive ? 'activated' : 'deactivated'} successfully`,
        );
    }

    // ===================================================
    // ADMIN — LIST PENDING APPROVALS
    // ===================================================

    async listPendingEducators(page?: number, limit?: number) {
        const pageNumber = Number(page) || 1;
        const pageSize = Number(limit) || 10;
        const skip = (pageNumber - 1) * pageSize;

        const educators = await this.educatorModel
            .find({ isApproved: false, isActive: true })
            .populate('userId', 'name email avatar')
            .populate('profileImage')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize)
            .lean();

        return ApiResponse.success('Pending educator approvals', educators);
    }

    // ===================================================
    // EDUCATOR — DASHBOARD STATS
    // ===================================================

    async getDashboardStats(userId: string) {
        const educator = await this.getEducatorByUserId(userId);

        const totalCourses = await this.courseModel.countDocuments({
            educatorId: educator._id,
        });

        const courses = await this.courseModel
            .find({ educatorId: educator._id })
            .select('_id')
            .lean();

        const courseIds = courses.map((c) => c._id);

        const totalStudents = await this.enrollmentModel.countDocuments({
            courseId: { $in: courseIds },
        });

        return ApiResponse.success('Educator dashboard stats', {
            totalCourses,
            totalStudents,
        });
    }
}
