import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { ApiResponse } from 'src/common/responses/api-response';
import { Coupon, CouponDocument, CouponType } from 'src/coupon/schema/coupon.schema';
import { CouponUsage, CouponUsageDocument } from 'src/coupon/schema/coupon-usage.schema';
import {
  ServiceBooking,
  ServiceBookingDocument,
  BookingStatus,
  BookingPaymentStatus,
} from './schema/service-booking.schema';
import { PaymentMethod } from 'src/order/schema/order.schema';
import { StaffAllocation, StaffAllocationDocument, AllocationType, StaffAllocationStatus } from './schema/staff-allocation.schema';
import { UserWalletService } from 'src/wallet/service/user/user.wallet.service';
import { CashbackSlab, CashbackSlabDocument, CashbackType } from 'src/wallet/schema/cashback/cashbacks.slabs.schema';
import { WalletTransactionReason } from 'src/wallet/schema/user/user.wallet.transactions';
import { ServiceReview, ServiceReviewDocument } from './schema/service-review.schema';
import { Service, ServiceDocument } from './schema/service.schema';
import { ServiceStaff, ServiceStaffDocument } from './schema/service-staff.schema';
import { User, UserDocument, UserRole } from 'src/user/schema/user.schema';
import { ServiceProvider, ServiceProviderDocument } from './schema/service-provider.schema';
import { CreateBookingDTO, RescheduleBookingDTO } from './dto/service.dto';
import { calculateEndTime, safeSendMail, sendMail, toMinutes, toTimeString } from 'src/utils/helper';
import { ServiceService } from './service.service';
import { bookingCancelledTemplate, bookingCompletedTemplate, bookingRescheduledTemplate } from 'src/utils/service.email.template';
import {
  CommissionRate,
  CommissionRateDocument,
  CommissionEntityType,
  CommissionOn,
} from 'src/admin/schema/commission-rate.schema';
import { AffiliateTrackingService } from 'src/influencer/affiliate-tracking.service';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationModuleType, NotificationType, NotificationPriority } from 'src/notification/schema/notification.schema';
import { PaymentMode, PaymentTransaction, PaymentTransactionDocument, ReferenceType, TransactionStatus } from 'src/payout/schema/payment-transaction.schema';
import { PaymentMethod as TransactionPaymentMethod } from 'src/payout/schema/payment-transaction.schema';
import { MarketplaceEarning, MarketplaceEarningDocument, EarningRole, EarningReferenceType, EarningStatus } from 'src/payout/schema/market-place-earning.schema';

@Injectable()
export class ServiceBookingService {
  constructor(
    @InjectModel(ServiceBooking.name)
    private serviceBookingModel: Model<ServiceBookingDocument>,
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
    @InjectModel(ServiceStaff.name)
    private serviceStaffModel: Model<ServiceStaffDocument>,
    @InjectModel(Coupon.name) private couponModel: Model<CouponDocument>,
    @InjectModel(CouponUsage.name)
    private couponUsageModel: Model<CouponUsageDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(ServiceProvider.name) private providerModel: Model<ServiceProviderDocument>,
    @InjectModel(CashbackSlab.name) private cashbackSlabModel: Model<CashbackSlabDocument>,
    @InjectModel(CommissionRate.name) private commissionRateModel: Model<CommissionRateDocument>,
    @InjectModel(ServiceReview.name) private reviewModel: Model<ServiceReviewDocument>,
    private service: ServiceService,
    private userWalletService: UserWalletService,
    @InjectModel(StaffAllocation.name) private staffAllocationModel: Model<StaffAllocationDocument>,
    @InjectModel(PaymentTransaction.name) private paymentTransactionModel: Model<PaymentTransactionDocument>,
    @InjectModel(MarketplaceEarning.name) private marketplaceEarningModel: Model<MarketplaceEarningDocument>,

    @InjectConnection() private connection: Connection,
    private affiliateTrackingService: AffiliateTrackingService,
    private notificationService: NotificationService,
  ) { }



