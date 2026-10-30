import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';
import { ServiceProviderCouponService } from './service-provider-coupon.service';
import {
  CreateServiceCouponDto,
  UpdateServiceCouponDto,
} from './dto/coupon.dto';

/**
 * Service-Provider Coupon Controller
 * Base: /api/v1/coupons/sp
 *
 * ALL endpoints require JWT + SERVICE_PROVIDER role.
 * serviceProviderId is ALWAYS injected from req.user.serviceProviderId (never body).
 */
@Controller('coupons/sp')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SERVICE_PROVIDER)
export class ServiceProviderCouponController {
  constructor(private readonly spCouponService: ServiceProviderCouponService) {}

  /** Create a coupon linked to one of the SP's own services */
  @Post('create')
  async createCoupon(@Req() req: any, @Body() dto: CreateServiceCouponDto) {
    const providerId = await this.spCouponService.resolveProviderId(req.user);
    return this.spCouponService.createCoupon(providerId, dto);
  }

  /** List all coupons owned by the logged-in SP */
  @Get('my-coupons')
  async myCoupons(@Req() req: any) {
    const providerId = await this.spCouponService.resolveProviderId(req.user);
    return this.spCouponService.myCoupons(providerId);
  }

  /** List the SP's own services (for the coupon create dropdown) */
  @Get('my-services')
  async myServices(@Req() req: any) {
    const providerId = await this.spCouponService.resolveProviderId(req.user);
    return this.spCouponService.myServices(providerId);
  }

  /** Update a coupon — ownership verified server-side */
  @Put('update/:id')
  async updateCoupon(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateServiceCouponDto,
  ) {
    const providerId = await this.spCouponService.resolveProviderId(req.user);
    return this.spCouponService.updateCoupon(providerId, id, dto);
  }

  /** Toggle isActive on a coupon */
  @Patch('toggle/:id')
  async toggleCoupon(@Req() req: any, @Param('id') id: string) {
    const providerId = await this.spCouponService.resolveProviderId(req.user);
    return this.spCouponService.toggleCoupon(providerId, id);
  }

  /** Delete a coupon — ownership verified server-side */
  @Delete('delete/:id')
  async deleteCoupon(@Req() req: any, @Param('id') id: string) {
    const providerId = await this.spCouponService.resolveProviderId(req.user);
    return this.spCouponService.deleteCoupon(providerId, id);
  }
}
