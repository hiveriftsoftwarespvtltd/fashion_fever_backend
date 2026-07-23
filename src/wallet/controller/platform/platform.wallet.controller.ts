import { Controller, Get } from '@nestjs/common';
import { PlatformWalletService } from '../../service/platform/platform.wallet.service';

@Controller('wallet/platform')
export class PlatformWalletController {
    constructor(private readonly platformWalletService: PlatformWalletService) {}

    @Get('balance')
    async getBalance() {
        return this.platformWalletService.getBalance();
    }

    @Get('transactions')
    async getTransactions() {
        return this.platformWalletService.getTransactions();
    }
}
