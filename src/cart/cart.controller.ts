import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { CouponService } from 'src/coupon/coupon.service';
import { ApplyCouponDTO } from 'src/coupon/dto/coupon.dto';


@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(
    private cartService: CartService,
    private couponService: CouponService,
  ) { }

  @Get('fetch-user-cart')
  async fetchUserCart(@Req() req: any) {
    return this.cartService.fetchUserCart(req.user._id);
  }

  @Delete('clear-cart')
  async clearCart(@Req() req: any) {
    return this.cartService.clearUserCart(req.user._id);
  }

  @Get('coupons')
  allCoupons(@Req() req: any) {
    return this.couponService.allUserCoupons(req.user._id);
  }

  @Post('validate-coupon')
  validateCoupon(@Req() req: any, @Body() dto: ApplyCouponDTO) {
    return this.couponService.applyCoupon(req.user._id, dto);
  }

  @Post('validate-wallet')
  validateWallet(@Req() req: any, @Body() dto: any) {
    return this.cartService.applyWallet(req.user._id, dto);
  }

  @Get('cart-details/:addressId')
  fetchCartDetails(@Req() req: any, @Param('addressId') addressId: string) {
    return this.cartService.estimateCartSummary(req.user._id, addressId)
  }

  @Post('add-to-cart/:id')
  async addToCart(
    @Req() req: any,
    @Param('id') id: string,
    @Body('quantity') quantity: number,
    @Body('productId') productId: string,
  ) {
   
    return this.cartService.addToCart(req.user._id, productId, id, quantity);
  }

  @Put('decrease-item-from-cart/:id')
  async decreaseItemFromCart(@Req() req: any, @Param('id') id: string) {
    return this.cartService.decreaseItemQuantity(req.user._id, id);
  }

  @Put('remove-item-from-cart/:id')
  async removeItemFromCart(@Req() req: any, @Param('id') id: string) {
    return this.cartService.removeItemFromCart(req.user._id, id);
  }
}
