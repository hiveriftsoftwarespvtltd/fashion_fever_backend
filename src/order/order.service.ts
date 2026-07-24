import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import { Connection, Model, Types } from 'mongoose';

import {
  Order,
  OrderDocument,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from './schema/order.schema';

import { Product, ProductDocument } from '../product/schema/product.schema';

import {
  ProductVariant,
  ProductVariantDocument,
} from '../product/schema/product-variant.schema';

import { Address, AddressDocument } from '../address/schema/address.schema';

import {
  Coupon,
  CouponDocument,
  CouponScope,
  CouponType,
} from '../coupon/schema/coupon.schema';

import { ApiResponse } from 'src/common/responses/api-response';

import { CreateOrderDto, UpdateUserOrderDTO } from './dto/order.dto';
import {
  Influencer,
  InfluencerDocument,
} from 'src/influencer/schema/influencer.schema';
import {
  CouponUsage,
  CouponUsageDocument,
} from 'src/coupon/schema/coupon-usage.schema';
import {
  CommissionStatus,
  InfluencerCommission,
  InfluencerCommissionDocument,
} from 'src/influencer/schema/influencer-commision-rate.schema';
import {
  VendorPayout,
  VendorPayoutDocument,
} from 'src/vendor/schema/vendor-payout.schema';
import { Vendor, VendorDocument } from 'src/vendor/schema/vendor.schema';
import { VendorOrder, VendorOrderDocument, CancelledByEntity } from './schema/vendor-order.schema';
import { ShiprocketService } from 'src/shiprocket/shiprocket.service';
import { UserWalletService } from 'src/wallet/service/user/user.wallet.service';
import { WalletTransactionReason } from 'src/wallet/schema/user/user.wallet.transactions';
import { UserReview, UserReviewDocument } from 'src/user-review/schema/user-review.schema';
import { CashbackSlab, CashbackSlabDocument, CashbackType } from 'src/wallet/schema/cashback/cashbacks.slabs.schema';
import {
  CommissionRate,
  CommissionRateDocument,
  CommissionEntityType,
  CommissionOn,
} from 'src/admin/schema/commission-rate.schema';
import { AffiliateTrackingService } from 'src/influencer/affiliate-tracking.service';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationModuleType, NotificationType, NotificationPriority } from 'src/notification/schema/notification.schema';
import { PaymentTransaction, PaymentTransactionDocument, TransactionStatus as PayoutTransactionStatus, ReferenceType as PayoutReferenceType, PaymentMode as PayoutPaymentMode, PaymentMethod as PayoutPaymentMethod } from 'src/payout/schema/payment-transaction.schema';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,

    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,

    @InjectModel(ProductVariant.name)
    private readonly variantModel: Model<ProductVariantDocument>,

    @InjectModel(Address.name)
    private readonly addressModel: Model<AddressDocument>,

    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,

    @InjectModel(Influencer.name)
    private readonly influencerModel: Model<InfluencerDocument>,

    @InjectModel(CouponUsage.name)
    private readonly couponUsageModel: Model<CouponUsageDocument>,

    @InjectModel(InfluencerCommission.name)
    private readonly influencerCommisionModel: Model<InfluencerCommissionDocument>,

    @InjectModel(VendorPayout.name)
    private readonly vendorPayoutModel: Model<VendorPayoutDocument>,

    @InjectModel(Vendor.name)
    private readonly vendorModel: Model<VendorDocument>,

    @InjectModel(VendorOrder.name)
    private readonly vendorOrderModel: Model<VendorOrderDocument>,

    @InjectModel(UserReview.name)
    private readonly userReviewModel: Model<UserReviewDocument>,

    @InjectConnection()
    private readonly connection: Connection,

    private shiprocketService: ShiprocketService,

    private readonly userWalletService: UserWalletService,

    @InjectModel(CashbackSlab.name)
    private readonly cashbackSlabModel: Model<CashbackSlabDocument>,

    @InjectModel(CommissionRate.name)
    private readonly commissionRateModel: Model<CommissionRateDocument>,

    private readonly affiliateTrackingService: AffiliateTrackingService,

    private readonly notificationService: NotificationService,

    @InjectModel(PaymentTransaction.name)
    private readonly paymentTransactionModel: Model<PaymentTransactionDocument>,
  ) { }


  async placeOrder(dto: CreateOrderDto, userId: string) {
    const session = await this.connection.startSession();

    try {
      session.startTransaction();

      // ─────────────────────────────────────────────────────────────
      // 1. Validate Address & Payment Method
      // ─────────────────────────────────────────────────────────────
      const address = await this.addressModel
        .findOne({
          _id: new Types.ObjectId(dto.addressId),
          user: new Types.ObjectId(userId),
        })
        .session(session);

      if (!address) {
        throw new NotFoundException('Address Not Found');
      }

      if (!dto.items?.length) {
        throw new BadRequestException('No Items Found');
      }

      // ─────────────────────────────────────────────────────────────
      // 2. Prevent duplicate variants
      // ─────────────────────────────────────────────────────────────
      const uniqueVariantIds = new Set<string>();

      for (const item of dto.items) {
        if (uniqueVariantIds.has(item.variantId)) {
          throw new BadRequestException('Duplicate variants are not allowed');
        }

        uniqueVariantIds.add(item.variantId);
      }

      // ─────────────────────────────────────────────────────────────
      // 3. Group items by vendor
      // ─────────────────────────────────────────────────────────────
      const vendorBuckets = new Map<
        string,
        {
          vendor: VendorDocument;

          orderItems: Partial<OrderItem>[];

          variantsToUpdate: {
            variant: any;
            quantity: number;
          }[];

          subTotal: number;

          totalWeight: number;
          declaredValue: number;

          length: number;
          width: number;
          height: number;
        }
      >();

      for (const item of dto.items) {
        const product = await this.productModel
          .findById(item.productId)
          .session(session);

        if (!product) {
          throw new NotFoundException('Product Not Found');
        }

        const variant = await this.variantModel
          .findById(item.variantId)
          .session(session);

        if (!variant) {
          throw new NotFoundException('Variant Not Found');
        }

        if (!product.vendorId) {
          throw new BadRequestException('Vendor Not Found');
        }

        const isVariantBelongsToProduct = product.variants.some(
          (id) => id.toString() === variant._id.toString(),
        );

        if (!isVariantBelongsToProduct) {
          throw new BadRequestException('Variant does not belong to product');
        }

        if (variant.stock < item.quantity) {
          throw new BadRequestException(`${product.name} is out of stock`);
        }

        const vendorIdStr = product.vendorId.toString();

        if (!vendorBuckets.has(vendorIdStr)) {
          const vendor = await this.vendorModel
            .findById(product.vendorId)
            .session(session);

          if (!vendor) {
            throw new NotFoundException('Vendor not found');
          }

          vendorBuckets.set(vendorIdStr, {
            vendor,
            orderItems: [],
            variantsToUpdate: [],
            subTotal: 0,

            totalWeight: 0,
            declaredValue: 0,

            length: 0,
            width: 0,
            height: 0,
          });
        }

        const bucket = vendorBuckets.get(vendorIdStr)!;

        const price =
          variant.offeredPrice || variant.salesPrice || variant.costPrice;

        const totalPrice = price * item.quantity;

        bucket.subTotal += totalPrice;

        // shipping calculations
        bucket.totalWeight += (variant.weight || 0.5) * item.quantity;

        bucket.declaredValue += totalPrice;

        bucket.length = Math.max(bucket.length, variant.length || 10);

        bucket.width = Math.max(bucket.width, variant.width || 10);

        bucket.height += (variant.height || 10) * item.quantity;

        // order item
        bucket.orderItems.push({
          productId: product._id,
          variantId: variant._id,
          vendorId: product.vendorId,

          productName: product.name,

          sku: variant.sku,

          attributes: variant.attributes || {},

          quantity: item.quantity,

          offeredPrice: variant.offeredPrice || 0,
          salesPrice: variant.salesPrice || 0,
          costPrice: variant.costPrice || 0,

          totalPrice,

          weight: variant.weight,
          length: variant.length,
          width: variant.width,
          height: variant.height,
        });

        bucket.variantsToUpdate.push({
          variant,
          quantity: item.quantity,
        });
      }

      // ─────────────────────────────────────────────────────────────
      // 4. Resolve Coupon
      // ─────────────────────────────────────────────────────────────
      let coupon: CouponDocument | null = null;

      let influencer: InfluencerDocument | null = null;

      if (dto.couponCode) {
        coupon = await this.couponModel.findOne({
          code: dto.couponCode.trim().toUpperCase(),
          isActive: true,
        }).session(session);

        if (!coupon) {
          throw new BadRequestException('Invalid Coupon');
        }

        if (dto.paymentMethod === PaymentMethod.CASH_ON_DELIVERY) {
          throw new BadRequestException('Coupon not apply for cash on delivery');
        }

        // vendor coupon validation
        if (coupon.scope === CouponScope.VENDOR && coupon.vendorId) {
          if (!vendorBuckets.has(coupon.vendorId.toString())) {
            throw new BadRequestException('Coupon not applicable for cart');
          }
        }

        const now = new Date();

        if (coupon.startsAt && now < coupon.startsAt) {
          throw new BadRequestException('Coupon not started yet');
        }

        if (coupon.expiresAt && now > coupon.expiresAt) {
          throw new BadRequestException('Coupon expired');
        }

        if (
          coupon.totalUsageLimit &&
          coupon.totalUsed >= coupon.totalUsageLimit
        ) {
          throw new BadRequestException('Coupon usage limit exceeded');
        }

        const userCouponUsage = await this.couponUsageModel.countDocuments({
          couponId: coupon._id,
          userId: new Types.ObjectId(userId),
        }).session(session);

        if (
          coupon.usageLimitPerUser &&
          userCouponUsage >= coupon.usageLimitPerUser
        ) {
          throw new BadRequestException('Coupon limit reached for user');
        }

        if (coupon.influencerId) {
          influencer = await this.influencerModel.findById(coupon.influencerId);

          if (!influencer) {
            throw new NotFoundException('Influencer not found');
          }
        }
      }

      // ─────────────────────────────────────────────────────────────
      // 5. Create Vendor Orders
      // ─────────────────────────────────────────────────────────────
      const vendorOrderIds: Types.ObjectId[] = [];
      const vendorOrdersData: any[] = [];

      const orderNumber = `ORD-${Date.now()}`;

      let orderSubTotal = 0;
      let orderDiscount = 0;
      let orderShippingCharge = 0;
      let orderCodCharge = 0;
      let orderGrandTotal = 0;

      let appliedCouponSnapshot: any = null;
      const influencerCommissionPayloads: any[] = [];
      for (const [vendorIdStr, bucket] of vendorBuckets) {
        const { vendor, orderItems, variantsToUpdate, subTotal } = bucket;

        // ─────────────────────────────────────────
        // SHIPPING
        // ─────────────────────────────────────────
        let shippingCharge = 0;
        let codCharge = 0;

        let estimatedDays = 0;
        let estimatedDate: any = null;

        try {
          if (!vendor.vendorPincode) {
            throw new Error(`Vendor ${vendor.businessName} has no pincode configured`);
          }

          const shipping = await this.shiprocketService.getShippingOptions({
            pickupPincode: vendor.vendorPincode,
            deliveryPincode: address.pincode,
            weightKg: bucket.totalWeight || 0.5,
            declaredValue: bucket.declaredValue,
            isCOD: dto.paymentMethod === PaymentMethod.CASH_ON_DELIVERY ? 1 : 0,
            length: bucket.length || 10,
            breadth: bucket.width || 10,
            height: bucket.height || 10,
          });

          shippingCharge = Number(shipping.shippingCharge) || 0;

          codCharge =
            dto.paymentMethod === PaymentMethod.CASH_ON_DELIVERY
              ? Number(shipping.codCharge) || 0
              : 0;

          estimatedDays = Number(shipping.estimatedDays) || 5;

          estimatedDate = shipping.estimatedDate || null;
        } catch (error) {
          console.warn(`Shiprocket shipping fallback used for vendor ${vendor.businessName}:`, error?.message || error);
          shippingCharge = 50; // Standard fallback shipping fee
          codCharge = dto.paymentMethod === PaymentMethod.CASH_ON_DELIVERY ? 30 : 0;
          estimatedDays = 5;
          estimatedDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
        }

        // ─────────────────────────────────────────
        // COUPON DISCOUNT
        // ─────────────────────────────────────────
        let vendorDiscount = 0;

        if (coupon) {
          const isApplicable =
            coupon.scope !== CouponScope.VENDOR ||
            coupon.vendorId?.toString() === vendorIdStr;

          if (isApplicable) {
            if (
              !coupon.minimumOrderAmount ||
              subTotal >= coupon.minimumOrderAmount
            ) {
              if (coupon.type === CouponType.PERCENTAGE) {
                vendorDiscount = (subTotal * coupon.value) / 100;

                if (
                  coupon.maximumDiscount &&
                  vendorDiscount > coupon.maximumDiscount
                ) {
                  vendorDiscount = coupon.maximumDiscount;
                }
              } else {
                const totalSubTotal = [...vendorBuckets.values()].reduce(
                  (sum, b) => sum + b.subTotal,
                  0,
                );

                vendorDiscount = (subTotal / totalSubTotal) * coupon.value;
              }
            }
          }
        }

        // ─────────────────────────────────────────
        // ITEM DISCOUNT DISTRIBUTION
        // ─────────────────────────────────────────
        for (const oi of orderItems) {
          if (vendorDiscount > 0) {
            oi.discountAmount = parseFloat(
              ((oi.totalPrice! / subTotal) * vendorDiscount).toFixed(2),
            );
          } else {
            oi.discountAmount = 0;
          }

          oi.finalPrice = parseFloat(
            (oi.totalPrice! - oi.discountAmount!).toFixed(2),
          );
        }

        // ─────────────────────────────────────────
        // COMMISSION (from admin CommissionRate schema)
        // ─────────────────────────────────────────
        const DEFAULT_COMMISSION_RATE = 25;
        const DEFAULT_COMMISSION_ON = CommissionOn.PROFITVALUE;

        // Fetch once per order; subsequent vendors reuse the same doc
        const commissionDoc = await this.commissionRateModel.findOne().session(session);

        const vendorSlab = commissionDoc?.commissions?.find(
          (s) => s.entityType === CommissionEntityType.VENDOR,
        );

        const platformCommissionRate =
          vendorSlab?.commissionPercentage ?? DEFAULT_COMMISSION_RATE;
        const platformCommissionOn =
          vendorSlab?.commissionOn ?? DEFAULT_COMMISSION_ON;

        const finalOrderAmount = subTotal - vendorDiscount;

        // Choose commission base according to commissionOn
        let commissionBase: number;
        if (platformCommissionOn === CommissionOn.PROFITVALUE) {
          const totalCostPriceTemp = orderItems.reduce(
            (sum, oi) => sum + (oi.costPrice || 0) * (oi.quantity || 0),
            0,
          );
          commissionBase = finalOrderAmount - totalCostPriceTemp;
          if (commissionBase < 0) commissionBase = 0;
        } else {
          commissionBase = finalOrderAmount;
        }

        const platformCommissionAmount = parseFloat(
          ((commissionBase * platformCommissionRate) / 100).toFixed(2),
        );

        const payoutAmount = parseFloat(
          (finalOrderAmount - platformCommissionAmount).toFixed(2),
        );

        // ─────────────────────────────────────────
        // GRAND TOTAL
        // ─────────────────────────────────────────
        const tax = 0;

        const vendorGrandTotal =
          finalOrderAmount + shippingCharge + codCharge + tax;

        // ─────────────────────────────────────────
        // COUPON SNAPSHOT
        // ─────────────────────────────────────────
        if (coupon && vendorDiscount > 0) {
          appliedCouponSnapshot = {
            code: coupon.code,

            couponId: coupon._id,

            scope: coupon.scope,

            couponType: coupon.type,

            couponValue: (coupon.value || 0).toFixed(2),

            discountAmount: (vendorDiscount || 0).toFixed(2),

            influencerId: coupon.influencerId,

            influencerCode: coupon.influencerId ? coupon.code : undefined,
          };
        }

        const totalCostPrice = orderItems.reduce(
          (sum, item) => sum + (item.costPrice || 0) * (item.quantity || 0),
          0,
        );

        const totalSellingPrice = orderItems.reduce(
          (sum, item) => sum + (item.salesPrice || 0) * (item.quantity || 0),
          0,
        );

        const totalOfferedPrice = orderItems.reduce(
          (sum, item) => sum + (item.offeredPrice || 0) * (item.quantity || 0),
          0,
        );

        const grossProfit = finalOrderAmount - totalCostPrice;

        const netProfit =
          grossProfit - platformCommissionAmount - shippingCharge - codCharge;

        // ─────────────────────────────────────────
        // CREATE VENDOR ORDER
        // ─────────────────────────────────────────
        const [vendorOrder] = await this.vendorOrderModel.create(
          [
            {
              userId: new Types.ObjectId(userId),

              vendorId: (vendor as any)._id,

              orderNumber: `${orderNumber}-${vendorIdStr.slice(-4)}`,

              shippingAddress: {
                phone: address.phone1,
                line1: address.line1,
                line2: address.line2,
                city: address.city,
                state: address.state,
                pincode: address.pincode,
              },

              items: orderItems,

              subTotal,

              discount: vendorDiscount,

              shippingCharge,

              codCharge,

              tax,

              grandTotal: vendorGrandTotal,

              commissionRate: platformCommissionRate,

              commissionAmount: platformCommissionAmount,
              platformCommissionRate,
              platformCommissionOn,
              platformCommissionAmount,


              payoutAmount,

              estimatedDeliveryDate: estimatedDate,

              orderStatus: OrderStatus.PENDING,

              costPrice: totalCostPrice,
              sellingPrice: totalSellingPrice,
              offeredPrice: totalOfferedPrice,
              grossProfit,
              netProfit,

              paymentStatus:
                dto.paymentMethod === PaymentMethod.CASH_ON_DELIVERY
                  ? PaymentStatus.PENDING
                  : PaymentStatus.PAID,
            },
          ],
          { session },
        );

        if (influencer && coupon?.influencerId && vendorDiscount > 0) {
          influencerCommissionPayloads.push({
            influencerId: coupon.influencerId,

            influencerUserId: influencer.userId,

            vendorOrderId: vendorOrder._id,

            vendorId: new Types.ObjectId(vendorIdStr),

            couponId: coupon._id,

            orderAmount: subTotal,

            discountAmount: vendorDiscount,

            finalOrderAmount,

            totalCostPrice,

            grossProfit,
            netProfit,

            shippingCost: shippingCharge,

            taxAmount: tax,

            platformCommissionAmount,

            commissionRate: 0,

            commissionAmount: 0,

            status: CommissionStatus.PENDING,

            commissionMonth: new Date().getMonth() + 1,

            commissionYear: new Date().getFullYear(),
          });
        }

        vendorOrderIds.push(vendorOrder._id);
        vendorOrdersData.push(vendorOrder);

        // ─────────────────────────────────────────
        // UPDATE STOCK
        // ─────────────────────────────────────────
        for (const { variant, quantity } of variantsToUpdate) {
          const updated = await this.variantModel.findOneAndUpdate(
            {
              _id: variant._id,
              stock: { $gte: quantity },
            },
            {
              $inc: {
                stock: -quantity,
              },
            },
            {
              new: true,
              session,
            },
          );

          if (!updated) {
            throw new BadRequestException(`${variant.sku} is out of stock`);
          }
        }


        orderSubTotal += subTotal;

        orderDiscount += vendorDiscount;

        orderShippingCharge += shippingCharge;

        orderCodCharge += codCharge;

        orderGrandTotal += vendorGrandTotal;
      }

      // ─────────────────────────────────────────────────────────────
      // 5.5 Deduct Wallet Balance
      // ─────────────────────────────────────────────────────────────
      let walletAmountUsed = 0;
      let actualPaymentStatus = (dto.paymentMethod === PaymentMethod.CASH_ON_DELIVERY || dto.paymentMethod === PaymentMethod.WALLET_PLUS_COD) ? PaymentStatus.PENDING : PaymentStatus.PAID;

      if (dto.paymentMethod === PaymentMethod.WALLET || dto.paymentMethod === PaymentMethod.WALLET_PLUS_ONLINE || dto.paymentMethod === PaymentMethod.WALLET_PLUS_COD) {
        const userWallet = await this.userWalletService.getBalance(userId);

        if (dto.paymentMethod === PaymentMethod.WALLET) {
          if (userWallet.balance < orderGrandTotal) {
            throw new BadRequestException('Insufficient wallet balance to cover the entire order');
          }
          walletAmountUsed = orderGrandTotal;
        } else if (dto.paymentMethod === PaymentMethod.WALLET_PLUS_ONLINE) {
          if (userWallet.balance <= 0) {
            throw new BadRequestException('Insufficient wallet balance');
          }
          walletAmountUsed = Math.min(userWallet.balance, orderGrandTotal);
        } else if (dto.paymentMethod === PaymentMethod.WALLET_PLUS_COD) {
          const advanceAmount = parseFloat((orderGrandTotal * 0.2).toFixed(2));
          if (userWallet.balance < advanceAmount) {
            throw new BadRequestException(`Minimum ₹${advanceAmount} wallet balance required as advance payment`);
          }
          walletAmountUsed = advanceAmount;
        }

        if (walletAmountUsed > 0) {
          await this.userWalletService.deductBalance(
            userId,
            walletAmountUsed,
            WalletTransactionReason.ORDER_PAYMENT,
            `Payment for Order ${orderNumber}`,
            session
          );
        }
      }

      // ─────────────────────────────────────────────────────────────
      // 6. CREATE MAIN ORDER
      // ─────────────────────────────────────────────────────────────
      const [order] = await this.orderModel.create(
        [
          {
            userId: new Types.ObjectId(userId),

            orderNumber,

            shippingAddress: {
              phone: address.phone1,
              line1: address.line1,
              line2: address.line2,
              city: address.city,
              state: address.state,
              pincode: address.pincode,
            },

            vendorOrders: vendorOrderIds,

            appliedCoupon: appliedCouponSnapshot,

            paymentMethod: dto.paymentMethod,

            paymentStatus:
              dto.paymentMethod === PaymentMethod.CASH_ON_DELIVERY
                ? PaymentStatus.PENDING
                : PaymentStatus.PAID,

            orderStatus: OrderStatus.PENDING,

            subTotal: orderSubTotal,

            discount: orderDiscount,

            shippingCharge: orderShippingCharge,

            codCharge: orderCodCharge,

            tax: 0,

            grandTotal: orderGrandTotal,

            walletAmountUsed: walletAmountUsed,

            paidAmount: actualPaymentStatus === PaymentStatus.PAID ? orderGrandTotal : walletAmountUsed,
          },
        ],
        { session },
      );

      

      

      for (const vOrder of vendorOrdersData) {
        const ratio = orderGrandTotal > 0 ? (vOrder.grandTotal / orderGrandTotal) : 0;
        const vendorWalletAmount = parseFloat((walletAmountUsed * ratio).toFixed(2));
        const vendorRemainingAmount = parseFloat((vOrder.grandTotal - vendorWalletAmount).toFixed(2));

        if (vendorWalletAmount > 0) {
          await this.paymentTransactionModel.create(
            [{
              customerId: new Types.ObjectId(userId),
              referenceType: PayoutReferenceType.ORDER,
              referenceId: vOrder._id,
              paymentMode: PayoutPaymentMode.ONLINE,
              paymentMethod: PayoutPaymentMethod.WALLET,
              amount: vendorWalletAmount,
              status: PayoutTransactionStatus.SUCCESS,
            }],
            { session }
          );
        }

        if (vendorRemainingAmount > 0 && (dto.paymentMethod === PaymentMethod.CASH_ON_DELIVERY || dto.paymentMethod === PaymentMethod.WALLET_PLUS_COD)) {
          await this.paymentTransactionModel.create(
            [{
              customerId: new Types.ObjectId(userId),
              referenceType: PayoutReferenceType.ORDER,
              referenceId: vOrder._id,
              paymentMode: PayoutPaymentMode.COD,
              paymentMethod: PayoutPaymentMethod.CASH,
              amount: vendorRemainingAmount,
              status: PayoutTransactionStatus.PENDING,
            }],
            { session }
          );
        }
      }

      await this.vendorOrderModel.updateMany(
        {
          _id: {
            $in: vendorOrderIds.map((id) => new Types.ObjectId(id)),
          },
        },
        {
          $set: {
            orderId: order._id,
          },
        },
        { session },
      );

      if (influencerCommissionPayloads.length) {
        const payloads = influencerCommissionPayloads.map((item) => ({
          ...item,
          orderId: order._id,


        }));

        await this.influencerCommisionModel.create(payloads, { session });
      }

      // ─────────────────────────────────────────────────────────────
      // 8. COUPON USAGE
      // ─────────────────────────────────────────────────────────────
      if (coupon) {
        await this.couponUsageModel.create(
          [
            {
              couponId: coupon._id,

              userId: new Types.ObjectId(userId),

              orderId: order._id,
            },
          ],
          { session },
        );

        await this.couponModel.findByIdAndUpdate(
          coupon._id,
          {
            $inc: {
              totalUsed: 1,
            },
          },
          { session },
        );
      }
      // ─────────────────────────────────────────────────────────────
      // 9. CASHBACK CALCULATION
      // ─────────────────────────────────────────────────────────────
      if (actualPaymentStatus === PaymentStatus.PAID) {
        const applicableSlab = await this.cashbackSlabModel.findOne({
          isActive: true,
          minValue: { $lte: orderGrandTotal },
          maxValue: { $gte: orderGrandTotal }
        }).session(session);

        if (applicableSlab) {
          let cashbackAmount = 0;
          if (applicableSlab.cashbackType === CashbackType.PERCENTAGE) {
            cashbackAmount = (orderGrandTotal * applicableSlab.cashbackValue) / 100;
            if (applicableSlab.maxCashback && applicableSlab.maxCashback > 0 && cashbackAmount > applicableSlab.maxCashback) {
              cashbackAmount = applicableSlab.maxCashback;
            }
          } else {
            cashbackAmount = applicableSlab.cashbackValue;
          }

          if (cashbackAmount > 0) {
            await this.userWalletService.addBalance(
              userId,
              cashbackAmount,
              WalletTransactionReason.CASHBACK,
              `Cashback for Order ${orderNumber}`,
              session
            );
          }
        }
      }

      await this.affiliateTrackingService.createPendingCommission(userId, 'PRODUCT', order._id, orderGrandTotal);

      await session.commitTransaction();

      // Send Notification to User
      await this.notificationService.sendNotification({
        receiverId: userId,
        title: 'Order Placed',
        body: `Your order has been placed successfully.`,
        moduleType: NotificationModuleType.ORDER,
        type: NotificationType.SYSTEM,
        priority: NotificationPriority.HIGH
      });

      // Send Notification to Vendors
      for (const [vendorIdStr, bucket] of vendorBuckets) {
        if (bucket.vendor.ownerId) {
          await this.notificationService.sendNotification({
            receiverId: bucket.vendor.ownerId.toString(),
            title: 'New Order Received',
            body: `You have received a new order.`,
            moduleType: NotificationModuleType.ORDER,
            type: NotificationType.SYSTEM,
            priority: NotificationPriority.HIGH
          });
        }
      }

      return ApiResponse.success('Order placed successfully', order);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async userOrders(userId: string) {
    const orders = await this.orderModel
      .find({
        userId: new Types.ObjectId(userId),
      })
      .populate({
        path: 'vendorOrders',
        populate: [
          {
            path: 'items.productId',
            select: 'name web_image app_image',
          },
          {
            path: 'items.variantId',
          },
        ],
      })
      .sort({ createdAt: -1 })
      .lean();

    const userReviews = await this.userReviewModel.find({ userId: new Types.ObjectId(userId), isDeleted: false }).lean();

    const ordersWithReviews = orders.map((order: any) => {
      if (order.vendorOrders) {
        order.vendorOrders.forEach((vendorOrder: any) => {
          if (vendorOrder.items) {
            vendorOrder.items.forEach((item: any) => {
              const review = userReviews.find(r => r.productId.toString() === (item.productId?._id?.toString() || item.productId?.toString()));
              item.isReviewed = !!review;
              item.reviewDetails = review || null;
            });
          }
        });
      }
      return order;
    });

    return ApiResponse.success('Orders fetched successfully', ordersWithReviews);
  }

  async userOrderDetails(userId: string, orderId: string) {
    const order = await this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        userId: new Types.ObjectId(userId),
      })
      .populate({
        path: 'vendorOrders',
        populate: [
          {
            path: 'items.productId',
            select: 'name web_image app_image',
          },
          {
            path: 'items.variantId',
          },
        ],
      })
      .lean();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const userReviews = await this.userReviewModel.find({ userId: new Types.ObjectId(userId), isDeleted: false }).lean();

    if (order.vendorOrders) {
      order.vendorOrders.forEach((vendorOrder: any) => {
        if (vendorOrder.items) {
          vendorOrder.items.forEach((item: any) => {
            const review = userReviews.find(r => r.productId.toString() === (item.productId?._id?.toString() || item.productId?.toString()));
            item.isReviewed = !!review;
            item.reviewDetails = review || null;
          });
        }
      });
    }

    return ApiResponse.success('Order details fetched successfully', order);
  }

  async cancelOrder(userId: string, orderId: string, dto: UpdateUserOrderDTO) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const order = await this.orderModel.findOne({
        _id: new Types.ObjectId(orderId),
        userId: new Types.ObjectId(userId),
      }).populate('vendorOrders').session(session);

      if (!order) {
        throw new NotFoundException('Order Not Found');
      }

      // Check if order is already cancelled or delivered
      if (order.orderStatus === OrderStatus.CANCELLED) {
        throw new ConflictException('Order already cancelled');
      }
      if (order.orderStatus === OrderStatus.DELIVERED) {
        throw new ConflictException('Delivered orders cannot be cancelled');
      }
      if (order.orderStatus === OrderStatus.RETURNED) {
        throw new ConflictException('Returned orders cannot be cancelled');
      }

      if (!dto.cancellationReason) {
        throw new ConflictException('Cancellation reason should be provided');
      }

      order.orderStatus = OrderStatus.CANCELLED;
      order.cancellationReason = dto.cancellationReason;
      order.cancelledAt = new Date();
      // Refund the total amount paid by the user to their wallet
      let paymentStatusRefunded = false;
      if (order.paymentStatus === PaymentStatus.PAID) {
        const amountToRefund = order.grandTotal;

        if (amountToRefund > 0 && (!order.walletRefundedAmount || order.walletRefundedAmount === 0)) {
          await this.userWalletService.addBalance(
            userId,
            amountToRefund,
            WalletTransactionReason.REFUND,
            `Refund for cancelled Order ${order.orderNumber}`,
            session
          );
          order.walletRefundedAmount = amountToRefund;
          order.paymentStatus = PaymentStatus.REFUNDED;
          paymentStatusRefunded = true;

          await this.paymentTransactionModel.create([{
            customerId: new Types.ObjectId(userId),
            referenceType: PayoutReferenceType.ORDER,
            referenceId: order._id,
            paymentMode: PayoutPaymentMode.ONLINE,
            paymentMethod: PayoutPaymentMethod.WALLET,
            amount: amountToRefund,
            status: PayoutTransactionStatus.REFUNDED
          }], { session });
        }
      }

      await order.save({ session });

      // Update VendorOrders
      const vendorOrderUpdateData: any = {
        orderStatus: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: dto.cancellationReason,
        cancelledBy: new Types.ObjectId(userId),
        cancelledByEntity: CancelledByEntity.USER
      };

      if (paymentStatusRefunded) {
        vendorOrderUpdateData.paymentStatus = PaymentStatus.REFUNDED;
      }

      await this.vendorOrderModel.updateMany(
        { orderId: order._id },
        {
          $set: vendorOrderUpdateData
        },
        { session }
      );

      // Create notification
      let itemsCancelledStr = '';
      if (order.vendorOrders && order.vendorOrders.length > 0) {
        const itemNames: string[] = [];
        order.vendorOrders.forEach((vo: any) => {
          if (vo.items) {
            vo.items.forEach((item: any) => itemNames.push(item.productName));
          }
        });
        itemsCancelledStr = itemNames.join(', ');
      }

      const refundAmt = (order.walletAmountUsed && order.walletAmountUsed > 0) ? order.walletAmountUsed : 0;
      const notificationDesc = `Order ${order.orderNumber} cancelled. Items cancelled: ${itemsCancelledStr || 'All'}. Amount refunded: ${refundAmt > 0 ? refundAmt : 'None'}.`;

      await this.notificationService.sendNotification({
        title: `Order cancelled`,
        body: notificationDesc,
        receiverId: userId,
        type: NotificationType.TRANSACTIONAL,
        priority: NotificationPriority.HIGH,
        moduleType: NotificationModuleType.ORDER,
        data: {
          orderId: order._id,
          cancellationReason: dto.cancellationReason,
          cancelledByEntity: CancelledByEntity.USER
        }
      });

      await session.commitTransaction();

      return ApiResponse.success('Order cancelled successfully!', order);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
