import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ServiceReviewDocument = ServiceReview & Document
@Schema({ timestamps: true })
export class ServiceReview {
  @Prop({
    type: Types.ObjectId,
    ref: 'Booking',
    required: true,
  })
  bookingId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'ServiceProvider',
    required: true,
  })
  serviceProviderId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Service',
    required: true,
  })
  serviceId!: Types.ObjectId;

  @Prop({
    type: [Types.ObjectId],
    ref: "Media",
    default: []
  })
  images!: Types.ObjectId[];

  @Prop({
    required: true,
    min: 1,
    max: 5,
  })
  providerRating!: number;

  @Prop({
    trim: true,
    maxlength: 1000,
  })
  providerReview?: string;

  @Prop({
    required: true,
    min: 1,
    max: 5,
  })
  serviceRating!: number;

  @Prop({
    trim: true,
    maxlength: 1000,
  })
  serviceReview?: string;
}

export const ServiceReviewSchema = SchemaFactory.createForClass(ServiceReview)


ServiceReviewSchema.index(
  { bookingId: 1, userId: 1, serviceId: 1 },
  { unique: true },
);