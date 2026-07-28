import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HomeBookingCardDocument = HomeBookingCard & Document;

@Schema({ timestamps: true })
export class HomeBookingCard {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true, default: 'SALON SERVICE' })
  category!: string;

  @Prop({ type: Types.ObjectId, ref: 'Media' })
  imageMedia?: Types.ObjectId;

  @Prop()
  imageUrl?: string;

  @Prop({ default: '' })
  slug!: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: 1 })
  displayOrder!: number;
}

export const HomeBookingCardSchema = SchemaFactory.createForClass(HomeBookingCard);
