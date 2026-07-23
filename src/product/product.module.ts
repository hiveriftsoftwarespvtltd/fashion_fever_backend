import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ProductService } from './product.service';
import { ProductController } from './product.controller';

import {
  Product,
  ProductSchema,
} from './schema/product.schema';

import {
  Category,
  CategorySchema,
} from './schema/category.schema';


import {
  ProductVariant,
  ProductVariantSchema,
} from './schema/product-variant.schema';

import {
  Media,
  MediaSchema,
} from 'src/document/schema/document.schema';

import {
  VendorOrder,
  VendorOrderSchema,
} from 'src/order/schema/vendor-order.schema';

import {
  User,
  UserSchema,
} from 'src/user/schema/user.schema';

import {
  QuickDeliveryCart,
  QuickDeliveryCartSchema,
} from 'src/quick-e-commerce/schema/quick-delivery-cart';

import { DocumentModule } from 'src/document/document.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Product.name,
        schema: ProductSchema,
      },

      {
        name: Category.name,
        schema: CategorySchema,
      },

      {
        name: User.name,
        schema: UserSchema,
      },

      {
        name: ProductVariant.name,
        schema: ProductVariantSchema,
      },

      {
        name: Media.name,
        schema: MediaSchema,
      },
      {
        name: VendorOrder.name,
        schema: VendorOrderSchema,
      },
      {
        name: QuickDeliveryCart.name,
        schema: QuickDeliveryCartSchema,
      },
    ]),

    DocumentModule,
    NotificationModule,
  ],

  controllers: [ProductController],

  providers: [ProductService],

  exports: [ProductService,MongooseModule],
})
export class ProductModule {}