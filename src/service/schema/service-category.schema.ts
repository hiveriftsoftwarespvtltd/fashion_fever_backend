import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";


export enum CategoryType {
  RENTAL = 'RENTAL',
  SERVICE = 'SERVICE'
}

export type ServiceCategoryDocument = ServiceCategory & Document
@Schema({ timestamps: true })
export class ServiceCategory {

  @Prop({ required: true, unique: true })
  name!: string;

  @Prop({ required: true, unique: true })
  label!: string;

  @Prop()
  description!: string;

  @Prop({ enum: CategoryType, required: true, default: CategoryType.SERVICE })
  type!: CategoryType;

  @Prop({
    type: Types.ObjectId,
    ref: 'Media',
  })
  image!: Types.ObjectId;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  isDeleted!: boolean
}

export const ServiceCategorySchema = SchemaFactory.createForClass(ServiceCategory)