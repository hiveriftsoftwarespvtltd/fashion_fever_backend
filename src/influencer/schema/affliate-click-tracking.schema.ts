import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";


export type AffliateClickTrackingDocument = AffliateClickTracking & Document
@Schema({ timestamps: true })
export class AffliateClickTracking {
    @Prop({ type: Types.ObjectId, ref: "AffliateProgram" })
    programId!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "Influencer" })
    influencerId!: Types.ObjectId;

    @Prop({ required: true, default: "" })
    ipAddress!: string;

    @Prop({ required: true, default: "" })
    userAgent!: string

    @Prop()
    sessionId?: string;

    @Prop()
    device?: string;

    @Prop()
    browser?: string;


    @Prop({ type: Date, required: true })
    clickedAt!: Date
}

export const AffliateClickTrackingSchema = SchemaFactory.createForClass(AffliateClickTracking)