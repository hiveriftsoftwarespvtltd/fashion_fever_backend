import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Coupon, CouponDocument, CouponScope, CouponType, OwnerType } from './schema/coupon.schema';
import { CouponUsage, CouponUsageDocument } from './schema/coupon-usage.schema';
import { Service, ServiceDocument } from 'src/service/schema/service.schema';
import { ServiceProvider, ServiceProviderDocument } from 'src/service/schema/service-provider.schema';
import { ApiResponse } from 'src/common/responses/api-response';
import {
  CreateServiceCouponDto,
  UpdateServiceCouponDto,
  ValidateServiceCouponDTO,
} from './dto/coupon.dto';

@Injectable()
export class ServiceProviderCouponService {
  constructor(
    @InjectModel(Coupon.name) private couponModel: Model<CouponDocument>,
    @InjectModel(CouponUsage.name) private couponUsageModel: Model<CouponUsageDocument>,
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
    @InjectModel(ServiceProvider.name) private providerModel: Model<ServiceProviderDocument>,
  ) {}

  // ── Ownership guard helper ────────────────────────────────────────────────
  async resolveProviderId(user: any): Promise<string> {
    if (user?.serviceProviderId) {
      return user.serviceProviderId.toString();
    }
    const userId = user?._id || user?.id || user?.sub;
    if (userId) {
      const provider = await this.providerModel.findOne({
        $or: [
          { userId: new Types.ObjectId(userId) },
          { ownerId: new Types.ObjectId(userId) },
        ],
        isDeleted: { $ne: true },
      });
      if (provider) {
        return provider._id.toString();
      }
    }
    throw new ForbiddenException('Provider identity not found');
  }

  private async assertCouponOwnership(
    couponId: string,
    serviceProviderId: string,
  ): Promise<CouponDocument> {
    const coupon = await this.couponModel.findById(new Types.ObjectId(couponId));
    if (!coupon) throw new NotFoundException('Coupon not found');
    if (!coupon.serviceProviderId || coupon.serviceProviderId.toString() !== serviceProviderId) {
      throw new ForbiddenException('You do not own this coupon');
    }
    return coupon;
  }

  // ── Create ────────────────────────────────────────────────────────────────
  async createCoupon(serviceProviderId: string, dto: CreateServiceCouponDto) {
    if (!serviceProviderId) throw new ForbiddenException('Provider identity not found');

    // Verify the linked service belongs to this provider
    const service = await this.serviceModel.findOne({
      _id: new Types.ObjectId(dto.linkedServiceId),
      providerId: new Types.ObjectId(serviceProviderId),
      isDeleted: { $ne: true },
    });
    if (!service) {
      throw new ForbiddenException('Service not found or does not belong to your salon');
    }

    // Unique code check
    const existing = await this.couponModel.findOne({
      code: dto.code.trim().toUpperCase(),
    });
    if (existing) throw new ConflictException('Coupon code already exists');

    // If expiresAt was provided without time (e.g., midnight UTC from datepicker), adjust to end of day
    let expiresAt: Date | undefined = undefined;
    if (dto.expiresAt) {
      expiresAt = new Date(dto.expiresAt);
      if (
        expiresAt.getUTCHours() === 0 &&
        expiresAt.getUTCMinutes() === 0 &&
        expiresAt.getUTCSeconds() === 0
      ) {
        expiresAt.setUTCHours(23, 59, 59, 999);
      }
    }

    const coupon = await this.couponModel.create({
      code: dto.code.trim().toUpperCase(),
      type: dto.type,
      value: dto.value,
      scope: CouponScope.SERVICE,
      serviceProviderId: new Types.ObjectId(serviceProviderId),
      linkedServiceId: new Types.ObjectId(dto.linkedServiceId),
      minimumOrderAmount: dto.minimumOrderAmount ?? 0,
      maximumDiscount: dto.maximumDiscount,
      usageLimitPerUser: dto.usageLimitPerUser ?? 1,
      totalUsageLimit: dto.totalUsageLimit ?? 0,
      startsAt: dto.startsAt,
      expiresAt: expiresAt,
      isActive: dto.isActive ?? true,
      description: dto.description,
      totalUsed: 0,
      isInfluencerCoupon: false,
      ownerType: OwnerType.SERVICE_PROVIDER,
      ownerId: new Types.ObjectId(serviceProviderId),
    });

    return ApiResponse.success('Coupon created successfully', coupon);
  }