  async createBooking(
    userId: string,
    dto: CreateBookingDTO,
  ) {
    const session = await this.connection.startSession();

    try {
      session.startTransaction();

      const requestedServiceIds: string[] = [];
      if (dto.items && dto.items.length > 0) {
        dto.items.forEach(item => {
          if (!requestedServiceIds.includes(item.serviceId)) {
            requestedServiceIds.push(item.serviceId);
          }
        });
      }

      if (requestedServiceIds.length === 0) {
        throw new BadRequestException('At least one service must be booked');
      }

      const services: any = await this.serviceModel
        .find({ _id: { $in: requestedServiceIds.map(id => new Types.ObjectId(id)) } })
        .session(session);

      if (services.length !== requestedServiceIds.length) {
        throw new NotFoundException('One or more services not found');
      }

      const inactiveServices = services.filter((s: any) => !s.isActive);
      if (inactiveServices.length > 0) {
        throw new BadRequestException('One or more services are inactive');
      }

      const primaryService = services[0];

      const providerId = primaryService?.providerId;


      const providerMismatch = services.some(s => s.providerId.toString() !== providerId?.toString());
      if (providerMismatch) {
        throw new BadRequestException('All services must belong to the same provider');
      }

      const user = await this.userModel.findById(new Types.ObjectId(userId)).session(session);

      if (!user) {
        throw new NotFoundException(
          'User not found or inactive',
        );
      }

      const staff = await this.serviceStaffModel
        .findOne({
          _id: new Types.ObjectId(dto.staffId),
          providerId: providerId,
          isActive: true,
        })
        .session(session);

      if (!staff) {
        throw new NotFoundException(
          'Staff not found or inactive',
        );
      }

      // Validate staff skill for ALL services
      for (const service of services) {
        const canPerformService = staff.services?.some(
          (sId) =>
            sId.toString() ===
            service._id.toString(),
        );

        if (!canPerformService) {
          throw new BadRequestException(
            `Selected staff cannot perform service: ${service.title}`,
          );
        }
      }

      // Calculate total duration and build items
      let totalDurationMinutes = 0;
      let subtotal = 0;
      const bookingItems: any[] = [];

      for (const service of services) {
        totalDurationMinutes += service.durationMinutes;
        const itemPrice = service.offeredPrice || service.sellingPrice;
        subtotal += itemPrice;

        bookingItems.push({
          serviceId: service._id,
          serviceName: service.title,
          costPrice: service.costPrice,
          sellingPrice: service.sellingPrice,
          offeredPrice: service.offeredPrice,
          total: itemPrice,
        });
      }

      const slotStartTime = new Date(dto.slotStartTime);

      const slotEndTime = new Date(
        slotStartTime.getTime() +
        totalDurationMinutes * 60 * 1000,
      );

      // Verify slot exists and staff is available
      const availableSlotsResponse =
        await this.service.getAvailableSlots(
          providerId!.toString(),
          { serviceIds: requestedServiceIds, date: dto.bookingDate }
        );

      const availableSlots =
        availableSlotsResponse.data?.slots || [];

      const selectedSlot = availableSlots.find(
        (slot) =>
          new Date(slot.utcStartTime || slot.startTime).getTime() ===
          new Date(dto.slotStartTime).getTime() &&
          slot.availableStaff.some(
            (s: any) =>
              s._id.toString() ===
              staff._id.toString(),
          ),
      );

      if (!selectedSlot) {
        throw new BadRequestException(
          'Selected slot is not available',
        );
      }

      const bookingDate = new Date(dto.bookingDate);

      const startOfDay = new Date(bookingDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(bookingDate);
      endOfDay.setHours(23, 59, 59, 999);

      const staffBookings =
        await this.serviceBookingModel
          .find({
            staffId: staff._id,
            bookingDate: {
              $gte: startOfDay,
              $lte: endOfDay,
            },
            bookingStatus: {
              $in: [
                BookingStatus.PENDING,
                BookingStatus.CONFIRMED,
                BookingStatus.ONGOING,
              ],
            },
          })
          .session(session);

      // 
      const requestedStart =
        slotStartTime.getTime();

      const requestedEnd =
        slotEndTime.getTime();

      const conflictingBooking =
        staffBookings.find((booking) => {
          const existingStart = new Date(
            booking.slotStartTime,
          ).getTime();

          const existingEnd = new Date(
            booking.slotEndTime,
          ).getTime();

          return (
            requestedStart < existingEnd &&
            requestedEnd > existingStart
          );
        });

      if (conflictingBooking) {
        throw new BadRequestException(
          'Selected slot is already booked',
        );
      }

      let couponDiscount = 0;
      let couponId: Types.ObjectId | undefined;
      let couponCode: string | undefined;

      // ---------------- COUPON LOGIC ----------------

      if (dto.couponCode) {
        const coupon = await this.couponModel
          .findOne({
            code: dto.couponCode
              .trim()
              .toUpperCase(),
            isActive: true,
          })
          .session(session);

        if (!coupon) {
          throw new BadRequestException(
            'Coupon not found',
          );
        }

        const now = new Date();

        if (
          coupon.startsAt &&
          now < coupon.startsAt
        ) {
          throw new BadRequestException(
            'Coupon not started yet',
          );
        }

        if (
          coupon.expiresAt &&
          now >= coupon.expiresAt
        ) {
          throw new BadRequestException(
            'Coupon expired',
          );
        }

        if (
          coupon.totalUsageLimit > 0 &&
          coupon.totalUsed >=
          coupon.totalUsageLimit
        ) {
          throw new BadRequestException(
            'Coupon usage limit exceeded',
          );
        }

        const userUsage =
          await this.couponUsageModel.countDocuments({
            userId: new Types.ObjectId(userId),
            couponId: coupon._id,
          });

        if (
          coupon.usageLimitPerUser > 0 &&
          userUsage >=
          coupon.usageLimitPerUser
        ) {
          throw new BadRequestException(
            'You already used this coupon',
          );
        }

        if (
          coupon.minimumOrderAmount > 0 &&
          subtotal <
          coupon.minimumOrderAmount
        ) {
          throw new BadRequestException(
            `Minimum order amount should be ₹${coupon.minimumOrderAmount}`,
          );
        }

        if (
          coupon.type ===
          CouponType.PERCENTAGE
        ) {
          couponDiscount =
            (subtotal * coupon.value) / 100;

          if (
            coupon.maximumDiscount &&
            couponDiscount >
            coupon.maximumDiscount
          ) {
            couponDiscount =
              coupon.maximumDiscount;
          }
        } else {
          couponDiscount = coupon.value;
        }

        couponDiscount = Math.min(
          couponDiscount,
          subtotal,
        );

        coupon.totalUsed += 1;

        await coupon.save({ session });

        couponId =
          coupon._id as Types.ObjectId;
        couponCode = coupon.code;
      }

      const totalAmount =
        subtotal - couponDiscount;

      const advanceAmount = parseFloat((totalAmount * 0.2).toFixed(2));
      const remainingAmount = parseFloat(
        (totalAmount - advanceAmount).toFixed(2),
      );

      // ── Resolve commission from admin CommissionRate schema ──────────────
      const DEFAULT_COMMISSION_RATE = 25;
      const DEFAULT_COMMISSION_ON = CommissionOn.PROFITVALUE;

      const commissionDoc = await this.commissionRateModel.findOne().session(session);
      const providerSlab = commissionDoc?.commissions?.find(
        (s) => s.entityType === CommissionEntityType.SERVICE_PROVIDER,);

      const platformCommissionRate =
        providerSlab?.commissionPercentage ?? DEFAULT_COMMISSION_RATE;
      const platformCommissionOn =
        providerSlab?.commissionOn ?? DEFAULT_COMMISSION_ON;

      // Commission base depends on commissionOn
      let commissionBase: number;
      if (platformCommissionOn === CommissionOn.PROFITVALUE) {
        const totalCostPrice = bookingItems.reduce(
          (sum, item) => sum + (item.costPrice || 0),
          0,
        );
        commissionBase = Math.max(0, totalAmount - totalCostPrice);
      } else {
        commissionBase = totalAmount;
      }

      const platformCommissionAmount = parseFloat(
        ((commissionBase * platformCommissionRate) / 100).toFixed(2),
      );
      const providerPayoutAmount = parseFloat(
        (totalAmount - platformCommissionAmount).toFixed(2),
      );



      let walletAmountUsed = 0;

      const userWallet = await this.userWalletService.getBalance(userId);

      if (userWallet.balance < advanceAmount) {
        throw new BadRequestException(
          `Minimum ₹${advanceAmount} wallet balance required as advance payment`,
        );
      }

      walletAmountUsed = advanceAmount;

      await this.userWalletService.deductBalance(
        userId,
        advanceAmount,
        WalletTransactionReason.BOOKING_ADVANCE_PAYMENT,
        `Advance payment for service booking`,
        session,
      );

      const actualPaymentStatus =
        advanceAmount > 0
          ? BookingPaymentStatus.PARTIALLY_PAID
          : BookingPaymentStatus.PENDING;



      const [booking] =
        await this.serviceBookingModel.create(
          [
            {
              userId:
                new Types.ObjectId(userId),
              providerId:
                providerId,
              items: bookingItems,
              staffId: staff._id,

              bookingDate,

              slotStartTime,

              slotEndTime,

              serviceAddress:
                dto.serviceAddress,

              subtotal,
              couponId,
              couponCode,
              couponDiscount,
              influencerDiscount: 0,
              platformCommissionRate,
              platformCommissionOn,
              platformCommissionAmount,
              providerPayoutAmount,
              totalAmount,
              advanceAmount,
              remainingAmount,

              bookingStatus:
                BookingStatus.CONFIRMED,

              paymentMethod: PaymentMethod.WALLET,
              paymentStatus: actualPaymentStatus,
              walletAmountUsed,
              paymentMeta: {
                cashbackAwarded: false
              },

            },
          ],
          { session },
        );

      if (walletAmountUsed > 0) {
        await this.paymentTransactionModel.create(
          [
            {
              customerId: new Types.ObjectId(userId),
              referenceType: ReferenceType.BOOKING,
              referenceId: booking._id,
              paymentMode: PaymentMode.ONLINE,
              paymentMethod: TransactionPaymentMethod.WALLET,
              amount: walletAmountUsed,
              status: TransactionStatus.SUCCESS,
            }
          ],
          { session }
        );
      }

      if (remainingAmount > 0) {
        await this.paymentTransactionModel.create(
          [
            {
              customerId: new Types.ObjectId(userId),
              referenceType: ReferenceType.BOOKING,
              referenceId: booking._id,
              paymentMode: PaymentMode.COD,
              paymentMethod: TransactionPaymentMethod.CASH,
              amount: remainingAmount,
              status: TransactionStatus.PENDING,
            }
          ],
          { session }
        );
      }

      if (couponId) {
        await this.couponUsageModel.create(
          [
            {
              userId: new Types.ObjectId(userId),
              couponId: couponId,
              serviceBookingId: booking._id,
              usedCount: 1,
            },
          ],
          { session },
        );
      }

      await this.staffAllocationModel.create(
        [
          {
            staffId: staff._id,
            serviceProviderId: providerId,
            serviceBookingId: booking._id,
            bookingDate: bookingDate,
            slotStartTime: slotStartTime,
            slotEndTime: slotEndTime,
            status: StaffAllocationStatus.CONFIRMED,
            allocationType: AllocationType.SERVICE_BOOKING,
          }
        ],
        { session },
      );

      await this.affiliateTrackingService.createPendingCommission(userId, 'SERVICE', booking._id, totalAmount);

      await session.commitTransaction();

      // Notifications
      await this.notificationService.sendNotification({
        receiverId: userId,
        title: 'Booking Confirmed',
        body: `Your service booking for ${dto.bookingDate} has been confirmed.`,
        moduleType: NotificationModuleType.SERVICE_BOOKINGS,
        type: NotificationType.SYSTEM,
        priority: NotificationPriority.HIGH
      });

      const provider = await this.providerModel.findById(providerId);
      if (provider && provider.userId) {
        await this.notificationService.sendNotification({
          receiverId: provider.userId.toString(),
          title: 'New Service Booking',
          body: `You have a new service booking for ${dto.bookingDate}.`,
          moduleType: NotificationModuleType.SERVICE_BOOKINGS,
          type: NotificationType.SYSTEM,
          priority: NotificationPriority.HIGH
        });
      }

      safeSendMail(
        user.email,
        'Booking Confirmed - WakeUp MakeUp',
        bookingCompletedTemplate(user.name || '', {
          serviceTitle: primaryService?.title || 'Service',
          providerName: 'Provider Name',
          staffName: staff.name,
          bookingDate: dto.bookingDate,
          bookingId: booking._id.toString(),
          totalAmount,
        }),
      ).then((res) => {
        if (!res.success) {
          console.log('Booking email failed but booking is safe');
        }
      });

      return ApiResponse.success('Booking created successfully', booking);

      // return ApiResponse.success(
      //   'Booking created successfully',
      //   booking,
      // );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async cancelBooking(userId: string, bookingId: string) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const booking = await this.serviceBookingModel
        .findById(bookingId)
        .populate('items.serviceId', 'title')
        .populate('providerId', 'businessName')
        .populate('staffId', 'name')
        .session(session);

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      const user = await this.userModel.findById(userId).session(session);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (booking.userId.toString() !== userId.toString()) {
        throw new BadRequestException('You are not authorized to cancel this booking');
      }

      if (
        booking.bookingStatus === BookingStatus.CANCELLED ||
        booking.bookingStatus === BookingStatus.COMPLETED
      ) {
        throw new BadRequestException(
          `Cannot cancel booking in ${booking.bookingStatus} status`,
        );
      }

      booking.bookingStatus = BookingStatus.CANCELLED;

      if (booking.walletAmountUsed && booking.walletAmountUsed > 0 && (!booking.walletRefundedAmount || booking.walletRefundedAmount === 0)) {
        await this.userWalletService.addBalance(
          userId,
          booking.walletAmountUsed,
          WalletTransactionReason.REFUND,
          `Refund for cancelled Service Booking`,
          session
        );
        booking.walletRefundedAmount = booking.walletAmountUsed;
        booking.paymentStatus = BookingPaymentStatus.REFUNDED;
      }

      await booking.save({ session });

      if (booking.walletAmountUsed && booking.walletAmountUsed > 0) {
        await this.paymentTransactionModel.create(
          [
            {
              customerId: new Types.ObjectId(userId),
              referenceType: ReferenceType.BOOKING,
              referenceId: booking._id,
              paymentMode: PaymentMode.ONLINE,
              paymentMethod: TransactionPaymentMethod.WALLET,
              amount: booking.walletAmountUsed,
              status: TransactionStatus.REFUNDED,
            }
          ],
          { session }
        );
      }

      // Cancel the associated StaffAllocation
      await this.staffAllocationModel.updateMany(
        { serviceBookingId: booking._id },
        { $set: { status: StaffAllocationStatus.CANCELLED } },
        { session }
      );

      await session.commitTransaction();

      // ✅ Safe email (non-blocking)
      safeSendMail(
        user.email,
        'Booking Cancelled - WakeUp MakeUp',
        bookingCancelledTemplate(user.name || '', {
          serviceTitle: booking.items?.[0]?.serviceName || 'Service',
          providerName: (booking.providerId as any)?.businessName || 'Provider',
          bookingDate: booking.bookingDate.toDateString(),
          slotStartTime: booking.slotStartTime.toISOString(),
          slotEndTime: booking.slotEndTime.toISOString(),
          bookingId: booking._id.toString(),
        })
      ).then((res) => {
        if (!res.success) {
          console.log('Booking cancellation email failed but flow is safe');
        }
      });

      return ApiResponse.success('Booking cancelled successfully', booking);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async rescheduleBooking(
    userId: string,
    bookingId: string,
    dto: RescheduleBookingDTO,
  ) {
    const session = await this.connection.startSession();

    try {
      session.startTransaction();

      const booking = await this.serviceBookingModel
        .findById(bookingId)
        .session(session);

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.userId.toString() !== userId.toString()) {
        throw new BadRequestException(
          'You are not authorized to reschedule this booking',
        );
      }

      if (
        booking.bookingStatus === BookingStatus.CANCELLED ||
        booking.bookingStatus === BookingStatus.COMPLETED
      ) {
        throw new BadRequestException(
          `Cannot reschedule a ${booking.bookingStatus} booking`,
        );
      }

      if (!booking.items || booking.items.length === 0) {
        throw new NotFoundException('Booking has no items');
      }

      // Fetch all services to calculate duration
      const serviceIds = booking.items.map(i => i.serviceId);
      const services = await this.serviceModel
        .find({ _id: { $in: serviceIds } })
        .session(session);

      if (services.length === 0) {
        throw new NotFoundException('Services not found');
      }

      const totalDurationMinutes = services.reduce((acc, s) => acc + s.durationMinutes, 0);

      // DATE RANGE
      const bookingDate = new Date(dto.bookingDate);

      const startOfDay = new Date(bookingDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(bookingDate);
      endOfDay.setHours(23, 59, 59, 999);

      // CONFLICT CHECK
      const conflicting = await this.staffAllocationModel
        .findOne({
          serviceBookingId: { $ne: booking._id },
          staffId: booking.staffId,
          bookingDate: { $gte: startOfDay, $lte: endOfDay },
          slotStartTime: dto.slotStartTime,
          status: {
            $in: [
              StaffAllocationStatus.ASSIGNED,
              StaffAllocationStatus.CONFIRMED,
            ],
          },
        })
        .session(session);

      if (conflicting) {
        throw new BadRequestException(
          'The selected slot is already booked for this staff member',
        );
      }

      const slotEndTime = calculateEndTime(
        dto.slotStartTime,
        totalDurationMinutes,
      );

      // STORE OLD VALUES FOR EMAIL
      const oldDate = booking.bookingDate;
      const oldTime = booking.slotStartTime;

      booking.bookingDate = bookingDate;
      booking.slotStartTime = new Date(dto.slotStartTime);
      booking.slotEndTime = slotEndTime;

      booking.bookingStatus = BookingStatus.CONFIRMED;
      booking.isRescheduled = true;
      booking.rescheduledAt = new Date();

      await booking.save({ session });

      // Cancel old StaffAllocation and create new one
      await this.staffAllocationModel.updateMany(
        { serviceBookingId: booking._id },
        { $set: { status: StaffAllocationStatus.CANCELLED } },
        { session }
      );

      await this.staffAllocationModel.create(
        [
          {
            staffId: booking.staffId,
            serviceProviderId: booking.providerId,
            serviceBookingId: booking._id,
            bookingDate: bookingDate,
            slotStartTime: dto.slotStartTime,
            slotEndTime: slotEndTime,
            status: StaffAllocationStatus.CONFIRMED,
            allocationType: AllocationType.SERVICE_BOOKING,
          }
        ],
        { session }
      );

      await session.commitTransaction();

      // 🔥 NON-BLOCKING EMAIL (AFTER COMMIT)
      safeSendMail(
        '', // user email (fetch user if needed)
        'Booking Rescheduled - WakeUp MakeUp',
        bookingRescheduledTemplate('', {
          serviceTitle: booking.items?.[0]?.serviceName || 'Service',
          providerName: 'Provider Name',
          oldDate: new Date(oldDate).toDateString(),
          oldTime: oldTime.toISOString(),
          newDate: booking.bookingDate.toDateString(),
          newTime: booking.slotStartTime.toISOString(),
          bookingId: booking._id.toString(),
        }),
      ).then((res) => {
        if (!res.success) {
          console.log('Reschedule email failed but booking is safe');
        }
      });

      return ApiResponse.success(
        'Booking rescheduled successfully',
        booking,
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async confirmBooking(providerId: string, bookingId: string) {
    const booking = await this.serviceBookingModel.findById(bookingId).populate('items.serviceId');

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Optional: check if the providerId matches booking.providerId if needed

    if (booking.bookingStatus !== BookingStatus.PENDING && booking.bookingStatus !== ('RESCHEDULED' as any)) {
      throw new BadRequestException(`Cannot confirm booking from status ${booking.bookingStatus}`);
    }

    booking.bookingStatus = BookingStatus.CONFIRMED;
    await booking.save();

    // Send confirmation email
    const user = await this.userModel.findById(booking.userId);
    if (user && user.email) {
      try {
        const serviceTitle = booking.items?.[0]?.serviceName || 'a service';
        const html = `
          <h2>Booking Confirmed!</h2>
          <p>Hi ${user.name || 'User'},</p>
          <p>Great news! Your booking for <b>${serviceTitle}</b> has been confirmed by the provider.</p>
          <p>Date: ${new Date(booking.bookingDate).toLocaleDateString()}</p>
          <p>Time: ${booking.slotStartTime} - ${booking.slotEndTime}</p>
          <p>Thank you for booking with us!</p>
        `;
        await sendMail(user.email, 'Your Booking is Confirmed', html);
      } catch (err) {
        console.error('Failed to send confirmation email:', err);
      }
    }

    return ApiResponse.success('Booking confirmed successfully', booking);
  }

  async getUserBookingHistory(
    userId: string,
    status?: string,
    startDateStr?: string,
    endDateStr?: string
  ) {
    const filter: any = { userId: new Types.ObjectId(userId) };

    if (status) {
      filter.bookingStatus = status;
    }

    // Default to last 1 month if no dates provided
    let start = new Date();
    start.setMonth(start.getMonth() - 1);
    let end = new Date();

    if (startDateStr) {
      start = new Date(startDateStr);
    }
    if (endDateStr) {
      end = new Date(endDateStr);
    }

    // Set end of day for the end date to include the whole day
    end.setHours(23, 59, 59, 999);

    filter.bookingDate = {
      $gte: start,
      $lte: end,
    };


    const bookings = await this.serviceBookingModel
      .find(filter)
      .populate('providerId', 'businessName address phone')
      .populate('items.serviceId', 'title description offeredPrice sellingPrice')
      .populate('staffId', 'name')
      .sort({ bookingDate: -1 })
      .lean();

    // Fetch all reviews by this user for the fetched bookings
    const bookingIds = bookings.map(b => b._id);
    const reviews = await this.reviewModel.find({
      userId: new Types.ObjectId(userId),
      bookingId: { $in: bookingIds }
    }).populate('images', 'url _id').lean();

    // Group reviews by bookingId
    const reviewsByBooking = reviews.reduce((acc, review) => {
      const bId = review.bookingId.toString();
      if (!acc[bId]) acc[bId] = [];
      acc[bId].push(review);
      return acc;
    }, {} as any);

    const enrichedBookings = bookings.map(booking => {
      const bId = booking._id.toString();
      const bookingReviews = reviewsByBooking[bId] || [];
      return {
        ...booking,
        isReviewed: bookingReviews.length > 0,
        reviews: bookingReviews
      };
    });

    return ApiResponse.success('Booking history fetched successfully', enrichedBookings);
  }

  async updateServiceBooking(providerId: string, serviceBookingId: string, bookingStatus?: BookingStatus, paymentStatus?: BookingPaymentStatus) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();


      const booking = await this.serviceBookingModel.findOne({
        _id: new Types.ObjectId(serviceBookingId),
        providerId: new Types.ObjectId(providerId)
      }).session(session);

      if (!booking) {
        throw new NotFoundException('Service Booking not found');
      }

      if (bookingStatus) {
        booking.bookingStatus = bookingStatus;
      }
      if (paymentStatus) {
        booking.paymentStatus = paymentStatus;
      }

      if (bookingStatus === BookingStatus.CANCELLED) {
        if (booking.walletAmountUsed && booking.walletAmountUsed > 0 && (!booking.walletRefundedAmount || booking.walletRefundedAmount === 0)) {
          await this.userWalletService.addBalance(
            booking.userId.toString(),
            booking.walletAmountUsed,
            WalletTransactionReason.REFUND,
            `Refund for cancelled Service Booking`,
            session
          );
          booking.walletRefundedAmount = booking.walletAmountUsed;
          booking.paymentStatus = BookingPaymentStatus.REFUNDED;

          await this.paymentTransactionModel.create(
            [
              {
                customerId: booking.userId,
                referenceType: ReferenceType.BOOKING,
                referenceId: booking._id,
                paymentMode: PaymentMode.ONLINE,
                paymentMethod: TransactionPaymentMethod.WALLET,
                amount: booking.walletAmountUsed,
                status: TransactionStatus.REFUNDED,
              }
            ],
            { session }
          );
        }

        await this.staffAllocationModel.updateMany(
          { serviceBookingId: booking._id },
          { $set: { status: StaffAllocationStatus.CANCELLED } },
          { session }
        );
      }

      await booking.save({ session });

      // Check if eligible for cashback
      if (
        booking.bookingStatus === BookingStatus.COMPLETED &&
        booking.paymentStatus === BookingPaymentStatus.PAID &&
        !booking.paymentMeta?.cashbackAwarded
      ) {
        const slabs = await this.cashbackSlabModel.find({ isActive: true }).sort({ minValue: -1 }).session(session);
        let awardedCashback = 0;

        for (const slab of slabs) {
          if (booking.totalAmount >= slab.minValue && booking.totalAmount <= slab.maxValue) {
            if (slab.cashbackType === CashbackType.PERCENTAGE) {
              awardedCashback = (booking.totalAmount * slab.cashbackValue) / 100;
            } else {
              awardedCashback = slab.cashbackValue;
            }
            if (slab.maxCashback > 0 && awardedCashback > slab.maxCashback) {
              awardedCashback = slab.maxCashback;
            }
            break;
          }
        }

        if (awardedCashback > 0) {
          await this.userWalletService.addBalance(
            booking.userId.toString(),
            awardedCashback,
            WalletTransactionReason.CASHBACK,
            `Cashback for Service Booking ${booking._id}`,
            session
          );

          await this.serviceBookingModel.findByIdAndUpdate(
            booking._id,
            { $set: { 'paymentMeta.cashbackAwarded': true } },
            { session }
          );
        }
      }

      if (
        booking.bookingStatus === BookingStatus.COMPLETED &&
        booking.paymentStatus === BookingPaymentStatus.PAID &&
        !(booking as any).isSettled
      ) {
        // ── Resolve commission from admin schema ───────────────────────────
        const DEFAULT_COMMISSION_RATE = 25;
        const DEFAULT_COMMISSION_ON = CommissionOn.PROFITVALUE;

        const commissionDoc = await this.commissionRateModel.findOne().session(session);
        const providerSlab = commissionDoc?.commissions?.find(
          (s) => s.entityType === CommissionEntityType.SERVICE_PROVIDER,
        );

        const commissionRate =
          providerSlab?.commissionPercentage ?? DEFAULT_COMMISSION_RATE;
        const commissionOn =
          providerSlab?.commissionOn ?? DEFAULT_COMMISSION_ON;

        const totalAmount = booking.totalAmount;
        let commissionBase: number;
        if (commissionOn === CommissionOn.PROFITVALUE) {
          const totalCostPrice = booking.items.reduce(
            (sum, item) => sum + (item.costPrice || 0),
            0,
          );
          commissionBase = Math.max(0, totalAmount - totalCostPrice);
        } else {
          commissionBase = totalAmount;
        }

        const platformCommissionAmount = parseFloat(
          ((commissionBase * commissionRate) / 100).toFixed(2),
        );
        const providerPayoutAmount = parseFloat(
          (totalAmount - platformCommissionAmount).toFixed(2),
        );

        await this.serviceBookingModel.findByIdAndUpdate(
          booking._id,
          {
            $set: {
              platformCommissionRate: commissionRate,
              platformCommissionOn: commissionOn,
              platformCommissionAmount,
              providerPayoutAmount,
              isSettled: true,
            },
          },
          { session },
        );

        const providerDetails = await this.providerModel.findById(new Types.ObjectId(booking.providerId)).session(session);

        if (!providerDetails) {
          throw new NotFoundException("Provider Not found")
        }

        await this.marketplaceEarningModel.create([{
          userId: new Types.ObjectId(providerDetails.userId),
          role: EarningRole.SERVICE_PROVIDER,
          referenceType: EarningReferenceType.BOOKING,
          referenceId: booking._id,
          grossAmount: totalAmount,
          netAmount: providerPayoutAmount > 0 ? providerPayoutAmount : 0,
          platformCommission: platformCommissionAmount,
          tax: 0,
          deduction: platformCommissionAmount,
          status: EarningStatus.PENDING
        }], { session });
      }

      if (booking.bookingStatus === BookingStatus.COMPLETED && booking.paymentStatus === BookingPaymentStatus.PAID) {
        await this.affiliateTrackingService.updateCommissionStatus(booking._id, 'SERVICE', 'PAID');
      }

      await session.commitTransaction();

      if (bookingStatus || paymentStatus) {
        await this.notificationService.sendNotification({
          receiverId: booking.userId.toString(),
          title: 'Booking Status Updated',
          body: `Your service booking status has been updated.`,
          moduleType: NotificationModuleType.SERVICE_BOOKINGS,
          type: NotificationType.SYSTEM,
          priority: NotificationPriority.HIGH
        });
      }

      return ApiResponse.success('Service Booking updated successfully', booking);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getProviderBookings(
    providerId: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
  ) {
    const filter: any = { providerId: new Types.ObjectId(providerId) };

    if (status) {
      filter.bookingStatus = status;
    }

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      this.serviceBookingModel
        .find(filter)
        .populate('userId', 'name email phone avatar')
        .populate('staffId', 'name')
        .populate('items.serviceId', 'title')
        .sort({ bookingDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.serviceBookingModel.countDocuments(filter),
    ]);

    return ApiResponse.success('Provider bookings fetched successfully', {
      bookings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  async getAdminBookings(
    page: number = 1,
    limit: number = 10,
    status?: string,
    providerId?: string,
  ) {
    const filter: any = {};

    if (status) {
      filter.bookingStatus = status;
    }

    if (providerId) {
      filter.providerId = new Types.ObjectId(providerId);
    }

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      this.serviceBookingModel
        .find(filter)
        .populate('userId', 'name email phone avatar')
        .populate('providerId', 'businessName phone')
        .populate('staffId', 'name')
        .populate('items.serviceId', 'title')
        .sort({ bookingDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.serviceBookingModel.countDocuments(filter),
    ]);

    return ApiResponse.success('Admin bookings fetched successfully', {
      bookings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  async getBookingDetails(bookingId: string, user: any) {
    const booking = await this.serviceBookingModel
      .findById(bookingId)
      .populate('userId', 'name email phone avatar')
      .populate('providerId', 'businessName phone address email logo')
      .populate('staffId', 'name phone avatar')
      .populate('items.serviceId', 'title description durationMinutes images')
      .lean();

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Access control check
    if (user.role === UserRole.USER && booking.userId?._id?.toString() !== user._id.toString()) {
      throw new BadRequestException('You are not authorized to view this booking');
    }

    if (user.role === UserRole.SERVICE_PROVIDER && booking.providerId?._id?.toString() !== user.serviceProviderId?.toString()) {
      throw new BadRequestException('You are not authorized to view this booking');
    }

    const reviews = await this.reviewModel.find({ bookingId: new Types.ObjectId(bookingId) }).populate('images', 'url _id').lean();

    return ApiResponse.success('Booking details fetched successfully', {
      ...booking,
      reviews,
      isReviewed: reviews.length > 0
    });
  }
}
