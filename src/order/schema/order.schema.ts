// // ===============================
// // order.schema.ts
// // ===============================

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types, Document } from "mongoose";

// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

// import { Document, Types } from 'mongoose';
// import { VendorShipment } from './vendor-shipment.schema';

// export type OrderDocument = Order & Document;

// // ===============================
// // ENUMS
// // ===============================

// export enum OrderStatus {
//   PENDING = 'pending',
//   CONFIRMED = 'confirmed',
//   PROCESSING = 'processing',
//   SHIPPED = 'shipped',
//   DELIVERED = 'delivered',
//   CANCELLED = 'cancelled',
//   RETURNED = 'returned',
// }

// export enum PaymentMethod {
//   CASH_ON_DELIVERY = 'CashOnDelivery',
//   ONLINE = 'Online',
// }

// export enum PaymentStatus {
//   PENDING = 'pending',
//   PAID = 'paid',
//   FAILED = 'failed',
//   REFUNDED = 'refunded',
// }

// // ===============================
// // ORDER ITEM
// // ===============================

// @Schema({ _id: false })
// export class OrderItem {
//   @Prop({
//     type: Types.ObjectId,
//     ref: 'Product',
//     required: true,
//   })
//   productId!: Types.ObjectId;

//   @Prop({
//     type: Types.ObjectId,
//     ref: 'ProductVariant',
//     required: true,
//   })
//   variantId!: Types.ObjectId;

//   @Prop({
//     type:Types.ObjectId,
//     ref:"Vendor",
//     required:true
//   })
//   vendorId!:Types.ObjectId

//   @Prop({
//     required: true,
//   })
//   productName!: string;

//   @Prop({
//     required: true,
//   })
//   sku!: string;

//   @Prop({
//     type: Object,
//     default: {},
//   })
//   attributes!: Record<string, string>;

//   @Prop({
//     required: true,
//   })
//   quantity!: number;

//  @Prop({required:true,min:0})
//   weight!:number

//   @Prop({required:true,min:0})
//   length!:number

//   @Prop({required:true,min:0})
//   width!:number

//   @Prop({required:true,min:0})
//   height!:number

//   @Prop({
//     required: true,
//   })
//   costPrice!: number;

//   @Prop({
//     default: 0,
//   })
//   salesPrice!: number;
//    @Prop({
//     default: 0,
//   })
//   offeredPrice!: number;

//   @Prop({
//     required: true,
//   })
//   totalPrice!: number;
// }

// export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

// // ===============================
// // APPLIED COUPON SNAPSHOT
// // ===============================

// @Schema({ _id: false })
// export class AppliedCoupon {
//   @Prop()
//   code?: string;

//   @Prop({
//     type: Types.ObjectId,
//     ref: 'Coupon',
//   })
//   couponId?: Types.ObjectId;

//   @Prop({
//     type: Types.ObjectId,
//     ref: 'Influencer',
//   })
//   influencerId?: Types.ObjectId;

//   @Prop()
//   influencerName?: string;

//   @Prop()
//   influencerCode?: string;

//   @Prop({ required: true })
//   couponType!: string;

//   @Prop({ required: true })
//   couponValue!: string;

//   @Prop({
//     default: 0,
//   })
//   discountAmount?: number;

//   @Prop({
//     default: 0,
//   })
//   influencerCommissionRate?: number;

//   @Prop({
//     default: 0,
//   })
//   influencerCommissionAmount?: number;
// }

// export const AppliedCouponSchema = SchemaFactory.createForClass(AppliedCoupon);

// @Schema({ _id: false })
// export class ShippingAddress {
//   @Prop()
//   fullName!: string;

//   @Prop()
//   phone!: string;

//   @Prop()
//   line1!: string;

//   @Prop()
//   line2?: string;

//   @Prop()
//   city!: string;

//   @Prop()
//   state!: string;

//   @Prop()
//   pincode!: string;

//   @Prop({ default: 'India' })
//   country?: string;
// }

// const ShippingAddressSchema = SchemaFactory.createForClass(ShippingAddress);

// @Schema({ timestamps: true })
// export class Order {
//   @Prop({
//     type: Types.ObjectId,
//     ref: 'User',
//     required: true,
//   })
//   userId!: Types.ObjectId;

//   @Prop({type:[VendorShipment],default:[]})
//   shipments!:VendorShipment[]

