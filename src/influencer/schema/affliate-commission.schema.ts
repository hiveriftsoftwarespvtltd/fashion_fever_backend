import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type AffliateCommissionDocument = AffliateCommission & Document;
@Schema({ timestamps: true })
export class AffliateCommission {
    @Prop({ type: Types.ObjectId, ref: 'AffliateProgram' })
    programId!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Influencer' })
    influencerId!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    customerId!: Types.ObjectId;

    @Prop({ type: Types.ObjectId })
    itemId!: Types.ObjectId;

    @Prop({
        enum: ['PRODUCT', 'SERVICE', 'COURSE']
    })
    itemType!: string;

    @Prop()
    orderAmount!: number;

    // @Prop()
    // commissionRate!: number;

    // @Prop()
    // commissionAmount!: number;

    @Prop({
        enum: ['PENDING', 'APPROVED', 'PAID'],
        default: 'PENDING'
    })
    status!: string;
}

export const AffliateCommissionSchema = SchemaFactory.createForClass(AffliateCommission)