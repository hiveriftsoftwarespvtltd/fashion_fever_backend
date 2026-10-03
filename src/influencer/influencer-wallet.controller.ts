import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';
import { InfluencerService } from './influencer.service';
import { RequestInfluencerPayoutDto } from './dto/influencer-payout.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INFLUENCER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('wallet/influencer')
export class InfluencerWalletController {
  constructor(private readonly influencerService: InfluencerService) {}

  @Get('balance')
  async getBalance(@Req() req: any) {
    return this.influencerService.getInfluencerWalletBalance(req.user._id);
  }

  @Get('transactions')
  async getTransactions(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.influencerService.getInfluencerWalletTransactions(
      req.user._id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Post('request-payout')
  async requestPayout(
    @Req() req: any,
    @Body() dto: RequestInfluencerPayoutDto,
  ) {
    return this.influencerService.requestInfluencerPayout(req.user._id, dto);
  }

  @Get('payout-requests')
  async getPayoutRequests(@Req() req: any) {
    return this.influencerService.getInfluencerPayoutRequests(req.user._id);
  }
}
