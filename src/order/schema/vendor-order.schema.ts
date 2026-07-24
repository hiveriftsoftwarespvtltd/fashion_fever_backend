import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  OrderItem,
  OrderItemSchema,
  OrderStatus,
  PaymentStatus,
  ShippingAddress,
  ShippingAddressSchema,
} from './order.schema';
import { CommissionOn } from 'src/admin/schema/commission-rate.schema';


export enum CancelledByEntity {
  VENDOR = 'VENDOR',
  USER = 'USER',
  PLATFORM = 'PLATFORM'
}

export type VendorOrderDocument = VendorOrder & Document;
@Schema({ timestamps: true })
export class VendorOrder {
  @Prop({
    type: Types.ObjectId,
    ref: 'Order',
    // required: false,
  })
  orderId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Vendor',
    required: false,
    default: null,
  })
  vendorId?: Types.ObjectId | null;

  @Prop({
    required: true,
  })
  orderNumber!: string;

  @Prop({
    type: ShippingAddressSchema,
    required: true,
  })
  shippingAddress!: ShippingAddress;

  @Prop({
    type: [OrderItemSchema],
    default: [],
  })
  items!: OrderItem[];

  @Prop({
    type: Types.ObjectId,
    ref: 'VendorShipment',
  })
  shipment?: Types.ObjectId;

  @Prop({ default: 0 })
  subTotal!: number;

  @Prop({ default: 0 })
  discount!: number;

  @Prop({ default: 0 })
  shippingCharge!: number;

  @Prop({ default: 0 })
  tax!: number;

  @Prop({ required: true })
  grandTotal!: number;

  @Prop({ default: 0 })
  commissionRate!: number;

  @Prop({ default: 0 })
  commissionAmount!: number;

  @Prop({ default: 0 })
  payoutAmount!: number;

  @Prop({
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  orderStatus!: OrderStatus;

  @Prop({ default: 0 })
  codCharge!: number;

  @Prop({
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus!: PaymentStatus;

  @Prop()
  estimatedDeliveryDate?: Date;

  @Prop()
  shippedAt?: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  cancellationReason?: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'User'
  })
  cancelledBy?: Types.ObjectId

  @Prop({ type: String, enum: CancelledByEntity, default: CancelledByEntity.USER })
  cancelledByEntity?: CancelledByEntity

  @Prop({ default: false })
  isVendorSettled!: boolean;

  @Prop()
  vendorSettledAt?: Date;

  @Prop({ default: 0 })
  platformCommissionRate!: number;

  @Prop({ default: CommissionOn.PROFITVALUE, enum: CommissionOn })
  platformCommissionOn!: CommissionOn;

  @Prop({ default: 0 })
  platformCommissionAmount!: number;

  @Prop({ default: 0 })
  influencerCommissionAmount!: number;

  @Prop({ default: 0 })
  netProfit?: number;

  @Prop({ default: 0 })
  grossProfit?: number;

  @Prop({ default: 0 })
  costPrice?: number;

  @Prop({ default: 0 })
  sellingPrice?: number;

  @Prop({ default: 0 })
  offeredPrice?: number;

  @Prop({
    type: Types.ObjectId,
    ref: 'VendorPayout',
  })
  vendorPayoutId?: Types.ObjectId;

  @Prop({ default: false })
  isSettled!: boolean;

  // ─── Rider Assignment (Standard Delivery) ───
  @Prop({
    type: Types.ObjectId,
    ref: 'DeliveryPerson',
    default: null,
  })
  deliveryPersonId?: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  deliveryStatus?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const VendorOrderSchema = SchemaFactory.createForClass(VendorOrder);
