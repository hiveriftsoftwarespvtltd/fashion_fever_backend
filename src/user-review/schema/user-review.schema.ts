import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserReviewDocument = UserReview & Document;

@Schema({ timestamps: true })
export class UserReview {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Product',
    required: true,
  })
  productId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'VendorOrder',
    required: false,
  })
  vendorOrderId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Order',
    required: false,
  })
  orderId?: Types.ObjectId;

  @Prop({
    min: 1,
    max: 5,
    required: true,
  })
  rating!: number;

  @Prop({
    trim: true,
  })
  title?: string;

  @Prop({
    trim: true,
  })
  review?: string;

  @Prop({
    type: [Types.ObjectId],
    ref: 'Media',
    default: [],
  })
  images!: Types.ObjectId[];

  @Prop({
    default: false,
  })
  isVerifiedPurchase!: boolean;

  @Prop({
    default: true,
  })
  isActive!: boolean;

  @Prop({
    default: false,
  })
  isDeleted!: boolean;
}

export const UserReviewSchema =
  SchemaFactory.createForClass(UserReview);

UserReviewSchema.index(
  {
    userId: 1,
    productId: 1,
  },
  {
    unique: true,
  },
);