  // ── List SP's coupons ─────────────────────────────────────────────────────
  async myCoupons(serviceProviderId: string) {
    if (!serviceProviderId) throw new ForbiddenException('Provider identity not found');

    const coupons = await this.couponModel
      .find({ serviceProviderId: new Types.ObjectId(serviceProviderId) })
      .populate({
        path: 'linkedServiceId',
        select: 'title offeredPrice sellingPrice costPrice durationMinutes images',
        populate: { path: 'images', select: 'url originalName' },
      })
      .sort({ createdAt: -1 })
      .lean();

    return ApiResponse.success('Your coupons', coupons);
  }

  // ── List SP's services (for dropdown) ────────────────────────────────────
  async myServices(serviceProviderId: string) {
    if (!serviceProviderId) throw new ForbiddenException('Provider identity not found');

    const services = await this.serviceModel
      .find({
        providerId: new Types.ObjectId(serviceProviderId),
        isDeleted: { $ne: true },
        isActive: true,
      })
      .populate('images', 'url originalName')
      .select('title offeredPrice sellingPrice costPrice durationMinutes images')
      .sort({ title: 1 })
      .lean();

    return ApiResponse.success('Your services', services);
  }

  // ── Update ────────────────────────────────────────────────────────────────
  async updateCoupon(serviceProviderId: string, id: string, dto: UpdateServiceCouponDto) {
    const coupon = await this.assertCouponOwnership(id, serviceProviderId);

    // If linkedServiceId is being changed, verify the new service also belongs to this provider
    if (dto.linkedServiceId && dto.linkedServiceId !== coupon.linkedServiceId?.toString()) {
      const service = await this.serviceModel.findOne({
        _id: new Types.ObjectId(dto.linkedServiceId),
        providerId: new Types.ObjectId(serviceProviderId),
      });
      if (!service) {
        throw new ForbiddenException('New service does not belong to your salon');
      }
    }

    const filtered = Object.fromEntries(
      Object.entries(dto).filter(([_, v]) => v !== undefined && v !== null && v !== ''),
    );
    if (filtered.code) filtered.code = (filtered.code as string).trim().toUpperCase();
    if (filtered.linkedServiceId) filtered.linkedServiceId = new Types.ObjectId(filtered.linkedServiceId as string);
    if (filtered.expiresAt) {
      const exp = new Date(filtered.expiresAt as string);
      if (
        exp.getUTCHours() === 0 &&
        exp.getUTCMinutes() === 0 &&
        exp.getUTCSeconds() === 0
      ) {
        exp.setUTCHours(23, 59, 59, 999);
      }
      filtered.expiresAt = exp;
    }

    Object.assign(coupon, filtered);
    await coupon.save();

    return ApiResponse.success('Coupon updated successfully', coupon);
  }

