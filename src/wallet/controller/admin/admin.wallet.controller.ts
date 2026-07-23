import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import { Controller, Post, Param, UseGuards, Get } from '@nestjs/common';
import { AdminWalletService } from '../../service/admin/admin.wallet.service';
import { UserWalletService } from '../../service/user/user.wallet.service';
import { PlatformWalletService } from '../../service/platform/platform.wallet.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Body, Put } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('wallet/admin')
export class AdminWalletController {
    constructor(
        private readonly adminWalletService: AdminWalletService,
        private readonly userWalletService: UserWalletService,
        private readonly platformWalletService: PlatformWalletService,
    ) { }

    @AdminAccess(AdminModule.FINANCE, AccessType.WRITE)
    @Post('initialize/:userId')
    async initializeUserWallet(@Param('userId') userId: string) {
        return this.adminWalletService.initializeUserWallet(userId);
    }

    @AdminAccess(AdminModule.FINANCE, AccessType.WRITE)
    @Post('sync-all')
    async syncAllWallets() {
        return this.adminWalletService.syncAllWallets();
    }

    // --- Admin's Own (Platform) ---
    @AdminAccess(AdminModule.FINANCE, AccessType.READ)
    @Get('platform/balance')
    async getPlatformBalance() {
        return this.platformWalletService.getBalance();
    }

    @AdminAccess(AdminModule.FINANCE, AccessType.READ)
    @Get('platform/transactions')
    async getPlatformTransactions() {
        return this.platformWalletService.getTransactions();
    }

    // --- User ---
    @AdminAccess(AdminModule.FINANCE, AccessType.READ)
    @Get('user/:userId/balance')
    async getUserBalance(@Param('userId') userId: string) {
        return this.userWalletService.getBalance(userId);
    }

    @AdminAccess(AdminModule.FINANCE, AccessType.READ)
    @Get('user/:userId/transactions')
    async getUserTransactions(@Param('userId') userId: string) {
        return this.userWalletService.getTransactions(userId);
    }

    // --- ALL BALANCES FOR TABLES ---

    @AdminAccess(AdminModule.FINANCE, AccessType.READ)
    @Get('balances/users')
    async getAllUserBalances() {
        return this.userWalletService.getAllWallets();
    }

    @AdminAccess(AdminModule.FINANCE, AccessType.READ)
    @Get('balances/platform')
    async getAllPlatformBalances() {
        return this.platformWalletService.getAllWallets();
    }
}
