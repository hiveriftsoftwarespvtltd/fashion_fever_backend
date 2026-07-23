import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Req } from '@nestjs/common';
import { PayoutService } from './payout.service';
import {
  SettleInfluencerPayoutDto,
  SettleVendorPayoutDto,
  SettleVendorPendingBalanceDto,
  SettleInfluencerPendingBalanceDto,
  SettleServiceProviderPendingBalanceDto,
  SettleEducatorPendingBalanceDto,
  UpdatePaymentTransactionDto,
  UpdateCashSettlementDto,
  UpdateSettlementDto,
  PaymentTransactionQueryDto,
  MarketplaceEarningQueryDto,
  MarketplacePayoutQueryDto,
  CashSettlementQueryDto,
  SettlementQueryDto,
  ProcessEarningsPayoutDto,
  DepositCashDto,
} from './dto/payout.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';

@UseGuards(JwtAuthGuard, RolesGuard)

@Controller('payout')
export class PayoutController {
  constructor(private payoutService: PayoutService) { }

  @AdminAccess(AdminModule.FINANCE, AccessType.WRITE)
  @Post('vendor-payout/settle')
  settleVendorPayout(@Body() dto: SettleVendorPayoutDto) {
    return this.payoutService.settleVendorPayout(dto);
  }

  @AdminAccess(AdminModule.FINANCE, AccessType.WRITE)
  @Post('influencer-payout/settle')
  settleInfluencerPayout(@Body() dto: SettleInfluencerPayoutDto) {
    return this.payoutService.settleInfluencerPayout(dto);
  }



  @AdminAccess(AdminModule.FINANCE, AccessType.READ)
  @Get('payment-transactions')
  getAllPaymentTransactions(@Query() query: PaymentTransactionQueryDto) {
    return this.payoutService.getAllPaymentTransactions(query);
  }

  @AdminAccess(AdminModule.FINANCE, AccessType.WRITE)
  @Patch('payment-transactions/:id')
  updatePaymentTransaction(@Param('id') id: string, @Body() dto: UpdatePaymentTransactionDto) {
    return this.payoutService.updatePaymentTransaction(id, dto);
  }

  @AdminAccess(AdminModule.FINANCE, AccessType.READ)
  @Get('marketplace-earnings')
  getAllMarketplaceEarnings(@Query() query: MarketplaceEarningQueryDto) {
    return this.payoutService.getAllMarketplaceEarnings(query);
  }

  // Accessible by any logged-in user to see their own earnings
  @Get('my-earnings')
  getMyEarnings(@Query() query: MarketplaceEarningQueryDto, @Req() req: any) {
    return this.payoutService.getMyEarnings(query, req.user._id.toString());
  }

  @AdminAccess(AdminModule.FINANCE, AccessType.READ)
  @Get('marketplace-payouts')
  getAllMarketplacePayouts(@Query() query: MarketplacePayoutQueryDto) {
    return this.payoutService.getAllMarketplacePayouts(query);
  }

  @AdminAccess(AdminModule.FINANCE, AccessType.READ)
  @Get('cash-settlements')
  getAllCashSettlements(@Query() query: CashSettlementQueryDto) {
    return this.payoutService.getAllCashSettlements(query);
  }

  @AdminAccess(AdminModule.FINANCE, AccessType.WRITE)
  @Patch('cash-settlements/:id')
  updateCashSettlement(@Param('id') id: string, @Body() dto: UpdateCashSettlementDto, @Req() req: any) {
    return this.payoutService.updateCashSettlement(id, dto, req.user._id.toString());
  }

  @Post('cash-settlements/deposit')
  depositeCashAmount(@Req() req: any, @Body() dto: DepositCashDto) {
    return this.payoutService.depositeCashAmount(req.user._id.toString(), dto);
  }

  @AdminAccess(AdminModule.FINANCE, AccessType.READ)
  @Get('settlements')
  getAllSettlements(@Query() query: SettlementQueryDto) {
    return this.payoutService.getAllSettlements(query);
  }

  @AdminAccess(AdminModule.FINANCE, AccessType.WRITE)
  @Patch('settlements/:id')
  updateSettlement(@Param('id') id: string, @Body() dto: UpdateSettlementDto) {
    return this.payoutService.updateSettlement(id, dto);
  }

  // ── Admin Earnings Payout ────────────────────────────────────────────
  // POST /payout/earnings/process-payout
  // Accessible only by SUPER_ADMIN or ADMIN with FINANCE WRITE access
  @AdminAccess(AdminModule.FINANCE, AccessType.WRITE)
  @Post('earnings/process-payout')
  processEarningsPayout(@Body() dto: ProcessEarningsPayoutDto) {
    return this.payoutService.processEarningsPayout(dto);
  }
}
