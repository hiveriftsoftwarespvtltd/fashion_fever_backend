import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationController } from './notification.controller';
import { AdminNotificationController } from './admin.notification.controller';
import { NotificationService } from './notification.service';
import { Notification, NotificationSchema } from './schema/notification.schema';
import { NotificationCampaign, NotificationCampaignSchema } from './schema/notification.campaign.schema';
import { User, UserSchema } from '../user/schema/user.schema';
import { ServiceBooking, ServiceBookingSchema } from '../service/schema/service-booking.schema';
import { Admin, AdminSchema } from 'src/admin/schema/admin.schema';
import { ProductNotify, ProductNotifySchema } from './schema/product.notify.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: NotificationCampaign.name, schema: NotificationCampaignSchema },
      { name: User.name, schema: UserSchema },
      { name: ServiceBooking.name, schema: ServiceBookingSchema },
      { name: Admin.name, schema: AdminSchema },
      { name: ProductNotify.name, schema: ProductNotifySchema }
    ]),
  ],
  controllers: [NotificationController, AdminNotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule { }
