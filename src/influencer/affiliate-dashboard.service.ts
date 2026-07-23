import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Influencer, InfluencerDocument } from './schema/influencer.schema';
import { AffliateClickTracking, AffliateClickTrackingDocument } from './schema/affliate-click-tracking.schema';
import { AffliateSignup, AffliateSignupDocument } from './schema/affliate-signup.schema';
import { User, UserDocument, UserRole } from 'src/user/schema/user.schema';
import { Order, OrderDocument, OrderStatus, PaymentStatus } from 'src/order/schema/order.schema';
import { ServiceBooking, ServiceBookingDocument, BookingStatus, BookingPaymentStatus } from 'src/service/schema/service-booking.schema';
import { CoursePurchase, CoursePurchaseDocument, CoursePurchaseStatus } from 'src/courses/schema/course-purchase.schema';
import { Vendor, VendorDocument } from 'src/vendor/schema/vendor.schema';
import { Educator, EducatorDocument } from 'src/courses/schema/educator.schema';
import { ServiceProvider, ServiceProviderDocument } from 'src/service/schema/service-provider.schema';

@Injectable()
export class AffiliateDashboardService {
    constructor(
        @InjectModel(Influencer.name) private influencerModel: Model<InfluencerDocument>,
        @InjectModel(AffliateClickTracking.name) private clickTrackingModel: Model<AffliateClickTrackingDocument>,
        @InjectModel(AffliateSignup.name) private signupModel: Model<AffliateSignupDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
        @InjectModel(ServiceBooking.name) private serviceBookingModel: Model<ServiceBookingDocument>,
        @InjectModel(CoursePurchase.name) private coursePurchaseModel: Model<CoursePurchaseDocument>,
        @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
        @InjectModel(Educator.name) private educatorModel: Model<EducatorDocument>,
        @InjectModel(ServiceProvider.name) private serviceProviderModel: Model<ServiceProviderDocument>,
    ) { }

    private getDateRange(month?: string, year?: string) {
        const currentDate = new Date();
        const targetMonth = month ? Number(month) : currentDate.getMonth() + 1;
        const targetYear = year ? Number(year) : currentDate.getFullYear();

        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

        return { startDate, endDate };
    }

