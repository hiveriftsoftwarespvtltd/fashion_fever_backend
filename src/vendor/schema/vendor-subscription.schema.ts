import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

export enum VendorSubscriptionStatus {
    ACTIVE = "ACTIVE",
    EXPIRED = "EXPIRED",
    CANCELLED = "CANCELLED"
}
export type VendorSubscriptionDocument = VendorSubscription & Document
@Schema({ timestamps: true })
export class VendorSubscription {

    @Prop({
        type: Types.ObjectId,
        ref: 'Vendor',
        required: true,
    })
    vendorId!: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: 'VendorSubscriptionPlan',
        required: true,
    })
    planId!: Types.ObjectId;

    @Prop()
    startDate!: Date;

    @Prop()
    endDate?: Date;

    @Prop()
    amountPaid!: number;

    @Prop({
        enum: VendorSubscriptionStatus,
        default: VendorSubscriptionStatus.ACTIVE,
    })
    status!: VendorSubscriptionStatus;

    @Prop({ default: false })
    autoRenew!: boolean;
}

export const VendorSubscriptionSchema = SchemaFactory.createForClass(VendorSubscription)