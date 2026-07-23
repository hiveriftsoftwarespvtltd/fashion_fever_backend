import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';

import { WishlistService } from './wishlist.service';

@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private wishlistService: WishlistService) {}

  @Post('add/:variantId')
  async addToWishlist(
    @Req() req: any,

    @Body('productId')
    productId: string,

    @Param('variantId')
    variantId: string,
  ) {
    return this.wishlistService.addToWishlist(
      req.user._id,
      productId,
      variantId,
    );
  }

  @Get('fetch')
  async fetchWishlist(@Req() req: any) {
    return this.wishlistService.fetchWishlist(req.user._id);
  }

  @Delete('remove/:variantId')
  async removeFromWishlist(
    @Req() req: any,
    @Param('variantId')
    variantId: string,
  ) {
    return this.wishlistService.removeFromWishlist(req.user._id, variantId);
  }

  @Delete('clear')
  async clearWishlist(@Req() req: any) {
    return this.wishlistService.clearWishlist(req.user._id);
  }
}
