import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CourseCategory, CourseCategoryDocument } from './schema/course-category.schema';
import { Connection, Model, Types } from 'mongoose';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { DocumentService } from 'src/document/document.service';
import { Multer } from 'multer';
import { AddCourseCategoryDTO, CreateCourseDTO, UpdateCourseCategoryDTO, UpdateCourseDTO } from './dto/course.dto';
import { MediaFolderName } from 'src/constants';
import { ApiResponse } from 'src/common/responses/api-response';
import { filteredObject } from 'src/utils/helper';
import { Course, CourseDocument, CourseStatus } from './schema/course.schema';
import { CoursePurchase, CoursePurchaseDocument, CoursePurchaseStatus } from './schema/course-purchase.schema';
import { UserRole } from 'src/user/schema/user.schema';
import { CourseEnrollment, CourseEnrollmentDocument, EnrollmentStatus } from './schema/course-enrollement.schema';
import { CourseLesson, CourseLessonDocument } from './schema/course-lesson.schema';

@Injectable()
export class CoursesService {
    constructor(
        @InjectModel(CourseCategory.name) private courseCategoryModel: Model<CourseCategoryDocument>,
        @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
        @InjectModel(CoursePurchase.name) private coursePurchaseModel: Model<CoursePurchaseDocument>,
        @InjectModel(CourseEnrollment.name) private courseEnrollmentModel: Model<CourseEnrollmentDocument>,
        @InjectModel(CourseLesson.name) private courseLessonModel: Model<CourseLessonDocument>,
        @InjectConnection() private connection: Connection,
        private documentService: DocumentService
    ) { }

    async addCategory(userId: string, file: any, dto: AddCourseCategoryDTO) {
        const session = await this.connection.startSession();
        let media: any = null

        try {
            session.startTransaction();
            const isCategoryExist = await this.courseCategoryModel.findOne({
                isDeleted: false,
                $or: [{ name: dto.name.trim() }, { label: dto.label.trim() }]
            }).session(session)
            if (isCategoryExist) {
                throw new ConflictException('Category exist with same name or label')
            }

            const payload: any = { ...dto }

            let iconId: any = null

            if (file) {
                media = await this.documentService.upload(file, MediaFolderName.CourseCategories, userId)
                iconId = media._id
                payload.icon = iconId
            }

            const category = await this.courseCategoryModel.create([payload], { session })

            await session.commitTransaction();
            return ApiResponse.success("Course Category Added Successfully", category)
        } catch (error) {
            await session.abortTransaction()
            if (media) {
                await this.documentService.deleteMedia(media._id.toString())
            }
            throw error
        } finally {
            await session.endSession();
        }
    }

    async updateCourseCategory(userId: string, courseCategoryId: string, dto: UpdateCourseCategoryDTO, file?: any) {
        let media: any = null
        const session = await this.connection.startSession()
        try {
            session.startTransaction()
            const courseCategory = await this.courseCategoryModel.findById(new Types.ObjectId(courseCategoryId)).session(session)
            if (!courseCategory) {
                throw new BadRequestException("Category not found")
            }

            if (dto.name || dto.label) {
                const isExist = await this.courseCategoryModel.findOne({
                    _id: { $ne: new Types.ObjectId(courseCategoryId) },
                    isDeleted: false,
                    $or: [...(dto.name ? [{ name: dto.name.trim() }] : []), ...(dto.label ? [{ name: dto.label.trim() }] : [])]
                })

                if (isExist) {
                    throw new BadRequestException("Category exist with same name or label")
                }
            }
            let mediaId: any = null

            if (file) {
                if (courseCategory.icon) {
                    await this.documentService.deleteMedia(courseCategory.icon.toString(), session)
                }

                media = await this.documentService.upload(file, MediaFolderName.CourseCategories, userId)
                mediaId = media._id
            }

            const filtereFields = filteredObject(dto);

            const updatedFields: any = {
                ...filtereFields,
            };
            if (mediaId) {
                updatedFields.icon = mediaId;
            }

            Object.assign(courseCategory, updatedFields);
            await courseCategory.save({ session })
            await session.commitTransaction();
            return ApiResponse.success("Category Updated Successfully", courseCategory)

        } catch (error) {
            await session.abortTransaction()
            if (media) {
                await this.documentService.deleteMedia(media._id.toString())
            }

        } finally {
            session.endSession()
        }
    }

