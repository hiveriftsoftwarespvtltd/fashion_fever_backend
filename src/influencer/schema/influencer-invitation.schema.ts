import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";


export type InfluencerInvitationDocument = InfluencerInvitation & Document
@Schema({ timestamps: true })
export class InfluencerInvitation {
  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true })
  token!: string;

  @Prop({ default: false })
  isUsed!: boolean;

  @Prop()
  usedAt?: Date;

  @Prop({
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })
  expiresAt!: Date;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  invitedBy?: Types.ObjectId;
}

export const InfluencerInvitationSchema = SchemaFactory.createForClass(InfluencerInvitation)