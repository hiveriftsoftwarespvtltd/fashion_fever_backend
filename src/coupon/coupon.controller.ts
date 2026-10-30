import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CouponService } from './coupon.service';
import { ServiceProviderCouponService } from './service-provider-coupon.service';
import { CreateCouponDto, UpdateCouponDTO } from './dto/coupon.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('coupons')
export class CouponController {
  constructor(
    private readonly couponService: CouponService,
    private readonly spCouponService: ServiceProviderCouponService,
  ) {}

  @Get('all')
  getAllCoupons() {
    return this.couponService.getAllCoupons();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('create-coupon')
  create(@Body() dto: CreateCouponDto) {
    return this.couponService.create(dto);
  }

  @Get('validate')
  validate(@Query('code') code: string, @Query('total') total: number) {
    return this.couponService.validateCoupon(code, Number(total));
  }

  @Get('coupon-detail/:id')
  couponDetails(@Param('id') id: string) {
    return this.couponService.couponDetails(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Put('update-coupon/:id')
  updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDTO) {
    return this.couponService.updateCoupon(dto, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Delete('delete-coupon/:id')
  deleteCoupon(@Param('id') id: string) {
    return this.couponService.deleteCoupon(id);
  }

  // ── Admin: Service-Provider coupon management ────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/by-provider/:providerId')
  adminByProvider(@Param('providerId') providerId: string) {
    return this.spCouponService.adminGetByProvider(providerId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/service-coupons')
  adminServiceCoupons(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.spCouponService.adminListServiceCoupons(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Patch('admin/force-deactivate/:id')
  adminForceDeactivate(@Param('id') id: string) {
    return this.spCouponService.adminForceDeactivate(id);
  }
}
