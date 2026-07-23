import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CourseCommentSection, CourseCommentSectionDocument } from './schema/course-comment-section';
import { CreateCourseReplyDTO, UpdateCourseReplyDTO } from './dto/course-reply.dto';
import { CourseEnrollment, CourseEnrollmentDocument } from './schema/course-enrollement.schema';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationModuleType, NotificationType, NotificationPriority } from 'src/notification/schema/notification.schema';
import { Course, CourseDocument } from './schema/course.schema';

@Injectable()
export class CourseReplyService {
    constructor(
        @InjectModel(CourseCommentSection.name) private courseCommentModel: Model<CourseCommentSectionDocument>,
        @InjectModel(CourseEnrollment.name) private courseEnrollmentModel: Model<CourseEnrollmentDocument>,
        @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
        private notificationService: NotificationService,
    ) { }

    private async checkEnrollment(userId: string, courseId: Types.ObjectId | string) {
        const isEnrolled = await this.courseEnrollmentModel.findOne({
            learnerId: new Types.ObjectId(userId),
            courseId: new Types.ObjectId(courseId)
        });
        if (!isEnrolled) {
            throw new BadRequestException('You can only access replies if you are enrolled in this course');
        }
    }

    async createReply(userId: string, dto: CreateCourseReplyDTO) {
        await this.checkEnrollment(userId, dto.courseId);

        const parentComment = await this.courseCommentModel.findById(dto.parentId);
        if (!parentComment) {
            throw new NotFoundException('Parent comment not found');
        }

        // Check if it's already a reply (one level deep check)
        if (parentComment.parentId) {
            throw new BadRequestException('You cannot reply to a reply. Comments can only be one level deep.');
        }

        const newReply = await this.courseCommentModel.create({
            ...dto,
            courseId: new Types.ObjectId(dto.courseId),
            courseSectionId: new Types.ObjectId(dto.courseSectionId),
            courseLessonId: new Types.ObjectId(dto.courseLessonId),
            parentId: new Types.ObjectId(dto.parentId),
            userId: new Types.ObjectId(userId),
        });

        if (parentComment.userId) {
            const course = await this.courseModel.findById(dto.courseId);
            if (course) {
                await this.notificationService.sendNotification({
                    receiverId: parentComment.userId.toString(),
                    title: 'New Reply to Your Comment',
                    body: `Someone replied to your comment in the course: ${course.title}`,
                    moduleType: NotificationModuleType.COURSES,
                    type: NotificationType.SYSTEM,
                    priority: NotificationPriority.HIGH
                });
            }
        }

        return newReply;
    }

    async getRepliesByComment(userId: string, parentId: string) {
        const parentComment = await this.courseCommentModel.findById(parentId);
        if (!parentComment) {
            throw new NotFoundException('Parent comment not found');
        }
        await this.checkEnrollment(userId, parentComment.courseId);

        return await this.courseCommentModel.find({ parentId: new Types.ObjectId(parentId), isDeleted: false })
            .populate('userId', 'name avatar')
            .lean();
    }

    async deleteReply(userId: string, replyId: string) {
        // Find a reply (where parentId is NOT null)
        const reply = await this.courseCommentModel.findOne({ _id: new Types.ObjectId(replyId), parentId: { $ne: null } });
        if (!reply) {
            throw new NotFoundException('Reply not found or you do not have permission to delete it');
        }

        reply.isDeleted = true;
        await reply.save();

        return { message: 'Reply deleted successfully' };
    }

    async updateReply(userId: string, replyId: string, dto: UpdateCourseReplyDTO) {
        // Find a reply (where parentId is NOT null)
        const reply = await this.courseCommentModel.findOne({ _id: new Types.ObjectId(replyId), userId: new Types.ObjectId(userId), parentId: { $ne: null } });
        if (!reply) {
            throw new NotFoundException('Reply not found or you do not have permission to update it');
        }

        await this.checkEnrollment(userId, reply.courseId);

        if (dto.comment !== undefined) {
            reply.comment = dto.comment;
            await reply.save();
        }

        return reply;
    }
}
