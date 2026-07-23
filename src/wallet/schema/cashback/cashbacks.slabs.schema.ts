import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"



export enum CashbackType {
    FIXED = 'FIXED',
    PERCENTAGE = 'PERCENTAGE',
}
export type CashbackSlabDocument = CashbackSlab & Document
@Schema({ timestamps: true })
export class CashbackSlab {

    @Prop({ required: true })
    minValue!: number;

    @Prop({ required: true })
    maxValue!: number;

    @Prop({ required: true })
    cashbackValue!: number;

    @Prop({
        enum: CashbackType,
        default: CashbackType.FIXED,
    })
    cashbackType!: CashbackType;

    @Prop({ default: 0 })
    maxCashback!: number;

    @Prop({ default: true })
    isActive!: boolean;
}

export const CashbackSlabSchema = SchemaFactory.createForClass(CashbackSlab)