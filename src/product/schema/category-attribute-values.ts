import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

export type CategoryAttributeValueDocument =
  CategoryAttributeValue & Document;

@Schema({ timestamps: true })
export class CategoryAttributeValue {
  @Prop({ type: Types.ObjectId, ref: "CategoryAttribute", required: true })
  attributeId!: Types.ObjectId;

  @Prop({ required: true })
  value!: string; 
  // e.g. "Red", "Blue", "XL", "128GB"

  @Prop({ default: 0 })
  sortOrder!: number;

  @Prop({ default: true })
  isActive!: boolean;
}

export const CategoryAttributeValueSchema =
  SchemaFactory.createForClass(CategoryAttributeValue);

CategoryAttributeValueSchema.index({ attributeId: 1 });