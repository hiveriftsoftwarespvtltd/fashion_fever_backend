import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InjectConnection,
  InjectModel,
  MongooseModule,
} from '@nestjs/mongoose';
import { Vendor, VendorDocument } from './schema/vendor.schema';
import { Model, Types } from 'mongoose';
import { createVendorDTO } from './dto/create-vendor.dto';
import { DashboardFilterDTO } from './dto/vendor-analytics.dto';
import { User, UserDocument, UserRole, RoleStatus } from 'src/user/schema/user.schema';
import { ApiResponse } from 'src/common/responses/api-response';
import { notifyAdmins } from 'src/utils/helper';
import { adminPendingRequestNotificationTemplate } from 'src/utils/email.template';
import { DocumentService } from 'src/document/document.service';
import { updateVendorDTO } from './dto/update-vendor-dto';
import { Product, ProductDocument } from 'src/product/schema/product.schema';
import { Category, CategoryDocument } from 'src/product/schema/category.schema';
import {
  ProductVariant,
  ProductVariantDocument,
} from 'src/product/schema/product-variant.schema';
import {
  Order,
  OrderDocument,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
} from 'src/order/schema/order.schema';
import { UpdateOrderDTO } from './dto/order.dto';
import {
  VendorOrder,
  VendorOrderDocument,
} from 'src/order/schema/vendor-order.schema';
import {
  VendorShipment,
  VendorShipmentDocument,
} from 'src/order/schema/vendor-shipment.schema';
import { Connection } from 'mongoose';
import {
  CommissionStatus,
  InfluencerCommission,
  InfluencerCommissionDocument,
} from 'src/influencer/schema/influencer-commision-rate.schema';
import {
  Influencer,
  InfluencerDocument,
} from 'src/influencer/schema/influencer.schema';
import { UserWalletService } from 'src/wallet/service/user/user.wallet.service';
import { CashbackSlab, CashbackSlabDocument, CashbackType } from 'src/wallet/schema/cashback/cashbacks.slabs.schema';
import { WalletTransactionReason } from 'src/wallet/schema/user/user.wallet.transactions';

import {
  CommissionRate,
  CommissionRateDocument,
  CommissionEntityType,
  CommissionOn,
} from 'src/admin/schema/commission-rate.schema';
import { AffiliateTrackingService } from 'src/influencer/affiliate-tracking.service';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationModuleType, NotificationType, NotificationPriority } from 'src/notification/schema/notification.schema';
import { MarketplaceEarning, MarketplaceEarningDocument, EarningRole, EarningReferenceType, EarningStatus } from 'src/payout/schema/market-place-earning.schema';
import { PaymentTransaction, PaymentTransactionDocument, TransactionStatus as PayoutTransactionStatus, ReferenceType as PayoutReferenceType, PaymentMode as PayoutPaymentMode, PaymentMethod as PayoutPaymentMethod } from 'src/payout/schema/payment-transaction.schema';
import { CancelledByEntity } from 'src/order/schema/vendor-order.schema';
import { DeliveryPerson, DeliveryPersonDocument, DeliveryPersonStatus } from 'src/quick-e-commerce/schema/delivery-person.schema';

@Injectable()
export class VendorService {
  constructor(
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(ProductVariant.name)
    private productVariantModel: Model<ProductVariantDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(VendorOrder.name)
    private vendorOrderModel: Model<VendorOrderDocument>,
    @InjectModel(VendorShipment.name)
    private shipmentModel: Model<VendorShipmentDocument>,
    @InjectModel(Influencer.name)
    private influencerModel: Model<InfluencerDocument>,
    @InjectModel(InfluencerCommission.name)
    private influencerCommisionModel: Model<InfluencerCommissionDocument>,
    @InjectModel(CashbackSlab.name)
    private cashbackSlabModel: Model<CashbackSlabDocument>,
    @InjectModel(CommissionRate.name)
    private commissionRateModel: Model<CommissionRateDocument>,
    @InjectConnection() private readonly connection: Connection,
    private documentService: DocumentService,
    private userWalletService: UserWalletService,
    private affiliateTrackingService: AffiliateTrackingService,
    private notificationService: NotificationService,
    @InjectModel(MarketplaceEarning.name) private marketplaceEarningModel: Model<MarketplaceEarningDocument>,
    @InjectModel(PaymentTransaction.name) private paymentTransactionModel: Model<PaymentTransactionDocument>,
    @InjectModel(DeliveryPerson.name) private deliveryPersonModel: Model<DeliveryPersonDocument>,
  ) { }

