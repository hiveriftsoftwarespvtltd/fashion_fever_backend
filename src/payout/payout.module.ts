import { Module } from '@nestjs/common';
import { PayoutService } from './payout.service';
import { PayoutController } from './payout.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Vendor, VendorSchema } from 'src/vendor/schema/vendor.schema';
import { VendorPayout, VendorPayoutSchema } from 'src/vendor/schema/vendor-payout.schema';
import { Influencer, InfluencerSchema } from 'src/influencer/schema/influencer.schema';
import { InfluencerPayout, InfluencerPayoutSchema } from 'src/influencer/schema/influencer-payout.schema';
import { InfluencerCommission, InfluencerCommissionSchema } from 'src/influencer/schema/influencer-commision-rate.schema';
import { influencerCommissionSlabSchema, influencerCommissonSlab } from 'src/influencer/schema/influencer-commission-slab';
import { Order, OrderSchema } from 'src/order/schema/order.schema';
import { VendorOrder, VendorOrderSchema } from 'src/order/schema/vendor-order.schema';
import { BankAccount, BankAccountSchema } from './schema/bank-account.schema';
import { BankAccountService } from './bank-account.service';
import { BankAccountController } from './bank-account.controller';

import { CoursePurchase, CoursePurchaseSchema } from 'src/courses/schema/course-purchase.schema';
import { ServiceBooking, ServiceBookingSchema } from 'src/service/schema/service-booking.schema';
import { PlatformWallet, PlatformWalletSchema } from 'src/wallet/schema/platform/platform.wallet.schema';
import { PlatformWalletTransaction, PlatformWalletTransactionSchema } from 'src/wallet/schema/platform/platform.wallet.transactions';
import { Admin } from 'openai/resources';
import { AdminSchema } from 'src/admin/schema/admin.schema';
import { PaymentTransaction, PaymenttransactionSchema } from './schema/payment-transaction.schema';
import { MarketplaceEarning, MarketplaceEarningSchema } from './schema/market-place-earning.schema';
import { MarketplacePayout, MarketplacePayoutSchema } from './schema/market-place-payout.schema';
import { CashSettlement, CashSettlementSchema } from './schema/cash-settlement.schema';
import { Settlement, SettlementSchema } from './schema/settlement.schema';
import { NotificationModule } from 'src/notification/notification.module';
import { User, UserSchema } from 'src/user/schema/user.schema';
import { VendorQuickOrder, VendorOrderSchema as VendorQuickOrderSchema } from 'src/quick-e-commerce/schema/quick-vendor-order.schema';
import { DeliveryPerson, DeliveryPersonSchema } from 'src/quick-e-commerce/schema/delivery-person.schema';
import { DeliveryPersonCashSettlementService } from './delivery-person-cash-settlement.service';
import { DeliveryPersonCashSettlementController } from './delivery-person-cash-settlement.controller';
import { ServiceProvider, ServiceProviderSchema } from 'src/service/schema/service-provider.schema';
import { QuickDeliveryConfiguration, QuickDeliveryConfigurationSchema } from 'src/quick-e-commerce/schema/quickDeliveryConfig';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vendor.name, schema: VendorSchema },
      { name: Influencer.name, schema: InfluencerSchema },
      { name: VendorPayout.name, schema: VendorPayoutSchema },
      { name: InfluencerPayout.name, schema: InfluencerPayoutSchema },
      { name: InfluencerCommission.name, schema: InfluencerCommissionSchema },
      { name: influencerCommissonSlab.name, schema: influencerCommissionSlabSchema },
      { name: Order.name, schema: OrderSchema },
      { name: VendorOrder.name, schema: VendorOrderSchema },
      { name: BankAccount.name, schema: BankAccountSchema },
      { name: CoursePurchase.name, schema: CoursePurchaseSchema },
      { name: ServiceBooking.name, schema: ServiceBookingSchema },
      { name: PlatformWallet.name, schema: PlatformWalletSchema },
      { name: PlatformWalletTransaction.name, schema: PlatformWalletTransactionSchema },
      { name: Admin.name, schema: AdminSchema },
      { name: PaymentTransaction.name, schema: PaymenttransactionSchema },
      { name: MarketplaceEarning.name, schema: MarketplaceEarningSchema },
      { name: MarketplacePayout.name, schema: MarketplacePayoutSchema },
      { name: CashSettlement.name, schema: CashSettlementSchema },
      { name: Settlement.name, schema: SettlementSchema },
      { name: User.name, schema: UserSchema },
      { name: VendorQuickOrder.name, schema: VendorQuickOrderSchema },
      { name: DeliveryPerson.name, schema: DeliveryPersonSchema },
      { name: ServiceProvider.name, schema: ServiceProviderSchema },
      { name: QuickDeliveryConfiguration.name, schema: QuickDeliveryConfigurationSchema }
    ]),
    NotificationModule,
  ],
  providers: [PayoutService, BankAccountService, DeliveryPersonCashSettlementService],
  controllers: [PayoutController, BankAccountController, DeliveryPersonCashSettlementController],
})
export class PayoutModule { }
