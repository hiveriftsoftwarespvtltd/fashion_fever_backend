import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { UserWalletService } from '../../service/user/user.wallet.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { UserRole } from 'src/user/schema/user.schema';
import { Roles } from 'src/auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER)

@Controller('wallet/user')
export class UserWalletController {
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

    @Post('add-balance')
    async addBalance(
        @Req() req: any,
        @Body('amount') amount: number,
        @Body('reason') reason: string,
        @Body('description') description?: string
    ) {
        // Warning: This endpoint should ideally be restricted to Admin users
        // depending on your specific business logic, since it credits balance arbitrarily.
        return this.userWalletService.addBalance(req.user._id, amount, reason as any, description);
    }
}
