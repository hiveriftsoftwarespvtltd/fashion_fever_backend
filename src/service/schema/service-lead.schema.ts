import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export enum ServiceLeadStatus {
  OPEN = "OPEN",
  ASSIGNED = "ASSIGNED",
  BOOKED = "BOOKED",
  EXPIRED = "EXPIRED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum ServiceLeadGender {
  MALE = "MALE",
  FEMALE = "FEMALE",
}

export type ServiceLeadDocument = ServiceLead & Document
@Schema({ timestamps: true })
export class ServiceLead {

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'ServiceCategory' }],
    default: [],
  })
  categoryIds!: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'ServiceProvider' })
  assignedProviderId?: Types.ObjectId;

  @Prop()
  pincode!: string;

  @Prop()
  name!: string;

  @Prop()
  email!: string;

  @Prop()
  phoneNumber!: string;

  // @Prop({ default: 1 })
  // quantity!: number;

  @Prop()
  city!: string;

  @Prop()
  state!: string;

  @Prop()
  requirement!: string;

  @Prop()
  budget!: number;

  @Prop()
  preferredDateAndTime!: Date;

  // @Prop()
  // preferredStartTime?: Date;

  @Prop({ default: 1 })
  totalPersons?: number;

  @Prop()
  address!: string;

  // @Prop({
  //   type: {
  //     type: String,
  //     enum: ['Point'],
  //     default: 'Point',
  //   },
  // })
  // locationType!: string;

  // @Prop({
  //   type: [Number],
  //   default: [0, 0],
  // })
  // coordinates!: number[];

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  })
  location!: {
    type: 'Point';
    coordinates: [number, number];
  };

  @Prop({ enum: ServiceLeadGender, default: ServiceLeadGender.FEMALE })
  gender!: ServiceLeadGender;


  @Prop({
    enum: ServiceLeadStatus,
    default: ServiceLeadStatus.OPEN,
  })
  status!: string;
}

export const ServiceLeadSchema = SchemaFactory.createForClass(ServiceLead)

ServiceLeadSchema.index({ location: '2dsphere' });