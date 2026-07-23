import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

export enum CourseAttachmentType {
    VIDEO = 'VIDEO',
    PDF = 'PDF',
    IMAGE = 'IMAGE',
    LINK = 'LINK',
    OTHER = 'OTHER'
}
export type CourseAttachmentDocument = CourseAttachment & Document
@Schema({ timestamps: true })
export class CourseAttachment {

    @Prop({ type: Types.ObjectId, ref: 'Course' })
    courseId!: Types.ObjectId

    @Prop({ type: Types.ObjectId, ref: 'CourseSection' })
    sectionId!: Types.ObjectId

    @Prop({ type: Types.ObjectId, ref: 'CourseLesson' })
    lessonId!: Types.ObjectId

    @Prop({ enum: CourseAttachmentType, default: CourseAttachmentType.OTHER })
    type?: CourseAttachmentType;

    @Prop()
    url!: string;

    @Prop()
    duration?: number;

}

export const CourseAttachmentSchema = SchemaFactory.createForClass(CourseAttachment)