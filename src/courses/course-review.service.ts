import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CourseReview, CourseReviewDocument } from './schema/course-review.schema';
import { CreateCourseReviewDTO, UpdateCourseReviewDTO } from './dto/course-review.dto';
import { Course, CourseDocument } from './schema/course.schema';
import { CourseEnrollment, CourseEnrollmentDocument } from './schema/course-enrollement.schema';

@Injectable()
export class CourseReviewService {
    constructor(
        @InjectModel(CourseReview.name) private courseReviewModel: Model<CourseReviewDocument>,
        @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
        @InjectModel(CourseEnrollment.name) private courseEnrollmentModel: Model<CourseEnrollmentDocument>,
    ) { }

    async createReview(userId: string, dto: CreateCourseReviewDTO) {
        const course = await this.courseModel.findById(dto.courseId);
        if (!course) {
            throw new NotFoundException('Course not found');
        }

        // Check if user is enrolled
        const isEnrolled = await this.courseEnrollmentModel.findOne({ learnerId: new Types.ObjectId(userId), courseId: new Types.ObjectId(dto.courseId) });
        if (!isEnrolled) {
            throw new BadRequestException('You can only review courses you are enrolled in');
        }

        // Optional: Check if user already reviewed
        const existingReview = await this.courseReviewModel.findOne({ userId: new Types.ObjectId(userId), courseId: new Types.ObjectId(dto.courseId) });
        if (existingReview) {
            throw new BadRequestException('You have already reviewed this course');
        }

        const newReview = await this.courseReviewModel.create({
            ...dto,
            courseId: new Types.ObjectId(dto.courseId),
            userId: new Types.ObjectId(userId),
        });

        await this.updateCourseRating(dto.courseId);

        return newReview;
    }

    async getReviewsByCourse(courseId: string) {
        return await this.courseReviewModel.find({ courseId: new Types.ObjectId(courseId) })
            .populate('userId', 'name avatar');
    }

    async deleteReview(userId: string, reviewId: string) {
        const review = await this.courseReviewModel.findOneAndDelete({ _id: new Types.ObjectId(reviewId) });
        if (!review) {
            throw new NotFoundException('Review not found or you do not have permission to delete it');
        }

        await this.updateCourseRating(review.courseId.toString());

        return { message: 'Review deleted successfully' };
    }

    async updateReview(userId: string, reviewId: string, dto: UpdateCourseReviewDTO) {
        const review = await this.courseReviewModel.findOne({ _id: new Types.ObjectId(reviewId), userId: new Types.ObjectId(userId) });
        if (!review) {
            throw new NotFoundException('Review not found or you do not have permission to update it');
        }

        if (dto.review !== undefined) review.review = dto.review;
        if (dto.rating !== undefined) review.rating = dto.rating;

        await review.save();

        if (dto.rating !== undefined) {
            await this.updateCourseRating(review.courseId.toString());
        }

        return review;
    }

    private async updateCourseRating(courseId: string) {
        const result = await this.courseReviewModel.aggregate([
            { $match: { courseId: new Types.ObjectId(courseId) } },
            {
                $group: {
                    _id: '$courseId',
                    averageRating: { $avg: '$rating' },
                    totalRating: { $sum: 1 },
                },
            },
        ]);

        if (result.length > 0) {
            const { averageRating, totalRating } = result[0];
            await this.courseModel.findByIdAndUpdate(courseId, {
                averageRating: Math.round(averageRating * 10) / 10,
                totalRating,
            });
        } else {
            await this.courseModel.findByIdAndUpdate(courseId, {
                averageRating: 0,
                totalRating: 0,
            });
        }
    }
}
