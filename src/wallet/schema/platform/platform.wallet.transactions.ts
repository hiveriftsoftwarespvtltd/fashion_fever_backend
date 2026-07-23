import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum PlatformWalletTransactionType {
    CREDIT = 'CREDIT',
    DEBIT = 'DEBIT',
}

export enum PlatformWalletTransactionReason {
    BOOKING_COMMISSION = 'BOOKING_COMMISSION',
    ORDER_COMMISSION = 'ORDER_COMMISSION',
    PLATFORM_FEE = 'PLATFORM_FEE',
    WITHDRAWAL = 'WITHDRAWAL',
    REFUND = 'REFUND',
}

export enum PlatformTransactionSourceType {
    ORDER = 'ORDER',
    BOOKING = 'BOOKING',
    TOPUP = 'TOPUP',
}

export type PlatformWalletTransactionDocument = PlatformWalletTransaction & Document;

@Schema({ timestamps: true })
export class PlatformWalletTransaction {
    @Prop({
        type: Types.ObjectId,
        ref: 'PlatformWallet',
        required: true,
    })
    walletId!: Types.ObjectId;

    @Prop({
        required: true,
    })
    amount!: number;

    @Prop({
        enum: PlatformWalletTransactionType,
        required: true,
    })
    type!: PlatformWalletTransactionType;

    @Prop({
        enum: PlatformWalletTransactionReason,
        required: true,
    })
    reason!: PlatformWalletTransactionReason;

    @Prop({
        type: Types.ObjectId,
        required: true,
    })
    sourceId!: Types.ObjectId;

    @Prop({
        enum: PlatformTransactionSourceType,
        required: true,
    })
    sourceType!: PlatformTransactionSourceType;

    @Prop()
    description?: string;

    @Prop({
        required: true,
    })
    balanceAfterTransaction!: number;
}

export const PlatformWalletTransactionSchema = SchemaFactory.createForClass(PlatformWalletTransaction);