    async getCourseCategories(role?: string) {
        const query: any = {}


        if (role && role !== UserRole.ADMIN) {
            query.isDeleted = false;
            query.isActive = true;
        } else if (!role) {
            query.isDeleted = false;
            query.isActive = true;
        }
        const courseCategories = await this.courseCategoryModel.find(query).populate("icon", "url _id publicId").lean()
        return ApiResponse.success("Course Categories", courseCategories)
    }

    async courseCategoryDetails(courseCategoryId: string, role?: string) {
        const query: any = {}

        if (role && role !== UserRole.ADMIN) {
            query.isDeleted = false;
            query.isActive = true;
        }
        const courseCategory = await this.courseCategoryModel.findOne({ _id: new Types.ObjectId(courseCategoryId), ...query }).populate("icon", "url _id publicId").lean()

        if (!courseCategory) {
            throw new NotFoundException("Couse category not found")
        }

        return ApiResponse.success("Course category details", courseCategory)
    }

    async deleteCourseCategory(courseCategoryId: string) {

        const session = await this.connection.startSession()
        try {
            session.startTransaction()
            const courseCategory = await this.courseCategoryModel.findById(new Types.ObjectId(courseCategoryId)).session(session)
            if (!courseCategory) {
                throw new NotFoundException("Course category not found")
            }
            const course = await this.courseModel.findOne({ categoryId: new Types.ObjectId(courseCategoryId) })
            if (course) {
                courseCategory.isDeleted = true
                courseCategory.isActive = false
                await courseCategory.save()
            } else {
                if (courseCategory.icon) {
                    await this.documentService.deleteMedia(courseCategory.icon.toString(), session)
                }
                await this.courseCategoryModel.deleteOne({ _id: new Types.ObjectId(courseCategoryId) }).session(session)
            }
            await session.commitTransaction()
            return ApiResponse.success(`Category ${course ? "Disabled" : "Deleted"} successfully`)
        } catch (error) {
            await session.abortTransaction()
            throw error
        } finally {
            await session.endSession()
        }
    }

    async addCourse(
        educatorId: string,
        file: any,
        dto: CreateCourseDTO
    ) {
        const session = await this.connection.startSession();
        let media: any = null;



        try {
            session.startTransaction();

            const isExist = await this.courseModel.findOne({
                isDeleted: false,
                title: dto.title.trim(),
                educatorId: new Types.ObjectId(educatorId)
            }).session(session);

            if (isExist) {
                throw new BadRequestException(
                    "Course exist with same name"
                );
            }

            if (dto.costPrice > dto.sellingPrice || dto.sellingPrice < dto.offeredPrice) {
                throw new BadRequestException("Cost price should be less than selling price and selling price should be less than offered price");
            }

            const coursecategory = await this.courseCategoryModel.findOne({ _id: new Types.ObjectId(dto.categoryId), isActive: true, isDeleted: false })
            if (!coursecategory) {
                throw new NotFoundException("Course category not found")
            }

            let thumbnailId: Types.ObjectId | null = null;

            if (file) {
                media = await this.documentService.upload(
                    file,
                    MediaFolderName.CourseContent,
                    educatorId,
                    undefined,
                    session
                );

                thumbnailId = media._id;
            }



            const payload: any = {
                ...dto,
                educatorId: new Types.ObjectId(educatorId),
                categoryId: new Types.ObjectId(dto.categoryId)
            };

            if (payload.costPrice !== undefined && payload.sellingPrice !== undefined && payload.offeredPrice !== undefined) {
                // if (!payload.isFree) {
                if (payload.costPrice > payload.sellingPrice || payload.sellingPrice < payload.offeredPrice) {
                    throw new BadRequestException("Cost price should be less than selling price and selling price should be less than offered price");
                    // }
                }
            }



            if (thumbnailId) {
                payload.thumbnail = thumbnailId;
            }

            const course = await this.courseModel.create(
                [payload],
                { session }
            );

            await session.commitTransaction();

            return ApiResponse.success(
                "Course added successfully",
                course[0]
            );

        } catch (error) {

            await session.abortTransaction();

            if (media) {
                try {
                    await this.documentService.deleteMedia(
                        media._id.toString()
                    );
                } catch (err) {
                    console.log('Media already rolled back');
                }
            }

            throw error;
        } finally {
            await session.endSession();
        }
    }

