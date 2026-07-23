import { Module } from '@nestjs/common';
import { InfluencerController } from './influencer.controller';
import { InfluencerService } from './influencer.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Influencer, InfluencerSchema } from './schema/influencer.schema';
import { User, UserSchema } from 'src/user/schema/user.schema';
import { Coupon, CouponSchema } from 'src/coupon/schema/coupon.schema';
import { InfluencerCommission, InfluencerCommissionSchema } from './schema/influencer-commision-rate.schema';
import { Order, OrderSchema } from 'src/order/schema/order.schema';
import { influencerCommissionSlabSchema, influencerCommissonSlab } from './schema/influencer-commission-slab';
import { InfluencerPayout, InfluencerPayoutSchema } from './schema/influencer-payout.schema';
import { InfluencerInvitation, InfluencerInvitationSchema } from './schema/influencer-invitation.schema';
import { WalletModule } from 'src/wallet/wallet.module';
import { AffliateProgram, AffliateProgramSchema } from './schema/affliate-program.schema';
import { AffliateClickTracking, AffliateClickTrackingSchema } from './schema/affliate-click-tracking.schema';
import { AffliateSignup, AffliateSignupSchema } from './schema/affliate-signup.schema';
import { AffliateCommission, AffliateCommissionSchema } from './schema/affliate-commission.schema';
import { AffiliateTrackingService } from './affiliate-tracking.service';
import { AffiliateTrackingController } from './affiliate-tracking.controller';
import { AffiliateProgramService } from './affiliate-program.service';
import { AffiliateProgramController } from './affiliate-program.controller';
import { AffiliateDashboardService } from './affiliate-dashboard.service';
import { AffiliateDashboardController } from './affiliate-dashboard.controller';
import { ServiceBooking, ServiceBookingSchema } from 'src/service/schema/service-booking.schema';
import { CoursePurchase, CoursePurchaseSchema } from 'src/courses/schema/course-purchase.schema';
import { Vendor, VendorSchema } from 'src/vendor/schema/vendor.schema';
import { Educator, EducatorSchema } from 'src/courses/schema/educator.schema';
import { ServiceProvider, ServiceProviderSchema } from 'src/service/schema/service-provider.schema';
import { InfluencerTaskbarController } from './influencer-taskbar.controller';
import { InfluencerTaskBar, InfluencerTaskbarSchema } from './schema/influencer-taskbar.schema';
import { InfluencerTaskBarService } from './influencer-taskbar.service';
import { InfluencerStory, InfluencerStorySchema } from './schema/influencer-stories.schema';
import { DocumentModule } from 'src/document/document.module';
import { Admin, AdminSchema } from 'src/admin/schema/admin.schema';


@Module({
  imports: [MongooseModule.forFeature([{ name: Influencer.name, schema: InfluencerSchema }]), MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]), MongooseModule.forFeature([{ name: Coupon.name, schema: CouponSchema }]), MongooseModule.forFeature([{ name: InfluencerCommission.name, schema: InfluencerCommissionSchema }]), MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]), MongooseModule.forFeature([{ name: influencerCommissonSlab.name, schema: influencerCommissionSlabSchema }]), MongooseModule.forFeature([{ name: InfluencerPayout.name, schema: InfluencerPayoutSchema }, { name: InfluencerInvitation.name, schema: InfluencerInvitationSchema }, { name: AffliateProgram.name, schema: AffliateProgramSchema }, { name: AffliateClickTracking.name, schema: AffliateClickTrackingSchema }, { name: AffliateSignup.name, schema: AffliateSignupSchema }, { name: AffliateCommission.name, schema: AffliateCommissionSchema }, { name: ServiceBooking.name, schema: ServiceBookingSchema }, { name: CoursePurchase.name, schema: CoursePurchaseSchema }, { name: Vendor.name, schema: VendorSchema }, { name: Educator.name, schema: EducatorSchema }, { name: ServiceProvider.name, schema: ServiceProviderSchema }, { name: InfluencerTaskBar.name, schema: InfluencerTaskbarSchema }, { name: InfluencerStory.name, schema: InfluencerStorySchema }, { name: Admin.name, schema: AdminSchema }]), WalletModule, DocumentModule],
  controllers: [InfluencerController, AffiliateTrackingController, AffiliateProgramController, AffiliateDashboardController, InfluencerTaskbarController],
  providers: [InfluencerService, AffiliateTrackingService, AffiliateProgramService, AffiliateDashboardService, InfluencerTaskBarService],
  exports: [InfluencerService, AffiliateTrackingService, AffiliateProgramService, AffiliateDashboardService, MongooseModule]
})
export class InfluencerModule { }
