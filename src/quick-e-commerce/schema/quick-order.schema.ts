import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";


export enum PaymentMethod {
    WALLET = "WALLET",
    CASH_ON_DELIVERY = "CASH_ON_DELIVERY",
    WALLET_PLUS_COD = "WALLET_PLUS_COD"
}
export enum PaymentStatus {
    PENDING = "PENDING",
    PAID = "PAID",
    FAILED = "FAILED",
    REFUNDED = "REFUNDED"
}
export enum QuickOrderStatus {
    PLACED = "PLACED",
    PROCESSING = "PROCESSING",
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
    PARTIALLY_DELIVERED = "PARTIALLY_DELIVERED",
    DELIVERED = "DELIVERED",
    PARTIALLY_CANCELLED = "PARTIALLY_CANCELLED",
    CANCELLED = "CANCELLED"
}

export enum OrderItemStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    PROCESSING = 'processing',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
    RETURNED = 'returned',
}

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
    costPrice!: number;

    @Prop({ required: true })
    salesPrice!: number;

    @Prop({ required: true })
    offeredPrice!: number;

    @Prop({ required: true })
    totalPrice!: number;

    @Prop({ type: Types.ObjectId, ref: 'Coupon' })
    couponId?: Types.ObjectId

    @Prop({ type: String })
    couponCode?: string

    @Prop({ type: Number })
    appliedCouponDiscountAmount?: number


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


export type QuickOrderDocument = QuickOrder & Document

@Schema({ timestamps: true })
export class QuickOrder {

    @Prop({ type: Types.ObjectId, ref: "User", required: true })
    customerId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "Address", required: true })
    addressId: Types.ObjectId;

    @Prop({ type: ShippingAddressSchema, required: true })
    shippingAddress: ShippingAddress

    @Prop({ type: [OrderItemSchema], default: [] })
    items: OrderItem[]

    @Prop({
        enum: PaymentMethod,
        required: true
    })
    paymentMethod: PaymentMethod;

    @Prop({
        enum: PaymentStatus,
        default: PaymentStatus.PENDING
    })
    paymentStatus: PaymentStatus;

    @Prop({ type: [Types.ObjectId], ref: 'VendorQuickOrder', default: [] })
    vendorOrders: Types.ObjectId[]

    @Prop()
    transactionId?: string;

    @Prop({ default: 0 })
    subtotal: number;

    @Prop({ default: 0 })
    deliveryCharge: number;

    @Prop({ default: 0 })
    tax: number;

    @Prop({ default: 0 })
    packagingCharge: number;

    @Prop({ default: 0 })
    discount: number;

    @Prop({ default: 0 })
    grandTotal: number;

    @Prop({ type: AppliedCouponSchema })
    appliedCoupon?: AppliedCoupon;

    @Prop({
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number],
            default: [0, 0],
        },
    })
    location!: {
        type: string;
        coordinates: number[];
    };

    @Prop({
        enum: QuickOrderStatus,
        default: QuickOrderStatus.PLACED
    })
    status: QuickOrderStatus;

    @Prop()
    notes?: string;
}

export const QuickOrderSchema = SchemaFactory.createForClass(QuickOrder)