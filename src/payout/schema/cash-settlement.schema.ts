import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { ReferenceType } from "./payment-transaction.schema";

export enum CollectedBy {
    VENDOR = 'VENDOR',
    SERVICE_PROVIDER = 'SERVICE_PROVIDER',
    DELIVERY_PERSON = 'DELIVERY_PERSON',
    PLATFORM = 'PLATFORM',
}

export enum CashSettlementStatus {
    COLLECTED = 'COLLECTED',
    DEPOSITED = 'DEPOSITED',
    VERIFIED = 'VERIFIED',
    CANCELLED = 'CANCELLED',
    REJECTED = 'REJECTED'
}

export type CashSettlementDocument = CashSettlement & Document
@Schema({ timestamps: true })
export class CashSettlement {
    @Prop({ type: Types.ObjectId, ref: 'PaymentTransaction' })
    paymentTransactionId!: Types.ObjectId

    @Prop({ type: String, enum: ReferenceType, default: ReferenceType.ORDER })
    referenceType: ReferenceType

    @Prop({ type: Types.ObjectId, required: true })
    referenceId!: Types.ObjectId

    @Prop({ type: Number, default: 0 })
    amount!: number

    @Prop({ type: String, enum: CollectedBy, default: CollectedBy.DELIVERY_PERSON })
    collectedBy!: CollectedBy

    @Prop({ type: Types.ObjectId, required: true })
    collectedByReferenceId!: Types.ObjectId

    @Prop({ type: Number, default: 0 })
    depositedAmount!: number

    @Prop({
        enum: CashSettlementStatus,
        default: CashSettlementStatus.COLLECTED
    })
    status: CashSettlementStatus

    @Prop({ type: Date })
    depositedAt!: Date

    @Prop({ type: Date })
    verifiedAt?: Date

    @Prop({ type: Types.ObjectId, ref: 'User' })
    verifiedBy?: Types.ObjectId

    @Prop({ type: String, default: '' })
    remarks?: string

    @Prop({ type: String, default: '' })
    rejectionReason?: string

    @Prop({ type: Types.ObjectId, ref: 'User' })
    rejectedBy?: Types.ObjectId

    @Prop({ type: Date })
    rejectedAt?: Date
}

export const CashSettlementSchema = SchemaFactory.createForClass(CashSettlement)