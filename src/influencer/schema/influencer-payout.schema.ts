import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { Document, Types } from 'mongoose';

export type InfluencerPayoutDocument = InfluencerPayout & Document;

export enum InfluencerPayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  FAILED = 'failed',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class InfluencerPayout {
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

  @Prop({ required: true })
  totalOrders!: number;

  @Prop({ required: true })
  totalSales!: number;

  @Prop({ required: true })
  totalProfit!: number;

  @Prop({ required: true })
  commissionRate!: number;

  @Prop({ required: true })
  totalCommission!: number;

  @Prop({ required: true })
  payoutMonth!: number;

  @Prop({ required: true })
  payoutYear!: number;

  @Prop({
    enum: InfluencerPayoutStatus,
    default: InfluencerPayoutStatus.PENDING,
  })
  status!: InfluencerPayoutStatus;

  @Prop()
  transactionId?: string;

  @Prop()
  paidAt?: Date;

  @Prop()
  remarks?: string;

  /**
   * Dedicated rejection/failure reason field.
   * Populated on admin rejection or failure; separate from general `remarks`.
   */
  @Prop()
  rejectionReason?: string;

  @Prop({
    type: [Types.ObjectId],
    ref: 'InfluencerCommission',
    default: [],
  })
  commissionIds!: Types.ObjectId[];

  @Prop()
  settledAt?: Date;

  @Prop({ default: false })
  isSettled!: boolean;

  /**
   * Immutable snapshot of the creator's bank/UPI details
   * taken at the exact moment of the payout request.
   * Fields: accountHolderName, bankName, accountNumber, ifscCode, upiId (optional).
   */
  @Prop({ type: Object })
  bankAccountSnapshot?: Record<string, any>;
}

export const InfluencerPayoutSchema =
  SchemaFactory.createForClass(InfluencerPayout);
