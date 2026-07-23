import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { PaymentMethod } from "src/order/schema/order.schema";
import { CommissionOn } from "src/admin/schema/commission-rate.schema";

export enum CoursePurchaseStatus {
    PENDING = 'PENDING',
    PAID = 'PAID',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED',
}

export type CoursePurchaseDocument = CoursePurchase & Document;

@Schema({ timestamps: true })
export class CoursePurchase {
    @Prop({
        type: Types.ObjectId,
        ref: 'User',
        required: true,
    })
    learnerId: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: 'Course',
        required: true,
    })
    courseId: Types.ObjectId;

    @Prop()
    amount: number;

    @Prop()
    paymentGatewayOrderId: string;

    @Prop()
    paymentGatewayPaymentId: string;

    @Prop({
        enum: CoursePurchaseStatus,
        default: CoursePurchaseStatus.PENDING,
    })
    status: CoursePurchaseStatus;

    @Prop({ enum: PaymentMethod, default: PaymentMethod.ONLINE })
    paymentMethod!: string;

    @Prop({ default: 0 })
    walletAmountUsed!: number;

    @Prop({ default: 0 })
    walletRefundedAmount!: number;

    @Prop({ type: Object, default: {} })
    paymentMeta!: any;

    @Prop({ default: false })
    isSettled!: boolean;

    @Prop({ default: 0 })
    platformCommissionRate!: number;

    @Prop({ default: CommissionOn.PROFITVALUE, enum: CommissionOn })
    platformCommissionOn!: CommissionOn;

    @Prop({ default: 0 })
    platformCommissionAmount!: number;

    @Prop({
        type: Types.ObjectId,
        ref: 'Coupon',
    })
    couponId?: Types.ObjectId;

    @Prop()
    couponCode?: string;

    @Prop({ default: 0 })
    discountAmount!: number;
}

export const CoursePurchaseSchema = SchemaFactory.createForClass(CoursePurchase);