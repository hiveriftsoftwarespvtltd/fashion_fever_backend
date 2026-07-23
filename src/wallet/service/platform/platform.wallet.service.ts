import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlatformWalletDocument, PlatformWallet } from '../../schema/platform/platform.wallet.schema';
import { PlatformWalletTransactionDocument, PlatformWalletTransaction } from '../../schema/platform/platform.wallet.transactions';

@Injectable()
export class PlatformWalletService {
    constructor(
        @InjectModel(PlatformWallet.name) private readonly platformWalletModel: Model<PlatformWalletDocument>,
        @InjectModel(PlatformWalletTransaction.name) private readonly platformWalletTransactionModel: Model<PlatformWalletTransactionDocument>,
    ) {}

    async getBalance() {
        let wallet = await this.platformWalletModel.findOne();
        if (!wallet) {
            // Platform wallet might not exist initially, create it
            wallet = await this.platformWalletModel.create({});
        }
        return { 
            balance: wallet.balance, 
            totalCommissionEarned: wallet.totalCommissionEarned, 
            totalPlatformFeesEarned: wallet.totalPlatformFeesEarned,
            totalPayouts: wallet.totalPayouts 
        };
    }

    async getTransactions() {
        return this.platformWalletTransactionModel.find().sort({ createdAt: -1 });
    }

    async getAllWallets() {
        return this.platformWalletModel.find().sort({ createdAt: -1 });
    }
}
