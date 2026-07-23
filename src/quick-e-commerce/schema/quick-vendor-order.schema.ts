import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";


import { OrderItem, OrderItemSchema, PaymentStatus } from "./quick-order.schema";

export enum VendorOrderStatus {

    PREPARING = "PREPARING",

    WAITING_FOR_DELIVERY_BOY = "WAITING_FOR_DELIVERY_BOY",

    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",

    DELIVERED = "DELIVERED",

    CANCELLED = "CANCELLED"
}

export type VendorOrderDocument = VendorQuickOrder & Document
@Schema({ timestamps: true })
export class VendorQuickOrder {

    @Prop({ type: Types.ObjectId, ref: "QuickOrder" })
    quickOrderId: Types.ObjectId;

    @Prop({ type: [OrderItemSchema], default: [] })
    items: OrderItem[];



    @Prop({ type: Types.ObjectId, ref: "Vendor" })
    vendorId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "DeliveryPerson", default: null })
    deliveryPersonId: Types.ObjectId | null;

    @Prop({
        enum: PaymentStatus,
        default: PaymentStatus.PENDING
    })
    paymentStatus: PaymentStatus;

    @Prop()
    subtotal: number;

    @Prop()
    packingCharge: number;

    @Prop()
    deliveryCharge: number;

    @Prop()
    tax: number;

    @Prop()
    total: number;

    @Prop({ type: Types.ObjectId, ref: 'Coupon' })
    couponId?: Types.ObjectId

    @Prop({ type: String })
    couponCode?: string

    @Prop({ type: Types.ObjectId, ref: 'Influencer' })
    influencerId?: Types.ObjectId;

    @Prop()
    influencerCommissionRate?: number;

    @Prop()
    influencerCommissionAmount?: number;

    @Prop({ type: Number })
    appliedCouponDiscountAmount?: number

    @Prop({ default: 0 })
    discountAmount?: number;

    @Prop({ default: 0 })
    commissionAmount?: number

    @Prop({ default: 0 })
    commissionRate: number

    @Prop()
    estimatedPreparationMinutes: number;

    @Prop()
    estimatedDeliveryMinutes: number;

    @Prop()
    acceptedAt: Date;

    @Prop()
    readyAt: Date;

    @Prop()
    deliveredAt: Date;


    @Prop()
    cancelledAt: Date;

    @Prop()
    cancelledReason: string;

    @Prop({
        enum: VendorOrderStatus,
        default: VendorOrderStatus.PREPARING
    })
    status: VendorOrderStatus;

    @Prop({ type: [Types.ObjectId], ref: 'Media', default: [] })
    deliveryProofImages: Types.ObjectId[];

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

}

export const VendorOrderSchema = SchemaFactory.createForClass(VendorQuickOrder)