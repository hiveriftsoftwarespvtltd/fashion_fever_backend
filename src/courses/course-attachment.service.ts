import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CourseAttachment, CourseAttachmentDocument } from './schema/course-attachments.schema';
import { Course, CourseDocument } from './schema/course.schema';
import { CreateCourseAttachmentDTO, UpdateCourseAttachmentDTO } from './dto/course-attachment.dto';
import { ApiResponse } from 'src/common/responses/api-response';
import { filteredObject } from 'src/utils/helper';
import { UserRole } from 'src/user/schema/user.schema';
import { CourseEnrollment, CourseEnrollmentDocument, EnrollmentStatus } from './schema/course-enrollement.schema';
import { CourseSection, CourseSectionDocument } from './schema/course-section.schema';
import { CourseLesson, CourseLessonDocument } from './schema/course-lesson.schema';

@Injectable()
export class CourseAttachmentService {
    constructor(
        @InjectModel(CourseAttachment.name) private courseAttachmentModel: Model<CourseAttachmentDocument>,
        @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
        @InjectModel(CourseEnrollment.name) private courseEnrollmentModel: Model<CourseEnrollmentDocument>,
        @InjectModel(CourseSection.name) private courseSectionModel: Model<CourseSectionDocument>,
        @InjectModel(CourseLesson.name) private courseLessonModel: Model<CourseLessonDocument>,
    ) { }

    async createAttachment(educatorId: string, dto: CreateCourseAttachmentDTO) {
        const course = await this.courseModel.findById(new Types.ObjectId(dto.courseId));
        if (!course || course.isDeleted) {
            throw new NotFoundException('Course not found');
        }

        if (course.educatorId.toString() !== educatorId) {
            throw new ForbiddenException('You do not own this course');
        }

        const attachment = await this.courseAttachmentModel.create({
            courseId: course._id,
            sectionId: dto.sectionId ? new Types.ObjectId(dto.sectionId) : undefined,
            lessonId: dto.lessonId ? new Types.ObjectId(dto.lessonId) : undefined,
            type: dto.type,
            url: dto.url,
            duration: dto.duration
        });

        return ApiResponse.success('Course attachment created successfully', attachment);
    }

    async updateAttachment(educatorId: string, attachmentId: string, dto: UpdateCourseAttachmentDTO) {
        const attachment = await this.courseAttachmentModel.findById(new Types.ObjectId(attachmentId));
        if (!attachment) {
            throw new NotFoundException('Course attachment not found');
        }

        const course = await this.courseModel.findById(attachment.courseId);
        if (!course || course.isDeleted || course.educatorId.toString() !== educatorId) {
            throw new ForbiddenException('You do not own this course or course not found');
        }

        Object.assign(attachment, filteredObject(dto));
        await attachment.save();

        return ApiResponse.success('Course attachment updated successfully', attachment);
    }

    private async checkAccess(courseId: string, user: any) {
        if (!user) {
            throw new ForbiddenException('You must be logged in to view attachments');
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
            throw new ForbiddenException('You must be enrolled in this course to view its attachments');
        }
        return true;
    }

    async getAttachmentsByCourse(courseId: string, user: any) {
        await this.checkAccess(courseId, user);
        const attachments = await this.courseAttachmentModel.find({ courseId: new Types.ObjectId(courseId) }).lean();
        return ApiResponse.success('Course attachments retrieved successfully', attachments);
    }

    async getAttachmentsBySection(sectionId: string, user: any) {
        const section = await this.courseSectionModel.findById(new Types.ObjectId(sectionId));
        if (!section) throw new NotFoundException('Section not found');

        await this.checkAccess(section.courseId.toString(), user);
        
        const attachments = await this.courseAttachmentModel.find({ sectionId: new Types.ObjectId(sectionId) }).lean();
        return ApiResponse.success('Course attachments retrieved successfully', attachments);
    }

    async getAttachmentsByLesson(lessonId: string, user: any) {
        const lesson = await this.courseLessonModel.findById(new Types.ObjectId(lessonId));
        if (!lesson) throw new NotFoundException('Lesson not found');

        await this.checkAccess(lesson.courseId.toString(), user);

        const attachments = await this.courseAttachmentModel.find({ lessonId: new Types.ObjectId(lessonId) }).lean();
        return ApiResponse.success('Course attachments retrieved successfully', attachments);
    }

    async deleteAttachment(educatorId: string, attachmentId: string) {
        const attachment = await this.courseAttachmentModel.findById(new Types.ObjectId(attachmentId));
        if (!attachment) {
            throw new NotFoundException('Course attachment not found');
        }

        const course = await this.courseModel.findById(attachment.courseId);
        if (!course || course.isDeleted || course.educatorId.toString() !== educatorId) {
            throw new ForbiddenException('You do not own this course or course not found');
        }

        await attachment.deleteOne();
        return ApiResponse.success('Course attachment deleted successfully');
    }
}
