import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CourseCommentSection, CourseCommentSectionDocument } from './schema/course-comment-section';
import { CreateCourseCommentDTO, UpdateCourseCommentDTO } from './dto/course-comment.dto';
import { CourseEnrollment, CourseEnrollmentDocument } from './schema/course-enrollement.schema';
import { CourseLesson, CourseLessonDocument } from './schema/course-lesson.schema';
import { Course, CourseDocument } from './schema/course.schema';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationModuleType, NotificationType, NotificationPriority } from 'src/notification/schema/notification.schema';
import { Educator, EducatorDocument } from './schema/educator.schema';

@Injectable()
export class CourseCommentService {
    constructor(
        @InjectModel(CourseCommentSection.name) private courseCommentModel: Model<CourseCommentSectionDocument>,
        @InjectModel(CourseEnrollment.name) private courseEnrollmentModel: Model<CourseEnrollmentDocument>,
        @InjectModel(CourseLesson.name) private courseLessonModel: Model<CourseLessonDocument>,
        @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
        @InjectModel(Educator.name) private educatorModel: Model<EducatorDocument>,
        private notificationService: NotificationService,
    ) { }

    private async checkEnrollment(userId: string, courseId: Types.ObjectId | string) {
        const isEnrolled = await this.courseEnrollmentModel.findOne({
            learnerId: new Types.ObjectId(userId),
            courseId: new Types.ObjectId(courseId)
        });
        if (!isEnrolled) {
            throw new BadRequestException('You can only access comments if you are enrolled in this course');
        }
    }

    async createComment(userId: string, dto: CreateCourseCommentDTO) {
        await this.checkEnrollment(userId, dto.courseId);

        // Ensure this is a top-level comment
        const newComment = await this.courseCommentModel.create({
            ...dto,
            courseId: new Types.ObjectId(dto.courseId),
            courseLessonId: new Types.ObjectId(dto.courseLessonId),
            courseSectionId: new Types.ObjectId(dto.courseSectionId),
            userId: new Types.ObjectId(userId),
            parentId: null, // explicitly set parentId to null for lesson comments
        });

        // Notify the educator
        const course = await this.courseModel.findById(dto.courseId);
        if (course) {
            const educator = await this.educatorModel.findById(course.educatorId);
            if (educator && educator.userId) {
                await this.notificationService.sendNotification({
                    receiverId: educator.userId.toString(),
                    title: 'New Comment on Lesson',
                    body: `A user has commented on your course: ${course.title}`,
                    moduleType: NotificationModuleType.COURSES,
                    type: NotificationType.SYSTEM,
                    priority: NotificationPriority.HIGH
                });
            }
        }

        return newComment;
    }

    async getCommentsByLesson(userId: string, courseLessonId: string) {
        const lesson = await this.courseLessonModel.findById(courseLessonId);
        if (!lesson) {
            throw new NotFoundException('Lesson not found');
        }
        await this.checkEnrollment(userId, lesson.courseId);

        // Fetch top-level comments
        return await this.courseCommentModel.find({ courseLessonId: new Types.ObjectId(courseLessonId), parentId: null, isDeleted: false })
            .populate('userId', 'name avatar')
            .lean();
    }

    async deleteComment(userId: string, commentId: string) {
        const comment = await this.courseCommentModel.findOne({ _id: new Types.ObjectId(commentId), parentId: null });
        if (!comment) {
            throw new NotFoundException('Comment not found or you do not have permission to delete it');
        }

        comment.isDeleted = true;
        await comment.save();

        // Soft-delete all replies
        await this.courseCommentModel.updateMany({ parentId: new Types.ObjectId(commentId) }, { $set: { isDeleted: true } });

        return { message: 'Comment deleted successfully' };
    }

    async updateComment(userId: string, commentId: string, dto: UpdateCourseCommentDTO) {
        const comment = await this.courseCommentModel.findOne({ _id: new Types.ObjectId(commentId), userId: new Types.ObjectId(userId), parentId: null });
        if (!comment) {
            throw new NotFoundException('Comment not found or you do not have permission to update it');
        }

        await this.checkEnrollment(userId, comment.courseId);

        if (dto.comment !== undefined) {
            comment.comment = dto.comment;
            await comment.save();
        }

        return comment;
    }
}
