import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";


@Schema({ timestamps: true })
export class AffliateProgram {

    @Prop({ type: Types.ObjectId, ref: 'Influencer', required: true })
    influencerId!: Types.ObjectId;

    @Prop({ required: true, unique: true })
    referralCode!: string;

    @Prop({ default: 0 })
    productSalesCount!: number;

    @Prop({ default: 0 })
    serviceBookingCount!: number;

    @Prop({ default: 0 })
    coursePurchaseCount!: number;

    @Prop({ default: 0 })
    totalCommission!: number;

    @Prop({ default: 0 })
    pendingCommission!: number;

    @Prop({ default: 0 })
    paidCommission!: number;

    @Prop({ default: 0 })
    totalClicks!: number;

    @Prop({ default: 0 })
    totalSignups!: number;

    @Prop({ default: 0 })
    totalOrders!: number;

    @Prop({ default: 0 })
    totalRevenueGenerated!: number;

    @Prop({ default: false })
    isDeleted!: boolean;

    @Prop({ default: true })
    isActive!: boolean;
}

export type AffliateProgramDocument = AffliateProgram & Document;
export const AffliateProgramSchema = SchemaFactory.createForClass(AffliateProgram)