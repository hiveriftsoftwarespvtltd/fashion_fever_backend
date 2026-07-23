import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model, Types } from 'mongoose';

import { Wishlist, WishlistDocument } from './schema/wishlist.schema';

import {
  Product,
  ProductDocument,
  ProductStatus,
} from 'src/product/schema/product.schema';

import {
  ProductVariant,
  ProductVariantDocument,
} from 'src/product/schema/product-variant.schema';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(Wishlist.name)
    private wishlistModel: Model<WishlistDocument>,

    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,

    @InjectModel(ProductVariant.name)
    private productVariantModel: Model<ProductVariantDocument>,
  ) {}
  

  async addToWishlist(userId: string, productId: string, variantId: string) {
    

    const product = await this.productModel.findOne({
      _id: productId,
      isDeleted: false,
      isActive: true,
      status: ProductStatus.ACTIVE,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const variant = await this.productVariantModel.findOne({
      _id: new Types.ObjectId(variantId),
      productId: new Types.ObjectId(productId),
      isActive: true,
    });


    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    let wishlist = await this.wishlistModel.findOne({
      user: userId,
    });

    if (!wishlist) {
      wishlist = await this.wishlistModel.create({
        user: userId,
        items: [],
      });
    }

    const alreadyExists = wishlist.items.find(
      (item) =>
        item.product.toString() === productId &&
        item.variant.toString() === variantId,
    );

    if (alreadyExists) {
      throw new BadRequestException('Item already exists in wishlist');
    }

    wishlist.items.push({
      product: new Types.ObjectId(productId),
      variant: new Types.ObjectId(variantId),
    } as any);

    await wishlist.save();

    return await this.fetchWishlist(userId);
  }

  async fetchWishlist(userId: string) {
    const wishlist = await this.wishlistModel
      .findOne({
        user: userId,
      })
      .populate({
        path: 'items.product',
        populate: {
          path: 'categoryId',
        },
      })
      .populate({
        path: 'items.variant',
        populate: [
          {
            path: 'thumbnail',
          },
          {
            path: 'images',
          },
        ],
      });

    return wishlist || { items: [] };
  }

  async removeFromWishlist(userId: string, variantId: string) {
    const wishlist = await this.wishlistModel.findOne({
      user: userId,
    });

    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

    const existingItem = wishlist.items.find(
      (item) => item.variant.toString() === variantId,
    );

    if (!existingItem) {
      throw new NotFoundException('Item not found in wishlist');
    }

    wishlist.items = wishlist.items.filter(
      (item) => item.variant.toString() !== variantId,
    );

    await wishlist.save();

    return await this.fetchWishlist(userId);
  }

  async clearWishlist(userId: string) {
    const wishlist = await this.wishlistModel.findOne({
      user: userId,
    });

    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

    wishlist.items = [];

    await wishlist.save();

    return {
      message: 'Wishlist cleared successfully',
    };
  }
}
