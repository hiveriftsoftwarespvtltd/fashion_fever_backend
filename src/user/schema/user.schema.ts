import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = 'admin',
  VENDOR = 'vendor',
  INFLUENCER = 'influencer',
  SERVICE_PROVIDER = 'service_provider',
  DISTRIBUTOR = 'distributor',
  USER = 'user',
  EDUCATOR = 'educator',
  DELIVERY_PERSON = 'delivery_person'
}

export enum AuthType {
  EMAIL = 'EMAIL',
  GOOGLE = 'GOOGLE',
}

export enum RoleStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  NOT_ONBOARDED = 'NOT_ONBOARDED',
  DEACTIVATED = "DEACTIVATED"
}



@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ type: Types.ObjectId, ref: 'Media' })
  avatar?: Types.ObjectId;

  @Prop()
  password?: string;

  @Prop()
  phone?: string;

  @Prop({ type: [String], enum: AuthType, default: [AuthType.EMAIL] })
  authTypes!: AuthType[];

  @Prop()
  googleId?: string;

  @Prop({ type: [String], enum: UserRole, default: [UserRole.USER] })
  roles!: UserRole[];

  @Prop({
    type: Map,
    of: String,
    default: {},
  })
  roleStatus!: Map<UserRole, RoleStatus>;

  @Prop({
    type: Map,
    of: String,
    default: {},
  })
  rejectionReasons!: Map<UserRole, string>;

  @Prop()
  otp?: string;

  @Prop()
  otpExpiresAt?: Date;

  @Prop({ default: false })
  isEmailVerified!: boolean;

  @Prop({ default: false })
  isPhoneVerified!: boolean;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  isDeleted!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Vendor' })
  vendorId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Influencer' })
  influencerId?: Types.ObjectId;

  @Prop({ default: false })
  isVendorOnboardingCompleted!: boolean;

  @Prop({ default: false })
  isServiceProviderOnboardingCompleted!: boolean;

  @Prop({ default: false })
  isDistributorOnboardingCompleted!: boolean;

  @Prop({ default: false })
  isInfluencerOnboardingCompleted!: boolean;

  @Prop({
    type: Types.ObjectId,
    ref: 'ServiceProvider',
  })
  serviceProviderId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Distributor',
  })
  distributorId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Educator',
  })
  educatorId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "AffliateProgram" })
  affliateProgramId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Influencer' })
  referredByInfluencerId?: Types.ObjectId;

  @Prop({ default: false })
  isEducatorOnboardingCompleted!: boolean;

}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.set('toObject', {
  flattenMaps: true,
});

UserSchema.set('toJSON', {
  flattenMaps: true,
});
