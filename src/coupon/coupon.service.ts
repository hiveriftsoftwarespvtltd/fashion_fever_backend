import {
  Coupon,
  CouponDocument,
  CouponScope,
  CouponType,
} from './schema/coupon.schema';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ApplyCouponDTO,
  CreateCouponDto,
  UpdateCouponDTO,
} from './dto/coupon.dto';
import { ApiResponse } from 'src/common/responses/api-response';
import { CouponUsage, CouponUsageDocument } from './schema/coupon-usage.schema';
import { types } from 'util';
import { Cart, CartDocument } from 'src/cart/schema/cart.schema';
import { Product, ProductDocument } from 'src/product/schema/product.schema';
import {
  ProductVariant,
  ProductVariantDocument,
} from 'src/product/schema/product-variant.schema';

@Injectable()
export class CouponService {
  constructor(
    @InjectModel(Coupon.name)
    private couponModel: Model<CouponDocument>,
    @InjectModel(CouponUsage.name)
    private couponUsageModel: Model<CouponUsageDocument>,
    @InjectModel(Cart.name)
    private cartModel: Model<CartDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    @InjectModel(ProductVariant.name)
    private productVariantModel: Model<ProductVariantDocument>,
  ) { }

  async create(dto: CreateCouponDto) {
    const existing = await this.couponModel.findOne({
      code: dto.code.toUpperCase(),
    });

    if (existing) {
      throw new ConflictException('Coupon already exists');
    }

    const coupon = await this.couponModel.create({
      ...dto,
      code: dto.code.toUpperCase(),
      vendorId: dto.vendorId ? new Types.ObjectId(dto.vendorId) : undefined,
      influencerId: dto.influencerId
        ? new Types.ObjectId(dto.influencerId)
        : undefined,
      // ownerId:new Types.Object
    });

    return coupon;
  }

  async validateCoupon(code: string, total: number) {
    const coupon = await this.couponModel.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    if (total < coupon.minimumOrderAmount) {
      throw new BadRequestException('Minimum amount not reached');
    }

    let discount = 0;

    if (coupon.type === CouponType.PERCENTAGE) {
      discount = (total * coupon.value) / 100;
    } else {
      discount = coupon.value;
    }

    if (coupon.maximumDiscount && discount > coupon.maximumDiscount) {
      discount = coupon.maximumDiscount;
    }

    return {
      coupon,
      discount,
    };
  }

  async getAllCoupons() {
    return this.couponModel.find().lean() || [];
  }

  async couponDetails(id: string) {
    const coupon = await this.couponModel.findById(new Types.ObjectId(id));
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return ApiResponse.success('Coupon Details fetched succesfuuly', coupon);
  }

  async updateCoupon(dto: UpdateCouponDTO, id: string) {
    const coupon = await this.couponModel.findById(new Types.ObjectId(id));
    if (!coupon) {
      throw new NotFoundException('Coupon Not Found');
    }

    const filteredDTO = Object.fromEntries(
      Object.entries(dto).filter(
        ([_, value]) => value !== undefined && value !== null && value !== '',
      ),
    );

    await this.couponModel.updateOne(
      { _id: new Types.ObjectId(id) },
      { $set: filteredDTO },
    );

    return ApiResponse.success('Coupon Updated Successfully!', coupon);
  }

  async deleteCoupon(id: string) {
    const coupon = await this.couponModel.findById(new Types.ObjectId(id));
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    await coupon.deleteOne();
    return ApiResponse.success('Coupon Deleted Successfully');
  }

