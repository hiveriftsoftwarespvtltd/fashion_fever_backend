import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, UserRole } from 'src/user/schema/user.schema';
import { Educator, EducatorDocument } from './schema/educator.schema';
import { Course, CourseDocument } from './schema/course.schema';
import { CourseLesson, CourseLessonDocument } from './schema/course-lesson.schema';
import { CourseAttachment, CourseAttachmentDocument } from './schema/course-attachments.schema';
import { CourseEnrollment, CourseEnrollmentDocument } from './schema/course-enrollement.schema';
import { DashboardQueryDTO } from './dto/dashboard.dto';
import { ApiResponse } from 'src/common/responses/api-response';

@Injectable()
export class DashboardService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Educator.name) private educatorModel: Model<EducatorDocument>,
        @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
        @InjectModel(CourseLesson.name) private courseLessonModel: Model<CourseLessonDocument>,
        @InjectModel(CourseAttachment.name) private courseAttachmentModel: Model<CourseAttachmentDocument>,
        @InjectModel(CourseEnrollment.name) private courseEnrollmentModel: Model<CourseEnrollmentDocument>,
    ) { }

    private getDateRange(query: DashboardQueryDTO) {
        const endDate = query.endDate ? new Date(query.endDate) : new Date();
        const startDate = query.startDate ? new Date(query.startDate) : new Date();

        if (!query.startDate) {
            startDate.setMonth(startDate.getMonth() - 1); // Default to last 1 month
        }
        return { startDate, endDate };
    }

    async getAdminOverview(query: DashboardQueryDTO) {
        const { startDate, endDate } = this.getDateRange(query);
        const dateMatch = { createdAt: { $gte: startDate, $lte: endDate } };

        const totalEducators = await this.educatorModel.countDocuments({ ...dateMatch, isDeleted: false });
        const totalLearners = await this.courseEnrollmentModel.distinct('learnerId', { ...dateMatch }).then(arr => arr.length);
        const totalCourses = await this.courseModel.countDocuments({ ...dateMatch, isDeleted: false });
        const totalLessons = await this.courseLessonModel.countDocuments({ ...dateMatch });

        const learnersGrowth = await this.courseEnrollmentModel.aggregate([
            { $match: { ...dateMatch } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const educatorsGrowth = await this.educatorModel.aggregate([
            { $match: { ...dateMatch, isDeleted: false } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const categoriesPieChartAgg = await this.courseEnrollmentModel.aggregate([
            { $match: { ...dateMatch } },
            { $lookup: { from: 'courses', localField: 'courseId', foreignField: '_id', as: 'course' } },
            { $unwind: '$course' },
            { $addFields: { "categoryIdObj": { $toObjectId: "$course.categoryId" } } },
            { $lookup: { from: 'coursecategories', localField: 'categoryIdObj', foreignField: '_id', as: 'category' } },
            { $unwind: '$category' },
            { $group: { _id: '$category.name', count: { $sum: 1 } } }
        ]);

        const coursesStatusChartAgg = await this.courseModel.aggregate([
            { $match: { ...dateMatch, isDeleted: false } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        return ApiResponse.success('Admin overview fetched', {
            totalEducators,
            totalLearners,
            totalCourses,
            totalLessons,
            growthChart: { learners: learnersGrowth, educators: educatorsGrowth },
            categoriesPieChart: categoriesPieChartAgg,
            coursesStatusChart: coursesStatusChartAgg
        });
    }

    async getAdminEducatorsList() {
        const educators = await this.educatorModel.find({ isDeleted: false }).populate('userId', 'name email profileImage').lean();

        const educatorIds = educators.map(e => e._id);
        const courses = await this.courseModel.find({ educatorId: { $in: educatorIds }, isDeleted: false }).lean();

        const courseMap = new Map();
        for (const c of courses) {
            const eId = c.educatorId.toString();
            if (!courseMap.has(eId)) courseMap.set(eId, []);
            courseMap.get(eId).push(c._id);
        }

        const enrichedEducators = await Promise.all(educators.map(async (educator: any) => {
            const eId = educator._id.toString();
            const cIds = courseMap.get(eId) || [];

            const totalCourses = cIds.length;
            const totalVideos = cIds.length > 0 ? await this.courseLessonModel.countDocuments({ courseId: { $in: cIds } }) : 0;
            const totalAttachments = cIds.length > 0 ? await this.courseAttachmentModel.countDocuments({ courseId: { $in: cIds } }) : 0;
            const totalLearners = cIds.length > 0 ? await this.courseEnrollmentModel.distinct('learnerId', { courseId: { $in: cIds } }).then(arr => arr.length) : 0;

            return {
                ...educator,
                totalCourses,
                totalVideos,
                totalAttachments,
                totalLearners
            };
        }));

        return ApiResponse.success('Educators list fetched', enrichedEducators);
    }

    async getEducatorParticularDetails(educatorId: string) {
        const courses = await this.courseModel.find({ educatorId: new Types.ObjectId(educatorId), isDeleted: false }).lean();
        const courseIds = courses.map(c => c._id);

        const enrollments = await this.courseEnrollmentModel.find({ courseId: { $in: courseIds } })
            .populate('learnerId', 'name email')
            .populate('courseId', 'title')
            .lean();

        const attachments = await this.courseAttachmentModel.find({ courseId: { $in: courseIds } })
            .populate('courseId', 'title')
            .lean();

        return ApiResponse.success('Educator details fetched', {
            learners: enrollments,
            attachments
        });
    }

    async getEducatorOverview(educatorId: string, query: DashboardQueryDTO) {
        const { startDate, endDate } = this.getDateRange(query);
        const dateMatch = { createdAt: { $gte: startDate, $lte: endDate } };

        const eId = new Types.ObjectId(educatorId);

        const courses = await this.courseModel.find({ educatorId: eId, isDeleted: false }).lean();
        const courseIds = courses.map(c => c._id);

        const coursesStatusChartAgg = await this.courseModel.aggregate([
            { $match: { educatorId: eId, isDeleted: false } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const totalCourses = courses.length;
        const totalLearners = await this.courseEnrollmentModel.distinct('learnerId', { courseId: { $in: courseIds } }).then(arr => arr.length);

        const courseLevelsPieChart = await this.courseModel.aggregate([
            { $match: { educatorId: eId, isDeleted: false } },
            { $group: { _id: '$level', count: { $sum: 1 } } }
        ]);

        const enrollmentsGrowth = await this.courseEnrollmentModel.aggregate([
            { $match: { ...dateMatch, courseId: { $in: courseIds } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        return ApiResponse.success('Educator overview fetched', {
            totalCourses,
            totalLearners,
            coursesStatusChart: coursesStatusChartAgg,
            courseLevelsPieChart,
            growthChart: { enrollments: enrollmentsGrowth }
        });
    }
}
