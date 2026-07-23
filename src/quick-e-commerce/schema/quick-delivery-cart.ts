import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type QuickDeliveryCartDocument = QuickDeliveryCart & Document
@Schema()
export class QuickDeliveryCartItem {
    @Prop({ type: Types.ObjectId, ref: "Product", required: true })
    product!: Types.ObjectId

    @Prop({ type: Types.ObjectId, ref: "ProductVariant", required: true })
    variant!: Types.ObjectId

    @Prop({ required: true, min: 1, default: 1 })
    quantity!: number
}

export const QuickDeliveryCartItemSchema = SchemaFactory.createForClass(QuickDeliveryCartItem)
@Schema({ timestamps: true })
export class QuickDeliveryCart {
    @Prop({ type: Types.ObjectId, ref: "User", required: true, unique: true })
    user!: Types.ObjectId

    @Prop({ type: [QuickDeliveryCartItemSchema], default: [] })
    items!: QuickDeliveryCartItem[]

}

export const QuickDeliveryCartSchema = SchemaFactory.createForClass(QuickDeliveryCart)