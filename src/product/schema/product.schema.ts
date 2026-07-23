import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types, Document } from "mongoose";

export type ProductDocument = Product & Document;

export enum ProductStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ARCHIVED = "ARCHIVED",
}

@Schema({ timestamps: true })
export class Product {

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  slug!: string;

  @Prop()
  description?: string;

  @Prop({
    type: Types.ObjectId,
    ref: "Vendor",
    required: true
  })
  vendorId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true
  })
  createdBy!: Types.ObjectId;

  @Prop({
    type: [String],
    default: [],
    lowercase: true
  })
  tags!: string[]

  @Prop({ default: 'brandless' })
  brand?: string
  // @Prop({
  //   type: Types.ObjectId,
  //   ref: "Brand",
  //   default: null
  // })
  // brand?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "Category",
    required: true
  })
  categoryId!: Types.ObjectId;

  @Prop({
    type: [Types.ObjectId],
    ref: "ProductVariant",
    default: []
  })
  variants!: Types.ObjectId[];

  @Prop()
  metaTitle?: string;

  @Prop()
  metaDescription?: string;

  @Prop({
    enum: ProductStatus,
    default: ProductStatus.DRAFT
  })
  status!: ProductStatus;

  @Prop({ default: false })
  hasVariants!: boolean;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  isDeleted!: boolean;


  @Prop({ default: true })
  isShippingApply!: boolean

  @Prop({ default: 0 })
  averageRating!: number;

  @Prop({ default: 0 })
  totalReviews!: number;
}
export const ProductSchema = SchemaFactory.createForClass(Product);