  async allUserCoupons(userId: string) {
    const now = new Date();

    const coupons = await this.couponModel
      .find({ isActive: true })
      .sort({ createdAt: -1 });

    const result = await Promise.all(
      coupons.map(async (coupon) => {
        let isValid = true;
        let reason: null | string = null;

        if (coupon.startsAt && now < coupon.startsAt) {
          isValid = false;
          reason = 'Coupon is not started yet';
        }

        if (coupon.expiresAt && now > coupon.expiresAt) {
          isValid = false;
          reason = 'Coupon expired';
        }

        if (
          coupon.totalUsageLimit > 0 &&
          coupon.totalUsed >= coupon.totalUsageLimit
        ) {
          isValid = false;
          reason = 'Coupon usage limit exceeded';
        }

        const userCouponUsage = await this.couponUsageModel.countDocuments({
          couponId: coupon._id,
          userId: new Types.ObjectId(userId),
        });

        if (
          coupon.usageLimitPerUser > 0 &&
          userCouponUsage >= coupon.usageLimitPerUser
        ) {
          isValid = false;
          reason = 'you already used this token';
        }
        return {
          _id: coupon._id,
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          scope: coupon.scope,
          minimumOrderAmount: coupon.minimumOrderAmount,
          maximumDiscount: coupon.maximumDiscount,
          usageLimitPerUser: coupon.usageLimitPerUser,
          totalUsageLimit: coupon.totalUsageLimit,
          totalUsed: coupon.totalUsed,
          description: coupon.description,
          startsAt: coupon.startsAt,
          expiresAt: coupon.expiresAt,
          isValid,
          reason,
        };
      }),
    );
    return ApiResponse.success('Coupon fetched successfully', result);
  }

