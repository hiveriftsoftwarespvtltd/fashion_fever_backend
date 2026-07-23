import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { Document, Types } from 'mongoose';

export type InfluencerCommissionDocument = InfluencerCommission & Document;

export enum CommissionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  REVERSED = 'reversed',
}

@Schema({ timestamps: true })
export class InfluencerCommission {
  @Prop({
    type: Types.ObjectId,
    ref: 'Influencer',
    required: true,
  })
  influencerId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  influencerUserId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Order',
    required: false,
    default: null,
  })
  orderId?: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'VendorOrder',
    required: false,
    default: null,
  })
  vendorOrderId?: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'Vendor',
    required: true,
  })
  vendorId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Coupon',
  })
  couponId?: Types.ObjectId;

  @Prop({
  type: Types.ObjectId,
  ref: 'InfluencerPayout',
})
payoutId?: Types.ObjectId;

  // financial snapshot
  @Prop({ required: true })
  orderAmount!: number;

  @Prop({ default: 0 })
  discountAmount!: number;

  @Prop({ required: true })
  finalOrderAmount!: number;

  @Prop({ required: true })
  totalCostPrice!: number;

  @Prop({ required: true })
  grossProfit!: number;

  @Prop({ default: 0 })
  shippingCost!: number;

  @Prop({ default: 0 })
  taxAmount!: number;

  @Prop({ default: 0 })
  platformCommissionAmount!: number;

  @Prop({ required: true })
  commissionRate!: number;

  @Prop({ required: true })
  commissionAmount!: number;

  @Prop({
    enum: CommissionStatus,
    default: CommissionStatus.PENDING,
  })
  status!: CommissionStatus;

  // monthly settlement tracking
  @Prop({ required: true })
  commissionMonth!: number;

  @Prop({ required: true })
  commissionYear!: number;

  @Prop({ default: false })
  isSettled!: boolean;

  @Prop()
  settledAt?: Date;

  @Prop()
  paidAt?: Date;

  @Prop()
  payoutReference?: string;

  @Prop()
  notes?: string;

  @Prop({ default: false })
  isReversed!: boolean;

  @Prop()
  reversedAt?: Date;

  @Prop()
  reversalReason?: string;

  @Prop({ default: false })
  isDelivered!: boolean;

  @Prop({ default: 0 })
  netProfit!: number;

  @Prop()
  deliveredAt?: Date;
}

export const InfluencerCommissionSchema =
  SchemaFactory.createForClass(InfluencerCommission);

// InfluencerCommissionSchema.index({
//   influencerId: 1,
//   vendorId: 1,
// }, { unique: true });
