import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";


export type InfluencerStoryDocument = InfluencerStory & Document
@Schema({ timestamps: true })
export class InfluencerStory {
    @Prop({
        type: Types.ObjectId,
        ref: 'Influencer',
        required: true,
    })
    influencerId: Types.ObjectId;

    @Prop({ required: true })
    storyUrl: string;


    @Prop({ default: true })
    isActive: boolean;

    @Prop({
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
    expiresAt: Date;
}

export const InfluencerStorySchema = SchemaFactory.createForClass(InfluencerStory)