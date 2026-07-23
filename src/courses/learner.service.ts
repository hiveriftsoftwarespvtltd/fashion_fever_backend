import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CourseEnrollment, CourseEnrollmentDocument, EnrollmentStatus } from './schema/course-enrollement.schema';
import { Course, CourseDocument } from './schema/course.schema';
import { User, UserDocument } from 'src/user/schema/user.schema';
import { ApiResponse } from 'src/common/responses/api-response';
const PDFDocument = require('pdfkit');

@Injectable()
export class LearnerService {
    constructor(
        @InjectModel(CourseEnrollment.name) private courseEnrollmentModel: Model<CourseEnrollmentDocument>,
        @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) { }

    async getEnrolledCourses(learnerId: string) {
        const enrollments = await this.courseEnrollmentModel.find({ learnerId: new Types.ObjectId(learnerId) })
            .populate({
                path: 'courseId',
                select: 'title thumbnail level isDeleted educatorId',
            })
            .sort({ createdAt: -1 })
            .lean();

        return ApiResponse.success('Enrolled courses retrieved', enrollments);
    }

    async generateCertificate(learnerId: string, courseId: string): Promise<PDFKit.PDFDocument> {
        const enrollment = await this.courseEnrollmentModel.findOne({
            learnerId: new Types.ObjectId(learnerId),
            courseId: new Types.ObjectId(courseId)
        }).lean();

        if (!enrollment) {
            throw new NotFoundException('Course enrollment not found');
        }

        if (enrollment.status !== EnrollmentStatus.COMPLETED && enrollment.progressPercentage !== 100) {
            throw new BadRequestException('Course is not completed yet. Certificate cannot be generated.');
        }

        const course = await this.courseModel.findById(courseId).lean();
        const user = await this.userModel.findById(learnerId).lean();

        if (!course) {
            throw new NotFoundException('Course not found');
        }
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const doc = new PDFDocument({
            layout: 'landscape',
            size: 'A4',
        });

        // Add background
        doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f9f9f9');

        // Add border
        doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke('#d1d1d1');

        doc.moveDown(3);
        doc.fontSize(50).fill('#021c27').text('Certificate of Completion', { align: 'center' });
        doc.moveDown(1);
        doc.fontSize(20).fill('#555555').text('This certificate is proudly presented to', { align: 'center' });
        doc.moveDown(1);
        doc.fontSize(35).fill('#000000').text(user.name.toUpperCase(), { align: 'center' });
        doc.moveDown(1);
        doc.fontSize(20).fill('#555555').text('For successfully completing the course:', { align: 'center' });
        doc.moveDown(1);
        doc.fontSize(30).fill('#1a73e8').text(course.title, { align: 'center' });
        doc.moveDown(0.5);

        const completedDate = enrollment.completedAt ? new Date(enrollment.completedAt).toLocaleDateString() : new Date().toLocaleDateString();
        doc.fontSize(16).fill('#333333').text(`Awarded on: ${completedDate}`, { align: 'center' });

        return doc;
    }
}
