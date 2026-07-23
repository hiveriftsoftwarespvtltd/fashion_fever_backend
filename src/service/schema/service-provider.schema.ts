import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";


export enum ServiceProviderType {
  SALON = "SALON",
  INDIVIDUAL = "INDIVIDUAL"
}

export enum ServiceProviderVerificationStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED"
}

export enum ServiceProviderGender {
  ONLY_MEN = "ONLY_MEN",
  ONLY_WOMEN = "ONLY_WOMEN",
  BOTH = "BOTH",
}
export type ServiceProviderDocument = ServiceProvider & Document

@Schema({ timestamps: true })
export class ServiceProvider {

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  userId!: Types.ObjectId;



  @Prop({ required: true })
  businessName!: string;

  @Prop()
  description!: string;

  @Prop()
  experienceYears!: number;

  @Prop()
  phone!: string;

  @Prop()
  email!: string;

  @Prop()
  gstNumber!: string;

  @Prop()
  panNumber!: string;

  @Prop()
  address!: string;

  @Prop()
  city!: string;

  @Prop()
  state!: string;

  @Prop()
  pincode!: string;

  @Prop({
    enum: ServiceProviderType,
    default: ServiceProviderType.INDIVIDUAL,
  })
  providerType!: string;

  @Prop({
    enum: ServiceProviderGender,
    default: ServiceProviderGender.ONLY_WOMEN,
  })
  providedGenderService!: string;

  @Prop({
    enum: ServiceProviderVerificationStatus,
    default: ServiceProviderVerificationStatus.PENDING,
  })
  verificationStatus!: string;

  @Prop({ default: true })
  homeServiceAvailable!: boolean;

  @Prop({ default: false })
  salonVisitAvailable!: boolean;

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
  })
  locationType!: string;

  @Prop({
    type: [Number],
    default: [0, 0],
  })
  coordinates!: number[];

  @Prop({ default: 10 })
  serviceRadiusKm!: number;

  @Prop({ default: 0 })
  rating!: number;

  @Prop({ default: 0 })
  totalReviews!: number;

  @Prop({ default: false })
  isFeatured!: boolean;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  isDeleted!: boolean;
}

export const ServiceProviderSchema = SchemaFactory.createForClass(ServiceProvider);


ServiceProviderSchema.index({ coordinates: '2dsphere' });