    async updateCourse(
        educatorId: string,
        courseId: string,
        dto: UpdateCourseDTO,
        file?: any
    ) {
        const session = await this.connection.startSession();
        let media: any = null;


        try {
            session.startTransaction();

            const course = await this.courseModel.findOne({
                _id: new Types.ObjectId(courseId),
                educatorId: new Types.ObjectId(educatorId),
                isDeleted: false
            }).session(session);

            if (!course) {
                throw new NotFoundException(
                    "Course not found"
                );
            }

            const updatedFields: any = filteredObject(dto);

            const finalCostPrice = updatedFields.costPrice !== undefined ? updatedFields.costPrice : course.costPrice;
            const finalSellingPrice = updatedFields.sellingPrice !== undefined ? updatedFields.sellingPrice : course.sellingPrice;
            const finalOfferedPrice = updatedFields.offeredPrice !== undefined ? updatedFields.offeredPrice : course.offeredPrice;



            const finalIsFree = updatedFields.isFree !== undefined ? updatedFields.isFree : course.isFree;

            if (!finalIsFree) {
                if (finalCostPrice > finalSellingPrice || finalSellingPrice < finalOfferedPrice) {
                    throw new BadRequestException("Cost price should be less than selling price and selling price should be less than offered price");
                }
            }

            if (
                dto.title &&
                dto.title.trim() !== course.title
            ) {
                const isExist = await this.courseModel.findOne({
                    isDeleted: false,
                    title: dto.title.trim(),
                    educatorId: new Types.ObjectId(educatorId),
                    _id: { $ne: course._id }
                }).session(session);

                if (isExist) {
                    throw new BadRequestException(
                        "Course exist with same name"
                    );
                }
            }



            let thumbnailId: Types.ObjectId | null = null;

            if (file) {
                if (course.thumbnail) {
                    await this.documentService.deleteMedia(
                        course.thumbnail.toString(),
                        session
                    );
                }

                media = await this.documentService.upload(
                    file,
                    MediaFolderName.CourseContent,
                    educatorId,
                    undefined,
                    session
                );

                thumbnailId = media._id;
            }

            if (thumbnailId) {
                updatedFields.thumbnail = thumbnailId;
            }

            if (dto.categoryId) {
                updatedFields.categoryId = new Types.ObjectId(dto.categoryId);
            }

            Object.assign(course, updatedFields);

            await course.save({ session });

            await session.commitTransaction();

            return ApiResponse.success(
                "Course updated successfully",
                course
            );

        } catch (error) {
            await session.abortTransaction();

            if (media) {
                await this.documentService.deleteMedia(
                    media._id.toString()
                );
            }

            throw error;
        } finally {
            await session.endSession();
        }
    }

    async getCourseDetails(courseId: string, user?: any) {
        const query: any = { _id: new Types.ObjectId(courseId) };
        const role: any = user?.role;
        const isAdmin = role === UserRole.ADMIN;

        if (!isAdmin) {
            query.isDeleted = false;
        }

        const course = await this.courseModel
            .findOne(query)
            .populate('thumbnail', 'url _id publicId')
            .populate('categoryId', 'name label')
            .populate({
                path: 'educatorId',
                select: 'fullName email profileImage',
                populate: {
                    path: 'profileImage',
                    select: 'url _id publicId'
                }
            })
            .lean();

        if (!course) {
            throw new NotFoundException('Course not found');
        }

        if (!isAdmin) {
            if (!course.isActive || course.status !== CourseStatus.PUBLISHED) {
                throw new NotFoundException('Course not found');
            }
        }

        let isPurchased = false;
        let isEnrolled = false;
        if (user && user._id) {
            const purchase = await this.coursePurchaseModel.findOne({
                learnerId: new Types.ObjectId(user._id),
                courseId: new Types.ObjectId(courseId),
                status: CoursePurchaseStatus.PAID
            }).lean();
            if (purchase) {
                isPurchased = true;
            }

            const enrollment = await this.courseEnrollmentModel.findOne({
                learnerId: new Types.ObjectId(user._id),
                courseId: new Types.ObjectId(courseId),
                status: { $in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] }
            }).lean();
            if (enrollment) {
                isEnrolled = true;
            }
        }

