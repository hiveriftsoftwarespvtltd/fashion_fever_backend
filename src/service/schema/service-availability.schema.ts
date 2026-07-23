import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export enum WeekDay {
  SUNDAY = "SUNDAY",
  MONDAY = "MONDAY",
  TUESDAY = "TUESDAY",
  WEDNESDAY = "WEDNESDAY",
  THURSDAY = "THURSDAY",
  FRIDAY = "FRIDAY",
  SATURDAY = "SATURDAY",
}
export type ProviderAvailabilityDocument = ProviderAvailability & Document
@Schema()
export class ProviderAvailability {

  @Prop({
    type: Types.ObjectId,
    ref: 'ServiceProvider',
  })
  providerId!: Types.ObjectId;

  @Prop({
    enum: WeekDay,
    required: true,
  })
  dayOfWeek!: WeekDay;

  @Prop()
  startTime!: string;

  @Prop()
  endTime!: string;

  @Prop()
  breakStart!: string;

  @Prop()
  breakEnd!: string;
}

export const ProviderAvailabilitySchema = SchemaFactory.createForClass(ProviderAvailability)