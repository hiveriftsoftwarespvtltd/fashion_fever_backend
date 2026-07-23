import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schema/order.schema';
import { Product, ProductSchema } from 'src/product/schema/product.schema';
import { ProductVariant, ProductVariantSchema } from 'src/product/schema/product-variant.schema';
import { Address, AddressSchema } from 'src/address/schema/address.schema';
import { Coupon, CouponSchema } from 'src/coupon/schema/coupon.schema';
import { Influencer, InfluencerSchema } from 'src/influencer/schema/influencer.schema';
import { CouponUsage, CouponUsageSchema } from 'src/coupon/schema/coupon-usage.schema';
import { VendorPayout, VendorPayoutSchema } from 'src/vendor/schema/vendor-payout.schema';
import { InfluencerCommission, InfluencerCommissionSchema } from 'src/influencer/schema/influencer-commision-rate.schema';
import { Vendor, VendorSchema } from 'src/vendor/schema/vendor.schema';
import { ShiprocketModule } from 'src/shiprocket/shiprocket.module';
import { VendorOrder, VendorOrderSchema } from './schema/vendor-order.schema';
import { UserReview, UserReviewSchema } from 'src/user-review/schema/user-review.schema';

import { WalletModule } from 'src/wallet/wallet.module';
import { CashbackSlab, CashbackSlabSchema } from 'src/wallet/schema/cashback/cashbacks.slabs.schema';
import { PaymentTransaction, PaymenttransactionSchema } from 'src/payout/schema/payment-transaction.schema';
import { CommissionRate, CommissionRateSchema } from 'src/admin/schema/commission-rate.schema';
import { InfluencerModule } from 'src/influencer/influencer.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]), MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]), MongooseModule.forFeature([{ name: ProductVariant.name, schema: ProductVariantSchema }]), MongooseModule.forFeature([{ name: Address.name, schema: AddressSchema }]), MongooseModule.forFeature([{ name: Coupon.name, schema: CouponSchema }]), MongooseModule.forFeature([{ name: Influencer.name, schema: InfluencerSchema }]), MongooseModule.forFeature([{ name: CouponUsage.name, schema: CouponUsageSchema }]), MongooseModule.forFeature([{ name: VendorPayout.name, schema: VendorPayoutSchema }]), MongooseModule.forFeature([{ name: InfluencerCommission.name, schema: InfluencerCommissionSchema }]), MongooseModule.forFeature([{ name: Vendor.name, schema: VendorSchema }]), MongooseModule.forFeature([{ name: VendorOrder.name, schema: VendorOrderSchema }]), MongooseModule.forFeature([{ name: UserReview.name, schema: UserReviewSchema }, { name: CashbackSlab.name, schema: CashbackSlabSchema }, { name: CommissionRate.name, schema: CommissionRateSchema }, { name: PaymentTransaction.name, schema: PaymenttransactionSchema }]), ShiprocketModule, WalletModule, InfluencerModule, NotificationModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService, MongooseModule]
})
export class OrderModule { }
