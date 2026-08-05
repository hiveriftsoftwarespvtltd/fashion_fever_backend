import { forwardRef, Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Vendor, VendorSchema } from 'src/vendor/schema/vendor.schema';
import { Mongoose } from 'mongoose';
import { User, UserSchema } from 'src/user/schema/user.schema';
import { Category, CategorySchema } from 'src/product/schema/category.schema';
import { Product, ProductSchema } from 'src/product/schema/product.schema';
import { DocumentModule } from 'src/document/document.module';
import {
  ProductVariant,
  ProductVariantSchema,
} from 'src/product/schema/product-variant.schema';
import { Order, OrderSchema } from 'src/order/schema/order.schema';
import { VendorOrder } from 'src/order/schema/vendor-order.schema';
import {
  InfluencerCommission,
  InfluencerCommissionSchema,
} from 'src/influencer/schema/influencer-commision-rate.schema';
import {
  VendorPayout,
  VendorPayoutSchema,
} from 'src/vendor/schema/vendor-payout.schema';
import { AdminDashboardService } from './admin.dashboard.service';
import { AdminDashboardController } from './admin.dashboard.controller';
import {
  Influencer,
  InfluencerSchema,
} from 'src/influencer/schema/influencer.schema';
import { AdminPublicController } from './admin.public.controllers';
import { InfluencerModule } from 'src/influencer/influencer.module';
import { influencerCommissionSlabSchema, influencerCommissonSlab } from 'src/influencer/schema/influencer-commission-slab';
import { InfluencerPayout, InfluencerPayoutSchema } from 'src/influencer/schema/influencer-payout.schema';
import { InfluencerInvitation, InfluencerInvitationSchema } from 'src/influencer/schema/influencer-invitation.schema';
import { HomeContentController } from './home.content.controller';
import { HomeContentService } from './home.content.service';
import { HomeContent, HomeContentSchema } from './schema/home.content.schema';
import { HomeBookingCardsController } from './home-booking-cards.controller';
import { HomeBookingCardsService } from './home-booking-cards.service';
import { HomeBookingCard, HomeBookingCardSchema } from './schema/home-booking-cards.schema';
import { WalletModule } from 'src/wallet/wallet.module';
import { ServiceLead, ServiceLeadSchema } from 'src/service/schema/service-lead.schema';
import { ServiceBooking, ServiceBookingSchema } from 'src/service/schema/service-booking.schema';
import { CoursePurchase, CoursePurchaseSchema } from 'src/courses/schema/course-purchase.schema';
import { UserWallet, UserWalletSchema } from 'src/wallet/schema/user/user.wallet.schema';
import { WalletTransaction, WalletTransactionSchema } from 'src/wallet/schema/user/user.wallet.transactions';
import { Wishlist, WishlistSchema } from 'src/wishlist/schema/wishlist.schema';
import { Cart, cartSchema } from 'src/cart/schema/cart.schema';
import { VendorOrderSchema } from 'src/order/schema/vendor-order.schema';

import { Educator, EducatorSchema } from 'src/courses/schema/educator.schema';
import { Course, CourseSchema } from 'src/courses/schema/course.schema';
import { CourseEnrollment, CourseEnrollmentSchema } from 'src/courses/schema/course-enrollement.schema';
import { ServiceProvider, ServiceProviderSchema } from 'src/service/schema/service-provider.schema';
import { ServiceQuotation, ServiceQuotationSchema } from 'src/service/schema/service-quotation.schema';
import { ProviderSubscription, ProviderSubscriptionSchema } from 'src/service/schema/provider-subscription.schema';
import { ServiceReview, ServiceReviewSchema } from 'src/service/schema/service-review.schema';
import { Service, ServiceSchema } from 'src/service/schema/service.schema';
import { ServiceStaff, ServiceStaffSchema } from 'src/service/schema/service-staff.schema';

