import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// User
import { UserWalletController } from './controller/user/user.wallet.controller';
import { UserWalletService } from './service/user/user.wallet.service';
import { UserWallet, UserWalletSchema } from './schema/user/user.wallet.schema';
import { WalletTransaction, WalletTransactionSchema } from './schema/user/user.wallet.transactions';
import { UserWalletTopup, UserWalletTopupSchema } from './schema/user/user.wallet.topup.schema';

// Platform
import { PlatformWalletController } from './controller/platform/platform.wallet.controller';
import { PlatformWalletService } from './service/platform/platform.wallet.service';
import { PlatformWallet, PlatformWalletSchema } from './schema/platform/platform.wallet.schema';
import { PlatformWalletTransaction, PlatformWalletTransactionSchema } from './schema/platform/platform.wallet.transactions';

// Admin
import { AdminWalletController } from './controller/admin/admin.wallet.controller';
import { AdminWalletService } from './service/admin/admin.wallet.service';
import { AdminCashbackSlabController } from './controller/admin/admin.cashback-slab.controller';
import { AdminCashbackSlabService } from './service/admin/admin.cashback-slab.service';
import { CashbackSlab, CashbackSlabSchema } from './schema/cashback/cashbacks.slabs.schema';

// Entity Collections for Sync
import { User, UserSchema } from 'src/user/schema/user.schema';
import { Vendor, VendorSchema } from 'src/vendor/schema/vendor.schema';
import { Influencer, InfluencerSchema } from 'src/influencer/schema/influencer.schema';
import { ServiceProvider, ServiceProviderSchema } from 'src/service/schema/service-provider.schema';
import { Educator, EducatorSchema } from 'src/courses/schema/educator.schema';
import { AdminModule } from 'src/admin/admin.module';
import { Admin } from 'openai/resources';
import { AdminSchema } from 'src/admin/schema/admin.schema';
import { NotificationModule } from 'src/notification/notification.module';

import { VendorWalletController } from './controller/vendor/vendor.wallet.controller';

import { MarketplaceEarning, MarketplaceEarningSchema } from 'src/payout/schema/market-place-earning.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserWallet.name, schema: UserWalletSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: UserWalletTopup.name, schema: UserWalletTopupSchema },

      { name: PlatformWallet.name, schema: PlatformWalletSchema },
      { name: PlatformWalletTransaction.name, schema: PlatformWalletTransactionSchema },

      // Entity Collections for Syncing
      { name: User.name, schema: UserSchema },
      { name: Vendor.name, schema: VendorSchema },
      { name: Influencer.name, schema: InfluencerSchema },
      { name: ServiceProvider.name, schema: ServiceProviderSchema },
      { name: Educator.name, schema: EducatorSchema },

      // Marketplace Earning
      { name: MarketplaceEarning.name, schema: MarketplaceEarningSchema },

      // Cashback
      { name: CashbackSlab.name, schema: CashbackSlabSchema },
      { name: Admin.name, schema: AdminSchema }

    ]),
    NotificationModule
  ],
  controllers: [
    UserWalletController,
    VendorWalletController,
    PlatformWalletController,
    AdminWalletController,
    AdminCashbackSlabController,
  ],
  providers: [
    UserWalletService,
    PlatformWalletService,
    AdminWalletService,
    AdminCashbackSlabService,
  ],
  exports: [
    UserWalletService,
  ]
})
export class WalletModule { }
