import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { truncate } from "node:fs/promises";

export type CartDocument = Cart & Document
@Schema()
export class CartItem {
    @Prop({ type: Types.ObjectId, ref: "Product", required: true })
    product!: Types.ObjectId

    @Prop({ type: Types.ObjectId, ref: "ProductVariant", required: true })
    variant!: Types.ObjectId

    @Prop({ required: true, min: 1, default: 1 })
    quantity!: number
}

export const cartItemSchema = SchemaFactory.createForClass(CartItem)
@Schema({ timestamps: true })
export class Cart {
    @Prop({ type: Types.ObjectId, ref: "User", required: true, unique: true })
    user!: Types.ObjectId

    @Prop({ type: [cartItemSchema], default: [] })
    items!: CartItem[]
}

export const cartSchema = SchemaFactory.createForClass(Cart)