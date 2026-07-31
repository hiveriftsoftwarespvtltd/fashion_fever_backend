import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

// Wallet schemas
import { UserWalletDocument, UserWallet } from '../../schema/user/user.wallet.schema';
import { PlatformWalletDocument, PlatformWallet } from '../../schema/platform/platform.wallet.schema';

// Collection schemas
import { UserDocument, User } from 'src/user/schema/user.schema';
import { VendorDocument, Vendor } from 'src/vendor/schema/vendor.schema';
import { InfluencerDocument, Influencer } from 'src/influencer/schema/influencer.schema';
import { ServiceProviderDocument, ServiceProvider } from 'src/service/schema/service-provider.schema';
import { EducatorDocument, Educator } from 'src/courses/schema/educator.schema';
import { MarketplaceEarningDocument, MarketplaceEarning, EarningRole, EarningStatus } from 'src/payout/schema/market-place-earning.schema';
import { ApiResponse } from 'src/common/responses/api-response';

@Injectable()
export class AdminWalletService {
    constructor(
        @InjectModel(UserWallet.name) private readonly userWalletModel: Model<UserWalletDocument>,
        @InjectModel(PlatformWallet.name) private readonly platformWalletModel: Model<PlatformWalletDocument>,
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
        @InjectModel(Vendor.name) private readonly vendorModel: Model<VendorDocument>,
        @InjectModel(Influencer.name) private readonly influencerModel: Model<InfluencerDocument>,
        @InjectModel(ServiceProvider.name) private readonly serviceProviderModel: Model<ServiceProviderDocument>,
        @InjectModel(Educator.name) private readonly educatorModel: Model<EducatorDocument>,
        @InjectModel(MarketplaceEarning.name) private readonly marketplaceEarningModel: Model<MarketplaceEarningDocument>,
    ) { }

    async initializeUserWallet(userId: string) {
        const existingWallet = await this.userWalletModel.findOne({ userId: new Types.ObjectId(userId) });
        if (existingWallet) {
            throw new BadRequestException('Wallet already exists for this user');
        }

        const newWallet = await this.userWalletModel.create({
            userId: new Types.ObjectId(userId),
            balance: 0,
            totalCredits: 0,
            totalDebits: 0,
            isActive: true,
        });

        return newWallet;
    }

    async syncAllWallets() {
        const results = {
            usersCreated: 0,
            platformWalletCreated: 0,
        };

        // Sync Users
        const users = await this.userModel.find();
        for (const user of users) {
            const existing = await this.userWalletModel.findOne({ userId: user._id });
            if (!existing) {
                await this.userWalletModel.create({ userId: user._id });
                results.usersCreated++;
            }
        }

        // Sync Platform Wallet
        const platformWallet = await this.platformWalletModel.findOne();
        if (!platformWallet) {
            await this.platformWalletModel.create({});
            results.platformWalletCreated++;
        }

        return { message: 'Wallet sync completed successfully', results };
    }

    async getVendorBalances() {
        const vendors = await this.vendorModel.find({ isDeleted: { $ne: true } }).lean();

        const results = await Promise.all(
            vendors.map(async (vendor: any) => {
                const userIds = [vendor.ownerId, vendor._id].filter(Boolean);
                const earnings = await this.marketplaceEarningModel.find({
                    role: EarningRole.VENDOR,
                    userId: { $in: userIds },
                }).lean();

                const totalEarnings = earnings.reduce((acc, e) => acc + (e.netAmount || 0), 0);
                const pendingBalance = earnings
                    .filter(e => e.status === EarningStatus.PENDING || e.status === EarningStatus.ELIGIBLE)
                    .reduce((acc, e) => acc + (e.netAmount || 0), 0);
                const totalWithdrawn = earnings
                    .filter(e => e.status === EarningStatus.PAID)
                    .reduce((acc, e) => acc + (e.netAmount || 0), 0);

                const balance = Math.max(0, totalEarnings - totalWithdrawn);

                return {
                    _id: vendor._id,
                    vendorId: {
                        _id: vendor._id,
                        businessName: vendor.businessName || 'Unnamed Merchant',
                        email: vendor.email || '',
                    },
                    balance,
                    pendingBalance,
                    totalEarnings,
                    totalWithdrawn,
                    isActive: vendor.isActive !== false && vendor.status !== 'REJECTED',
                };
            })
        );

        return ApiResponse.success('Vendor balances retrieved successfully', results);
    }