//   // @Prop({
//   //   type: Types.ObjectId,
//   //   ref: 'Vendor',
//   //   required: true,
//   // })
//   // vendorId!: Types.ObjectId;

//   @Prop({
//     type: ShippingAddress,
//     required: true,
//   })
//   shippingAddress!: ShippingAddress;

//   @Prop({
//     unique: true,
//   })
//   orderNumber!: string;

//   @Prop({
//     default: 0,
//   })
//   refundAmount!: number;

//   @Prop({
//     default: 0,
//   })
//   vendorPayoutAmount!: number;

//   @Prop()
//   vendorPaidAt?: Date;

//   @Prop({
//     default: false,
//   })
//   vendorPaid!: boolean;

//   @Prop({
//     type: Types.ObjectId,
//     ref: 'Address',
//   })
//   addressId?: Types.ObjectId;

//   @Prop({
//     type: [OrderItemSchema],
//     default: [],
//   })
//   items!: OrderItem[];

//   @Prop({
//     type: AppliedCouponSchema,
//   })
//   appliedCoupon?: AppliedCoupon;

//   @Prop({
//     enum: PaymentMethod,
//     default: PaymentMethod.CASH_ON_DELIVERY,
//   })
//   paymentMethod!: PaymentMethod;

//   @Prop({
//     enum: PaymentStatus,
//     default: PaymentStatus.PENDING,
//   })
//   paymentStatus!: PaymentStatus;

//   // gateway integration later
//   @Prop()
//   transactionId?: string;

//   @Prop()
//   paymentGateway?: string;

//   @Prop({
//     type: Object,
//   })
//   paymentMeta?: Record<string, any>;

//   // order status
//   @Prop({
//     enum: OrderStatus,
//     default: OrderStatus.PENDING,
//   })
//   orderStatus!: OrderStatus;

//   // pricing
//   @Prop({
//     default: 0,
//   })
//   subTotal!: number;

//   @Prop({
//     default: 0,
//   })
//   discount!: number;

//   @Prop({
//     default: 0,
//   })
//   shippingCharge!: number;

//   @Prop({
//     default: 0,
//   })
//   tax!: number;

//   @Prop({
//     required: true,
//   })
//   grandTotal!: number;

//   // tracking
//   @Prop()
//   trackingId?: string;

//   @Prop()
//   shippedAt?: Date;

//   @Prop()
//   deliveredAt?: Date;

//   @Prop({
//     type: Types.ObjectId,
//     ref: 'User',
//   })
//   cancelledBy?: Types.ObjectId;

//   @Prop()
//   cancelledAt?: Date;

//   @Prop()
//   cancellationReason?: string;

//   @Prop()
//   returnReason?: string;

//   @Prop()
//   returnedAt?: Date;

//   // purchase date
//   @Prop({
//     default: Date.now,
//   })
//   dateOfPurchase!: Date;

//   @Prop()
//   notes?: string;

//   @Prop({
//     default: false,
//   })
//   isDeleted!: boolean;

//   @Prop()
//   estimatedDeliveryDate?: Date;

//   @Prop()
//   platformCommissionAmount!: number;

//   @Prop()
//   influencerCommissionAmount!: number;

//   @Prop()
//   platformCommissionRate!: number;
// }

// export const OrderSchema = SchemaFactory.createForClass(Order);


export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',

  PARTIALLY_SHIPPED = 'partially_shipped',
  SHIPPED = 'shipped',

  PARTIALLY_DELIVERED = 'partially_delivered',
  DELIVERED = 'delivered',

  PARTIALLY_CANCELLED = 'partially_cancelled',
  CANCELLED = 'cancelled',

  PARTIALLY_RETURNED = 'partially_returned',
  RETURNED = 'returned',
}

export enum PaymentMethod {
  CASH_ON_DELIVERY = 'CashOnDelivery',
  ONLINE = 'Online',
  WALLET = 'Wallet',
  WALLET_PLUS_ONLINE = 'WalletPlusOnline',
  WALLET_PLUS_COD = 'WalletPlusCOD',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum OrderItemStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned',
}

@Schema({ _id: false })
export class ShippingAddress {
  @Prop()
  fullName!: string;

  @Prop({ required: true })
  phone!: string;

  @Prop({ required: true })
  line1!: string;

  @Prop()
  line2?: string;

  @Prop({ required: true })
  city!: string;

