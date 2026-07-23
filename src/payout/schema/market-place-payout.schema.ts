import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EarningRole } from './market-place-earning.schema';


export type MarketplacePayoutDocument = MarketplacePayout & Document;

export enum PayoutStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  UPI = 'UPI',
  CASH = 'CASH',
  WALLET = 'WALLET',
}

@Schema({
  timestamps: true,
})
export class MarketplacePayout {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    
  })
  userId!: Types.ObjectId;

  @Prop({
    enum: EarningRole,
    required: true,
  })
  role!: EarningRole;

  @Prop({
    required: true,
    min: 0,
  })
  totalAmount!: number;

  @Prop({
    default: 'INR',
  })
  currency!: string;

  @Prop({
    enum: PayoutStatus,
    default: PayoutStatus.PENDING,
    
  })
  status!: PayoutStatus;

  @Prop({
    enum: PaymentMethod,
  })
  paymentMethod?: PaymentMethod;

  @Prop()
  transactionReference?: string;

  @Prop()
  remarks?: string;

  @Prop()
  paidAt?: Date;


}

export const MarketplacePayoutSchema =
  SchemaFactory.createForClass(MarketplacePayout);