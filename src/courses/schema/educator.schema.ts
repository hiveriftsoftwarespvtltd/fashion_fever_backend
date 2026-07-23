import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export enum EducatorStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    BLOCKED = 'BLOCKED',
}

export type EducatorDocument = Educator & Document

@Schema({ timestamps: true })
export class Educator {
    @Prop({
        type: Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    })
    userId: Types.ObjectId;

    @Prop()
    bio: string;

    @Prop({ type: [String], default: [] })
    expertise: string[];

    @Prop({ type: Types.ObjectId, ref: 'Media' })
    profileImage?: Types.ObjectId;

    @Prop({ default: false })
    isApproved: boolean;

    @Prop({ enum: EducatorStatus, default: EducatorStatus.PENDING })
    status: EducatorStatus

    @Prop({ type: Number, default: 15 })
    comissionRate: number;

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ default: false })
    isDeleted: boolean;
}

export const EducatorSchema = SchemaFactory.createForClass(Educator)