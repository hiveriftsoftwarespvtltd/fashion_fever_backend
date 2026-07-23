// ===============================
// coupon.schema.ts
// ===============================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { Document, Types } from 'mongoose';

export type CouponDocument = Coupon & Document;

export enum CouponType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}


export enum CouponScope {
  PLATFORM = 'platform',
  PRODUCT = 'product',
  QUICK_DELIVERY = 'quick_delivery',
  SERVICE = 'service',
  COURSE = 'course',
  VENDOR = 'vendor'
}


export enum CouponFor {
  USER = 'user',
  ADMIN = 'admin',
  INFLUENCER = 'influencer',
  EDUCATOR = 'educator',
  SERVICE_PROVIDERS = 'service_providers'

}


export enum OwnerType {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  INFLUENCER = 'influencer',
  EDUCATOR = 'educator',
  SERVICE_PROVIDER = 'service_provider',
  VENDOR = 'vendor'
}


@Schema({ timestamps: true })
export class Coupon {
  @Prop({
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  })
  code!: string;

  @Prop({
    enum: CouponType,
    required: true,
  })
  type!: CouponType;

  @Prop({
    required: true,
  })
  value!: number;

  @Prop({
    type: Types.ObjectId,
    ref: 'Vendor',
  })
  vendorId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Influencer',
  })
  influencerId?: Types.ObjectId;

  @Prop({
    enum: CouponScope,
    default: CouponScope.PLATFORM,
  })
  scope!: CouponScope;

  @Prop({
    default: 0,
  })
  minimumOrderAmount!: number;

  @Prop()
  maximumDiscount?: number;

  @Prop({
    default: 1,
  })
  usageLimitPerUser!: number;

  @Prop({
    default: 0,
  })
  totalUsageLimit!: number;

  @Prop({
    default: 0,
  })
  totalUsed!: number;

  @Prop({
    default: true,
  })
  isActive!: boolean;

  @Prop()
  startsAt?: Date;

  @Prop()
  expiresAt?: Date;

  @Prop()
  description?: string;

  @Prop({ default: 0 })
  totalSalesGenerated!: number;

  @Prop({ default: true })
  isInfluencerCoupon!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy!: Types.ObjectId

  @Prop({ type: String, enum: OwnerType, default: OwnerType.SUPER_ADMIN })
  ownerType!: OwnerType

  @Prop({ type: Types.ObjectId, default: null })
  ownerId: Types.ObjectId

  @Prop({ type: [Types.ObjectId], ref: 'Product', default: [] })
  appliedProducts!: Types.ObjectId[]

  @Prop({ type: [Types.ObjectId], ref: 'Service', default: [] })
  appliedServices!: Types.ObjectId[]

  @Prop({ type: [Types.ObjectId], ref: 'Course', default: [] })
  appliedCourses!: Types.ObjectId[]

  @Prop({ type: String, enum: CouponFor, default: CouponFor.USER })
  couponFor!: CouponFor


}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
