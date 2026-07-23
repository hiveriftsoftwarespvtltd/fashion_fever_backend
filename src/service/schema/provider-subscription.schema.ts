import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

export enum ServiceSubscriptionStatus {
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED"
}
export type ProviderSubscriptionDocument = ProviderSubscription & Document
@Schema({ timestamps: true })
export class ProviderSubscription {

  @Prop({
    type: Types.ObjectId,
    ref: 'ServiceProvider',
    required: true,
  })
  providerId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'SubscriptionPlan',
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
    enum: ServiceSubscriptionStatus,
    default: ServiceSubscriptionStatus.ACTIVE,
  })
  status!: ServiceSubscriptionStatus;

  @Prop({ default: false })
  autoRenew!: boolean;
}

export const ProviderSubscriptionSchema = SchemaFactory.createForClass(ProviderSubscription)