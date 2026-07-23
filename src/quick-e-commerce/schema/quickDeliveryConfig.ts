import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";




export type QuickDeliveryConfigurationDocument = QuickDeliveryConfiguration & Document
@Schema({ timestamps: true })
export class QuickDeliveryConfiguration {

    @Prop({ type: Number, required: true, default: 49, min: 0 })
    minimumValueForFreeDelivery: number

    @Prop({ type: Number, required: true, default: 25, min: 0 })
    deliveryFee: number

    @Prop({ type: Number, required: true, default: 0, min: 0 })
    packagingCharge: number

    @Prop({ type: Number, required: true, default: 0, min: 0 })
    tax!: number

    @Prop({ type: Number, required: true, default: 0, min: 0 })
    deliveryPersonChargeForPerDelivery!: number
}

export const QuickDeliveryConfigurationSchema = SchemaFactory.createForClass(QuickDeliveryConfiguration);