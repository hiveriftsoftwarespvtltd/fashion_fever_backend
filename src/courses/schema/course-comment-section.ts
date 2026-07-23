import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

import { Types } from "mongoose";

export type CourseCommentSectionDocument = CourseCommentSection & Document
@Schema({ timestamps: true })
export class CourseCommentSection {
    @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
    userId!: Types.ObjectId

    @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
    courseId!: Types.ObjectId

    @Prop({ type: Types.ObjectId, ref: 'CourseSection', required: true })
    courseSectionId!: Types.ObjectId

    @Prop({ type: Types.ObjectId, ref: 'CourseLesson', required: true })
    courseLessonId!: Types.ObjectId

    @Prop({ required: true })
    comment!: string

    @Prop({ type: Types.ObjectId, ref: 'CourseCommentSection', default: null })
    parentId?: Types.ObjectId | null;

    @Prop({ default: false })
    isDeleted!: boolean;
}

export const CourseCommentSectionSchema = SchemaFactory.createForClass(CourseCommentSection)