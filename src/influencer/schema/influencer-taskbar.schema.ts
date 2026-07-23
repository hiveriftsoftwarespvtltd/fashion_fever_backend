import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";


export enum PlatformType {
    INSTAGRAM = "INSTAGRAM",
    YOUTUBE = "YOUTUBE",
    FACEBOOK = "FACEBOOK",
    SNAPCHAT = "SNAPCHAT"
}

export type InfluencerTaskbarDocument = InfluencerTaskBar & Document
@Schema({ timestamps: true })
export class InfluencerTaskBar {
    @Prop({ type: Types.ObjectId, ref: 'Influencer', required: true })
    influencerId!: Types.ObjectId


    @Prop({ enum: PlatformType, default: "INSTAGRAM" })
    platform!: PlatformType

    @Prop({ type: String, required: true })
    mediaLink!: string

    @Prop({ type: Date, required: true })
    postingDate!: Date

}

export const InfluencerTaskbarSchema = SchemaFactory.createForClass(InfluencerTaskBar)