import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";



export type CourseReviewDocument = CourseReview & Document
@Schema({ timestamps: true })
export class CourseReview {

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId!: Types.ObjectId

    @Prop({ type: Types.ObjectId, ref: "Course", required: true })
    courseId!: Types.ObjectId

    @Prop({ required: true, maxlength: 1000, trim: true })
    review!: string

    @Prop({ required: true, min: 1, max: 5 })
    rating!: number
}

export const CourseReviewSchema = SchemaFactory.createForClass(CourseReview)