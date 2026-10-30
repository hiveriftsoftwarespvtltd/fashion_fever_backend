import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AffliateClickRateLimitDocument = AffliateClickRateLimit & Document;

@Schema({ timestamps: true })
export class AffliateClickRateLimit {
  @Prop({ type: Types.ObjectId, ref: 'Influencer', required: true })
  influencerId!: Types.ObjectId;

  @Prop({ required: true })
  ipAddress!: string;

  @Prop({ type: Date, required: true })
  lastEligibleClickAt!: Date;
}

export const AffliateClickRateLimitSchema = SchemaFactory.createForClass(
  AffliateClickRateLimit,
);
AffliateClickRateLimitSchema.index(
  { influencerId: 1, ipAddress: 1 },
  { unique: true },
);
