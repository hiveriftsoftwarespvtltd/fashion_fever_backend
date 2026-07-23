import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CourseSection, CourseSectionDocument } from './schema/course-section.schema';
import { Course, CourseDocument } from './schema/course.schema';
import { CourseLesson, CourseLessonDocument } from './schema/course-lesson.schema';
import { CreateCourseSectionDTO, UpdateCourseSectionDTO } from './dto/course-content.dto';
import { ApiResponse } from 'src/common/responses/api-response';
import { filteredObject } from 'src/utils/helper';
import { CourseAttachment, CourseAttachmentDocument } from './schema/course-attachments.schema';
import { CoursePurchase, CoursePurchaseDocument, CoursePurchaseStatus } from './schema/course-purchase.schema';
import { CourseEnrollment, CourseEnrollmentDocument, EnrollmentStatus } from './schema/course-enrollement.schema';
import { LessonProgress, LessonProgressDocument } from './schema/course-lesson-progress.schema';

@Injectable()
export class CourseSectionService {
    constructor(
        @InjectModel(CourseSection.name) private courseSectionModel: Model<CourseSectionDocument>,
        @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
        @InjectModel(CourseLesson.name) private courseLessonModel: Model<CourseLessonDocument>,
        @InjectModel(CourseAttachment.name) private courseAttachmentModel: Model<CourseAttachmentDocument>,
        @InjectModel(CoursePurchase.name) private coursePurchaseModel: Model<CoursePurchaseDocument>,
        @InjectModel(CourseEnrollment.name) private courseEnrollmentModel: Model<CourseEnrollmentDocument>,
        @InjectModel(LessonProgress.name) private lessonProgressModel: Model<LessonProgressDocument>,
    ) { }

    async createSection(educatorId: string, dto: CreateCourseSectionDTO) {
        const course = await this.courseModel.findById(new Types.ObjectId(dto.courseId));
        if (!course || course.isDeleted) {
            throw new NotFoundException('Course not found');
        }

        if (course.educatorId.toString() !== educatorId) {
            throw new ForbiddenException('You do not own this course');
        }

        const isExist = await this.courseSectionModel.findOne({ courseId: new Types.ObjectId(dto.courseId), title: dto.title, order: dto.order })

        if (isExist) {
            throw new BadRequestException('Section already exists with this Title or Order');
        }

        const section = await this.courseSectionModel.create({
            courseId: new Types.ObjectId(dto.courseId),
            title: dto.title,
            order: dto.order
        });

        return ApiResponse.success('Course section created successfully', section);
    }

    async updateSection(
        educatorId: string,
        sectionId: string,
        dto: UpdateCourseSectionDTO,
    ) {
        const section = await this.courseSectionModel.findById(sectionId);

        if (!section) {
            throw new NotFoundException('Course section not found');
        }

        const course = await this.courseModel.findById(section.courseId);

        if (
            !course ||
            course.isDeleted ||
            course.educatorId.toString() !== educatorId
        ) {
            throw new ForbiddenException(
                'You do not own this course or course not found',
            );
        }

        const duplicateConditions: any = [];

        if (dto.title) {
            duplicateConditions.push({ title: dto.title });
        }

        if (dto.order !== undefined) {
            duplicateConditions.push({ order: dto.order });
        }

        if (duplicateConditions.length) {
            const isExist = await this.courseSectionModel.findOne({
                _id: { $ne: section._id },
                courseId: section.courseId,
                $or: duplicateConditions,
            });

            if (isExist) {
                throw new BadRequestException(
                    'Section already exists with this title or order',
                );
            }
        }

        Object.assign(section, filteredObject(dto));

        await section.save();

        return ApiResponse.success(
            'Course section updated successfully',
            section,
        );
    }
    async getSectionsByCourse(courseId: string, user?: any) {
        const sections = await this.courseSectionModel.find({ courseId: new Types.ObjectId(courseId) }).sort({ order: 1 }).lean();

        let isEnrolled = false;

        if (user && user._id) {
            const enrollment = await this.courseEnrollmentModel.findOne({
                learnerId: new Types.ObjectId(user._id),
                courseId: new Types.ObjectId(courseId),
                status: { $in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] }
            }).lean();
            if (enrollment) {
                isEnrolled = true;
            }
        }

        const sectionIds = sections.map(s => s._id);

        const totalVideosAgg = await this.courseLessonModel.aggregate([
            { $match: { sectionId: { $in: sectionIds } } },
            { $group: { _id: "$sectionId", count: { $sum: 1 } } }
        ]);
        const videoCounts = new Map(totalVideosAgg.map(i => [i._id.toString(), i.count]));

        const totalAttachmentsAgg = await this.courseAttachmentModel.aggregate([
            { $match: { sectionId: { $in: sectionIds } } },
            { $group: { _id: "$sectionId", count: { $sum: 1 } } }
        ]);
        const attachmentCounts = new Map(totalAttachmentsAgg.map(i => [i._id.toString(), i.count]));

        let completedCounts = new Map();
        if (isEnrolled) {
            const completedLessons = await this.lessonProgressModel.find({
                learnerId: new Types.ObjectId(user._id),
                courseId: new Types.ObjectId(courseId),
                isCompleted: true
            }).lean();

            const completedLessonIds = completedLessons.map(p => p.lessonId);

            if (completedLessonIds.length > 0) {
                const completedLessonsWithSection = await this.courseLessonModel.find({
                    _id: { $in: completedLessonIds }
                }).select('sectionId').lean();

                for (const lesson of completedLessonsWithSection) {
                    const sid = lesson.sectionId.toString();
                    completedCounts.set(sid, (completedCounts.get(sid) || 0) + 1);
                }
            }
        }

        const enhancedSections = sections.map((section: any) => {
            const sid = section._id.toString();
            const enhanced = {
                ...section,
                totalVideos: videoCounts.get(sid) || 0,
                totalAttachments: attachmentCounts.get(sid) || 0,
            };

            if (isEnrolled) {
                enhanced.completedVideos = completedCounts.get(sid) || 0;
            }

            return enhanced;
        });

        return ApiResponse.success('Course sections retrieved successfully', enhancedSections);
    }

    async deleteSection(educatorId: string, sectionId: string) {
        const section = await this.courseSectionModel.findById(new Types.ObjectId(sectionId));
        if (!section) {
            throw new NotFoundException('Course section not found');
        }

        const course = await this.courseModel.findById(section.courseId);
        if (!course || course.isDeleted || course.educatorId.toString() !== educatorId) {
            throw new ForbiddenException('You do not own this course or course not found');
        }

        await this.courseLessonModel.deleteMany({ sectionId: new Types.ObjectId(sectionId) });
        await section.deleteOne();

        return ApiResponse.success('Course section deleted successfully');
    }
}
