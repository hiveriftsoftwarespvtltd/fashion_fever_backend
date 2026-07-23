import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CourseLesson, CourseLessonDocument, LessonType } from './schema/course-lesson.schema';
import { CourseSection, CourseSectionDocument } from './schema/course-section.schema';
import { Course, CourseDocument } from './schema/course.schema';
import { CreateCourseLessonDTO, UpdateCourseLessonDTO } from './dto/course-content.dto';
import { ApiResponse } from 'src/common/responses/api-response';
import { filteredObject } from 'src/utils/helper';
import { UserRole } from 'src/user/schema/user.schema';
import { CourseEnrollment, CourseEnrollmentDocument, EnrollmentStatus } from './schema/course-enrollement.schema';

@Injectable()
export class CourseLessonService {
    constructor(
        @InjectModel(CourseLesson.name) private courseLessonModel: Model<CourseLessonDocument>,
        @InjectModel(CourseSection.name) private courseSectionModel: Model<CourseSectionDocument>,
        @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
        @InjectModel(CourseEnrollment.name) private courseEnrollmentModel: Model<CourseEnrollmentDocument>,
    ) { }

    private async updateCourseStats(courseId: Types.ObjectId) {
        const result = await this.courseLessonModel.aggregate([
            { $match: { courseId: new Types.ObjectId(courseId) } },
            {
                $group: {
                    _id: "$courseId",
                    totalLessons: { $sum: 1 },
                    totalDurationInSeconds: { $sum: "$durationInSeconds" }
                }
            }
        ]);

        const stats = result[0] || { totalLessons: 0, totalDurationInSeconds: 0 };

        await this.courseModel.findByIdAndUpdate(courseId, {
            totalLessons: stats.totalLessons,
            totalDurationInMinutes: Math.round((stats.totalDurationInSeconds || 0) / 60)
        });
    }

    async createLesson(
        educatorId: string,
        dto: CreateCourseLessonDTO,
    ) {
        const course = await this.courseModel.findById(
            new Types.ObjectId(dto.courseId),
        );

        if (!course || course.isDeleted) {
            throw new NotFoundException('Course not found');
        }

        if (course.educatorId.toString() !== educatorId) {
            throw new ForbiddenException('You do not own this course');
        }

        const section = await this.courseSectionModel.findOne({
            _id: new Types.ObjectId(dto.sectionId),
            courseId: new Types.ObjectId(dto.courseId),
        });

        if (!section) {
            throw new NotFoundException(
                'Course section not found or does not belong to this course',
            );
        }

        if (dto.lessonType === LessonType.LIVE_CLASS) {
            if (!dto.liveClassStartTime) {
                throw new ConflictException('Live class start time is required');
            }

            if (dto.liveClassStartTime <= new Date()) {
                throw new ConflictException(
                    'Live class start time must be in the future',
                );
            }
        }

        const existingLesson = await this.courseLessonModel.findOne({
            sectionId: section._id,
            $or: [
                { title: dto.title },
                { order: dto.order },
            ],
        });

        if (existingLesson) {
            if (existingLesson.title === dto.title) {
                throw new BadRequestException(
                    'Lesson title already exists in this section',
                );
            }

            if (existingLesson.order === dto.order) {
                throw new BadRequestException(
                    'Lesson order already exists in this section',
                );
            }
        }

        const lesson = await this.courseLessonModel.create({
            courseId: course._id,
            sectionId: section._id,
            title: dto.title,
            description: dto.description,
            videoUrl: dto.videoUrl,
            videoId: dto.videoId,
            durationInSeconds: dto.durationInSeconds,
            order: dto.order,
            isPreview: dto.isPreview,
            lessonType: dto.lessonType || LessonType.VIDEO,
            liveClassStartTime: dto.lessonType === LessonType.LIVE_CLASS ? dto.liveClassStartTime : undefined,
        });

        await this.updateCourseStats(course._id);

        return ApiResponse.success(
            'Course lesson created successfully',
            lesson,
        );
    }

    async updateLesson(
        educatorId: string,
        lessonId: string,
        dto: UpdateCourseLessonDTO,
    ) {
        const lesson = await this.courseLessonModel.findById(
            new Types.ObjectId(lessonId),
        );

        if (!lesson) {
            throw new NotFoundException('Course lesson not found');
        }

        const course = await this.courseModel.findById(lesson.courseId);

        if (
            !course ||
            course.isDeleted ||
            course.educatorId.toString() !== educatorId
        ) {
            throw new ForbiddenException(
                'You do not own this course or course not found',
            );
        }

        const duplicateConditions: Record<string, any>[] = [];

        if (dto.title) {
            duplicateConditions.push({ title: dto.title });
        }

        if (dto.order !== undefined) {
            duplicateConditions.push({ order: dto.order });
        }

        if (duplicateConditions.length) {
            const existingLesson = await this.courseLessonModel.findOne({
                _id: { $ne: lesson._id },
                sectionId: lesson.sectionId,
                $or: duplicateConditions,
            });

            if (existingLesson) {
                if (
                    dto.title &&
                    existingLesson.title === dto.title
                ) {
                    throw new BadRequestException(
                        'Lesson title already exists in this section',
                    );
                }

                if (
                    dto.order !== undefined &&
                    existingLesson.order === dto.order
                ) {
                    throw new BadRequestException(
                        'Lesson order already exists in this section',
                    );
                }
            }
        }

        Object.assign(lesson, filteredObject(dto));

        await lesson.save();

        await this.updateCourseStats(course._id);

        return ApiResponse.success(
            'Course lesson updated successfully',
            lesson,
        );
    }

