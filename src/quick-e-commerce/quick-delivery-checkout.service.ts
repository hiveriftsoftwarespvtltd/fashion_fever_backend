import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { QuickDeliveryCart, QuickDeliveryCartDocument } from './schema/quick-delivery-cart';
import { QuickDeliveryConfiguration, QuickDeliveryConfigurationDocument } from './schema/quickDeliveryConfig';
import { Coupon, CouponDocument, CouponScope, CouponType } from 'src/coupon/schema/coupon.schema';

@Injectable()
export class QuickDeliveryCheckoutService {
  constructor(
    @InjectModel(QuickDeliveryCart.name) private cartModel: Model<QuickDeliveryCartDocument>,
    @InjectModel(QuickDeliveryConfiguration.name) private configModel: Model<QuickDeliveryConfigurationDocument>,
    @InjectModel(Coupon.name) private couponModel: Model<CouponDocument>,
  ) { }

  async getCheckoutDetails(userId: string, couponCode?: string) {
    const cart = await this.cartModel
      .findOne({ user: new Types.ObjectId(userId) })
      .populate({
        path: 'items.product',
        select: '_id name slug description vendorId',
        populate: {
          path: 'vendorId',
          select: '_id businessName slug logo'
        }
      })
      .populate({
        path: 'items.variant',
        select: '_id productId attributes salesPrice offeredPrice stock',
        populate: {
          path: "thumbnail",
          select: "_id publicId url"
        }
      })
      .exec();

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const cartObj = (cart as any).toObject ? (cart as any).toObject() : cart;

    const vendorMap = new Map();
    let totalPrice = 0;
    let itemDiscountPrice = 0;

    for (const item of cartObj.items || []) {
      const vendor = item.product?.vendorId;
      const vendorIdStr = vendor?._id?.toString() || 'unknown';
      if (!vendorMap.has(vendorIdStr)) {
        vendorMap.set(vendorIdStr, {
          vendor: vendor || null,
          items: []
        });
      }
      vendorMap.get(vendorIdStr).items.push(item);

      const variant = item.variant;
      if (variant) {
        const salesPrice = variant.salesPrice || 0;
        const offeredPrice = variant.offeredPrice || 0;
        const quantity = item.quantity || 1;

        totalPrice += salesPrice * quantity;
        if (salesPrice > offeredPrice && offeredPrice > 0) {
          itemDiscountPrice += (salesPrice - offeredPrice) * quantity;
        }
      }
    }

    if (vendorMap.size > 1) {
      cartObj.groupedItems = Array.from(vendorMap.values());
    } else {
      cartObj.groupedItems = Array.from(vendorMap.values());
    }

    const subtotal = totalPrice - itemDiscountPrice;

    // Delivery Config
    let config = await this.configModel.findOne().exec();

    if (!config) {
      config = await this.configModel.create({
        minimumValueForFreeDelivery: 49,
        deliveryFee: 25,
        packagingCharge: 0,
        tax: 0
      });
    }

    let deliveryCharge = 0;
    if (subtotal > 0 && subtotal < config.minimumValueForFreeDelivery) {
      deliveryCharge = config.deliveryFee;
    }

    const packagingCharge = config.packagingCharge || 0;
    const tax = config.tax || 0;

    // Coupon logic
    let couponDiscount = 0;
    let appliedCoupon: any = null;

    if (couponCode) {
      const coupon = await this.couponModel.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon) {
        const now = new Date();
        let isValid = true;

        if (coupon.startsAt && new Date(coupon.startsAt) > now) isValid = false;
        if (coupon.expiresAt && new Date(coupon.expiresAt) < now) isValid = false;
        if (coupon.minimumOrderAmount && subtotal < coupon.minimumOrderAmount) isValid = false;
        if (coupon.scope !== CouponScope.PLATFORM && coupon.scope !== CouponScope.QUICK_DELIVERY) isValid = false;

        if (isValid) {
          appliedCoupon = coupon;
          if (coupon.type === CouponType.FIXED) {
            couponDiscount = coupon.value;
          } else if (coupon.type === CouponType.PERCENTAGE) {
            couponDiscount = (subtotal * coupon.value) / 100;
            if (coupon.maximumDiscount && couponDiscount > coupon.maximumDiscount) {
              couponDiscount = coupon.maximumDiscount;
            }
          }
        }
      }
    }

    if (couponDiscount > subtotal) {
      couponDiscount = subtotal;
    }

    const finalAmount = subtotal + deliveryCharge + packagingCharge + tax - couponDiscount;

    cartObj.totalPrice = totalPrice;
    cartObj.discountPrice = itemDiscountPrice;
    cartObj.subtotal = subtotal;
    cartObj.deliveryCharge = deliveryCharge;
    cartObj.packagingCharge = packagingCharge;
    cartObj.tax = tax;
    cartObj.couponDiscount = couponDiscount;
    cartObj.finalAmount = finalAmount;
    cartObj.appliedCoupon = appliedCoupon || null;

    return {
      message: 'Checkout details retrieved successfully',
      data: cartObj,
    };
  }

  async applyCoupon(userId: string, couponCode: string) {
    const cart = await this.cartModel.findOne({ user: new Types.ObjectId(userId) }).populate('items.variant').exec();
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    let subtotal = 0;
    for (const item of cart.items) {
      const variant: any = item.variant;
      if (variant) {
        const price = (variant.offeredPrice > 0 && variant.salesPrice > variant.offeredPrice)
          ? variant.offeredPrice
          : variant.salesPrice;
        subtotal += (price * item.quantity);
      }
    }

    const coupon = await this.couponModel.findOne({ code: couponCode.toUpperCase(), isActive: true });
    if (!coupon) {
      throw new NotFoundException('Invalid or expired coupon');
    }

    const now = new Date();
    if (coupon.startsAt && new Date(coupon.startsAt) > now) {
      throw new BadRequestException('Coupon is not active yet');
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
      throw new BadRequestException('Coupon has expired');
    }

    if (coupon.scope !== CouponScope.PLATFORM && coupon.scope !== CouponScope.QUICK_DELIVERY) {
      throw new BadRequestException('This coupon is not valid for quick delivery');
    }

    if (coupon.minimumOrderAmount && subtotal < coupon.minimumOrderAmount) {
      throw new BadRequestException(`Minimum order amount of ${coupon.minimumOrderAmount} required to apply this coupon`);
    }

    return this.getCheckoutDetails(userId, couponCode);
  }
}