        const previewLesson = await this.courseLessonModel.findOne({
            courseId: new Types.ObjectId(courseId),
            isPreview: true
        }).sort({ sectionId: 1, order: 1 }).lean();

        const isPreviewAvailable = !!previewLesson;
        const preview = previewLesson ? previewLesson.videoUrl : null;

        return ApiResponse.success('Course details', { ...course, isPurchased, isEnrolled, isPreviewAvailable, preview });
    }

    async listUserCourses(user: any, educatorId?: string, categoryId?: string, page: number = 1, limit: number = 10) {
        const query: any = {};
        const role = user?.role;

        if (role === UserRole.ADMIN) {
            if (educatorId) query.educatorId = new Types.ObjectId(educatorId);
            if (categoryId) query.categoryId = new Types.ObjectId(categoryId);
        } else if (role === UserRole.EDUCATOR) {
            query.isDeleted = false;
            query.educatorId = new Types.ObjectId(user.educatorId);
            if (categoryId) query.categoryId = new Types.ObjectId(categoryId);
        } else {
            query.isDeleted = false;
            query.isActive = true;
            query.status = CourseStatus.PUBLISHED;
            if (educatorId) query.educatorId = new Types.ObjectId(educatorId);
            if (categoryId) query.categoryId = new Types.ObjectId(categoryId);
        }

        const skip = (page - 1) * limit;

        const courses = await this.courseModel.find(query)
            .populate('thumbnail', 'url _id publicId')
            .populate('categoryId', 'name label')
            .populate('educatorId', 'fullName userName profileImage')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        let enhancedCourses: any[] = courses;

        if (courses.length > 0) {
            const courseIds = courses.map(c => c._id);

            const stats = await this.courseLessonModel.aggregate([
                { $match: { courseId: { $in: courseIds } } },
                {
                    $group: {
                        _id: "$courseId",
                        totalLessons: { $sum: 1 },
                        totalDurationInSeconds: { $sum: "$durationInSeconds" }
                    }
                }
            ]);

            const statsMap = new Map();
            stats.forEach(stat => {
                statsMap.set(stat._id.toString(), {
                    totalLessons: stat.totalLessons,
                    totalDurationInMinutes: Math.round((stat.totalDurationInSeconds || 0) / 60)
                });
            });

            let purchasedCourseIds = new Set<string>();
            let enrolledCourseIds = new Set<string>();

            if (user && user._id) {
                const purchases = await this.coursePurchaseModel.find({
                    learnerId: new Types.ObjectId(user._id),
                    courseId: { $in: courseIds },
                    status: CoursePurchaseStatus.PAID
                }).lean();
                purchasedCourseIds = new Set(purchases.map(p => p.courseId.toString()));

                const enrollments = await this.courseEnrollmentModel.find({
                    learnerId: new Types.ObjectId(user._id),
                    courseId: { $in: courseIds },
                    status: { $in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] }
                }).lean();
                enrolledCourseIds = new Set(enrollments.map(e => e.courseId.toString()));
            }

            enhancedCourses = courses.map(course => {
                const courseStats = statsMap.get(course._id.toString()) || { totalLessons: 0, totalDurationInMinutes: 0 };
                return {
                    ...course,
                    totalLessons: courseStats.totalLessons,
                    totalDurationInMinutes: courseStats.totalDurationInMinutes,
                    isPurchased: purchasedCourseIds.has(course._id.toString()),
                    isEnrolled: enrolledCourseIds.has(course._id.toString())
                };
            });
        }

        const totalItems = await this.courseModel.countDocuments(query);
        const totalPages = Math.ceil(totalItems / limit);

        return ApiResponse.success('Courses listed successfully', {
            courses: enhancedCourses,
            pagination: {
                totalItems,
                totalPages,
                currentPage: page,
                limit
            }
        });
    }

    async searchCourses(keyword: string, user?: any, page: number = 1, limit: number = 10) {
        const query: any = {};
        const role = user?.role;
        const userId = user?._id;

        if (role === UserRole.ADMIN) {
            // Admin sees all
        } else if (role === UserRole.EDUCATOR) {
            query.isDeleted = false;
            query.educatorId = new Types.ObjectId(user.educatorId);
        } else {
            query.isDeleted = false;
            query.isActive = true;
            query.status = CourseStatus.PUBLISHED;
        }

        if (keyword) {
            query.$or = [
                { title: { $regex: keyword, $options: 'i' } },
                { subtitle: { $regex: keyword, $options: 'i' } },
                { tags: { $regex: keyword, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;

        const courses = await this.courseModel.find(query)
            .populate('thumbnail', 'url _id publicId')
            .populate('categoryId', 'name label')
            .populate('educatorId', 'fullName userName profileImage')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        let enhancedCourses: any[] = courses;

        if (courses.length > 0) {
            const courseIds = courses.map(c => c._id);

            const stats = await this.courseLessonModel.aggregate([
                { $match: { courseId: { $in: courseIds } } },
                {
                    $group: {
                        _id: "$courseId",
                        totalLessons: { $sum: 1 },
                        totalDurationInSeconds: { $sum: "$durationInSeconds" }
                    }
                }
            ]);

            const statsMap = new Map();
            stats.forEach(stat => {
                statsMap.set(stat._id.toString(), {
                    totalLessons: stat.totalLessons,
                    totalDurationInMinutes: Math.round((stat.totalDurationInSeconds || 0) / 60)
                });
            });

            let purchasedCourseIds = new Set<string>();
            let enrolledCourseIds = new Set<string>();

            if (userId) {
                const purchases = await this.coursePurchaseModel.find({
                    learnerId: new Types.ObjectId(userId),
                    courseId: { $in: courseIds },
                    status: CoursePurchaseStatus.PAID
                }).lean();
                purchasedCourseIds = new Set(purchases.map(p => p.courseId.toString()));

                const enrollments = await this.courseEnrollmentModel.find({
                    learnerId: new Types.ObjectId(userId),
                    courseId: { $in: courseIds },
                    status: { $in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] }
                }).lean();
                enrolledCourseIds = new Set(enrollments.map(e => e.courseId.toString()));
            }

            enhancedCourses = courses.map(course => {
                const courseStats = statsMap.get(course._id.toString()) || { totalLessons: 0, totalDurationInMinutes: 0 };
                return {
                    ...course,
                    totalLessons: courseStats.totalLessons,
                    totalDurationInMinutes: courseStats.totalDurationInMinutes,
                    isPurchased: purchasedCourseIds.has(course._id.toString()),
                    isEnrolled: enrolledCourseIds.has(course._id.toString())
                };
            });
        }

        const totalItems = await this.courseModel.countDocuments(query);
        const totalPages = Math.ceil(totalItems / limit);

        return ApiResponse.success('Courses retrieved successfully', {
            courses: enhancedCourses,
            pagination: {
                totalItems,
                totalPages,
                currentPage: page,
                limit
            }
        });
    }

    async deleteCourse(educatorId: string, courseId: string) {
        const session = await this.connection.startSession()
        try {
            session.startTransaction()

            const course = await this.courseModel.findOne({
                _id: new Types.ObjectId(courseId),
                educatorId: new Types.ObjectId(educatorId),
                isDeleted: false
            }).session(session)

            if (!course) {
                throw new NotFoundException("Course not found")
            }

            // Check if course has been purchased
            const purchases = await this.coursePurchaseModel.countDocuments({
                courseId: new Types.ObjectId(courseId),
                status: CoursePurchaseStatus.PAID
            }).session(session)

            if (purchases > 0) {
                // If purchased, soft delete
                course.isDeleted = true;
                course.isActive = false;
                await course.save({ session });
            } else {
                // If not purchased, hard delete
                if (course.thumbnail) {
                    await this.documentService.deleteMedia(course.thumbnail.toString(), session);
                }
                await course.deleteOne({ session });
            }
            await session.commitTransaction()
            return ApiResponse.success(purchases > 0 ? "Course archived as it has active purchases" : "Course deleted permanently")
        } catch (error) {
            await session.abortTransaction()
            throw error
        } finally {
            await session.endSession()
        }
    }
}
