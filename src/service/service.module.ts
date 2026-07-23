import { Module } from '@nestjs/common';
import { ServiceController } from './service.controller';
import { ServiceService } from './service.service';
import { ServiceSearchController } from './service-search.controller';
import { ServiceSearchService } from './service-search.service';
import { ServiceBookingController } from './service-booking.controller';
import { ServiceBookingService } from './service-booking.service';
import { ServiceLeadController } from './service-lead.controller';
import { ServiceLeadService } from './service-lead.service';
import { ServiceReviewController } from './service-review.controller';
import { ServiceReviewService } from './service-review.service';
import { ServiceProviderReviewController } from './service-provider-review.controller';
import { ServiceProviderReviewService } from './service-provider-review.service';
import { ServiceQuotationController } from './service-quotation.controller';
import { ServiceQuotationService } from './service-quotation.service';
import {
  ProviderSubscription,
  ProviderSubscriptionSchema,
} from './schema/provider-subscription.schema';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ProviderAvailability,
  ProviderAvailabilitySchema,
} from './schema/service-availability.schema';
import {
  ServiceBooking,
  ServiceBookingSchema,
} from './schema/service-booking.schema';
import {
  ServiceCategory,
  ServiceCategorySchema,
} from './schema/service-category.schema';
import { ServiceLead, ServiceLeadSchema } from './schema/service-lead.schema';

import {
  ServiceProvider,
  ServiceProviderSchema,
} from './schema/service-provider.schema';
import {
  ServiceReview,
  ServiceReviewSchema,
} from './schema/service-review.schema';
import {
  ServiceQuotation,
  ServiceQuotationSchema,
} from './schema/service-quotation.schema';
import { ServcieSlotSchema, ServiceSlot } from './schema/service-slot.schema';
import {
  ServiceStaff,
  ServiceStaffSchema,
} from './schema/service-staff.schema';
import {
  ServiceSubscriptionPlan,
  ServiceSubscriptionPlanSchema,
} from './schema/service-subscription.schema';
import { Service, ServiceSchema } from './schema/service.schema';
import { DocumentModule } from 'src/document/document.module';
import { User, UserSchema } from 'src/user/schema/user.schema';
import { Coupon, CouponSchema } from 'src/coupon/schema/coupon.schema';
import { CouponUsage, CouponUsageSchema } from 'src/coupon/schema/coupon-usage.schema';
import { CashbackSlab, CashbackSlabSchema } from 'src/wallet/schema/cashback/cashbacks.slabs.schema';
import { WalletModule } from 'src/wallet/wallet.module';
import { LeadBooking, LeadBookingSchema } from './schema/service-lead-booking.schema';
import { StaffAllocation, StaffAllocationSchema } from './schema/staff-allocation.schema';
import { CommissionRate, CommissionRateSchema } from 'src/admin/schema/commission-rate.schema';
import { InfluencerModule } from 'src/influencer/influencer.module';
import { Admin, AdminSchema } from 'src/admin/schema/admin.schema';
import { NotificationModule } from 'src/notification/notification.module';
import { PaymentTransaction, PaymenttransactionSchema } from 'src/payout/schema/payment-transaction.schema';
import { MarketplaceEarning, MarketplaceEarningSchema } from 'src/payout/schema/market-place-earning.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProviderSubscription.name, schema: ProviderSubscriptionSchema },
      { name: ProviderAvailability.name, schema: ProviderAvailabilitySchema },
      { name: ServiceBooking.name, schema: ServiceBookingSchema },
      { name: ServiceCategory.name, schema: ServiceCategorySchema },
      { name: ServiceLead.name, schema: ServiceLeadSchema },
      { name: ServiceProvider.name, schema: ServiceProviderSchema },
      { name: ServiceReview.name, schema: ServiceReviewSchema },
      { name: ServiceQuotation.name, schema: ServiceQuotationSchema },
      { name: ServiceSlot.name, schema: ServcieSlotSchema },
      { name: ServiceStaff.name, schema: ServiceStaffSchema },
      {
        name: ServiceSubscriptionPlan.name,
        schema: ServiceSubscriptionPlanSchema,
      },
      { name: Service.name, schema: ServiceSchema },
      { name: User.name, schema: UserSchema },
      { name: Coupon.name, schema: CouponSchema },
      { name: CouponUsage.name, schema: CouponUsageSchema },
      { name: CashbackSlab.name, schema: CashbackSlabSchema },
      { name: LeadBooking.name, schema: LeadBookingSchema },
      { name: StaffAllocation.name, schema: StaffAllocationSchema },
      { name: CommissionRate.name, schema: CommissionRateSchema },
      { name: PaymentTransaction.name, schema: PaymenttransactionSchema },
      { name: MarketplaceEarning.name, schema: MarketplaceEarningSchema },
      { name: Admin.name, schema: AdminSchema },
    ]),
    DocumentModule,
    WalletModule,
    InfluencerModule,
    NotificationModule,
  ],
  controllers: [ServiceController, ServiceSearchController, ServiceBookingController, ServiceLeadController, ServiceReviewController, ServiceProviderReviewController, ServiceQuotationController],
  providers: [ServiceService, ServiceSearchService, ServiceBookingService, ServiceLeadService, ServiceReviewService, ServiceProviderReviewService, ServiceQuotationService],
  exports: [ServiceService, ServiceSearchService, ServiceBookingService, ServiceLeadService, MongooseModule, ServiceReviewService, ServiceProviderReviewService, ServiceQuotationService],
})
export class ServiceModule { }