  @Prop({ required: true })
  state!: string;

  @Prop({ required: true })
  pincode!: string;

  @Prop({ default: 'India' })
  country!: string;
}

export const ShippingAddressSchema = SchemaFactory.createForClass(ShippingAddress)

@Schema({ _id: false })
export class AppliedCoupon {

  @Prop()
  code?: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Coupon',
  })
  couponId?: Types.ObjectId;

  @Prop()
  scope?: string;

  @Prop()
  couponType?: string;

  @Prop()
  couponValue?: number;

  @Prop()
  discountAmount?: number;

  @Prop({
    type: Types.ObjectId,
    ref: 'Influencer',
  })
  influencerId?: Types.ObjectId;

  @Prop()
  influencerCode?: string;

  @Prop()
  influencerCommissionRate?: number;

  @Prop()
  influencerCommissionAmount?: number;
}

export const AppliedCouponSchema = SchemaFactory.createForClass(AppliedCoupon)

@Schema({ _id: true })
export class OrderItem {

  @Prop({
    type: Types.ObjectId,
    ref: 'Product',
    required: true,
  })
  productId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'ProductVariant',
    required: true,
  })
  variantId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Vendor',
    required: true,
  })
  vendorId!: Types.ObjectId;

  @Prop({ required: true })
  productName!: string;

  @Prop({ required: true })
  sku!: string;

  @Prop({
    type: Object,
    default: {},
  })
  attributes!: Record<string, string>;

  @Prop({ required: true })
  quantity!: number;

  @Prop({ required: true })
  weight!: number;

  @Prop({ required: true })
  length!: number;

  @Prop({ required: true })
  width!: number;

  @Prop({ required: true })
  height!: number;

  @Prop({ required: true })
  costPrice!: number;

  @Prop({ required: true })
  salesPrice!: number;

  @Prop({ required: true })
  offeredPrice!: number;

  @Prop({ required: true })
  totalPrice!: number;

  // allocated discount
  @Prop({ default: 0 })
  discountAmount!: number;

  // after discount
  @Prop({ required: true })
  finalPrice!: number;

  @Prop({
    enum: OrderItemStatus,
    default: OrderItemStatus.PENDING,
  })
  status!: OrderItemStatus;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  cancellationReason?: string;

  @Prop()
  returnedAt?: Date;

  @Prop()
  returnReason?: string;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem)
export type OrderDocument = Order & Document

@Schema({ timestamps: true })
export class Order {

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    unique: true,
    required: true,
  })
  orderNumber!: string;

  @Prop({
    type: ShippingAddressSchema,
    required: true,
  })
  shippingAddress!: ShippingAddress;

  @Prop({
    type: [Types.ObjectId],
    ref: 'VendorOrder',
    default: [],
  })
  vendorOrders!: Types.ObjectId[];

  @Prop({
    type: AppliedCouponSchema,
  })
  appliedCoupon?: AppliedCoupon;

  @Prop({
    enum: PaymentMethod,
    default: PaymentMethod.CASH_ON_DELIVERY,
  })
  paymentMethod!: PaymentMethod;

  @Prop({
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus!: PaymentStatus;

  @Prop()
  transactionId?: string;

  @Prop()
  paymentGateway?: string;

  @Prop({
    type: Object,
  })
  paymentMeta?: Record<string, any>;

  @Prop({
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  orderStatus!: OrderStatus;

  @Prop({ default: 0 })
  subTotal!: number;

  @Prop({ default: 0 })
  discount!: number;

  @Prop({ default: 0 })
  shippingCharge!: number;

  @Prop({ default: 0 })
  codCharge!: number;


  @Prop({ default: 0 })
  tax!: number;

  @Prop({ required: true })
  grandTotal!: number;

  @Prop({ default: 0 })
  refundAmount!: number;

  @Prop({ default: 0 })
  walletAmountUsed!: number;

  @Prop({ default: 0 })
  walletRefundedAmount!: number;

  @Prop({ default: 0 })
  paidAmount!: number;

  @Prop({ default: 0 })
  platformComissionRate!: number;

  @Prop({ default: 0 })
  influencerComissionRate!: number;

  @Prop({ default: 0 })
  influencerComissionAmount!: number;

  @Prop({ default: 0 })
  platformComissionAmount!: number;

  @Prop({
    default: false,
  })
  isDeleted!: boolean;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  cancellationReason?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order)