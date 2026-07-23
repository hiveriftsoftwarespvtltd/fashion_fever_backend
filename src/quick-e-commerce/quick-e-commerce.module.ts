import { Module } from '@nestjs/common';
import { QuickECommerceService } from './quick-e-commerce.service';
import { QuickECommerceController } from './quick-e-commerce.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from 'src/product/schema/product.schema';
import { Category, CategorySchema } from 'src/product/schema/category.schema';
import { User, UserSchema } from 'src/user/schema/user.schema';
import { Address, AddressSchema } from 'src/address/schema/address.schema';
import { Vendor, VendorSchema } from 'src/vendor/schema/vendor.schema';
import { ProductVariant, ProductVariantSchema } from 'src/product/schema/product-variant.schema';
import { DeliveryPerson, DeliveryPersonSchema } from './schema/delivery-person.schema';
import { DeliveryPersonService } from './delivery-person.service';
import { VendorDeliveryPersonController } from './vendor-delivery-person.controller';
import { AdminDeliveryPersonController } from './admin-delivery-person.controller';
import { QuickVendorController } from './quick-vendor.controller';
import { QuickVendorService } from './quick-vendor.service';
import { QuickAdminController } from './quick-admin.controller';
import { QuickAdminService } from './quick-admin.service';
import { VendorQuickOrder, VendorOrderSchema } from './schema/quick-vendor-order.schema';
import { QuickOrder, QuickOrderSchema } from './schema/quick-order.schema';
import { QuickDeliveryCart, QuickDeliveryCartSchema } from './schema/quick-delivery-cart';
import { QuickDeliveryCartController } from './quick-delivery-cart.controller';
import { QuickDeliveryCartService } from './quick-delivery-cart.service';
import { QuickDeliveryConfiguration, QuickDeliveryConfigurationSchema } from './schema/quickDeliveryConfig';
import { QuickDeliveryConfigController } from './quick-delivery-config.controller';
import { QuickDeliveryConfigService } from './quick-delivery-config.service';
import { Admin, AdminSchema } from 'src/admin/schema/admin.schema';
import { Coupon, CouponSchema } from 'src/coupon/schema/coupon.schema';
import { QuickDeliveryCheckoutService } from './quick-delivery-checkout.service';
import { QuickDeliveryCheckoutController } from './quick-delivery-checkout.controller';
import { QuickOrderService } from './quick-delivery-order.service';
import { QuickOrderController } from './quick-delivery-order.controller';
import { VendorQuickOrderController } from './vendor-quick-order.controller';
import { AdminQuickOrderController } from './admin-quick-order.controller';
import { DeliveryPersonQuickOrderController } from './delivery-person-quick-order.controller';
import { UserWallet, UserWalletSchema } from 'src/wallet/schema/user/user.wallet.schema';
import { WalletTransaction, WalletTransactionSchema } from 'src/wallet/schema/user/user.wallet.transactions';
import { CommissionRate, CommissionRateSchema } from 'src/admin/schema/commission-rate.schema';
import { DocumentModule } from 'src/document/document.module';
import { Notification, NotificationSchema } from 'src/notification/schema/notification.schema';
import { NotificationModule } from 'src/notification/notification.module';
import { DeliveryPersonAssignment, DeliveryPersonAssignmentSchema } from './schema/delivery-person-assignment.schema';
import { PaymentTransaction, PaymenttransactionSchema } from 'src/payout/schema/payment-transaction.schema';
import { MarketplaceEarning, MarketplaceEarningSchema } from 'src/payout/schema/market-place-earning.schema';
import { Influencer, InfluencerSchema } from 'src/influencer/schema/influencer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: User.name, schema: UserSchema },
      { name: Address.name, schema: AddressSchema },
      { name: Vendor.name, schema: VendorSchema },
      { name: ProductVariant.name, schema: ProductVariantSchema },
      { name: DeliveryPerson.name, schema: DeliveryPersonSchema },
      { name: VendorQuickOrder.name, schema: VendorOrderSchema },
      { name: QuickOrder.name, schema: QuickOrderSchema },
      { name: QuickDeliveryCart.name, schema: QuickDeliveryCartSchema },
      { name: QuickDeliveryConfiguration.name, schema: QuickDeliveryConfigurationSchema },
      { name: Admin.name, schema: AdminSchema },
      { name: Coupon.name, schema: CouponSchema },
      { name: UserWallet.name, schema: UserWalletSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: CommissionRate.name, schema: CommissionRateSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: DeliveryPersonAssignment.name, schema: DeliveryPersonAssignmentSchema },
      { name: PaymentTransaction.name, schema: PaymenttransactionSchema },
      { name: MarketplaceEarning.name, schema: MarketplaceEarningSchema },
      { name: Influencer.name, schema: InfluencerSchema }
    ]),
    DocumentModule,
    NotificationModule
  ],
  providers: [
    QuickECommerceService,
    DeliveryPersonService,
    QuickVendorService,
    QuickAdminService,
    QuickDeliveryCartService,
    QuickDeliveryConfigService,
    QuickDeliveryCheckoutService,
    QuickOrderService
  ],
  controllers: [
    QuickECommerceController,
    VendorDeliveryPersonController,
    AdminDeliveryPersonController,
    QuickVendorController,
    QuickAdminController,
    QuickDeliveryCartController,
    QuickDeliveryConfigController,
    QuickDeliveryCheckoutController,
    QuickOrderController,
    VendorQuickOrderController,
    AdminQuickOrderController,
    DeliveryPersonQuickOrderController
  ]
})
export class QuickECommerceModule { }
