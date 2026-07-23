import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";


export type AffliateSignupDocument = AffliateSignup & Document

@Schema({ timestamps: true })
export class AffliateSignup {
    @Prop({ type: Types.ObjectId, ref: "User" })
    userId!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "AffliateProgram" })
    affliateProgramId!: Types.ObjectId;

    @Prop()
    signupAt!: Date
}

export const AffliateSignupSchema = SchemaFactory.createForClass(AffliateSignup)