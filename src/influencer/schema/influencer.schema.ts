// ===============================
// influencer.schema.ts
// ===============================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { Document, Types } from 'mongoose';

export type InfluencerDocument = Influencer & Document;

export enum InfluencerStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  PENDING = 'pending',
  REJECTED = 'rejected'
}

@Schema({ timestamps: true })
export class Influencer {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    required: true,
  })
  name!: string;

  @Prop({type:Types.ObjectId,ref:"Media"})
  profilePicture?:Types.ObjectId

  @Prop({
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true,
  })
  referralCode?: string;

  @Prop()
  bio?: string;

  @Prop()
  instagram?: string;

  @Prop()
  youtube?: string;

  @Prop()
  tiktok?: string;

  @Prop()
  facebook?: string;

  @Prop()
  snapchat?: string;

  @Prop({
    default: 0,
  })
  followers!: number;

  // Custom commission % (strictly null by default; NO global fallback)
  @Prop({
    type: Number,
    default: null,
    min: 0,
    max: 100,
  })
  commissionRate?: number | null;

  @Prop({
    enum: InfluencerStatus,
    default: InfluencerStatus.PENDING,
  })
  status!: InfluencerStatus;

  @Prop({
    default: 0,
  })
  totalSales!: number;

  @Prop({ default: 0 })
  totalOrders!: number

  @Prop({ default: 0 })
  totalSignups!: number;

  @Prop({
    default: 0,
  })
  totalCommissionEarned!: number;

  @Prop({
    default: 0,
  })
  pendingCommission!: number;

  @Prop({
    default: 0,
  })
  approvedCommission!: number;

  @Prop({
    default: 0,
  })
  paidCommission!: number;

  @Prop({
    type: Types.ObjectId, ref: "User",
    default: null
  })
  invitedBy?: Types.ObjectId

  @Prop({
    default: false,
  })
  isDeleted!: boolean;
  @Prop({
    default: true,
  })
  isActive!: boolean;
}

const InfluencerSchema = SchemaFactory.createForClass(Influencer)

InfluencerSchema.virtual('coupons', {
  ref: 'Coupon',
  localField: '_id',
  foreignField: 'influencerId',
  justOne: false,
});

InfluencerSchema.set('toObject', {
  virtuals: true,
});

InfluencerSchema.set('toJSON', {
  virtuals: true,
});

export { InfluencerSchema };
