import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";


export class QuickCommerceConfig {
  @Prop({ default: false })
  enabled!: boolean;

  @Prop({ default: false })
  acceptingOrders!: boolean;

  @Prop({ default: true })
  autoPause!: boolean;

  @Prop({ default: 10 })
  defaultPreparationTime!: number;

  @Prop({ default: 5 })
  serviceRadius!: number;

  @Prop({ default: 20 })
  maxConcurrentOrders!: number;

  @Prop({ default: 2 })
  minimumAvailableDeliveryBoys!: number;

  @Prop()
  pausedReason?: string;

  @Prop()
  pausedAt?: Date;
}

export type VendorDocument = Vendor & Document;
@Schema({ timestamps: true })
export class Vendor {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId!: Types.ObjectId;

  @Prop({ required: true })
  businessName!: string;

  @Prop({ required: true, unique: true })
  slug!: string;

  @Prop()
  description?: string;

  @Prop()
  address?: string;

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop({ type: Types.ObjectId, ref: 'Media' })
  logo?: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'Media' })
  banner?: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  staff!: Types.ObjectId[];

  @Prop({ default: 'PENDING' })
  status!: 'PENDING' | 'APPROVED' | 'REJECTED';

  @Prop({ default: 0 })
  commissionRate!: number;

  @Prop({ required: true })
  city!: string

  @Prop({ required: true })
  state!: string

  @Prop({ required: true })
  vendorPincode!: string

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  })
  location!: {
    type: string;
    coordinates: number[];
  };

  @Prop({ type: QuickCommerceConfig, default: {} })
  quickCommerce!: QuickCommerceConfig;

  @Prop({ default: false })
  isActive!: boolean;

  @Prop({ default: false })
  isDeleted!: boolean;
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);

