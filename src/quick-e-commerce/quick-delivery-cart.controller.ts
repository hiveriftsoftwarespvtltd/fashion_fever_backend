import { Controller, Get, Post, Put, Delete, Body, Req, UseGuards } from '@nestjs/common';
import { QuickDeliveryCartService } from './quick-delivery-cart.service';
import { AddToCartDto, DecreaseCartItemDto, RemoveCartItemDto } from './dto/quick-delivery-cart.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER) // Allowing typical buyers to access cart
@Controller('quick-cart')
export class QuickDeliveryCartController {
  constructor(private readonly quickDeliveryCartService: QuickDeliveryCartService) { }

  @Get('get-items')
  async getCart(@Req() req: any) {
    const result = await this.quickDeliveryCartService.getCart(req.user._id);
    console.log("=== DEBUG QUICK CART ===", JSON.stringify(result));
    return result;
  }

  @Post('add')
  async addItem(@Req() req: any, @Body() dto: AddToCartDto) {
    return await this.quickDeliveryCartService.addOrUpdateItem(req.user._id, dto);
  }

  @Put('decrease')
  async decreaseItem(@Req() req: any, @Body() dto: DecreaseCartItemDto) {
    return await this.quickDeliveryCartService.decreaseItem(req.user._id, dto);
  }

  @Delete('remove')
  async removeItem(@Req() req: any, @Body() dto: RemoveCartItemDto) {
    return await this.quickDeliveryCartService.removeItem(req.user._id, dto);
  }

  @Delete('clear')
  async clearCart(@Req() req: any) {
    return await this.quickDeliveryCartService.clearCart(req.user._id);
  }
}
