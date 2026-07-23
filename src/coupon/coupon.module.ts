import { Module } from '@nestjs/common';
import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Coupon, CouponSchema } from './schema/coupon.schema';
import { CouponUsage, CouponUsageSchema } from './schema/coupon-usage.schema';
import { Cart, cartSchema } from 'src/cart/schema/cart.schema';
import { Product, ProductSchema } from 'src/product/schema/product.schema';
import { ProductVariant, ProductVariantSchema } from 'src/product/schema/product-variant.schema';

@Module({
  imports:[MongooseModule.forFeature([{name:Coupon.name,schema:CouponSchema}]),MongooseModule.forFeature([{name:CouponUsage.name,schema:CouponUsageSchema}]),MongooseModule.forFeature([{name:Cart.name,schema:cartSchema}]),MongooseModule.forFeature([{name:Product.name,schema:ProductSchema}]),MongooseModule.forFeature([{name:ProductVariant.name,schema:ProductVariantSchema}])],
  controllers: [CouponController],
  providers: [CouponService],
  exports:[CouponService]
})
export class CouponModule {}
