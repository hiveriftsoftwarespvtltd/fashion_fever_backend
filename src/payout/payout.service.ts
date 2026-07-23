import { BadRequestException, Injectable } from '@nestjs/common';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationModuleType, NotificationType, NotificationPriority } from 'src/notification/schema/notification.schema';
import { User, UserDocument, UserRole } from 'src/user/schema/user.schema';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { ApiResponse } from 'src/common/responses/api-response';
import {
  CommissionStatus,
  InfluencerCommission,
  InfluencerCommissionDocument,
} from 'src/influencer/schema/influencer-commision-rate.schema';
import {
  InfluencerCommissionSlabDocument,
  influencerCommissonSlab,
} from 'src/influencer/schema/influencer-commission-slab';
import {
  InfluencerPayout,
  InfluencerPayoutDocument,
  InfluencerPayoutStatus,
} from 'src/influencer/schema/influencer-payout.schema';
import {
  Influencer,
  InfluencerDocument,
} from 'src/influencer/schema/influencer.schema';
import {
  Order,
  OrderDocument,
  OrderStatus,
  PaymentStatus,
} from 'src/order/schema/order.schema';
import {
  VendorOrder,
  VendorOrderDocument,
} from 'src/order/schema/vendor-order.schema';
import {
  VendorPayout,
  VendorPayoutDocument,
  VendorPayoutStatus,
} from 'src/vendor/schema/vendor-payout.schema';
import { Vendor, VendorDocument } from 'src/vendor/schema/vendor.schema';

import { CoursePurchase, CoursePurchaseDocument } from 'src/courses/schema/course-purchase.schema';
import { ServiceBooking, ServiceBookingDocument } from 'src/service/schema/service-booking.schema';
import { ServiceProvider, ServiceProviderDocument } from 'src/service/schema/service-provider.schema';
import { QuickDeliveryConfiguration, QuickDeliveryConfigurationDocument } from 'src/quick-e-commerce/schema/quickDeliveryConfig';
import { VendorQuickOrder, VendorOrderDocument as VendorQuickOrderDocument } from 'src/quick-e-commerce/schema/quick-vendor-order.schema';
import { DeliveryPerson, DeliveryPersonDocument, DeliveryPersonReference } from 'src/quick-e-commerce/schema/delivery-person.schema';
import { PlatformWallet, PlatformWalletDocument } from 'src/wallet/schema/platform/platform.wallet.schema';
import { PlatformWalletTransaction, PlatformWalletTransactionDocument, PlatformWalletTransactionType, PlatformWalletTransactionReason, PlatformTransactionSourceType } from 'src/wallet/schema/platform/platform.wallet.transactions';
import { PaymentTransaction, PaymentTransactionDocument, PaymentMode, TransactionStatus, ReferenceType } from './schema/payment-transaction.schema';
import { MarketplaceEarning, MarketplaceEarningDocument, EarningRole, EarningStatus, EarningReferenceType } from './schema/market-place-earning.schema';
import { MarketplacePayout, MarketplacePayoutDocument, PayoutStatus, PaymentMethod as MarketplacePaymentMethod } from './schema/market-place-payout.schema';
import { CashSettlement, CashSettlementDocument, CashSettlementStatus, CollectedBy } from './schema/cash-settlement.schema';
import { PaymentDirection, Settlement, SettlementDocument, SettlementStatus } from './schema/settlement.schema';
import {
  UpdatePaymentTransactionDto, UpdateCashSettlementDto, UpdateSettlementDto,
  PaymentTransactionQueryDto, MarketplaceEarningQueryDto, MarketplacePayoutQueryDto,
  CashSettlementQueryDto, SettlementQueryDto, ProcessEarningsPayoutDto, DepositCashDto
} from './dto/payout.dto';

