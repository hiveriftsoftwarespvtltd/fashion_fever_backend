import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export enum DocumentType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
}

export type MediaDocument = Media & Document

@Schema({ timestamps: true })
export class Media {
  @Prop({ required: true })
  url!: string;

  @Prop({ required: true, index: true })
  publicId!: string;

  @Prop({ enum: DocumentType, default: DocumentType.IMAGE })
  type!: DocumentType;

  @Prop({ required: true })
  originalName!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true })
  size!: number; 

  @Prop({ type: Types.ObjectId, ref: 'User' })
  uploadedBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Vendor' })
  vendor?: Types.ObjectId;

  @Prop({ required: true })
  folder!: string;

  @Prop({required:true,enum:['local','cloudinary','s3']})
  storage!:string;

  @Prop({ default: true })
  isActive!: boolean;
}



export const MediaSchema = SchemaFactory.createForClass(Media)
