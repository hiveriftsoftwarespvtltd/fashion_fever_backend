import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

export enum EducatorSubscriptionStatus {
    ACTIVE = "ACTIVE",
    EXPIRED = "EXPIRED",
    CANCELLED = "CANCELLED"
}
export type EducatorSubscriptionDocument = EducatorSubscription & Document
@Schema({ timestamps: true })
export class EducatorSubscription {

    @Prop({
        type: Types.ObjectId,
        ref: 'Educator',
        required: true,
    })
    educatorId!: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: 'EducatorSubscriptionPlan',
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
        enum: EducatorSubscriptionStatus,
        default: EducatorSubscriptionStatus.ACTIVE,
    })
    status!: EducatorSubscriptionStatus;

    @Prop({ default: false })
    autoRenew!: boolean;
}

export const EducatorSubscriptionSchema = SchemaFactory.createForClass(EducatorSubscription)