    async getAdminDashboardStats(month?: string, year?: string) {
        const { startDate, endDate } = this.getDateRange(month, year);

        // 1. Get all influencers
        const influencers = await this.influencerModel.find({ isActive: true, isDeleted: false }).lean();

        // 2. Fetch all signups and map userId -> influencerId
        const allSignups = await this.signupModel.aggregate([
            { $lookup: { from: 'affliateprograms', localField: 'affliateProgramId', foreignField: '_id', as: 'program' } },
            { $unwind: '$program' }
        ]);

        const userToInfluencerMap: Record<string, string> = {};
        allSignups.forEach(signup => {
            if (signup.userId && signup.program.influencerId) {
                userToInfluencerMap[signup.userId.toString()] = signup.program.influencerId.toString();
            }
        });

        const allReferredUserIds = Object.keys(userToInfluencerMap).map(id => new Types.ObjectId(id));

        // 3. Get unique clicks grouped by influencer
        const uniqueClicksAggr = await this.clickTrackingModel.aggregate([
            { $match: { clickedAt: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: { influencerId: '$influencerId', ipAddress: '$ipAddress' } } },
            { $group: { _id: '$_id.influencerId', uniqueClicks: { $sum: 1 } } }
        ]);
        const clicksMap = uniqueClicksAggr.reduce((acc, item) => {
            if (item._id) acc[item._id.toString()] = item.uniqueClicks;
            return acc;
        }, {});

        // 4. Batch queries using all referred userIds
        const dateMatch = { createdAt: { $gte: startDate, $lte: endDate } };

        const [
            orders,
            services,
            courses,
            users,
            vendors,
            educators,
            serviceProviders
        ] = await Promise.all([
            this.orderModel.find({ ...dateMatch, userId: { $in: allReferredUserIds }, orderStatus: OrderStatus.DELIVERED, paymentStatus: PaymentStatus.PAID }, { userId: 1, grandTotal: 1, platformComissionAmount: 1 }).lean(),
            this.serviceBookingModel.find({ ...dateMatch, userId: { $in: allReferredUserIds }, bookingStatus: BookingStatus.COMPLETED, paymentStatus: BookingPaymentStatus.PAID }, { userId: 1, totalAmount: 1, platformCommissionAmount: 1 }).lean(),
            this.coursePurchaseModel.find({ ...dateMatch, learnerId: { $in: allReferredUserIds }, status: CoursePurchaseStatus.PAID }, { learnerId: 1, amount: 1, platformCommissionAmount: 1 }).lean(),
            this.userModel.find({ ...dateMatch, _id: { $in: allReferredUserIds }, isEmailVerified: true }, { _id: 1, role: 1 }).lean(),
            this.vendorModel.find({ ...dateMatch, ownerId: { $in: allReferredUserIds }, status: 'APPROVED' }, { ownerId: 1 }).lean(),
            this.educatorModel.find({ ...dateMatch, userId: { $in: allReferredUserIds }, isApproved: true }, { userId: 1 }).lean(),
            this.serviceProviderModel.find({ ...dateMatch, userId: { $in: allReferredUserIds }, verificationStatus: 'APPROVED' }, { userId: 1 }).lean(),
        ]);

        // 5. Initialize stats map
        const statsByInfluencer: Record<string, any> = {};
        influencers.forEach(inf => {
            const infId = inf._id.toString();
            statsByInfluencer[infId] = {
                uniqueClicks: clicksMap[infId] || 0,
                totalSignups: 0,
                totalOrders: 0,
                totalServices: 0,
                totalCourses: 0,
                totalOrderValue: 0,
                platformCommissionEarned: 0,
                userSignups: 0,
                vendorOnboarded: 0,
                educatorOnboarded: 0,
                serviceProviderOnboarded: 0,
            };
        });

        // 6. Aggregate results into the map
        const incStat = (userId: Types.ObjectId, statKey: string, value: number = 1) => {
            const infId = userToInfluencerMap[userId.toString()];
            if (infId && statsByInfluencer[infId]) {
                statsByInfluencer[infId][statKey] += value;
            }
        };

        orders.forEach(doc => {
            incStat(doc.userId, 'totalOrders');
            incStat(doc.userId, 'totalOrderValue', doc.grandTotal || 0);
            incStat(doc.userId, 'platformCommissionEarned', doc.platformComissionAmount || 0);
        });
        services.forEach(doc => {
            incStat(doc.userId, 'totalServices');
            incStat(doc.userId, 'totalOrderValue', doc.totalAmount || 0);
            incStat(doc.userId, 'platformCommissionEarned', doc.platformCommissionAmount || 0);
        });
        courses.forEach(doc => {
            incStat(doc.learnerId, 'totalCourses');
            incStat(doc.learnerId, 'totalOrderValue', doc.amount || 0);
            incStat(doc.learnerId, 'platformCommissionEarned', doc.platformCommissionAmount || 0);
        });

        // Count signups directly from AffliateSignup for the specified date range
        const signupsInRange = allSignups.filter(s => s.signupAt >= startDate && s.signupAt <= endDate);
        signupsInRange.forEach(doc => incStat(doc.userId, 'totalSignups'));

        users.forEach(doc => {
            // Count verified users where role is USER
            if (doc.roles && doc.roles.includes(UserRole.USER)) {
                incStat(doc._id, 'userSignups');
            }
        });
        vendors.forEach(doc => incStat(doc.ownerId, 'vendorOnboarded'));
        educators.forEach(doc => incStat(doc.userId, 'educatorOnboarded'));
        serviceProviders.forEach(doc => incStat(doc.userId, 'serviceProviderOnboarded'));

        // 7. Format Response
        let totalAdminUsers = 0;
        let totalAdminVendors = 0;
        let totalAdminServiceProviders = 0;
        let totalAdminEducators = 0;

        const influencerStatsList = influencers.map(inf => {
            const infId = inf._id.toString();
            const stats = statsByInfluencer[infId];

            totalAdminUsers += stats.userSignups;
            totalAdminVendors += stats.vendorOnboarded;
            totalAdminServiceProviders += stats.serviceProviderOnboarded;
            totalAdminEducators += stats.educatorOnboarded;

            return {
                influencerId: inf._id,
                name: inf.name,
                stats
            };
        });

        return {
            influencers: influencerStatsList,
            pieChart: {
                users: totalAdminUsers,
                vendors: totalAdminVendors,
                serviceProviders: totalAdminServiceProviders,
                educators: totalAdminEducators
            }
        };
    }

