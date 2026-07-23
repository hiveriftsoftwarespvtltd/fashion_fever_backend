import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

export type CategoryAttributeDocument = CategoryAttribute & Document;

@Schema({ timestamps: true })
export class CategoryAttribute {
  @Prop({ type: Types.ObjectId, ref: "Category", required: true })
  categoryId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string; 
  // e.g. "Color", "Size", "Storage"

  @Prop({ required: true })
  slug!: string;

  @Prop({ default: false })
  isRequired!: boolean;

  @Prop({ default: false })
  isVariant!: boolean; 
  // true = used in product variants (like size/color)

  @Prop({ default: false })
  isFilterable!: boolean; 
  // used for frontend filters

  @Prop({ default: true })
  isActive!: boolean;
}

export const CategoryAttributeSchema =
  SchemaFactory.createForClass(CategoryAttribute);

CategoryAttributeSchema.index({ categoryId: 1 });