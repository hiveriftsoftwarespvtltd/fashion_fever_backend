import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schema/user.schema';
import { Media, MediaSchema } from 'src/document/schema/document.schema';
import { DocumentModule } from 'src/document/document.module';
import { Product, ProductSchema } from 'src/product/schema/product.schema';
import { AddressModule } from 'src/address/address.module';
import { Wishlist, WishlistSchema } from 'src/wishlist/schema/wishlist.schema';
import { Coupon, CouponSchema } from 'src/coupon/schema/coupon.schema';
import { ShiprocketModule } from 'src/shiprocket/shiprocket.module';
import { Address, AddressSchema } from 'src/address/schema/address.schema';
import { PublicUserController } from './user.public.controller';
import { InfluencerModule } from 'src/influencer/influencer.module';
import { VendorOrder, VendorOrderSchema } from 'src/order/schema/vendor-order.schema';
import { Cart, cartSchema as CartSchema } from 'src/cart/schema/cart.schema';


@Module({
  imports:[
    MongooseModule.forFeature([{name:User.name,schema:UserSchema}]),
    MongooseModule.forFeature([{name:Media.name,schema:MediaSchema}]),
    MongooseModule.forFeature([{name:Product.name,schema:ProductSchema}]),
    MongooseModule.forFeature([{name:Wishlist.name,schema:WishlistSchema}]),
    MongooseModule.forFeature([{name:Coupon.name,schema:CouponSchema}]),
    MongooseModule.forFeature([{name:Address.name,schema:AddressSchema}]),
    MongooseModule.forFeature([{name:VendorOrder.name,schema:VendorOrderSchema}]),
    MongooseModule.forFeature([{name:Cart.name,schema:CartSchema}]),
    
    DocumentModule,
    AddressModule,
    ShiprocketModule,
    InfluencerModule
    
  ],
  providers: [UserService],
  controllers: [UserController,PublicUserController],
  exports:[UserService,MongooseModule]
})
export class UserModule {}
