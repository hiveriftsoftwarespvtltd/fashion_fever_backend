// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document, Types } from 'mongoose';

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

export enum VendorPayoutStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  REVERSED = 'reversed',
}

export enum PaymentMethod{
  UPI='upi',
  CARD='card',
  BANK_TRANSFER='bank_transfer'
}

// export type VendorPayoutDocument = VendorPayout & Document;

// @Schema({ timestamps: true })
// export class VendorPayout {
//   @Prop({ type: Types.ObjectId, ref: 'Vendor', required: true })
//   vendorId!: Types.ObjectId;

//   @Prop({ type: Types.ObjectId, ref: 'User', required: true })
//   vendorUserId!: Types.ObjectId;

//   @Prop({ type: Types.ObjectId, ref: 'Order', required: false })
//   orderId!: Types.ObjectId;

//   @Prop({ type: Types.ObjectId, ref: 'VendorOrder', required: true })
//   vendorOrderId!: Types.ObjectId;

//   @Prop({ required: true })
//   orderAmount!: number;

//   @Prop({ default: 0 })
//   discountAmount?: number;

//   @Prop({ required: true })
//   finalOrderAmount!: number;

//   @Prop({ required: true })
//   platformCommissionRate!: number;

//   @Prop({ required: true })
//   platformCommissionAmount!: number;

//   @Prop({ default: 0 })
//   influencerCommissionAmount!: number;

//   @Prop({ required: true })
//   payoutAmount!: number;

//   @Prop({ enum: VendorPayoutStatus, default: VendorPayoutStatus.PENDING })
//   status!: VendorPayoutStatus;

//   @Prop({enum:PaymentMethod,default:PaymentMethod.BANK_TRANSFER})
//   paymentMethod!:PaymentMethod;

//   @Prop({ default: false })
//   isSettled!: boolean;

//   @Prop()
//   settledAt?: Date;

//   @Prop()
//   payoutReference?: string;

//   @Prop()
//   paidAt?: Date;

//   @Prop()
//   notes?: string;

//   @Prop({ default: false })
//   isReversed!: boolean;

//   @Prop()
//   reversedAt?: Date;

//   @Prop()
//   reversalReason?: string;

//   @Prop()
//   paymentReference?: string;

//   @Prop()
//   transactionId?: string;

//   @Prop({
//     type: Types.ObjectId,
//     ref: 'User',
//   })
//   paidBy?: Types.ObjectId;

//    @Prop()
//   grossProfit?:number

//   @Prop()
//   costAmount?:number

//   @Prop()
//   platformFee?:number

//   @Prop()
//   shippingDeduction?:number

//   @Prop()
//   refundAmount?:number

//   @Prop()
//   taxAmount?:number

//   @Prop()
//   tdsAmount?:number

//   @Prop()
//   settlementMonth?:number

//   @Prop()
//   settlementYear?:number

//   @Prop({ default: 0 })
// couponDiscountAmount?: number;

//  @Prop()
//   netProfit?:number

// @Prop({ default: 0 })
// shippingCharge?: number;
// }

// export const VendorPayoutSchema = SchemaFactory.createForClass(VendorPayout);
export type VendorPayoutDocument = VendorPayout & Document
@Schema({ timestamps: true })
export class VendorPayout {

  @Prop({
    type: Types.ObjectId,
    ref: 'Vendor',
    required: true,
  })
  vendorId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  vendorUserId!: Types.ObjectId;

  @Prop({
    type: [Types.ObjectId],
    ref: 'VendorOrder',
    default: [],
  })
  vendorOrderIds!: Types.ObjectId[];

  @Prop({ required: true })
  totalOrders!: number;

  @Prop({ required: true })
  totalSales!: number;

  @Prop({ required: true })
  totalCommission!: number;

  @Prop({ default: 0 })
  totalInfluencerCommission!: number;

  @Prop({ default: 0 })
  totalShippingDeduction!: number;

  @Prop({ required: true })
  netPayout!: number;

  @Prop({ required: true })
  payoutMonth!: number;

  @Prop({ required: true })
  payoutYear!: number;

  @Prop({
    enum: VendorPayoutStatus,
    default: VendorPayoutStatus.PENDING,
  })
  status!: VendorPayoutStatus;

  @Prop()
  transactionId?: string;

  @Prop()
  paidAt?: Date;

  @Prop()
  remarks?: string;
}

export const VendorPayoutSchema = SchemaFactory.createForClass(VendorPayout);
