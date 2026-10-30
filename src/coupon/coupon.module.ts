import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';
import { Coupon, CouponSchema } from './schema/coupon.schema';
import { CouponUsage, CouponUsageSchema } from './schema/coupon-usage.schema';
import { Cart, cartSchema } from 'src/cart/schema/cart.schema';
import { Product, ProductSchema } from 'src/product/schema/product.schema';
import {
  ProductVariant,
  ProductVariantSchema,
} from 'src/product/schema/product-variant.schema';

// Service-Provider coupon additions
import { ServiceProviderCouponController } from './service-provider-coupon.controller';
import { ServiceProviderCouponService } from './service-provider-coupon.service';
import { Service, ServiceSchema } from 'src/service/schema/service.schema';
import {
  ServiceProvider,
  ServiceProviderSchema,
} from 'src/service/schema/service-provider.schema';

import { Media, MediaSchema } from 'src/document/schema/document.schema';
import {
  Influencer,
  InfluencerSchema,
} from 'src/influencer/schema/influencer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Coupon.name, schema: CouponSchema },
      { name: CouponUsage.name, schema: CouponUsageSchema },
      { name: Cart.name, schema: cartSchema },
      { name: Product.name, schema: ProductSchema },
      { name: ProductVariant.name, schema: ProductVariantSchema },
      // Needed by ServiceProviderCouponService
      { name: Service.name, schema: ServiceSchema },
      { name: ServiceProvider.name, schema: ServiceProviderSchema },
      { name: Media.name, schema: MediaSchema },
      { name: Influencer.name, schema: InfluencerSchema },
    ]),
  ],
  controllers: [CouponController, ServiceProviderCouponController],
  providers: [CouponService, ServiceProviderCouponService],
  exports: [CouponService, ServiceProviderCouponService],
})
export class CouponModule {}
