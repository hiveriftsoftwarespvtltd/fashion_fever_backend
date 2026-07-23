import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { PaymentMethod } from "src/order/schema/order.schema";
import { CommissionOn } from "src/admin/schema/commission-rate.schema";


export enum BookingStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  ONGOING = "ONGOING",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
  RESCHEDULED = "RESCHEDULED"
}

export enum BookingPaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  REFUNDED = "REFUNDED",
  PARTIALLY_PAID = "PARTIALLY_PAID"
}

@Schema({ _id: false })
export class BookingItem {

  @Prop({
    type: Types.ObjectId,
    ref: 'Service',
    required: true,
  })
  serviceId!: Types.ObjectId;


  @Prop({ required: true })
  serviceName!: string;

  @Prop({ required: true })
  costPrice!: number;

  @Prop({ required: true })
  sellingPrice!: number;

  @Prop({ required: true })
  offeredPrice!: number;



  @Prop()
  total!: number;
}

export const BookingItemSchema = SchemaFactory.createForClass(BookingItem)

export type ServiceBookingDocument = ServiceBooking & Document
@Schema({ timestamps: true })
export class ServiceBooking {

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ServiceProvider' })
  providerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ServiceStaff' })
  staffId?: Types.ObjectId;

  // @Prop({ type: Types.ObjectId, ref: 'Service' })
  // serviceId!: Types.ObjectId;

  @Prop({
    type: [BookingItemSchema],
    default: [],
  })
  items!: BookingItem[];

  @Prop()
  bookingDate!: Date;

  @Prop()
  slotStartTime!: Date;

  @Prop()
  slotEndTime!: Date;

  @Prop()
  serviceAddress!: string;

  @Prop()
  subtotal!: number;

  @Prop({ type: Types.ObjectId, ref: 'Coupon' })
  couponId?: Types.ObjectId;

  @Prop()
  couponCode?: string;

  @Prop()
  couponDiscount!: number;

  @Prop()
  influencerDiscount!: number;

  @Prop()
  platformCommission!: number;

  @Prop()
  totalAmount!: number;

  @Prop()
  advanceAmount!: number;

  @Prop()
  remainingAmount!: number;

  @Prop({
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  bookingStatus!: BookingStatus;

  @Prop({ default: false })
  isRescheduled!: boolean;

  @Prop()
  rescheduledAt?: Date;

  @Prop({
    enum: BookingPaymentStatus,
    default: BookingPaymentStatus.PENDING,
  })
  paymentStatus!: string;

  @Prop({ enum: PaymentMethod, default: PaymentMethod.CASH_ON_DELIVERY })
  paymentMethod!: string;

  @Prop({ default: 0 })
  walletAmountUsed!: number;

  @Prop({ default: 0 })
  walletRefundedAmount!: number;

  @Prop({ type: Object, default: {} })
  paymentMeta!: any;

  // ── Commission / Payout fields ──────────────────────────────────
  @Prop({ default: 0 })
  platformCommissionRate!: number;

  @Prop({ default: CommissionOn.PROFITVALUE, enum: CommissionOn })
  platformCommissionOn!: CommissionOn;

  @Prop({ default: 0 })
  platformCommissionAmount!: number;

  @Prop({ default: 0 })
  providerPayoutAmount!: number;

  @Prop({ default: false })
  isSettled!: boolean;
}

export const ServiceBookingSchema = SchemaFactory.createForClass(ServiceBooking)