import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type CourseCategoryDocument = CourseCategory & Document;

@Schema({timestamps:true})
export class CourseCategory {

    @Prop({ required: true })
    name!: string;

    @Prop({ required: true })
    description!: string;

    @Prop({ required: true })
    label!: string

    @Prop({ type: Types.ObjectId, ref: 'Media' })
    icon?: Types.ObjectId;

    @Prop({ type: [String], default: [] })
    tags!: string[]

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ default: false })
    isDeleted: boolean;
}

export const CourseCategorySchema = SchemaFactory.createForClass(CourseCategory);
