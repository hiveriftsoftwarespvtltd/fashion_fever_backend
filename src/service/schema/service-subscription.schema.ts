import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";


export enum CommissionOn {
  PROFITVALUE = 'PROFIT_VALUE',
  SALEVALUE = 'SALE_VALUE'
}

export type ServiceSubscriptionPlanDocument = ServiceSubscriptionPlan & Document
@Schema({ timestamps: true })
export class ServiceSubscriptionPlan {

  @Prop({ required: true, unique: true })
  name!: string;

  @Prop({ required: true })
  label!: string;


  @Prop({ required: true })
  price!: number;

  @Prop({ required: true })
  durationDays!: number;

  @Prop({ enum: CommissionOn, required: true, default: CommissionOn.PROFITVALUE })
  commissionOn!: CommissionOn


  @Prop({ required: true })
  maxServices!: number;

  @Prop({ required: true })
  maxStaff!: number;

  @Prop({ required: true })
  monthlyLeadLimit!: number;

  @Prop({ required: true })
  commissionPercentage!: number;

  @Prop({ default: false })
  featuredListing!: boolean;

  @Prop({ default: false })
  prioritySupport!: boolean;

  @Prop({ default: false })
  analyticsAccess!: boolean;

  @Prop({ default: 0 })
  priorityRank!: number;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  isDeleted!: boolean;
}

export const ServiceSubscriptionPlanSchema = SchemaFactory.createForClass(ServiceSubscriptionPlan)