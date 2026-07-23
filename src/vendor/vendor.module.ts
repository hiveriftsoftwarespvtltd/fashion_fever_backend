import { Module } from '@nestjs/common';
import { VendorService } from './vendor.service';
import { VendorController } from './vendor.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Vendor, VendorSchema } from './schema/vendor.schema';
import { User, UserSchema } from 'src/user/schema/user.schema';
import { DocumentModule } from 'src/document/document.module';
import { Product, ProductSchema } from 'src/product/schema/product.schema';
import { Category, CategorySchema } from 'src/product/schema/category.schema';
import { ProductVariant, ProductVariantSchema } from 'src/product/schema/product-variant.schema';
import { Order, OrderSchema } from 'src/order/schema/order.schema';
import { VendorOrder, VendorOrderSchema } from 'src/order/schema/vendor-order.schema';
import { VendorShipment, VendorShipmentSchema } from 'src/order/schema/vendor-shipment.schema';
import { Influencer, InfluencerSchema } from 'src/influencer/schema/influencer.schema';
import { InfluencerCommission, InfluencerCommissionSchema } from 'src/influencer/schema/influencer-commision-rate.schema';
import { CashbackSlab, CashbackSlabSchema } from 'src/wallet/schema/cashback/cashbacks.slabs.schema';
import { WalletModule } from 'src/wallet/wallet.module';
import { CommissionRate, CommissionRateSchema } from 'src/admin/schema/commission-rate.schema';
import { InfluencerModule } from 'src/influencer/influencer.module';
import { NotificationModule } from 'src/notification/notification.module';
import { MarketplaceEarning, MarketplaceEarningSchema } from 'src/payout/schema/market-place-earning.schema';
import { PaymentTransaction, PaymenttransactionSchema } from 'src/payout/schema/payment-transaction.schema';

@Module({
  imports:[MongooseModule.forFeature([{name:Vendor.name,schema:VendorSchema}]),MongooseModule.forFeature([{name:User.name,schema:UserSchema}]),MongooseModule.forFeature([{name:Product.name,schema:ProductSchema}]),MongooseModule.forFeature([{name:Category.name,schema:CategorySchema}]),MongooseModule.forFeature([{name:ProductVariant.name,schema:ProductVariantSchema}]),MongooseModule.forFeature([{name:Order.name,schema:OrderSchema}]),MongooseModule.forFeature([{name:VendorOrder.name,schema:VendorOrderSchema}]),
  MongooseModule.forFeature([{name:VendorShipment.name,schema:VendorShipmentSchema}]),MongooseModule.forFeature([{name:Influencer.name,schema:InfluencerSchema}]),MongooseModule.forFeature([{name:InfluencerCommission.name,schema:InfluencerCommissionSchema}]),MongooseModule.forFeature([{name:CashbackSlab.name,schema:CashbackSlabSchema}]),MongooseModule.forFeature([{name:CommissionRate.name,schema:CommissionRateSchema}]),MongooseModule.forFeature([{name:MarketplaceEarning.name,schema:MarketplaceEarningSchema}]),MongooseModule.forFeature([{name:PaymentTransaction.name,schema:PaymenttransactionSchema}]),DocumentModule,WalletModule,InfluencerModule,NotificationModule],
  providers: [VendorService],
  controllers: [VendorController],
  exports:[MongooseModule]
})
export class VendorModule {}
