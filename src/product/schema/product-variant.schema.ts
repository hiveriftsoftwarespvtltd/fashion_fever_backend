import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types, Document } from "mongoose";


export type ProductVariantDocument = ProductVariant & Document

@Schema({
  timestamps: true, toObject: {
    flattenMaps: true,
  },
  toJSON: {
    flattenMaps: true,
  },
})
export class ProductVariant {

  @Prop({
    type: Types.ObjectId,
    ref: "Product",
    required: true
  })
  productId!: Types.ObjectId;

  @Prop({
    type: [Types.ObjectId],
    ref: "Media",
    default: []
  })
  images!: Types.ObjectId[];

  @Prop({
    type: Types.ObjectId,
    ref: "Media",
    required: true
  })
  thumbnail!: Types.ObjectId;

  @Prop({ required: true })
  sku!: string;

  @Prop({ required: true })
  costPrice!: number;

  @Prop()
  salesPrice!: number;

  @Prop()
  offeredPrice!: number;

  @Prop({
    required: true,
    default: 0
  })
  stock!: number;

  @Prop({
    type: Map,
    of: String,
    default: {}
  })
  attributes!: Record<string, string>;

  @Prop({ required: true, min: 0 })
  weight!: number

  @Prop({ required: true, min: 0 })
  length!: number

  @Prop({ required: true, min: 0 })
  width!: number

  @Prop({ required: true, min: 0 })
  height!: number


  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  isDeleted!: boolean;
}

export const ProductVariantSchema = SchemaFactory.createForClass(ProductVariant);