import { AdminCleanupController } from './admin.cleanup.controller';
import { AdminCleanupService } from './admin.cleanup.service';

import { AdminSeederController } from './admin.seeder.controller';
import { AdminSeederService } from './admin.seeder.service';
import { AdminCommissionRateController } from './admin.commission-rate.controller';
import { AdminCommissionRateService } from './admin.commission-rate.service';
import { CommissionRate, CommissionRateSchema } from './schema/commission-rate.schema';
import { Admin, AdminSchema } from './schema/admin.schema';
import { SubAdminService } from './sub-admin.service';
import { SubAdminController } from './sub-admin.controller';
import { UserManagementService } from './user-management.service';
import { UserManagementController } from './user-management.controller';
import { AdminProfileController } from './admin-profile.controller';
import { AdminProfileService } from './admin-profile.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Vendor.name, schema: VendorSchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
    ]),
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    MongooseModule.forFeature([
      { name: ProductVariant.name, schema: ProductVariantSchema },
    ]),
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    MongooseModule.forFeature([
      { name: VendorOrder.name, schema: VendorOrderSchema },
    ]),
    MongooseModule.forFeature([
      { name: InfluencerCommission.name, schema: InfluencerCommissionSchema },
    ]),
    MongooseModule.forFeature([
      { name: Influencer.name, schema: InfluencerSchema },
    ]),
    MongooseModule.forFeature([
      { name: VendorPayout.name, schema: VendorPayoutSchema },
    ]),
    MongooseModule.forFeature([{ name: influencerCommissonSlab.name, schema: influencerCommissionSlabSchema }]),
    MongooseModule.forFeature([{ name: InfluencerPayout.name, schema: InfluencerPayoutSchema }, { name: InfluencerInvitation.name, schema: InfluencerInvitationSchema }, { name: ServiceLead.name, schema: ServiceLeadSchema }, { name: ServiceBooking.name, schema: ServiceBookingSchema }, { name: CoursePurchase.name, schema: CoursePurchaseSchema }, { name: UserWallet.name, schema: UserWalletSchema }, { name: WalletTransaction.name, schema: WalletTransactionSchema }, { name: Wishlist.name, schema: WishlistSchema }, { name: Cart.name, schema: cartSchema }, { name: Educator.name, schema: EducatorSchema }, { name: Course.name, schema: CourseSchema }, { name: CourseEnrollment.name, schema: CourseEnrollmentSchema }, { name: ServiceProvider.name, schema: ServiceProviderSchema }, { name: ServiceQuotation.name, schema: ServiceQuotationSchema }, { name: ProviderSubscription.name, schema: ProviderSubscriptionSchema }, { name: ServiceReview.name, schema: ServiceReviewSchema }, { name: Service.name, schema: ServiceSchema }, { name: ServiceStaff.name, schema: ServiceStaffSchema }]),
    MongooseModule.forFeature([{ name: HomeContent.name, schema: HomeContentSchema }]),
    MongooseModule.forFeature([{ name: HomeBookingCard.name, schema: HomeBookingCardSchema }]),
    MongooseModule.forFeature([{ name: CommissionRate.name, schema: CommissionRateSchema }]),
    MongooseModule.forFeature([{ name: Admin.name, schema: AdminSchema }]),
    DocumentModule,
    InfluencerModule,
    WalletModule

  ],
  providers: [AdminService, AdminDashboardService, HomeContentService, HomeBookingCardsService, AdminCleanupService, AdminSeederService, AdminCommissionRateService, SubAdminService, UserManagementService, AdminProfileService],
  controllers: [
    AdminPublicController,
    HomeContentController,
    HomeBookingCardsController,
    AdminDashboardController,
    AdminCleanupController,
    AdminSeederController,
    AdminCommissionRateController,
    SubAdminController,
    UserManagementController,
    AdminProfileController,
    AdminController,
  ],
  exports: [AdminService, MongooseModule]
})
export class AdminModule { }