  async applyCoupon(userId: string, dto: ApplyCouponDTO) {
    const { couponCode } = dto;

    // =========================
    // FETCH USER CART
    // =========================

    const cart = await this.cartModel.findOne({
      user: new Types.ObjectId(userId),
    });

    if (!cart || !cart.items.length) {
      throw new BadRequestException('Cart is empty');
    }

    // =========================
    // CALCULATE SUBTOTAL
    // =========================

    let subTotal = 0;

    let vendorId: string | undefined;

    const cartItems: any[] = [];

    for (const item of cart.items) {
      const product = await this.productModel.findById(item.product);

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (!product.isActive || product.isDeleted) {
        throw new BadRequestException(`${product.name} is unavailable`);
      }

      const variant = await this.productVariantModel.findById(item.variant).populate("images", "url publicId _id").populate("thumbnail", "url publicId _id");

      if (!variant) {
        throw new NotFoundException('Variant not found');
      }

      if (!variant.isActive) {
        throw new BadRequestException(`${product.name} variant unavailable`);
      }

      // =========================
      // VALIDATE VARIANT BELONGS TO PRODUCT
      // =========================

      if (
        !product.variants.some((id) => id.toString() === variant._id.toString())
      ) {
        throw new BadRequestException('Invalid cart item');
      }

      // =========================
      // SINGLE VENDOR VALIDATION
      // =========================

      // const currentVendorId = product.vendorId.toString();

      // if (!vendorId) {
      //   vendorId = currentVendorId;
      // }

      // if (vendorId !== currentVendorId) {
      //   throw new BadRequestException(
      //     'All cart items must belong to same vendor',
      //   );
      // }

      // =========================
      // STOCK VALIDATION
      // =========================

      if (variant.stock < item.quantity) {
        throw new BadRequestException(`${product.name} is out of stock`);
      }

      // =========================
      // PRICE CALCULATION
      // =========================

      const sellingPrice = variant.offeredPrice;

      const totalPrice = sellingPrice * item.quantity;

      subTotal += totalPrice;

      cartItems.push({
        productId: product,
        variantId: variant,
        quantity: item.quantity,
        price: sellingPrice,
        totalPrice,
      });
    }

    // =========================
    // FIND COUPON
    // =========================

    const coupon = await this.couponModel.findOne({
      code: couponCode.trim().toUpperCase(),
      isActive: true,
    });



    if (!coupon) {
      throw new BadRequestException('Coupon not found');
    }

    const now = new Date();

    if (coupon.startsAt && now < coupon.startsAt) {
      throw new BadRequestException('Coupon not started yet');
    }

    if (coupon.expiresAt && now >= coupon.expiresAt) {
      throw new BadRequestException('Coupon expired');
    }

    if (
      coupon.totalUsageLimit > 0 &&
      coupon.totalUsed >= coupon.totalUsageLimit
    ) {
      throw new BadRequestException('Coupon usage limit exceeded');
    }

    const userCouponUsage = await this.couponUsageModel.countDocuments({
      userId: new Types.ObjectId(userId),
      couponId: coupon._id,
    });

    if (
      coupon.usageLimitPerUser > 0 &&
      userCouponUsage >= coupon.usageLimitPerUser
    ) {
      throw new BadRequestException('You already used this coupon');
    }

    if (coupon.minimumOrderAmount > 0 && subTotal < coupon.minimumOrderAmount) {
      throw new BadRequestException(
        `Minimum order amount should be ₹${coupon.minimumOrderAmount}`,
      );
    }

    if (coupon.scope === CouponScope.VENDOR && coupon.vendorId) {
      if (coupon.vendorId.toString() !== vendorId) {
        throw new BadRequestException('Coupon not applicable for this vendor');
      }
    }

    let discount = 0;

    if (coupon.type === CouponType.PERCENTAGE) {
      discount = (subTotal * coupon.value) / 100;

      if (coupon.maximumDiscount && discount > coupon.maximumDiscount) {
        discount = coupon.maximumDiscount;
      }
    } else {
      discount = coupon.value;
    }

    if (discount > subTotal) {
      discount = subTotal;
    }

    const finalTotal = subTotal - discount;

    return ApiResponse.success('Coupon applied successfully', {
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        scope: coupon.scope,
      },

      cartSummary: {
        totalItems: cart.items.length,
        subTotal,
        discount,
        finalTotal,
      },

      appliedDiscount: {
        amount: discount,
        couponCode: coupon.code,
      },

      cartItems,
    });
  }
  async validateCouponForAmount(userId: string, couponCode: string, amount: number, vendorId?: string) {
    const coupon = await this.couponModel.findOne({
      code: couponCode.trim().toUpperCase(),
      isActive: true,
    });

    if (!coupon) {
      throw new BadRequestException('Coupon not found');
    }

    const now = new Date();

    if (coupon.startsAt && now < coupon.startsAt) {
      throw new BadRequestException('Coupon not started yet');
    }

    if (coupon.expiresAt && now >= coupon.expiresAt) {
      throw new BadRequestException('Coupon expired');
    }

    if (
      coupon.totalUsageLimit > 0 &&
      coupon.totalUsed >= coupon.totalUsageLimit
    ) {
      throw new BadRequestException('Coupon usage limit exceeded');
    }

    const userCouponUsage = await this.couponUsageModel.countDocuments({
      userId: new Types.ObjectId(userId),
      couponId: coupon._id,
    });

    if (
      coupon.usageLimitPerUser > 0 &&
      userCouponUsage >= coupon.usageLimitPerUser
    ) {
      throw new BadRequestException('You already used this coupon');
    }

    if (coupon.minimumOrderAmount > 0 && amount < coupon.minimumOrderAmount) {
      throw new BadRequestException(
        `Minimum order amount should be ₹${coupon.minimumOrderAmount}`,
      );
    }

    if (coupon.scope === CouponScope.VENDOR && coupon.vendorId && vendorId) {
      if (coupon.vendorId.toString() !== vendorId) {
        throw new BadRequestException('Coupon not applicable for this course');
      }
    }

    let discount = 0;

    if (coupon.type === CouponType.PERCENTAGE) {
      discount = (amount * coupon.value) / 100;

      if (coupon.maximumDiscount && discount > coupon.maximumDiscount) {
        discount = coupon.maximumDiscount;
      }
    } else {
      discount = coupon.value;
    }

    if (discount > amount) {
      discount = amount;
    }

    return {
      coupon,
      discount,
    };
  }

  async recordCourseCouponUsage(userId: string, couponId: string, coursePurchaseId: string, session?: any) {
    await this.couponUsageModel.create([{
      userId: new Types.ObjectId(userId),
      couponId: new Types.ObjectId(couponId),
      coursePurchaseId: new Types.ObjectId(coursePurchaseId),
      usedCount: 1
    }], { session });

    await this.couponModel.findByIdAndUpdate(new Types.ObjectId(couponId), {
      $inc: { totalUsed: 1 }
    }, { session });
  }
}
