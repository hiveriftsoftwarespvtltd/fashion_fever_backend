import { Controller, Get, Post, Body, Req, UseGuards, Query } from '@nestjs/common';
import { QuickDeliveryCheckoutService } from './quick-delivery-checkout.service';
import { ApplyCouponDto } from './dto/quick-delivery-checkout.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';

@UseGuards(JwtAuthGuard)
@Controller('quick-checkout')
export class QuickDeliveryCheckoutController {
  constructor(private readonly checkoutService: QuickDeliveryCheckoutService) { }

  @Get('details')
  async getCheckoutDetails(@Req() req: any, @Query('couponCode') couponCode?: string) {
    return await this.checkoutService.getCheckoutDetails(req.user._id, couponCode);
  }

  @Post('apply-coupon')
  async applyCoupon(@Req() req: any, @Body() dto: ApplyCouponDto) {
    return await this.checkoutService.applyCoupon(req.user._id, dto.couponCode);
  }
}
