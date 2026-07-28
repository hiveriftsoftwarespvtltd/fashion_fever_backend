import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';


export type AddressDocument = Address & Document
@Schema({ timestamps: true })
export class Address {

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user!: Types.ObjectId;

  @Prop({ required: true })
  line1!: string;

  @Prop()
  line2?: string;

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

  @Prop({ required: true })
  phone1!: string;

  @Prop()
  phone2?: string;

  @Prop()
  landmark?: string;

  @Prop({ required: true })
  pincode!: string;

  @Prop({ required: true })
  city!: string;

  @Prop({ required: true })
  state!: string;

  @Prop({ default: 'Home' })
  addressType?: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  isDeleted!: boolean;

}

export const AddressSchema = SchemaFactory.createForClass(Address);