@Injectable()
export class PayoutService {
  constructor(
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
    @InjectModel(VendorOrder.name)
    private vendorOrderModel: Model<VendorOrderDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Influencer.name)
    private influencerModel: Model<InfluencerDocument>,
    @InjectModel(InfluencerCommission.name)
    private influencerCommissionModel: Model<InfluencerCommissionDocument>,
    @InjectModel(influencerCommissonSlab.name)
    private slabModel: Model<InfluencerCommissionSlabDocument>,
    @InjectModel(InfluencerPayout.name)
    private influencerPayoutModel: Model<InfluencerPayoutDocument>,
    @InjectModel(VendorPayout.name)
    private vendorPayoutModel: Model<VendorPayoutDocument>,

    @InjectModel(CoursePurchase.name) private coursePurchaseModel: Model<CoursePurchaseDocument>,
    @InjectModel(ServiceBooking.name) private serviceBookingModel: Model<ServiceBookingDocument>,
    @InjectModel(PlatformWallet.name) private platformWalletModel: Model<PlatformWalletDocument>,
    @InjectModel(PlatformWalletTransaction.name) private platformWalletTransactionModel: Model<PlatformWalletTransactionDocument>,
    @InjectModel(PaymentTransaction.name) private paymentTransactionModel: Model<PaymentTransactionDocument>,
    @InjectModel(MarketplaceEarning.name) private marketplaceEarningModel: Model<MarketplaceEarningDocument>,
    @InjectModel(MarketplacePayout.name) private marketplacePayoutModel: Model<MarketplacePayoutDocument>,
    @InjectModel(CashSettlement.name) private cashSettlementModel: Model<CashSettlementDocument>,
    @InjectModel(Settlement.name) private settlementModel: Model<SettlementDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(ServiceProvider.name) private serviceProviderModel: Model<ServiceProviderDocument>,
    @InjectModel(QuickDeliveryConfiguration.name) private quickDeliveryConfigModel: Model<QuickDeliveryConfigurationDocument>,
    @InjectModel(VendorQuickOrder.name) private vendorQuickOrderModel: Model<VendorQuickOrderDocument>,
    @InjectModel(DeliveryPerson.name) private deliveryPersonModel: Model<DeliveryPersonDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly notificationService: NotificationService,
  ) { }

  private async updatePlatformWallet(
    amount: number,
    sourceId: Types.ObjectId,
    sourceType: PlatformTransactionSourceType,
    reason: PlatformWalletTransactionReason,
    description: string,
    session: any
  ) {
    if (amount <= 0) return;

    let wallet = await this.platformWalletModel.findOne().session(session);
    if (!wallet) {
      const wallets = await this.platformWalletModel.create([{}], { session });
      wallet = wallets[0];
    }

    wallet.balance += amount;
    if (reason === PlatformWalletTransactionReason.ORDER_COMMISSION || reason === PlatformWalletTransactionReason.BOOKING_COMMISSION) {
      wallet.totalCommissionEarned += amount;
    } else if (reason === PlatformWalletTransactionReason.PLATFORM_FEE) {
      wallet.totalPlatformFeesEarned += amount;
    }

    await wallet.save({ session });

    await this.platformWalletTransactionModel.create([{
      walletId: wallet._id,
      amount,
      type: PlatformWalletTransactionType.CREDIT,
      reason,
      sourceId,
      sourceType,
      description,
      balanceAfterTransaction: wallet.balance
    }], { session });
  }

  async settleVendorPayout(dto: {
    vendorId: string;
    vendorOrderIds: string[];
    transactionId: string;
    remarks?: string;
    month?: number;
    year?: number;
  }) {
    const session = await this.connection.startSession();

    try {
      session.startTransaction();

      const month = dto.month || new Date().getMonth() + 1;

      const year = dto.year || new Date().getFullYear();

      const vendorOrders = await this.vendorOrderModel.find({
        _id: {
          $in: dto.vendorOrderIds.map((id: any) => new Types.ObjectId(id)),
        },

        vendorId: new Types.ObjectId(dto.vendorId),

        orderStatus: OrderStatus.DELIVERED,

        paymentStatus: PaymentStatus.PAID,

        isVendorSettled: false,
      });

      if (!vendorOrders.length) {
        throw new BadRequestException('No payable orders found');
      }

      const vendor = await this.vendorModel.findById(dto.vendorId);

      const totalOrders = vendorOrders.length;

      const totalSales = vendorOrders.reduce(
        (sum, item) => sum + item.grandTotal,
        0,
      );

      const totalCommission = vendorOrders.reduce(
        (sum, item) => sum + item.commissionAmount,
        0,
      );

      const totalInfluencerCommission = vendorOrders.reduce(
        (sum, item) => sum + item.influencerCommissionAmount,
        0,
      );

      const totalShippingDeduction = vendorOrders.reduce(
        (sum, item) => sum + item.shippingCharge + item.codCharge,
        0,
      );

      const netPayout = vendorOrders.reduce(
        (sum, item) => sum + item.payoutAmount,
        0,
      );

      const payout = await this.vendorPayoutModel.create(
        [
          {
            vendorId: vendor!._id,

            vendorUserId: vendor!.ownerId,

            vendorOrderIds: vendorOrders.map((o) => o._id),

            totalOrders,

            totalSales,

            totalCommission,

            totalInfluencerCommission,

            totalShippingDeduction,

            netPayout,

            payoutMonth: month,

            payoutYear: year,

            transactionId: dto.transactionId,

            remarks: dto.remarks,

            paidAt: new Date(),

            status: VendorPayoutStatus.PAID,
          },
        ],
        { session },
      );

      await this.vendorOrderModel.updateMany(
        {
          _id: {
            $in: vendorOrders.map((x) => x._id),
          },
        },
        {
          $set: {
            isVendorSettled: true,

            vendorSettledAt: new Date(),
          },
        },
        { session },
      );

      await session.commitTransaction();

      return ApiResponse.success('Vendor payout completed', payout[0]);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async settleInfluencerPayout(dto: {
    influencerId: string;
    commissionIds: string[];
    transactionId: string;
    remarks?: string;
    month?: number;
    year?: number;
  }) {
    const session = await this.connection.startSession();

    try {
      session.startTransaction();

      const month = dto.month || new Date().getMonth() + 1;

      const year = dto.year || new Date().getFullYear();

      const commissions = await this.influencerCommissionModel.find({
        _id: {
          $in: dto.commissionIds.map((id) => new Types.ObjectId(id)),
        },

        influencerId: new Types.ObjectId(dto.influencerId),

        isDelivered: true,

        isSettled: false,
      });

      if (!commissions.length) {
        throw new BadRequestException('No commissions found');
      }

      const influencer = await this.influencerModel.findById(dto.influencerId);

      const totalSales = commissions.reduce(
        (sum, item) => sum + item.finalOrderAmount,
        0,
      );

      const slab = await this.slabModel
        .findOne({
          minSales: {
            $lte: totalSales,
          },
          maxSales: {
            $gte: totalSales,
          },
          isActive: true,
        })
        .lean();

      const rate = slab?.commissionRate || 0;

      const totalPlatformCommission = commissions.reduce(
        (sum, item) => sum + item.platformCommissionAmount,
        0,
      );

      const payoutAmount = Number(
        ((totalPlatformCommission * rate) / 100).toFixed(2),
      );

      const payout = await this.influencerPayoutModel.create(
        [
          {
            influencerId: influencer!._id,

            influencerUserId: influencer!.userId,

            totalOrders: commissions.length,

            totalSales,

            totalProfit: commissions.reduce(
              (sum, item) => sum + item.netProfit,
              0,
            ),

            commissionRate: rate,

            totalCommission: payoutAmount,

            payoutMonth: month,

            payoutYear: year,

            transactionId: dto.transactionId,

            remarks: dto.remarks,

            commissionIds: commissions.map((c) => c._id),

            settledAt: new Date(),

            paidAt: new Date(),

            status: InfluencerPayoutStatus.PAID,
          },
        ],
        { session },
      );

      await this.influencerCommissionModel.updateMany(
        {
          _id: {
            $in: commissions.map((c) => c._id),
          },
        },
        {
          $set: {
            isSettled: true,

            settledAt: new Date(),

            paidAt: new Date(),

            commissionRate: rate,

            commissionAmount: payoutAmount / commissions.length,

            status: CommissionStatus.PAID,
          },
        },
        { session },
      );

      await this.influencerModel.updateOne(
        {
          _id: influencer!._id,
        },
        {
          $inc: {
            paidCommission: payoutAmount,

            pendingCommission: -payoutAmount,
          },
        },
        { session },
      );

      await session.commitTransaction();

      return ApiResponse.success('Influencer payout completed', payout[0]);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }



  async getAllPaymentTransactions(query: PaymentTransactionQueryDto = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.paymentMode) filter.paymentMode = query.paymentMode;
    if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;
    if (query.referenceType) filter.referenceType = query.referenceType;
    if (query.customerId) filter.customerId = new Types.ObjectId(query.customerId);
    if (query.userId) filter.customerId = new Types.ObjectId(query.userId);
    if (query.transactionId) filter.transactionId = query.transactionId;

    const [data, total] = await Promise.all([
      this.paymentTransactionModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.paymentTransactionModel.countDocuments(filter)
    ]);

    return ApiResponse.success('Payment transactions fetched', { data, total, page, limit, totalPages: Math.ceil(total / limit) });
  }

  async updatePaymentTransaction(id: string, dto: UpdatePaymentTransactionDto) {
    const updated = await this.paymentTransactionModel.findByIdAndUpdate(id, dto, { new: true });
    if (!updated) throw new BadRequestException('Payment transaction not found');
    return ApiResponse.success('Payment transaction updated', updated);
  }

  async getAllMarketplaceEarnings(query: MarketplaceEarningQueryDto = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.role) filter.role = query.role;
    if (query.referenceType) filter.referenceType = query.referenceType;
    if (query.userId) filter.userId = new Types.ObjectId(query.userId);
    if (query.payoutId) filter.payoutId = new Types.ObjectId(query.payoutId);
    if (query.paymentTransactionId) filter.paymentTransactionId = new Types.ObjectId(query.paymentTransactionId);

    // Apply date filter
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(new Date().setMonth(new Date().getMonth() - 1)); // Default to last 1 month

    filter.createdAt = {
      $gte: startDate,
      $lte: endDate
    };

    const [data, total] = await Promise.all([
      this.marketplaceEarningModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.marketplaceEarningModel.countDocuments(filter)
    ]);

    return ApiResponse.success('Marketplace earnings fetched', { data, total, page, limit, totalPages: Math.ceil(total / limit) });
  }

  async getMyEarnings(query: MarketplaceEarningQueryDto, userId: string) {
    query.userId = userId;
    console.log("Query in line 750", query);
    return this.getAllMarketplaceEarnings(query);
  }

  async getAllMarketplacePayouts(query: MarketplacePayoutQueryDto = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;
    if (query.userId) filter.userId = new Types.ObjectId(query.userId);

    const [data, total] = await Promise.all([
      this.marketplacePayoutModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.marketplacePayoutModel.countDocuments(filter)
    ]);

    return ApiResponse.success('Marketplace payouts fetched', { data, total, page, limit, totalPages: Math.ceil(total / limit) });
  }

  async getAllCashSettlements(query: CashSettlementQueryDto = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.collectedBy) filter.collectedBy = query.collectedBy;
    if (query.referenceType) filter.referenceType = query.referenceType;
    if (query.collectedByReferenceId) filter.collectedByReferenceId = new Types.ObjectId(query.collectedByReferenceId);
    if (query.userId) filter.collectedByReferenceId = new Types.ObjectId(query.userId);
    if (query.paymentTransactionId) filter.paymentTransactionId = new Types.ObjectId(query.paymentTransactionId);

    const [data, total] = await Promise.all([
      this.cashSettlementModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.cashSettlementModel.countDocuments(filter)
    ]);

    return ApiResponse.success('Cash settlements fetched', { data, total, page, limit, totalPages: Math.ceil(total / limit) });
  }

  async updateCashSettlement(id: string, dto: UpdateCashSettlementDto, adminUserId?: string) {
    const settlement = await this.cashSettlementModel.findById(id);
    if (!settlement) throw new BadRequestException('Cash settlement not found');

    const previousStatus = settlement.status;
    Object.assign(settlement, dto);

    if (dto.status === CashSettlementStatus.VERIFIED && previousStatus !== CashSettlementStatus.VERIFIED) {
      settlement.verifiedAt = new Date();
      if (adminUserId) settlement.verifiedBy = new Types.ObjectId(adminUserId);

      await this.paymentTransactionModel.findByIdAndUpdate(settlement.paymentTransactionId, { status: TransactionStatus.SUCCESS });
      await this.generateEarningsForVerifiedSettlement(settlement.paymentTransactionId);
    } else if (dto.status === CashSettlementStatus.REJECTED && previousStatus !== CashSettlementStatus.REJECTED) {
      settlement.rejectedAt = new Date();
      if (adminUserId) settlement.rejectedBy = new Types.ObjectId(adminUserId);
    }

    await settlement.save();
    return ApiResponse.success('Cash settlement updated', settlement);
  }

  async getAllSettlements(query: SettlementQueryDto = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.role) filter.role = query.role;
    if (query.paymentDirection) filter.paymentDirection = query.paymentDirection;
    if (query.referenceType) filter.referenceType = query.referenceType;
    if (query.userId) filter.userId = new Types.ObjectId(query.userId);
    if (query.marketplacePayoutId) filter.marketplacePayoutId = new Types.ObjectId(query.marketplacePayoutId);
    if (query.paymentTransactionId) filter.paymentTransactionId = new Types.ObjectId(query.paymentTransactionId);

    const [data, total] = await Promise.all([
      this.settlementModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.settlementModel.countDocuments(filter)
    ]);

    return ApiResponse.success('Settlements fetched', { data, total, page, limit, totalPages: Math.ceil(total / limit) });
  }

  async updateSettlement(id: string, dto: UpdateSettlementDto) {
    const updated = await this.settlementModel.findByIdAndUpdate(id, dto, { new: true });
    if (!updated) throw new BadRequestException('Settlement not found');
    return ApiResponse.success('Settlement updated', updated);
  }

  // ======================================================
  // PROCESS EARNINGS PAYOUT (Admin/Super Admin)
  // ======================================================
  async processEarningsPayout(dto: ProcessEarningsPayoutDto) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const earningObjectIds = dto.earningIds.map(id => new Types.ObjectId(id));

      // ── Fetch all earnings ──────────────────────────────────────
      const earnings = await this.marketplaceEarningModel
        .find({ _id: { $in: earningObjectIds } })
        .session(session);

      if (!earnings.length) {
        throw new BadRequestException('No earnings found for the provided IDs');
      }

      // ── Cross verify: all requested IDs must exist ──────────────
      const foundIds = new Set(earnings.map(e => e._id.toString()));
      const missingIds = dto.earningIds.filter(id => !foundIds.has(id));
      if (missingIds.length) {
        throw new BadRequestException(`Earnings not found for IDs: ${missingIds.join(', ')}`);
      }

      // ── Validate: no already-paid earnings ──────────────────────
      const alreadyPaid = earnings.filter(e => e.status === EarningStatus.PAID);
      if (alreadyPaid.length) {
        throw new BadRequestException(
          `These earnings are already paid: ${alreadyPaid.map(e => e._id).join(', ')}`
        );
      }

      // ── Validate: all must match the provided role ───────────────
      const roleMismatch = earnings.filter(e => e.role !== dto.role);
      if (roleMismatch.length) {
        throw new BadRequestException(
          `Role mismatch on earnings: ${roleMismatch.map(e => e._id).join(', ')}. Expected role: ${dto.role}`
        );
      }

      // ── Validate: all userIds must exist in User collection ──────
      const uniqueUserIds = [...new Set(earnings.map(e => e.userId.toString()))];
      const users = await this.userModel.find({
        _id: { $in: uniqueUserIds.map(id => new Types.ObjectId(id)) }
      }).select('_id name roles').session(session);

      const userMap = new Map(users.map(u => [u._id.toString(), u]));
      const missingUsers = uniqueUserIds.filter(uid => !userMap.has(uid));
      if (missingUsers.length) {
        throw new BadRequestException(`Users not found for IDs: ${missingUsers.join(', ')}`);
      }

      // ── Group earnings by userId ─────────────────────────────────
      const earningsByUser = new Map<string, typeof earnings>();
      for (const earning of earnings) {
        const uid = earning.userId.toString();
        if (!earningsByUser.has(uid)) earningsByUser.set(uid, []);
        earningsByUser.get(uid)!.push(earning);
      }

      const payoutDocs: any[] = [];

      // ── Create a MarketplacePayout record per user ───────────────
      for (const [userId, userEarnings] of earningsByUser.entries()) {
        const totalNetAmount = userEarnings.reduce((sum, e) => sum + e.netAmount, 0);
        const payout = await this.marketplacePayoutModel.create([{
          userId: new Types.ObjectId(userId),
          role: dto.role,
          totalAmount: parseFloat(totalNetAmount.toFixed(2)),
          status: PayoutStatus.PAID,
          paymentMethod: dto.paymentMethod as MarketplacePaymentMethod ?? undefined,
          transactionReference: dto.transactionReference,
          remarks: dto.remarks,
          paidAt: new Date(),
        }], { session });

        payoutDocs.push({ userId, payoutId: payout[0]._id, totalNetAmount });

        // Mark each earning as PAID and link to the payout record
        await this.marketplaceEarningModel.updateMany(
          { _id: { $in: userEarnings.map(e => e._id) } },
          {
            $set: {
              status: EarningStatus.PAID,
              payoutId: payout[0]._id,
            }
          },
          { session }
        );

        const settlements = userEarnings.map((earning) => ({
          userId: new Types.ObjectId(earning.userId as any),
          role: earning.role,
          referenceType: earning.referenceType,
          referenceId: new Types.ObjectId(earning.referenceId as any),

          marketplacePayoutId: payout[0]._id,

          grossAmount: earning.grossAmount,
          platformCommission: earning.platformCommission,
          tax: earning.tax,
          deduction: earning.deduction,
          netAmount: earning.netAmount,

          paymentDirection: PaymentDirection.PLATFORM_TO_USER,
          status: SettlementStatus.COMPLETED,

          paidAt: payout[0].paidAt,
        }))

        await this.settlementModel.insertMany(settlements, {
          session,
        });
      }

      await session.commitTransaction();

      // ── Send notifications (outside transaction) ─────────────────
      for (const { userId, totalNetAmount } of payoutDocs) {
        try {
          await this.notificationService.sendNotification({
            receiverId: userId,
            title: 'Payout Processed',
            body: `Your earnings of ₹${totalNetAmount.toFixed(2)} have been paid out successfully.`,
            moduleType: NotificationModuleType.ORDER,
            type: NotificationType.SYSTEM,
            priority: NotificationPriority.HIGH,
          });
        } catch {
          // Notification failure should not roll back the payout
        }
      }

      return ApiResponse.success('Earnings payout processed successfully', {
        totalUsersProcessed: payoutDocs.length,
        totalEarningsPaid: earnings.length,
        payouts: payoutDocs.map(p => ({
          userId: p.userId,
          payoutId: p.payoutId,
          amount: p.totalNetAmount,
        })),
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async depositeCashAmount(userId: string, dto: DepositCashDto) {
    const paymentTx = await this.paymentTransactionModel.findById(dto.paymentTransactionId);
    if (!paymentTx) throw new BadRequestException('Payment transaction not found');
    if (paymentTx.paymentMode !== PaymentMode.COD) throw new BadRequestException('Not a COD transaction');

    const existing = await this.cashSettlementModel.findOne({ paymentTransactionId: dto.paymentTransactionId });
    if (existing && existing.status !== CashSettlementStatus.REJECTED && existing.status !== CashSettlementStatus.CANCELLED) {
      throw new BadRequestException('Cash settlement already exists for this transaction');
    }

    const user = await this.userModel.findById(userId);
    if (!user) throw new BadRequestException('User not found');

    let collectedBy: CollectedBy;
    let collectedByReferenceId: Types.ObjectId = user._id as Types.ObjectId;

    if (user.roles.includes(UserRole.DELIVERY_PERSON)) {
      collectedBy = CollectedBy.DELIVERY_PERSON;
    } else if (user.roles.includes(UserRole.SERVICE_PROVIDER) && user.serviceProviderId) {
      collectedBy = CollectedBy.SERVICE_PROVIDER;
      collectedByReferenceId = new Types.ObjectId(user.serviceProviderId as any);
    } else if (user.roles.includes(UserRole.VENDOR) && user.vendorId) {
      collectedBy = CollectedBy.VENDOR;
      collectedByReferenceId = new Types.ObjectId(user.vendorId as any);
    } else {
      collectedBy = CollectedBy.DELIVERY_PERSON;
    }

    const settlement = await this.cashSettlementModel.create({
      paymentTransactionId: new Types.ObjectId(paymentTx._id as any),
      referenceType: paymentTx.referenceType,
      referenceId: new Types.ObjectId(paymentTx.referenceId as any),
      amount: paymentTx.amount,
      collectedBy,
      collectedByReferenceId: new Types.ObjectId(collectedByReferenceId as any),
      depositedAmount: dto.depositedAmount || paymentTx.amount,
      status: CashSettlementStatus.DEPOSITED,
      depositedAt: new Date(),
      remarks: dto.remarks
    });

    return ApiResponse.success('Cash deposit submitted successfully', settlement);
  }

  private async generateEarningsForVerifiedSettlement(paymentTransactionId: Types.ObjectId) {
    const paymentTx = await this.paymentTransactionModel.findById(paymentTransactionId);
    if (!paymentTx) return;

    const earningsToCreate: any[] = [];

    if (paymentTx.referenceType === ReferenceType.QUICK_ORDER) {
      const vendorOrder = await this.vendorQuickOrderModel.findById(paymentTx.referenceId);
      if (vendorOrder) {
        const vendorUser = await this.vendorModel.findById(vendorOrder.vendorId);
        if (vendorUser && vendorUser.ownerId) {
          earningsToCreate.push({
            userId: new Types.ObjectId(vendorUser.ownerId as any),
            role: EarningRole.VENDOR,
            referenceType: EarningReferenceType.QUICK_ORDER,
            referenceId: new Types.ObjectId(vendorOrder._id as any),
            grossAmount: vendorOrder.total,
            netAmount: vendorOrder.total - (vendorOrder.commissionAmount || 0),
            platformCommission: vendorOrder.commissionAmount || 0,
            tax: vendorOrder.tax || 0,
            deduction: vendorOrder.commissionAmount || 0,
            status: EarningStatus.PENDING
          });
        }

        if (vendorOrder.influencerId && vendorOrder.influencerCommissionAmount && vendorOrder.influencerCommissionAmount > 0) {
          const influencer = await this.influencerModel.findById(vendorOrder.influencerId);
          if (influencer && influencer.userId) {
            earningsToCreate.push({
              userId: new Types.ObjectId(influencer.userId as any),
              role: EarningRole.INFLUENCER,
              referenceType: EarningReferenceType.QUICK_ORDER,
              referenceId: new Types.ObjectId(vendorOrder._id as any),
              grossAmount: vendorOrder.influencerCommissionAmount,
              netAmount: vendorOrder.influencerCommissionAmount,
              platformCommission: 0,
              tax: 0,
              deduction: 0,
              status: EarningStatus.PENDING
            });
          }
        }

        if (vendorOrder.deliveryPersonId) {
          const deliveryPerson = await this.deliveryPersonModel.findById(vendorOrder.deliveryPersonId);
          if (deliveryPerson && deliveryPerson.userId && deliveryPerson.reference === DeliveryPersonReference.PLATFORM) {
            const config = await this.quickDeliveryConfigModel.findOne();
            const deliveryPersonAmount = config?.deliveryPersonChargeForPerDelivery || 0;
            if (deliveryPersonAmount > 0) {
              earningsToCreate.push({
                userId: new Types.ObjectId(deliveryPerson.userId as any),
                role: EarningRole.DELIVERY_PERSON,
                referenceType: EarningReferenceType.QUICK_ORDER,
                referenceId: new Types.ObjectId(vendorOrder._id as any),
                grossAmount: deliveryPersonAmount,
                netAmount: deliveryPersonAmount,
                platformCommission: 0,
                tax: 0,
                deduction: 0,
                status: EarningStatus.PENDING
              });
            }
          }
        }
      }
    } else if (paymentTx.referenceType === ReferenceType.ORDER) {
      const vendorOrder = await this.vendorOrderModel.findById(paymentTx.referenceId);
      if (vendorOrder) {
        const vendorUser = await this.vendorModel.findById(vendorOrder.vendorId);
        if (vendorUser && vendorUser.ownerId) {
          earningsToCreate.push({
            userId: new Types.ObjectId(vendorUser.ownerId as any),
            role: EarningRole.VENDOR,
            referenceType: EarningReferenceType.ORDER,
            referenceId: new Types.ObjectId(vendorOrder._id as any),
            grossAmount: vendorOrder.grandTotal,
            netAmount: vendorOrder.payoutAmount || 0,
            platformCommission: vendorOrder.platformCommissionAmount || 0,
            tax: vendorOrder.tax || 0,
            deduction: vendorOrder.platformCommissionAmount || 0,
            status: EarningStatus.PENDING
          });
        }

        if (vendorOrder.orderId) {
          const mainOrder = await this.orderModel.findById(vendorOrder.orderId);
          if (mainOrder && mainOrder.appliedCoupon?.influencerId && vendorOrder.influencerCommissionAmount && vendorOrder.influencerCommissionAmount > 0) {
            const influencer = await this.influencerModel.findById(mainOrder.appliedCoupon.influencerId);
            if (influencer && influencer.userId) {
              earningsToCreate.push({
                userId: new Types.ObjectId(influencer.userId as any),
                role: EarningRole.INFLUENCER,
                referenceType: EarningReferenceType.ORDER,
                referenceId: new Types.ObjectId(vendorOrder._id as any),
                grossAmount: vendorOrder.influencerCommissionAmount,
                netAmount: vendorOrder.influencerCommissionAmount,
                platformCommission: 0,
                tax: 0,
                deduction: 0,
                status: EarningStatus.PENDING
              });
            }
          }
        }
      }
    } else if (paymentTx.referenceType === ReferenceType.BOOKING) {
      const booking = await this.serviceBookingModel.findById(paymentTx.referenceId);
      if (booking) {
        const provider = await this.serviceProviderModel.findById(booking.providerId);
        if (provider && provider.userId) {
          const totalAmount = booking.totalAmount || 0;
          const platformCommissionAmount = booking.platformCommissionAmount || 0;
          const providerPayoutAmount = booking.providerPayoutAmount || (totalAmount - platformCommissionAmount);

          earningsToCreate.push({
            userId: new Types.ObjectId(provider.userId as any),
            role: EarningRole.SERVICE_PROVIDER,
            referenceType: EarningReferenceType.BOOKING,
            referenceId: new Types.ObjectId(booking._id as any),
            grossAmount: totalAmount,
            netAmount: providerPayoutAmount > 0 ? providerPayoutAmount : 0,
            platformCommission: platformCommissionAmount,
            tax: 0,
            deduction: platformCommissionAmount,
            status: EarningStatus.PENDING
          });
        }
      }
    }

    for (const earning of earningsToCreate) {
      const exists = await this.marketplaceEarningModel.findOne({
        referenceId: earning.referenceId,
        role: earning.role
      });
      if (!exists) {
        await this.marketplaceEarningModel.create(earning);
      }
    }
  }
}
