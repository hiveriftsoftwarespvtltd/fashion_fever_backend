import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { UserWalletService } from '../../service/user/user.wallet.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { UserRole } from 'src/user/schema/user.schema';
import { Roles } from 'src/auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR, UserRole.ADMIN)
@Controller('wallet/vendor')
export class VendorWalletController {
    constructor(private readonly userWalletService: UserWalletService) { }

    @Get('balance')
    async getBalance(@Req() req: any) {
        return this.userWalletService.getBalance(req.user._id);
    }

    @Get('transactions')
    async getTransactions(@Req() req: any) {
        return this.userWalletService.getTransactions(req.user._id);
    }

    @Post('topup')
    async initiateTopup(@Req() req: any, @Body('amount') amount: number) {
        return this.userWalletService.initiateTopup(req.user._id, amount);
    }
}