    private async checkAccess(courseId: string, user: any) {
        if (!user) {
            throw new ForbiddenException('You must be logged in to view lessons');
        }

        if (user.role === UserRole.ADMIN) return true;

        const course = await this.courseModel.findById(new Types.ObjectId(courseId));
        if (!course) throw new NotFoundException('Course not found');

        if (user.role === UserRole.EDUCATOR && course.educatorId.toString() === user.educatorId?.toString()) {
            return true;
        }

        const enrollment = await this.courseEnrollmentModel.findOne({
            learnerId: new Types.ObjectId(user._id),
            courseId: new Types.ObjectId(courseId),
            status: { $in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] }
        });

        if (!enrollment) {
            throw new ForbiddenException('You must be enrolled in this course to view its lessons');
        }
        return true;
    }

    private async hasFullAccess(courseId: string, user?: any): Promise<boolean> {
        const course = await this.courseModel.findById(
            new Types.ObjectId(courseId),
        );

        if (!course) {
            throw new NotFoundException('Course not found');
        }

        // Admin can access everything
        if (user?.role === UserRole.ADMIN) {
            return true;
        }

        // Course owner can access everything
        if (
            user?.role === UserRole.EDUCATOR &&
            course.educatorId.toString() === user.educatorId?.toString()
        ) {
            return true;
        }

        // Not logged in -> preview only
        if (!user) {
            return false;
        }

        // Check enrollment
        const enrollment = await this.courseEnrollmentModel.findOne({
            learnerId: new Types.ObjectId(user._id),
            courseId: new Types.ObjectId(courseId),
            status: {
                $in: [
                    EnrollmentStatus.ACTIVE,
                    EnrollmentStatus.COMPLETED,
                ],
            },
        });

        return !!enrollment;
    }

    // async getLessonsBySection(sectionId: string, user: any) {
    //     const section = await this.courseSectionModel.findById(new Types.ObjectId(sectionId));
    //     if (!section) throw new NotFoundException('Section not found');

    //     await this.checkAccess(section.courseId.toString(), user);

    //     const lessons = await this.courseLessonModel.find({ sectionId: new Types.ObjectId(sectionId) }).sort({ order: 1 }).lean();
    //     return ApiResponse.success('Course lessons retrieved successfully', lessons);
    // }

    async getLessonsBySection(sectionId: string, user?: any) {
        const section = await this.courseSectionModel.findById(
            new Types.ObjectId(sectionId),
        );

        if (!section) {
            throw new NotFoundException('Section not found');
        }

        const hasFullAccess = await this.hasFullAccess(
            section.courseId.toString(),
            user,
        );

        const filter: any = {
            sectionId: new Types.ObjectId(sectionId),
        };

        // If not enrolled or not logged in, show only preview lessons
        if (!hasFullAccess) {
            filter.isPreview = true;
        }

        const lessons = await this.courseLessonModel
            .find(filter)
            .sort({ order: 1 })
            .lean();

        return ApiResponse.success(
            'Course lessons retrieved successfully',
            lessons,
        );
    }

    async getLessonsByCourse(courseId: string, user: any) {
        // await this.checkAccess(courseId, user);

        const lessons = await this.courseLessonModel.find({ courseId: new Types.ObjectId(courseId) }).sort({ sectionId: 1, order: 1 }).lean();
        return ApiResponse.success('Course lessons retrieved successfully', lessons);
    }

    async deleteLesson(educatorId: string, lessonId: string) {
        const lesson = await this.courseLessonModel.findById(new Types.ObjectId(lessonId));
        if (!lesson) {
            throw new NotFoundException('Course lesson not found');
        }

        const course = await this.courseModel.findOne({ _id: lesson.courseId, educatorId: new Types.ObjectId(educatorId) });
        if (!course) {
            throw new ForbiddenException('You do not own this course or course not found');
        }

        await lesson.deleteOne();

        // Re-order remaining lessons
        await this.courseLessonModel.updateMany(
            { sectionId: lesson.sectionId, order: { $gt: lesson.order } },
            { $inc: { order: -1 } }
        );

        await this.updateCourseStats(course._id);

        return ApiResponse.success('Course lesson deleted successfully');
    }

    async getUpcomingLiveClasses(courseId: string, userId: string) {
        const enrollment = await this.courseEnrollmentModel.findOne({
            courseId: new Types.ObjectId(courseId),
            learnerId: new Types.ObjectId(userId),
            status: EnrollmentStatus.ACTIVE
        });

        if (!enrollment) {
            throw new ForbiddenException('You must be enrolled in this course to view its live classes');
        }

        const now = new Date();
        const upcomingLessons = await this.courseLessonModel.find({
            courseId: new Types.ObjectId(courseId),
            lessonType: LessonType.LIVE_CLASS,
            liveClassStartTime: { $gt: now },
        }).sort({ liveClassStartTime: 1 }).select('title description liveClassStartTime durationInSeconds videoUrl videoId order');

        return ApiResponse.success('Upcoming live classes retrieved successfully', upcomingLessons);
    }
}
