import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";



export type ProductNotifyDocument = ProductNotify & Document;


@Schema({ timestamps: true })
export class ProductNotify {
    @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
    productId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'ProductVariant', required: true })
    productVariantId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ type: Boolean, default: false })
    isNotified: Boolean;
}

export const ProductNotifySchema = SchemaFactory.createForClass(ProductNotify);