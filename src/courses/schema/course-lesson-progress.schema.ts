import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type LessonProgressDocument = LessonProgress & Document


@Schema({ timestamps: true })
export class LessonProgress {
    @Prop({
        type: Types.ObjectId,
        ref: 'User',
        required: true,
    })
    learnerId: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: 'Course',
        required: true,
    })
    courseId: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: 'CourseLesson',
        required: true,
    })
    lessonId: Types.ObjectId;

    @Prop({ default: false })
    isCompleted: boolean;

    @Prop()
    completedAt: Date;

    @Prop({ default: 0 })
    watchedDurationInSeconds: number;
}

export const LessonProgressSchema = SchemaFactory.createForClass(LessonProgress);