  // ── Toggle active ─────────────────────────────────────────────────────────
  async toggleCoupon(serviceProviderId: string, id: string) {
    const coupon = await this.assertCouponOwnership(id, serviceProviderId);
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    return ApiResponse.success(`Coupon ${coupon.isActive ? 'activated' : 'deactivated'}`, { isActive: coupon.isActive });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async deleteCoupon(serviceProviderId: string, id: string) {
    const coupon = await this.assertCouponOwnership(id, serviceProviderId);
    await coupon.deleteOne();
    return ApiResponse.success('Coupon deleted successfully');
  }

  // ── Customer-facing: validate a service coupon ────────────────────────────
  /**
   * Validates coupon ownership + service match + expiry + usage limits.
   * Returns the computed discount amount for the linked service.
   * Called by the customer during Step 4 of booking flow.
   */
  async validateServiceCoupon(dto: ValidateServiceCouponDTO, userId: string) {
    const coupon = await this.couponModel.findOne({
      code: dto.couponCode.trim().toUpperCase(),
      isActive: true,
      scope: CouponScope.SERVICE,
    });

    if (!coupon) throw new NotFoundException('Coupon not found or is not a service coupon');

    // 1. Provider ownership check (server-side lookup)
    if (!coupon.serviceProviderId || coupon.serviceProviderId.toString() !== dto.providerId) {
      throw new BadRequestException('This coupon is not valid for the selected salon');
    }

    // 2. Service match
    if (!coupon.linkedServiceId || coupon.linkedServiceId.toString() !== dto.serviceId) {
      throw new BadRequestException('This coupon does not apply to the selected service');
    }

    // 3. Date checks
    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      throw new BadRequestException('This coupon is not yet active');
    }
    if (coupon.expiresAt && now >= coupon.expiresAt) {
      throw new BadRequestException('This coupon has expired');
    }

    // 4. Total usage limit
    if (coupon.totalUsageLimit > 0 && coupon.totalUsed >= coupon.totalUsageLimit) {
      throw new BadRequestException('Coupon usage limit has been reached');
    }

    // 5. Per-user usage
    if (coupon.usageLimitPerUser > 0) {
      const userUsage = await this.couponUsageModel.countDocuments({
        couponId: coupon._id,
        userId: new Types.ObjectId(userId),
      });
      if (userUsage >= coupon.usageLimitPerUser) {
        throw new BadRequestException('You have already used this coupon');
      }
    }

    // 6. Calculate discount against linked service price
    const service = await this.serviceModel.findById(new Types.ObjectId(dto.serviceId));
    if (!service) throw new NotFoundException('Service not found');

    const price = service.offeredPrice || service.sellingPrice || (service as any).costPrice || 0;

    if (coupon.minimumOrderAmount > 0 && price < coupon.minimumOrderAmount) {
      throw new BadRequestException(`Minimum service price of ₹${coupon.minimumOrderAmount} required`);
    }

    let discountAmount = 0;
    if (coupon.type === CouponType.PERCENTAGE) {
      discountAmount = (price * coupon.value) / 100;
      if (coupon.maximumDiscount && discountAmount > coupon.maximumDiscount) {
        discountAmount = coupon.maximumDiscount;
      }
    } else {
      discountAmount = coupon.value;
    }

    // Cap at service price
    discountAmount = Math.min(discountAmount, price);

    return ApiResponse.success('Coupon is valid', {
      couponId: coupon._id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      appliedToServiceId: dto.serviceId,
      serviceName: service.title,
      servicePrice: price,
    });
  }

  // ── Admin: list all SP coupons ────────────────────────────────────────────
  async adminGetByProvider(providerId: string) {
    const coupons = await this.couponModel
      .find({ serviceProviderId: new Types.ObjectId(providerId) })
      .populate('linkedServiceId', 'title offeredPrice')
      .sort({ createdAt: -1 })
      .lean();
    return ApiResponse.success('Provider coupons', coupons);
  }

  async adminListServiceCoupons(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [coupons, total] = await Promise.all([
      this.couponModel
        .find({ scope: CouponScope.SERVICE })
        .populate('serviceProviderId', 'businessName city')
        .populate('linkedServiceId', 'title offeredPrice')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.couponModel.countDocuments({ scope: CouponScope.SERVICE }),
    ]);
    return ApiResponse.success('All service coupons', { coupons, total, page, limit });
  }

  async adminForceDeactivate(couponId: string) {
    const coupon = await this.couponModel.findByIdAndUpdate(
      new Types.ObjectId(couponId),
      { isActive: false },
      { new: true },
    );
    if (!coupon) throw new NotFoundException('Coupon not found');
    return ApiResponse.success('Coupon deactivated by admin', coupon);
  }
}
