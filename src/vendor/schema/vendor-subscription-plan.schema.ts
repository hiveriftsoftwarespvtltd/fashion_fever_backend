import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export enum CommissionOn {
    PROFITVALUE = 'PROFIT_VALUE',
    SALEVALUE = 'SALE_VALUE'
}
export type VendorSubscriptionPlanDocument = VendorSubscriptionPlan & Document
@Schema({ timestamps: true })
export class VendorSubscriptionPlan {

    @Prop({ required: true, unique: true })
    name!: string;

    @Prop({ required: true })
    label!: string;

    @Prop({enum:CommissionOn, required:true,default:CommissionOn.PROFITVALUE})
    commissionOn!: CommissionOn

    @Prop({ required: true })
    price!: number;

    @Prop({ required: true })
    durationDays!: number;

    @Prop({ required: true })
    commissionPercentage!: number;

    @Prop({ default: true })
    isActive!: boolean;

    @Prop({ default: false })
    isDeleted!: boolean;
}

export const VendorSubscriptionPlanSchema = SchemaFactory.createForClass(VendorSubscriptionPlan)