    async getInfluencerDashboardStats(influencerId: string, month?: string, year?: string) {
        const { startDate, endDate } = this.getDateRange(month, year);
        const infIdObj = new Types.ObjectId(influencerId);

        // 1. Get referred userIds for this influencer
        const signups = await this.signupModel.aggregate([
            { $lookup: { from: 'affliateprograms', localField: 'affliateProgramId', foreignField: '_id', as: 'program' } },
            { $unwind: '$program' },
            { $match: { 'program.influencerId': infIdObj } }
        ]);
        const referredUserIds = signups.map(s => s.userId).filter(id => !!id);

        const dateMatch = { createdAt: { $gte: startDate, $lte: endDate } };

        // 2. Query independent collections
        const [
            uniqueClicksAggr,
            ordersCount,
            servicesCount,
            coursesCount,
            usersCount,
            vendorsCount,
            educatorsCount,
            serviceProvidersCount
        ] = await Promise.all([
            this.clickTrackingModel.aggregate([
                { $match: { influencerId: infIdObj, clickedAt: { $gte: startDate, $lte: endDate } } },
                { $group: { _id: '$ipAddress' } },
                { $count: 'uniqueClicks' }
            ]),
            this.orderModel.aggregate([
                { $match: { ...dateMatch, userId: { $in: referredUserIds }, orderStatus: OrderStatus.DELIVERED, paymentStatus: PaymentStatus.PAID } },
                { $group: { _id: null, count: { $sum: 1 }, totalValue: { $sum: '$grandTotal' } } }
            ]),
            this.serviceBookingModel.aggregate([
                { $match: { ...dateMatch, userId: { $in: referredUserIds }, bookingStatus: BookingStatus.COMPLETED, paymentStatus: BookingPaymentStatus.PAID } },
                { $group: { _id: null, count: { $sum: 1 }, totalValue: { $sum: '$totalAmount' } } }
            ]),
            this.coursePurchaseModel.aggregate([
                { $match: { ...dateMatch, learnerId: { $in: referredUserIds }, status: CoursePurchaseStatus.PAID } },
                { $group: { _id: null, count: { $sum: 1 }, totalValue: { $sum: '$amount' } } }
            ]),
            this.userModel.countDocuments({ ...dateMatch, _id: { $in: referredUserIds }, isEmailVerified: true, role: UserRole.USER }),
            this.vendorModel.countDocuments({ ...dateMatch, ownerId: { $in: referredUserIds }, status: 'APPROVED' }),
            this.educatorModel.countDocuments({ ...dateMatch, userId: { $in: referredUserIds }, isApproved: true }),
            this.serviceProviderModel.countDocuments({ ...dateMatch, userId: { $in: referredUserIds }, verificationStatus: 'APPROVED' }),
        ]);

        const uniqueClicks = uniqueClicksAggr[0]?.uniqueClicks || 0;
        const totalSignups = signups.filter(s => s.signupAt >= startDate && s.signupAt <= endDate).length;

        const orderStats = ordersCount[0] || { count: 0, totalValue: 0 };
        const serviceStats = servicesCount[0] || { count: 0, totalValue: 0 };
        const courseStats = coursesCount[0] || { count: 0, totalValue: 0 };

        const totalOrderValue = orderStats.totalValue + serviceStats.totalValue + courseStats.totalValue;

        return {
            stats: {
                uniqueClicks,
                totalSignups,
                totalOrders: orderStats.count,
                totalServices: serviceStats.count,
                totalCourses: courseStats.count,
                totalOrderValue,
                userSignups: usersCount,
                vendorOnboarded: vendorsCount,
                serviceProviderOnboarded: serviceProvidersCount,
                educatorOnboarded: educatorsCount
            },
            pieChart: {
                users: usersCount,
                vendors: vendorsCount,
                serviceProviders: serviceProvidersCount,
                educators: educatorsCount
            }
        };
    }

    async getInfluencerRanking(month?: string, year?: string) {
        const dashboardStats = await this.getAdminDashboardStats(month, year);
        const influencers = dashboardStats.influencers;

        influencers.sort((a, b) => {
            const valA = a.stats.totalOrderValue || 0;
            const valB = b.stats.totalOrderValue || 0;
            if (valB !== valA) return valB - valA;

            const commA = a.stats.platformCommissionEarned || 0;
            const commB = b.stats.platformCommissionEarned || 0;
            if (commB !== commA) return commB - commA;

            const signupsA = a.stats.totalSignups || 0;
            const signupsB = b.stats.totalSignups || 0;
            return signupsB - signupsA;
        });

        return influencers;
    }
}
