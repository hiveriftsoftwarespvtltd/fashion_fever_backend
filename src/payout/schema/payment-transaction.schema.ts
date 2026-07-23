import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export enum PaymentMode {
    ONLINE = 'ONLINE',
    COD = 'COD'
}

export enum PaymentMethod {
    UPI = 'UPI',
    NETBANKING = 'NETBANKING',
    CREDIT_DEBIT_CARD = 'CREDIT_DEBIT_CARD',
    WALLET = 'WALLET',
    CASH = 'CASH'
}

export enum TransactionStatus {
    PENDING = 'PENDING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED',
    CANCELLED = 'CANCELLED'
}

export enum ReferenceType {
    ORDER = 'ORDER',
    QUICK_ORDER = 'QUICK_ORDER',
    BOOKING = 'BOOKING',
    COURSE = 'COURSE'
}

export type PaymentTransactionDocument = PaymentTransaction & Document
@Schema({ timestamps: true })
export class PaymentTransaction {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    customerId!: Types.ObjectId

    @Prop({ type: String, enum: ReferenceType, default: ReferenceType.ORDER })
    referenceType!: ReferenceType

    @Prop({ type: Types.ObjectId, required: true })
    referenceId!: Types.ObjectId

    @Prop({ type: String, enum: PaymentMode, default: PaymentMode.COD })
    paymentMode!: PaymentMode

    @Prop({ type: String, enum: PaymentMethod, default: PaymentMethod.CASH })
    paymentMethod!: PaymentMethod

    @Prop({ type: Number, required: true })
    amount!: number

    @Prop()
    gatewayName?: string;

    @Prop({ type: String, enum: TransactionStatus, default: TransactionStatus.PENDING })
    status!: TransactionStatus

    @Prop({ type: String, default: null })
    transactionId!: string

    @Prop({ type: String, default: null })
    transactionReference!: string

    @Prop({ type: Date })
    paidAt!: Date
}

export const PaymenttransactionSchema = SchemaFactory.createForClass(PaymentTransaction)