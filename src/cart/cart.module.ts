import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, cartSchema } from './schema/cart.schema';
import { Product, ProductSchema } from 'src/product/schema/product.schema';
import { ProductVariant, ProductVariantSchema } from 'src/product/schema/product-variant.schema';
import { CouponModule } from 'src/coupon/coupon.module';
import { ShiprocketModule } from 'src/shiprocket/shiprocket.module';
import { Vendor, VendorSchema } from 'src/vendor/schema/vendor.schema';
import { Address, AddressSchema } from 'src/address/schema/address.schema';
import { UserWallet, UserWalletSchema } from 'src/wallet/schema/user/user.wallet.schema';

@Module({
  imports:[MongooseModule.forFeature([{name:Cart.name,schema:cartSchema}]),MongooseModule.forFeature([{name:Product.name,schema:ProductSchema}]),MongooseModule.forFeature([{name:ProductVariant.name,schema:ProductVariantSchema}]),MongooseModule.forFeature([{name:Vendor.name,schema:VendorSchema}]),MongooseModule.forFeature([{name:Address.name,schema:AddressSchema}]),MongooseModule.forFeature([{name:UserWallet.name,schema:UserWalletSchema}]),CouponModule,ShiprocketModule],
  controllers: [CartController],
  providers: [CartService]
})
export class CartModule {}
