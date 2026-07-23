import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";


export enum PaymentMethod {
    CASH = "cash",
    CARD = "card",
    UPI = "upi",
    WALLET = "wallet",
}

export type DeliveryPersonAssignmentDocument = DeliveryPersonAssignment & Document
@Schema({ timestamps: true })
export class DeliveryPersonAssignment {
    @Prop({ type: Types.ObjectId, ref: 'QuickOrder', required: true })
    quickOrderId!: Types.ObjectId

    @Prop({ type: Types.ObjectId, ref: 'VendorQuickOrder', required: true })
    quickVendorOrderId!: Types.ObjectId

    @Prop({ type: Types.ObjectId, ref: 'DeliveryPerson', required: true, })
    deliveryPersonId!: Types.ObjectId

    @Prop({ type: Number, required: true, default: 0 })
    timeTakenForDeliveryInMinutes!: number

    @Prop({ type: Number, required: true, default: 0 })
    deliveryCharge!: number

    @Prop({ type: Date, required: true, default: new Date() })
    deliveryDate!: Date

    @Prop({ type: Boolean, required: true, default: false })
    isPaid!: boolean

    @Prop({ type: String, default: null })
    transactionId!: string

    @Prop({ type: String, enum: PaymentMethod, default: null })
    paymentMethod?: PaymentMethod

    @Prop({ type: Date, default: null })
    paymentDate?: Date

}

export const DeliveryPersonAssignmentSchema = SchemaFactory.createForClass(DeliveryPersonAssignment)