import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { ReferenceType } from "./payment-transaction.schema";


export enum UserRole {
    USER = 'USER',
    VENDOR = 'VENDOR',
    SERVICE_PROVIDER = 'SERVICE_PROVIDER',
    INFLUENCER = 'INFLUENCER',
    DELIVERY_PERSON = 'DELIVERY_PERSON'
}

export enum PaymentDirection {
    USER_TO_PLATFORM = 'USER_TO_PLATFORM',
    PLATFORM_TO_USER = 'PLATFORM_TO_USER',
}

export enum SettlementStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export type SettlementDocument = Settlement & Document

@Schema({ timestamps: true })
export class Settlement {
    @Prop({ type: Types.ObjectId, ref: 'User' })
    userId!: Types.ObjectId

    @Prop({ type: String, enum: UserRole, default: UserRole.VENDOR })
    role!: UserRole

    @Prop({ type: String, enum: ReferenceType, default: ReferenceType.ORDER })
    referenceType!: ReferenceType

    @Prop({
        type: Types.ObjectId,
        ref: 'MarketplacePayout',
    })
    marketplacePayoutId?: Types.ObjectId;

    @Prop({ type: Types.ObjectId })
    referenceId!: Types.ObjectId

    @Prop({ type: Number })
    grossAmount!: number

    @Prop({ type: Number, default: 0 })
    platformCommission!: number

    @Prop({ type: Number, default: 0 })
    tax!: number


    @Prop({ type: Number, default: 0 })
    deduction!: number

    @Prop({ type: Number, default: 0 })
    netAmount!: number

    @Prop({ type: String, default: '' })
    remarks!: string

    @Prop({ type: String, enum: PaymentDirection, default: PaymentDirection.PLATFORM_TO_USER })
    paymentDirection!: PaymentDirection

    @Prop({ type: String, enum: SettlementStatus, default: SettlementStatus.PENDING })
    status!: SettlementStatus

    @Prop({ type: Types.ObjectId, ref: 'PaymentTransaction' })
    paymentTransactionId?: Types.ObjectId

    @Prop({ type: Date })
    paidAt?: Date
}

export const SettlementSchema = SchemaFactory.createForClass(Settlement)