  async registerVendor(
    dto: createVendorDTO,
    userId: string,
    files: { banner?: any[]; logo?: any[] },
  ) {
    const isOwnerExist = await this.vendorModel.findOne({ ownerId: userId });
    if (isOwnerExist) {
      throw new BadRequestException('This Owner Already Exist with a Vendor');
    }

    const isUnique = await this.vendorModel.findOne({
      $or: [
        { businessName: dto.businessName.trim() },
        { slug: dto.slug.toLowerCase().trim() },
      ],
    });

    if (isUnique) {
      throw new ConflictException(
        'Businessname or Slug already should be unique',
      );
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    console.log("User status in line 127", user.roleStatus)
    if (user.roleStatus.get(UserRole.VENDOR) !== RoleStatus.NOT_ONBOARDED) {
      throw new BadRequestException('You need to register as vendor');
    }

    const vendor = await this.vendorModel.create({
      ownerId: userId,
      businessName: dto.businessName,
      slug: dto.slug.toLowerCase().trim(),
      vendorPincode: dto.vendorPincode,
      city: dto.city,
      state: dto.state,
    });

    let bannerImageId: any;
    let logoImageId: any;

    if (files?.banner?.length) {
      const uploadedBanner = await this.documentService.upload(
        files.banner[0],
        'vendor',
        userId,
        String(vendor._id),
      );
      bannerImageId = uploadedBanner._id;
    }
    if (files?.logo?.length) {
      const uploadedLogo = await this.documentService.upload(
        files.logo[0],
        'vendor',
        userId,
        String(vendor._id),
      );
      logoImageId = uploadedLogo._id;
    }

    vendor.logo = logoImageId;
    vendor.banner = bannerImageId;
    await vendor.save();

    user.vendorId = vendor._id;
    user.isVendorOnboardingCompleted = true;
    user.roleStatus.set(UserRole.VENDOR, RoleStatus.PENDING);
    await user.save();

    await notifyAdmins(
      this.userModel,
      'New Vendor Onboarding Request',
      adminPendingRequestNotificationTemplate('Vendor', user.name, user.email, {
        BusinessName: vendor.businessName,
        City: vendor.city,
        State: vendor.state,
      })
    );

    return ApiResponse.success('Vendor Request created successfully', vendor);
  }

  async getAllVendors() {
    return await this.vendorModel.find().lean();
  }

  async getVendorDetails(userId: string, vendorId: string) {
    if (!vendorId) {
      throw new ConflictException(
        'Complete you onboarding to access this feature',
      );
    }
    return await this.vendorModel.findById(vendorId).lean();
  }

  async updateVendorDetails(
    dto: updateVendorDTO,
    userId: string,
    vendorId: string,
    files: {
      banner?: any[];
      logo?: any[];
    },
  ) {
    const vendor = await this.vendorModel.findOne({
      ownerId: userId,
      _id: vendorId,
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (dto.businessName !== undefined && dto.businessName.trim() !== '') {
      const businessName = dto.businessName.trim();

      const existingBusiness = await this.vendorModel.findOne({
        businessName,
        _id: { $ne: vendorId },
      });

      if (existingBusiness) {
        throw new ConflictException('Business name already exists');
      }

      vendor.businessName = businessName;
    }

    if (dto.slug !== undefined && dto.slug.trim() !== '') {
      const slug = dto.slug.toLowerCase().trim();

      const existingSlug = await this.vendorModel.findOne({
        slug,
        _id: { $ne: vendorId },
      });

      if (existingSlug) {
        throw new ConflictException('Slug already exists');
      }

      vendor.slug = slug;
    }

    if (dto.description !== undefined && dto.description.trim() !== '') {
      vendor.description = dto.description.trim();
    }

    if (dto.address !== undefined && dto.address.trim() !== '') {
      vendor.address = dto.address.trim();
    }

    if (dto.phone !== undefined && dto.phone.trim() !== '') {
      vendor.phone = dto.phone.trim();
    }

    if (dto.email !== undefined && dto.email.trim() !== '') {
      vendor.email = dto.email.trim().toLowerCase();
    }

    if (files?.banner?.length) {
      if (vendor.banner) {
        await this.documentService.replace(
          String(vendor.banner),
          files.banner[0],
        );
      } else {
        /*
        CREATE NEW BANNER
      */
        const uploadedBanner = await this.documentService.upload(
          files.banner[0],
          'vendors/banner',
          userId,
          vendorId,
        );

        vendor.banner = uploadedBanner._id;
      }
    }

    if (files?.logo?.length) {
      if (vendor.logo) {
        await this.documentService.replace(String(vendor.logo), files.logo[0]);
      } else {
        const uploadedLogo = await this.documentService.upload(
          files.logo[0],
          'vendors/logo',
          userId,
          vendorId,
        );

        vendor.logo = uploadedLogo._id;
      }
    }

    await vendor.save();

    return ApiResponse.success('Vendor updated successfully', vendor);
  }

  async vendorProducts(userId: string, vendorId: string, page?: number, limit?: number) {
    if (!vendorId) {
      throw new ConflictException(
        'Complete Your Onboarding to access this feature',
      );
    }

    const pageNumber = Number(page) || 1;
    const pageSize = Number(limit) || 10;
    const skip = (pageNumber - 1) * pageSize;

    return await this.productModel
      .find({ createdBy: userId, vendorId: vendorId })
      .populate('variants')
      .skip(skip)
      .limit(pageSize)
      .lean();
  }

  async vendorCategories(userId: string, vendorId: string) {
    if (!vendorId) {
      throw new ConflictException(
        'Complete Your Onboarding to access this feature',
      );
    }
    return await this.categoryModel
      .find({ ownerId: userId, vendorId })
      .populate('image')
      .lean();
  }


  async vendorOrders(vendorId: string, page?: number, limit?: number) {
    const pageNumber = Number(page) || 1;
    const pageSize = Number(limit) || 10;
    const skip = (pageNumber - 1) * pageSize;

    const orders = await this.vendorOrderModel
      .find({
        vendorId: new Types.ObjectId(vendorId),
      })
      .populate('userId', '-password')
      .populate('vendorId')
      .populate('orderId')
      .populate('shipment')
      .populate('items.productId')
      .populate('items.variantId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    return ApiResponse.success('Vendor Orders Fetched Successfully', orders);
  }

  async orderDetails(vendorId: string, orderId: string) {
    const order = await this.vendorOrderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        vendorId: new Types.ObjectId(vendorId),
      })
      .populate('userId', '-password')
      .populate('vendorId')
      .populate('orderId')
      .populate('shipment')
      .populate('items.productId')
      .populate('items.variantId')
      .lean();

    if (!order) {
      throw new NotFoundException('Order Not Found');
    }

    return ApiResponse.success('Order Details Fetched Successfully', order);
  }



  async updateOrder(dto: UpdateOrderDTO, orderId: string, vendorId: string, userId?: string) {
    const session = await this.connection.startSession();

    try {
      session.startTransaction();

      // ======================================================
      // FIND VENDOR ORDER
      // ======================================================

      const vendorOrder = await this.vendorOrderModel.findOne({
        _id: new Types.ObjectId(orderId),
        vendorId: new Types.ObjectId(vendorId),
      });

      if (!vendorOrder) {
        throw new NotFoundException('Vendor Order Not Found');
      }

      // ======================================================
      // PREVENT UPDATE AFTER DELIVERED
      // ======================================================

      if (vendorOrder.orderStatus === OrderStatus.DELIVERED) {
        throw new ConflictException('Delivered order cannot be updated');
      }

      // ======================================================
      // CLEAN DTO
      // ======================================================

      const filteredData = Object.fromEntries(
        Object.entries(dto).filter(
          ([_, value]) => value !== undefined && value !== null && value !== '',
        ),
      );

      Object.assign(vendorOrder, filteredData);

      // ======================================================
      // DELIVERED
      // ======================================================

      if (dto.orderStatus === OrderStatus.DELIVERED) {
        vendorOrder.orderStatus = OrderStatus.DELIVERED;

        vendorOrder.deliveredAt = dto.deliveredAt
          ? new Date(dto.deliveredAt)
          : new Date();
      }

      // ======================================================
      // SHIPPED
      // ======================================================

      if (dto.orderStatus === OrderStatus.SHIPPED) {
        vendorOrder.orderStatus = OrderStatus.SHIPPED;

        vendorOrder.shippedAt = new Date();
      }

      // ======================================================
      // CANCELLED
      // ======================================================

      if (dto.orderStatus === OrderStatus.CANCELLED) {
        if (!dto.cancellationReason) {
          throw new ConflictException('Provide cancellation reason');
        }

        vendorOrder.orderStatus = OrderStatus.CANCELLED;

        vendorOrder.cancelledAt = dto.cancelledAt
          ? new Date(dto.cancelledAt)
          : new Date();

        vendorOrder.cancellationReason = dto.cancellationReason;

        if (userId) {
          vendorOrder.cancelledBy = new Types.ObjectId(userId);
          vendorOrder.cancelledByEntity = CancelledByEntity.VENDOR;
        }

        const mainOrder = await this.orderModel.findById(vendorOrder.orderId).session(session);
        if (mainOrder) {
          let refundAmount = 0;
          if (mainOrder.walletAmountUsed && mainOrder.walletAmountUsed > 0) {
            const alreadyRefunded = mainOrder.walletRefundedAmount || 0;
            const remainingToRefund = mainOrder.walletAmountUsed - alreadyRefunded;
            if (remainingToRefund > 0) {
              const vendorShareRatio = mainOrder.grandTotal > 0 ? (vendorOrder.grandTotal / mainOrder.grandTotal) : 0;
              let calculatedRefund = Math.round(mainOrder.walletAmountUsed * vendorShareRatio * 100) / 100;
              if (calculatedRefund > remainingToRefund) {
                calculatedRefund = remainingToRefund;
              }
              refundAmount = calculatedRefund;

              if (refundAmount > 0) {
                await this.userWalletService.addBalance(
                  mainOrder.userId.toString(),
                  refundAmount,
                  WalletTransactionReason.REFUND,
                  `Partial refund for cancelled Vendor Order in ${mainOrder.orderNumber}`,
                  session
                );

                mainOrder.walletRefundedAmount = alreadyRefunded + refundAmount;
                if (mainOrder.walletRefundedAmount >= mainOrder.walletAmountUsed) {
                  mainOrder.paymentStatus = PaymentStatus.REFUNDED;
                }
                await mainOrder.save({ session });

                await this.paymentTransactionModel.create([{
                  customerId: mainOrder.userId,
                  referenceType: PayoutReferenceType.ORDER,
                  referenceId: mainOrder._id,
                  paymentMode: PayoutPaymentMode.ONLINE,
                  paymentMethod: PayoutPaymentMethod.WALLET,
                  amount: refundAmount,
                  status: PayoutTransactionStatus.REFUNDED
                }], { session });
              }
            }
          }

          const itemsCancelled = vendorOrder.items.map((i: any) => i.productName).join(', ');
          const notificationDesc = `Order ${mainOrder.orderNumber} partially cancelled. Items cancelled: ${itemsCancelled}. Amount refunded: ${refundAmount > 0 ? refundAmount : 'None'}.`;

          await this.notificationService.sendNotification({
            title: `Order partially cancelled`,
            body: notificationDesc,
            receiverId: mainOrder.userId.toString(),
            type: NotificationType.TRANSACTIONAL,
            priority: NotificationPriority.HIGH,
            moduleType: NotificationModuleType.ORDER,
            data: {
              orderId: mainOrder._id,
              cancellationReason: dto.cancellationReason,
              cancelledByEntity: CancelledByEntity.VENDOR
            }
          });
        }
      }

      // ======================================================
      // PAYMENT STATUS
      // ======================================================

      if (dto.paymentStatus) {
        vendorOrder.paymentStatus = dto.paymentStatus;
      }

      // ======================================================
      // SETTLE VENDOR WALLET
      // ======================================================

      if (
        vendorOrder.orderStatus === OrderStatus.DELIVERED &&
        vendorOrder.paymentStatus === PaymentStatus.PAID &&
        !vendorOrder.isVendorSettled
      ) {
        const influencerComm = await this.influencerCommisionModel.findOne({
          vendorOrderId: vendorOrder._id,
        });

        if (influencerComm && influencerComm.commissionAmount) {
          vendorOrder.influencerCommissionAmount = influencerComm.commissionAmount;
        }

        // ── Resolve commission rate from admin schema ──────────────────
        const DEFAULT_COMMISSION_RATE = 25;
        const DEFAULT_COMMISSION_ON = CommissionOn.PROFITVALUE;

        const commissionDoc = await this.commissionRateModel.findOne().session(session);

        const vendorSlab = commissionDoc?.commissions?.find(
          (s) => s.entityType === CommissionEntityType.VENDOR,
        );

        const commissionRate = vendorSlab?.commissionPercentage ?? DEFAULT_COMMISSION_RATE;
        const commissionOn = vendorSlab?.commissionOn ?? DEFAULT_COMMISSION_ON;

        // ── Compute payout based on commissionOn ──────────────────────
        let commissionBase: number;
        if (commissionOn === CommissionOn.PROFITVALUE) {
          // grossProfit = finalOrderAmount - costPrice
          commissionBase = vendorOrder.grossProfit ?? 0;
        } else {
          // SALE_VALUE → commission on the final order amount (grandTotal - shipping - cod)
          commissionBase = vendorOrder.grandTotal - (vendorOrder.shippingCharge ?? 0) - (vendorOrder.codCharge ?? 0);
        }

        const platformCommissionAmount = parseFloat(((commissionBase * commissionRate) / 100).toFixed(2));

        // payout = sale amount (excl. shipping/cod) minus platform commission
        const saleBase = vendorOrder.grandTotal - (vendorOrder.shippingCharge ?? 0) - (vendorOrder.codCharge ?? 0);
        const resolvedPayout = parseFloat((saleBase - platformCommissionAmount).toFixed(2));

        vendorOrder.platformCommissionRate = commissionRate;
        vendorOrder.platformCommissionOn = commissionOn;
        vendorOrder.platformCommissionAmount = platformCommissionAmount;
        vendorOrder.payoutAmount = resolvedPayout > 0 ? resolvedPayout : 0;
        vendorOrder.isVendorSettled = true;
        vendorOrder.vendorSettledAt = new Date();

        const deductionAmount = (vendorOrder.shippingCharge ?? 0) + (vendorOrder.codCharge ?? 0) + vendorOrder.platformCommissionAmount + (vendorOrder.influencerCommissionAmount ?? 0);

        await this.marketplaceEarningModel.create([{
          userId: new Types.ObjectId(userId),
          role: EarningRole.VENDOR,
          referenceType: EarningReferenceType.ORDER,
          referenceId: vendorOrder._id,
          grossAmount: vendorOrder.grandTotal || vendorOrder.payoutAmount,
          netAmount: vendorOrder.payoutAmount,
          platformCommission: vendorOrder.platformCommissionAmount || 0,
          tax: vendorOrder.tax || 0,
          deduction: deductionAmount,
          status: EarningStatus.PENDING
        }], { session });
      }

      // ======================================================
      // SAVE VENDOR ORDER
      // ======================================================

      await vendorOrder.save({
        session,
      });

      // ======================================================
      // UPDATE INFLUENCER COMMISSION
      // ======================================================

      const influencerCommission = await this.influencerCommisionModel.findOne({
        vendorOrderId: vendorOrder._id,
      });

      if (influencerCommission) {
        // ------------------------------------------
        // DELIVERED + PAID
        // ------------------------------------------

        if (
          vendorOrder.orderStatus === OrderStatus.DELIVERED &&
          vendorOrder.paymentStatus === PaymentStatus.PAID
        ) {
          // prevent duplicate updates
          if (!influencerCommission.isDelivered) {
            influencerCommission.isDelivered = true;

            influencerCommission.deliveredAt = new Date();

            influencerCommission.status = CommissionStatus.APPROVED;

            await influencerCommission.save({
              session,
            });

            // update influencer stats
            await this.influencerModel.findByIdAndUpdate(
              influencerCommission.influencerId,
              {
                $inc: {
                  totalSales: influencerCommission.finalOrderAmount,

                  totalOrders: 1,
                },
              },
              { session },
            );

            if (influencerCommission.commissionAmount && influencerCommission.commissionAmount > 0) {
              await this.marketplaceEarningModel.create([{
                userId: new Types.ObjectId(influencerCommission.influencerId.toString()), // the user id for the influencer
                role: EarningRole.INFLUENCER,
                referenceType: EarningReferenceType.ORDER,
                referenceId: vendorOrder._id,
                grossAmount: influencerCommission.commissionAmount,
                netAmount: influencerCommission.commissionAmount,
                platformCommission: 0,
                tax: 0,
                deduction: 0,
                status: EarningStatus.PENDING
              }], { session });
            }
          }
        }

        // ------------------------------------------
        // CANCELLED
        // ------------------------------------------

        if (vendorOrder.orderStatus === OrderStatus.CANCELLED) {
          influencerCommission.status = CommissionStatus.CANCELLED;

          influencerCommission.notes =
            dto.cancellationReason || 'Vendor order cancelled';

          await influencerCommission.save({
            session,
          });
        }
      }

      // ======================================================
      // FETCH ALL RELATED VENDOR ORDERS
      // ======================================================

      const allVendorOrders = await this.vendorOrderModel
        .find({
          orderId: vendorOrder.orderId,
        })
        .session(session);

      // ======================================================
      // STATUS CHECKS
      // ======================================================

      const allDelivered = allVendorOrders.every(
        (item) => item.orderStatus === OrderStatus.DELIVERED,
      );

      const someDelivered = allVendorOrders.some(
        (item) => item.orderStatus === OrderStatus.DELIVERED,
      );

      const allCancelled = allVendorOrders.every(
        (item) => item.orderStatus === OrderStatus.CANCELLED,
      );

      const someCancelled = allVendorOrders.some(
        (item) => item.orderStatus === OrderStatus.CANCELLED,
      );

      const allPaid = allVendorOrders.every(
        (item) => item.paymentStatus === PaymentStatus.PAID,
      );

      // ======================================================
      // PREPARE MAIN ORDER UPDATE
      // ======================================================

      const mainOrderUpdate: any = {};

      // ------------------------------------------
      // ORDER STATUS
      // ------------------------------------------

      const allShipped = allVendorOrders.every(
        (item) => item.orderStatus === OrderStatus.SHIPPED || item.orderStatus === OrderStatus.DELIVERED,
      );

      const someShipped = allVendorOrders.some(
        (item) => item.orderStatus === OrderStatus.SHIPPED,
      );

      if (allDelivered) {
        mainOrderUpdate.orderStatus = OrderStatus.DELIVERED;
      } else if (allCancelled) {
        mainOrderUpdate.orderStatus = OrderStatus.CANCELLED;
      } else if (someDelivered && someCancelled) {
        mainOrderUpdate.orderStatus = OrderStatus.PARTIALLY_DELIVERED;
      } else if (someDelivered) {
        mainOrderUpdate.orderStatus = OrderStatus.PARTIALLY_DELIVERED;
      } else if (someCancelled) {
        mainOrderUpdate.orderStatus = OrderStatus.PARTIALLY_CANCELLED;
      } else if (allShipped || someShipped) {
        mainOrderUpdate.orderStatus = OrderStatus.SHIPPED;
      }

      if (dto.trackingId) {
        mainOrderUpdate.trackingId = dto.trackingId;
      }

      if (allPaid) {
        mainOrderUpdate.paymentStatus = PaymentStatus.PAID;
      }

      // ------------------------------------------
      // AGGREGATE AMOUNTS FOR MAIN ORDER
      // ------------------------------------------
      if (allDelivered && allPaid) {
        let totalPlatformCommissionAmount = 0;
        let totalInfluencerCommissionAmount = 0;
        let totalTax = 0;
        let platformCommissionRate = 0;
        let influencerCommissionRate = 0;

        for (const vo of allVendorOrders) {
          totalPlatformCommissionAmount += vo.platformCommissionAmount || 0;
          totalInfluencerCommissionAmount += vo.influencerCommissionAmount || 0;
          totalTax += vo.tax || 0;
          if (vo.platformCommissionRate) platformCommissionRate = vo.platformCommissionRate;
          // In this system influencer commission rate is typically derived from the influencer schema/slab, 
          // but we capture the aggregate amount here.
        }

        mainOrderUpdate.platformComissionAmount = totalPlatformCommissionAmount;
        mainOrderUpdate.influencerComissionAmount = totalInfluencerCommissionAmount;
        mainOrderUpdate.tax = totalTax;

        if (platformCommissionRate > 0) {
          mainOrderUpdate.platformComissionRate = platformCommissionRate;
        }
      }

      // ======================================================
      // UPDATE MAIN ORDER
      // ======================================================

      if (Object.keys(mainOrderUpdate).length > 0) {
        const updatedMainOrder = await this.orderModel.findByIdAndUpdate(
          vendorOrder.orderId,
          {
            $set: mainOrderUpdate,
          },
          {
            session,
            new: true,
          },
        );

        // ======================================================
        // CASHBACK: credit user wallet for any DELIVERED + PAID order
        // ======================================================
        if (
          allDelivered &&
          updatedMainOrder &&
          updatedMainOrder.paymentStatus === PaymentStatus.PAID &&
          !updatedMainOrder.paymentMeta?.cashbackAwarded
        ) {
          const slabs = await this.cashbackSlabModel
            .find({ isActive: true })
            .sort({ minValue: -1 })
            .session(session);

          let awardedCashback = 0;

          for (const slab of slabs) {
            if (
              updatedMainOrder.grandTotal >= slab.minValue &&
              updatedMainOrder.grandTotal <= slab.maxValue
            ) {
              if (slab.cashbackType === CashbackType.PERCENTAGE) {
                awardedCashback = (updatedMainOrder.grandTotal * slab.cashbackValue) / 100;
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
              updatedMainOrder.userId.toString(),
              awardedCashback,
              WalletTransactionReason.CASHBACK,
              `Cashback for Order ${updatedMainOrder.orderNumber}`,
              session,
            );

            await this.orderModel.findByIdAndUpdate(
              updatedMainOrder._id,
              { $set: { 'paymentMeta.cashbackAwarded': true } },
              { session },
            );
          }
        }

        if (allDelivered && updatedMainOrder && updatedMainOrder.paymentStatus === PaymentStatus.PAID) {
          await this.affiliateTrackingService.updateCommissionStatus(updatedMainOrder._id, 'PRODUCT', 'PAID');
        }
      }

      // ======================================================
      // COMMIT TRANSACTION
      // ======================================================

      await session.commitTransaction();

      // Send notifications
      const mainOrder = await this.orderModel.findById(vendorOrder.orderId);
      if (mainOrder) {
        // To User
        await this.notificationService.sendNotification({
          receiverId: mainOrder.userId.toString(),
          title: 'Order Status Updated',
          body: `Your order ${vendorOrder.orderNumber} status has been updated to ${vendorOrder.orderStatus}.`,
          moduleType: NotificationModuleType.ORDER,
          type: NotificationType.SYSTEM,
          priority: NotificationPriority.HIGH
        });
      }

      // To Vendor
      const vendor = await this.vendorModel.findById(vendorId);
      if (vendor && vendor.ownerId) {
        await this.notificationService.sendNotification({
          receiverId: vendor.ownerId.toString(),
          title: 'Order Status Updated',
          body: `Order ${vendorOrder.orderNumber} status successfully updated to ${vendorOrder.orderStatus}.`,
          moduleType: NotificationModuleType.ORDER,
          type: NotificationType.SYSTEM,
          priority: NotificationPriority.HIGH
        });
      }

      return ApiResponse.success('Order Updated Successfully', vendorOrder);
    } catch (error) {
      await session.abortTransaction();

      throw error;
    } finally {
      session.endSession();
    }
  }


  // ─── Assign Rider to Standard Order ─────────────────────────────────
  async assignRiderToStandardOrder(orderId: string, vendorId: string, deliveryPersonId: string) {
    // Find the vendor order
    const vendorOrder = await this.vendorOrderModel.findOne({
      _id: new Types.ObjectId(orderId),
      vendorId: new Types.ObjectId(vendorId),
    });
    if (!vendorOrder) throw new NotFoundException('Vendor order not found');

    // Find the delivery person
    const deliveryPerson = await this.deliveryPersonModel.findOne({
      _id: new Types.ObjectId(deliveryPersonId),
      isDeleted: false,
      isActive: true,
    });
    if (!deliveryPerson) throw new BadRequestException('Delivery rider not found or inactive');

    // Assign rider
    (vendorOrder as any).deliveryPersonId = new Types.ObjectId(deliveryPersonId);
    (vendorOrder as any).deliveryStatus = 'ASSIGNED';
    vendorOrder.orderStatus = OrderStatus.SHIPPED;
    vendorOrder.shippedAt = new Date();
    await vendorOrder.save();

    // Update delivery person status
    deliveryPerson.status = DeliveryPersonStatus.ON_DELIVERY;
    await deliveryPerson.save();

    // Notify rider
    if (deliveryPerson.userId) {
      await this.notificationService.sendNotification({
        receiverId: deliveryPerson.userId.toString(),
        type: NotificationType.TRANSACTIONAL,
        priority: NotificationPriority.HIGH,
        title: 'New Standard Order Assigned',
        body: `You have been assigned a standard delivery for order #${vendorOrder.orderNumber}.`,
        moduleType: NotificationModuleType.ORDER,
      });
    }

    const populatedOrder = await this.vendorOrderModel
      .findById(vendorOrder._id)
      .populate('deliveryPersonId', 'name phone vehicleType vehicleNumber status')
      .lean();

    return ApiResponse.success('Rider assigned successfully', populatedOrder);
  }

  async deleteAllVendorProducts(vendorId: string) {
    const session = await this.productModel.db.startSession();

    try {
      session.startTransaction();

      const products = await this.productModel
        .find({
          vendorId: new Types.ObjectId(vendorId),
        })
        .session(session);

      if (!products.length) {
        throw new NotFoundException('No products found');
      }

      const productIds = products.map((product) => product._id);

      const variants = await this.productVariantModel
        .find({
          productId: { $in: productIds },
        })
        .session(session);

      const mediaIds: string[] = [];

      for (const variant of variants) {
        if (variant.thumbnail) {
          mediaIds.push(variant.thumbnail.toString());
        }

        if (variant.images?.length) {
          mediaIds.push(...variant.images.map((img) => img.toString()));
        }
      }

      await this.productVariantModel.deleteMany(
        {
          productId: { $in: productIds },
        },
        { session },
      );

      await this.productModel.deleteMany(
        {
          _id: { $in: productIds },
        },
        { session },
      );

      await session.commitTransaction();

      // Delete media after successful commit
      await Promise.allSettled(
        mediaIds.map((id) => this.documentService.deleteMedia(id)),
      );

      return ApiResponse.success('All vendor products deleted successfully');
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async overview(vendorId: string) {
    const vendorObjectId = new Types.ObjectId(vendorId);

    const [
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      revenueData,
    ] = await Promise.all([
      this.vendorOrderModel.countDocuments({
        vendorId: vendorObjectId,
      }),

      this.vendorOrderModel.countDocuments({
        vendorId: vendorObjectId,
        orderStatus: OrderStatus.PENDING,
      }),

      this.vendorOrderModel.countDocuments({
        vendorId: vendorObjectId,
        orderStatus: OrderStatus.DELIVERED,
      }),

      this.vendorOrderModel.countDocuments({
        vendorId: vendorObjectId,
        orderStatus: OrderStatus.CANCELLED,
      }),

      this.vendorOrderModel.aggregate([
        {
          $match: {
            vendorId: vendorObjectId,
            orderStatus: OrderStatus.DELIVERED,
          },
        },

        {
          $group: {
            _id: null,

            totalRevenue: {
              $sum: '$grandTotal',
            },

            grossProfit: {
              $sum: '$grossProfit',
            },

            netProfit: {
              $sum: '$netProfit',
            },

            pendingPayout: {
              $sum: {
                $cond: [
                  {
                    $eq: ['$isVendorSettled', false],
                  },
                  '$payoutAmount',
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    return ApiResponse.success('Dashboard Overview', {
      totalOrders,

      pendingOrders,

      deliveredOrders,

      cancelledOrders,

      totalRevenue: revenueData[0]?.totalRevenue || 0,

      grossProfit: revenueData[0]?.grossProfit || 0,

      netProfit: revenueData[0]?.netProfit || 0,

      pendingPayout: revenueData[0]?.pendingPayout || 0,
    });
  }

  async topSellingProducts(vendorId: string) {
    const data = await this.vendorOrderModel.aggregate([
      {
        $match: {
          vendorId: new Types.ObjectId(vendorId),
          orderStatus: OrderStatus.DELIVERED,
        },
      },

      {
        $unwind: '$items',
      },

      {
        $group: {
          _id: {
            productId: '$items.productId',
            variantId: '$items.variantId',
            productName: '$items.productName',
            sku: '$items.sku',
          },

          // total quantity sold
          totalSold: {
            $sum: '$items.quantity',
          },

          // actual customer paid amount
          revenue: {
            $sum: '$items.finalPrice',
          },

          // original selling amount before discount
          grossRevenue: {
            $sum: '$items.totalPrice',
          },

          // total discount given
          totalDiscount: {
            $sum: '$items.discountAmount',
          },

          // profit
          profit: {
            $sum: {
              $subtract: [
                '$items.finalPrice',
                {
                  $multiply: ['$items.costPrice', '$items.quantity'],
                },
              ],
            },
          },
        },
      },

      {
        $sort: {
          totalSold: -1,
        },
      },

      {
        $limit: 10,
      },
    ]);

    return ApiResponse.success('Top Selling Products', data);
  }
  async orderGraph(vendorId: string, days: number = 30) {
    const startDate = new Date();

    startDate.setDate(startDate.getDate() - days);

    const data = await this.vendorOrderModel.aggregate([
      {
        $match: {
          vendorId: new Types.ObjectId(vendorId),

          createdAt: {
            $gte: startDate,
          },
        },
      },

      {
        $group: {
          _id: {
            day: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
              },
            },
          },

          totalOrders: {
            $sum: 1,
          },

          deliveredOrders: {
            $sum: {
              $cond: [
                {
                  $eq: ['$orderStatus', OrderStatus.DELIVERED],
                },
                1,
                0,
              ],
            },
          },

          revenue: {
            $sum: '$grandTotal',
          },

          grossProfit: {
            $sum: '$grossProfit',
          },

          netProfit: {
            $sum: '$netProfit',
          },
        },
      },

      {
        $sort: {
          '_id.day': 1,
        },
      },
    ]);

    return ApiResponse.success('Order Graph Data', data);
  }

  async topCategories(vendorId: string) {
    return this.vendorOrderModel.aggregate([
      {
        $match: {
          vendorId: new Types.ObjectId(vendorId),
          orderStatus: {
            $ne: OrderStatus.CANCELLED,
          },
        },
      },

      {
        $unwind: '$items',
      },

      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product',
        },
      },

      {
        $unwind: '$product',
      },

      {
        $group: {
          _id: '$product.categoryId',

          totalSales: {
            $sum: '$items.quantity',
          },
        },
      },

      {
        $sort: {
          totalSales: -1,
        },
      },
    ]);
  }

  async orderComparison(vendorId: string) {
    const vendorObjectId = new Types.ObjectId(vendorId);

    const currentMonthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    const previousMonthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth() - 1,
      1,
    );

    const previousMonthEnd = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      0,
    );

    const [currentMonth, previousMonth] = await Promise.all([
      this.vendorOrderModel.aggregate([
        {
          $match: {
            vendorId: vendorObjectId,

            createdAt: {
              $gte: currentMonthStart,
            },
          },
        },

        {
          $group: {
            _id: null,

            totalOrders: {
              $sum: 1,
            },

            revenue: {
              $sum: '$grandTotal',
            },
          },
        },
      ]),

      this.vendorOrderModel.aggregate([
        {
          $match: {
            vendorId: vendorObjectId,

            createdAt: {
              $gte: previousMonthStart,
              $lte: previousMonthEnd,
            },
          },
        },

        {
          $group: {
            _id: null,

            totalOrders: {
              $sum: 1,
            },

            revenue: {
              $sum: '$grandTotal',
            },
          },
        },
      ]),
    ]);

    return ApiResponse.success('Order Comparison Data', {
      currentMonth: {
        totalOrders: currentMonth[0]?.totalOrders || 0,

        revenue: currentMonth[0]?.revenue || 0,
      },

      previousMonth: {
        totalOrders: previousMonth[0]?.totalOrders || 0,

        revenue: previousMonth[0]?.revenue || 0,
      },
    });
  }

  // 1. Sales Performance Chart
  async getSalesPerformance(vendorId: string, filter: DashboardFilterDTO) {
    const { startDate, endDate } = this.getDateRange(filter);

    const matchStage: any = {
      vendorId: new Types.ObjectId(vendorId),
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (filter.paymentStatus) matchStage.paymentStatus = filter.paymentStatus;
    if (filter.orderStatus) matchStage.orderStatus = filter.orderStatus;

    const data = await this.vendorOrderModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$grandTotal' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return ApiResponse.success('Sales performance fetched', data);
  }

  // 2. Top Selling Products Report
  async getTopSellingProducts(vendorId: string, filter: DashboardFilterDTO) {
    const { startDate, endDate } = this.getDateRange(filter);

    const matchStage: any = {
      vendorId: new Types.ObjectId(vendorId),
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (filter.paymentStatus) matchStage.paymentStatus = filter.paymentStatus;
    if (filter.orderStatus) matchStage.orderStatus = filter.orderStatus;

    const data = await this.vendorOrderModel.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          totalQuantitySold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    return ApiResponse.success('Top selling products fetched', data);
  }

  // 3. Percentage of Products in Sales (Pie Chart)
  async getProductSalesPercentage(vendorId: string, filter: DashboardFilterDTO) {
    const { startDate, endDate } = this.getDateRange(filter);

    const matchStage: any = {
      vendorId: new Types.ObjectId(vendorId),
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (filter.paymentStatus) matchStage.paymentStatus = filter.paymentStatus;
    if (filter.orderStatus) matchStage.orderStatus = filter.orderStatus;

    const productsAggr = await this.vendorOrderModel.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          totalQuantity: { $sum: '$items.quantity' }
        }
      }
    ]);

    const totalQuantity = productsAggr.reduce((acc, curr) => acc + curr.totalQuantity, 0);

    const data = productsAggr.map(item => ({
      ...item,
      percentage: totalQuantity ? parseFloat(((item.totalQuantity / totalQuantity) * 100).toFixed(2)) : 0
    }));

    return ApiResponse.success('Product sales percentage fetched', data);
  }

  // 4. Customer Demographics Chart
  async getCustomerDemographics(vendorId: string, filter: DashboardFilterDTO) {
    const { startDate, endDate } = this.getDateRange(filter);

    const matchStage: any = {
      vendorId: new Types.ObjectId(vendorId),
      createdAt: { $gte: startDate, $lte: endDate },
    };

    const data = await this.vendorOrderModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            city: '$shippingAddress.city',
            state: '$shippingAddress.state',
            pincode: '$shippingAddress.pincode'
          },
          orderCount: { $sum: 1 },
          uniqueCustomers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          _id: 1,
          orderCount: 1,
          customerCount: { $size: '$uniqueCustomers' }
        }
      }
    ]);

    return ApiResponse.success('Customer demographics fetched', data);
  }

  // 5. Export Vendor Orders to CSV
  async exportVendorOrders(vendorId: string, filter: DashboardFilterDTO) {
    const { startDate, endDate } = this.getDateRange(filter);

    const matchStage: any = {
      vendorId: new Types.ObjectId(vendorId),
      createdAt: { $gte: startDate, $lte: endDate },
    };

    const orders = await this.vendorOrderModel.find(matchStage)
      .populate('userId', 'name email phone')
      .lean();

    if (!orders || orders.length === 0) {
      throw new NotFoundException('No orders found for the given period');
    }

    const csvRows: any = [];
    // Header
    csvRows.push(['Order Number', 'Date', 'Customer Name', 'Customer Email', 'City', 'State', 'Order Status', 'Payment Status', 'Grand Total'].join(','));

    // Rows
    for (const order of orders) {
      const user = order.userId as any;
      csvRows.push([
        order.orderNumber,
        new Date(order?.createdAt as any).toISOString(),
        user?.name || 'N/A',
        user?.email || 'N/A',
        order.shippingAddress?.city || 'N/A',
        order.shippingAddress?.state || 'N/A',
        order.orderStatus,
        order.paymentStatus,
        order.grandTotal
      ].join(','));
    }

    return csvRows.join('\n');
  }

  private getDateRange(filter: DashboardFilterDTO) {
    let startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1); // Default last 1 month
    let endDate = new Date();

    if (filter.startDate) startDate = new Date(filter.startDate);
    if (filter.endDate) endDate = new Date(filter.endDate);

    return { startDate, endDate };
  }
}
