import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum WalletTransactionType {
    CREDIT = 'CREDIT',
    DEBIT = 'DEBIT',
}

export enum WalletTransactionReason {
    ADD_MONEY = 'ADD_MONEY',
    BOOKING_PAYMENT = 'BOOKING_PAYMENT',
    REFUND = 'REFUND',
    CASHBACK = 'CASHBACK',
    REFERRAL_BONUS = 'REFERRAL_BONUS',
    ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
    ORDER_PAYMENT = 'ORDER_PAYMENT',
    COURSE_PAYMENT = 'COURSE_PAYMENT',
    BOOKING_ADVANCE_PAYMENT = 'BOOKING_ADVANCE_PAYMENT'
}

export type WalletTransactionDocument =
    WalletTransaction & Document;

@Schema({ timestamps: true })
export class WalletTransaction {
    @Prop({
        type: Types.ObjectId,
        ref: 'Wallet',
        required: true,
    })
    walletId!: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: 'User',
        required: true,
    })
    userId!: Types.ObjectId;

    @Prop({
        required: true,
    })
    amount!: number;

    @Prop({
        enum: WalletTransactionType,
        required: true,
    })
    type!: WalletTransactionType;

    @Prop({
        enum: WalletTransactionReason,
        required: true,
    })
    reason!: WalletTransactionReason;

    @Prop({
        type: Types.ObjectId,
        ref: 'ServiceBooking',
    })
    bookingId?: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: 'Order',
    })
    orderId?: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: 'CoursePurchase',
    })
    coursePurchaseId?: Types.ObjectId;

    @Prop()
    description?: string;

    @Prop({
        required: true,
    })
    balanceAfterTransaction!: number;
}

export const WalletTransactionSchema =
    SchemaFactory.createForClass(WalletTransaction);