    async getInfluencerBalances() {
        const influencers = await this.influencerModel
            .find({ isDeleted: { $ne: true } })
            .populate('userId', 'name email')
            .lean();

        const results = await Promise.all(
            influencers.map(async (inf: any) => {
                const userId = inf.userId?._id || inf.userId;

                const earnings = await this.marketplaceEarningModel.find({
                    role: EarningRole.INFLUENCER,
                    userId: userId,
                }).lean();

                const earnedFromMarketplace = earnings.reduce((acc, e) => acc + (e.netAmount || 0), 0);
                const pendingFromMarketplace = earnings
                    .filter(e => e.status === EarningStatus.PENDING || e.status === EarningStatus.ELIGIBLE)
                    .reduce((acc, e) => acc + (e.netAmount || 0), 0);
                const withdrawnFromMarketplace = earnings
                    .filter(e => e.status === EarningStatus.PAID)
                    .reduce((acc, e) => acc + (e.netAmount || 0), 0);

                const totalEarnings = Math.max(inf.totalCommissionEarned || 0, earnedFromMarketplace);
                const pendingBalance = inf.pendingCommission !== undefined && inf.pendingCommission > 0
                    ? inf.pendingCommission
                    : pendingFromMarketplace;
                const totalWithdrawn = Math.max(inf.paidCommission || 0, withdrawnFromMarketplace);
                const balance = Math.max(0, totalEarnings - totalWithdrawn);

                return {
                    _id: inf._id,
                    influencerId: {
                        _id: inf._id,
                        id: inf._id.toString(),
                        name: inf.name || inf.userId?.name || 'Unnamed Influencer',
                        email: inf.userId?.email || '',
                    },
                    balance,
                    pendingBalance,
                    totalEarnings,
                    totalWithdrawn,
                    isActive: inf.isActive !== false && inf.status !== 'blocked',
                };
            })
        );

        return ApiResponse.success('Influencer balances retrieved successfully', results);
    }

    async getServiceProviderBalances() {
        const providers = await this.serviceProviderModel
            .find({ isDeleted: { $ne: true } })
            .populate('userId', 'name email')
            .lean();

        const results = await Promise.all(
            providers.map(async (sp: any) => {
                const userId = sp.userId?._id || sp.userId;

                const earnings = await this.marketplaceEarningModel.find({
                    role: EarningRole.SERVICE_PROVIDER,
                    userId: userId,
                }).lean();

                const totalEarnings = earnings.reduce((acc, e) => acc + (e.netAmount || 0), 0);
                const pendingBalance = earnings
                    .filter(e => e.status === EarningStatus.PENDING || e.status === EarningStatus.ELIGIBLE)
                    .reduce((acc, e) => acc + (e.netAmount || 0), 0);
                const totalWithdrawn = earnings
                    .filter(e => e.status === EarningStatus.PAID)
                    .reduce((acc, e) => acc + (e.netAmount || 0), 0);

                const balance = Math.max(0, totalEarnings - totalWithdrawn);

                return {
                    _id: sp._id,
                    serviceProviderId: {
                        _id: sp._id,
                        businessName: sp.businessName || 'Salon Lounge',
                        email: sp.email || sp.userId?.email || '',
                    },
                    providerId: sp._id.toString(),
                    balance,
                    pendingBalance,
                    totalEarnings,
                    totalWithdrawn,
                    isActive: sp.isActive !== false,
                };
            })
        );

        return ApiResponse.success('Service provider balances retrieved successfully', results);
    }

    async getEducatorBalances() {
        const educators = await this.educatorModel
            .find({ isDeleted: { $ne: true } })
            .populate('userId', 'name email')
            .lean();

        const results = await Promise.all(
            educators.map(async (edu: any) => {
                const userId = edu.userId?._id || edu.userId;

                const earnings = await this.marketplaceEarningModel.find({
                    role: EarningRole.EDUCATOR,
                    userId: userId,
                }).lean();

                const totalEarnings = earnings.reduce((acc, e) => acc + (e.netAmount || 0), 0);
                const pendingBalance = earnings
                    .filter(e => e.status === EarningStatus.PENDING || e.status === EarningStatus.ELIGIBLE)
                    .reduce((acc, e) => acc + (e.netAmount || 0), 0);
                const totalWithdrawn = earnings
                    .filter(e => e.status === EarningStatus.PAID)
                    .reduce((acc, e) => acc + (e.netAmount || 0), 0);

                const balance = Math.max(0, totalEarnings - totalWithdrawn);

                return {
                    _id: edu._id,
                    educatorId: {
                        _id: edu._id,
                        userId: {
                            _id: userId,
                            name: edu.userId?.name || 'Educator',
                            email: edu.userId?.email || '',
                        }
                    },
                    balance,
                    pendingBalance,
                    totalEarnings,
                    totalWithdrawn,
                    isActive: edu.isActive !== false,
                };
            })
        );

        return ApiResponse.success('Educator balances retrieved successfully', results);
    }
}

