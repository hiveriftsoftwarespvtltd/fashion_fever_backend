import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { VendorOrder } from 'src/order/schema/vendor-order.schema';

@Module({
 
  providers: [DashboardService],
  controllers: [DashboardController]
})
export class DashboardModule {}
