import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  Document,
  Types,
} from 'mongoose';

export type WishlistDocument =
  Wishlist & Document;

@Schema({
  timestamps: true,
  _id: false,
})
export class WishlistItem {

  @Prop({
    type: Types.ObjectId,
    ref: 'Product',
    required: true,
  })
  product!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'ProductVariant',
    required: true,
  })
  variant!: Types.ObjectId;
}

export const WishlistItemSchema =
  SchemaFactory.createForClass(
    WishlistItem,
  );

@Schema({
  timestamps: true,
})
export class Wishlist {

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  user!: Types.ObjectId;

  @Prop({
    type: [WishlistItemSchema],
    default: [],
  })
  items!: WishlistItem[];
}

export const WishlistSchema =
  SchemaFactory.createForClass(
    Wishlist,
  );