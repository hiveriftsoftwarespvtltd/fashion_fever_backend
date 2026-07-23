import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";


export enum RoleCommission {
    VENDOR = "VENDOR",
    EDUCATOR = "EDUCATOR",
    SERVICE_PROVIDER = "SERVICE_PROVIDER",
    DELIVERY_PERSON = "DELIVERY_PERSON"
}

export enum CommissionOn {
    PROFITVALUE = 'PROFIT_VALUE',
    SALEVALUE = 'SALE_VALUE'
}

export enum CommissionType {
    FIXED = 'FIXED',
    PERCENTAGE = 'PERCENTAGE'
}


export enum CommissionEntityType {
    VENDOR = "VENDOR",
    EDUCATOR = "EDUCATOR",
    SERVICE_PROVIDER = "SERVICE_PROVIDER",
    LEAD_BOOKING = "LEAD_BOOKING",
    INFLUENCER = "INFLUENCER",
    AFFLIATE_LINK = "AFFLIATE_LINK",
    QUICK_DELIVERY = "QUICK_DELIVERY"
}

@Schema({ _id: false })
export class CommissionRateSlab {
    @Prop({
        required: true,
        enum: CommissionEntityType
    })
    entityType: CommissionEntityType;

    @Prop({ required: true, enum: CommissionType, default: CommissionType.PERCENTAGE })
    commissionType!: CommissionType

    @Prop({
        required: true,
        enum: CommissionOn,
        default: CommissionOn.PROFITVALUE
    })
    commissionOn: CommissionOn;

    @Prop({
        required: true,
        min: 0,
        max: 100
    })
    commissionPercentage: number;
}

export const CommissionRateSlabSchema =
    SchemaFactory.createForClass(CommissionRateSlab);

@Schema({ timestamps: true })
export class CommissionRate {


    @Prop({
        type: [CommissionRateSlabSchema],
        default: []
    })
    commissions: CommissionRateSlab[];
}

export type CommissionRateDocument =
    CommissionRate & Document;

export const CommissionRateSchema =
    SchemaFactory.createForClass(CommissionRate);