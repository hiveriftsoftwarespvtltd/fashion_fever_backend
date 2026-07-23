import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose'
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { VendorModule } from './vendor/vendor.module';
import { DocumentModule } from './document/document.module';
import { ProductModule } from './product/product.module';
import { AdminModule } from './admin/admin.module';
import { InfluencerModule } from './influencer/influencer.module';
import { CartModule } from './cart/cart.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { OrderModule } from './order/order.module';
import { AddressModule } from './address/address.module';
import { CouponModule } from './coupon/coupon.module';
import { ShiprocketModule } from './shiprocket/shiprocket.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UserReviewModule } from './user-review/user-review.module';
import { ServiceModule } from './service/service.module';
import { PayoutModule } from './payout/payout.module';
import { WalletModule } from './wallet/wallet.module';
import { CoursesModule } from './courses/courses.module';
import { AiFeaturesModule } from './ai-features/ai-features.module';
import { TicketModule } from './ticket/ticket.module';
import { QuickECommerceModule } from './quick-e-commerce/quick-e-commerce.module';
import { NotificationModule } from './notification/notification.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const node_env = configService.get<string>('NODE_ENV');

        const uri = node_env === 'development' ? configService.get('LOCAL_MONGO_URI') : configService.get('MONGO_URI')
        if (!uri) {
          throw new Error("MNGO_URI NOT FOUND IN ENV")
        }
        return { uri }
      }
    }),
    UserModule,
    AuthModule,
    VendorModule,
    DocumentModule,
    ProductModule,
    AdminModule,
    InfluencerModule,
    CartModule,
    WishlistModule,
    OrderModule,
    AddressModule,
    CouponModule,
    ShiprocketModule,
    DashboardModule,
    UserReviewModule,
    ServiceModule,
    PayoutModule,
    WalletModule,
    CoursesModule,
    AiFeaturesModule,
    TicketModule,
    QuickECommerceModule,
    NotificationModule,
    ScheduleModule.forRoot()
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
