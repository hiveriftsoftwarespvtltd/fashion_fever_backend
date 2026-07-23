import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type CourseSectionDocument = CourseSection & Document

@Schema({ timestamps: true })
export class CourseSection {
  @Prop({
    type: Types.ObjectId,
    ref: 'Course',
    required: true,
  })
  courseId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  order: number;
}

export const CourseSectionSchema = SchemaFactory.createForClass(CourseSection)