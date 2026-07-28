import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { UserWalletDocument, UserWallet } from '../../schema/user/user.wallet.schema';
import { WalletTransactionDocument, WalletTransaction, WalletTransactionType, WalletTransactionReason } from '../../schema/user/user.wallet.transactions';
import { UserWalletTopupDocument, UserWalletTopup, WalletTopupStatus } from '../../schema/user/user.wallet.topup.schema';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationModuleType, NotificationType, NotificationPriority } from 'src/notification/schema/notification.schema';

@Injectable()
export class UserWalletService {
    constructor(
        @InjectModel(UserWallet.name) private readonly userWalletModel: Model<UserWalletDocument>,
        @InjectModel(WalletTransaction.name) private readonly walletTransactionModel: Model<WalletTransactionDocument>,
        @InjectModel(UserWalletTopup.name) private readonly userWalletTopupModel: Model<UserWalletTopupDocument>,
        private readonly notificationService: NotificationService,
    ) { }

    async initializeWallet(userId: string) {
        const existing = await this.userWalletModel.findOne({ userId: new Types.ObjectId(userId) });
        if (!existing) {
            await this.userWalletModel.create({ userId: new Types.ObjectId(userId) });
        }
    }

    async getBalance(userId: string) {
        const wallet = await this.userWalletModel.findOne({ userId: new Types.ObjectId(userId) });
        if (!wallet) throw new NotFoundException('Wallet not found');
        return { balance: wallet.balance, totalCredits: wallet.totalCredits, totalDebits: wallet.totalDebits };
    }

    async getTransactions(userId: string) {
        return this.walletTransactionModel.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 });
    }

    async getAllWallets() {
        return this.userWalletModel.find().populate('userId', 'name email').sort({ createdAt: -1 });
    }

    async initiateTopup(userId: string, amount: number) {
        if (amount <= 0) throw new BadRequestException('Amount must be greater than zero');

        // Mock order ID creation - in real scenario, this comes from a payment gateway
        const orderId = 'ORDER_' + Date.now();

        const topup = await this.userWalletTopupModel.create({
            userId: new Types.ObjectId(userId),
            amount,
            orderId,
            status: WalletTopupStatus.PENDING,
        });

        return topup;
    }

    async addBalance(userId: string, amount: number, reason: WalletTransactionReason, description?: string, session?: ClientSession) {
        if (amount <= 0) throw new BadRequestException('Amount must be greater than zero');

        const wallet = await this.userWalletModel.findOne({ userId: new Types.ObjectId(userId) }).session(session || null);
        if (!wallet) throw new NotFoundException('Wallet not found');

        wallet.balance += amount;
        wallet.totalCredits += amount;
        await wallet.save({ session });

        const [transaction] = await this.walletTransactionModel.create([{
            walletId: wallet._id,
            userId: new Types.ObjectId(userId),
            amount,
            type: WalletTransactionType.CREDIT,
            reason: reason,
            description,
            balanceAfterTransaction: wallet.balance,
        }], { session });

        await this.notificationService.sendNotification({
            receiverId: userId,
            title: 'Wallet Credited',
            body: `Your wallet has been credited with ₹${amount}. Reason: ${description || reason}`,
            moduleType: NotificationModuleType.WALLET,
            type: NotificationType.SYSTEM,
            priority: NotificationPriority.HIGH
        });

        return { wallet, transaction };
    }

    async deductBalance(userId: string, amount: number, reason: WalletTransactionReason, description?: string, session?: ClientSession) {
        if (amount <= 0) throw new BadRequestException('Amount must be greater than zero');

        const wallet = await this.userWalletModel.findOne({ userId: new Types.ObjectId(userId) }).session(session || null);
        if (!wallet) throw new NotFoundException('Wallet not found');

        if (wallet.balance < amount) throw new BadRequestException('Insufficient wallet balance');

        wallet.balance -= amount;
        wallet.totalDebits += amount;
        await wallet.save({ session });

        const [transaction] = await this.walletTransactionModel.create([{
            walletId: wallet._id,
            userId: new Types.ObjectId(userId),
            amount,
            type: WalletTransactionType.DEBIT,
            reason: reason,
            description,
            balanceAfterTransaction: wallet.balance,
        }], { session });

        await this.notificationService.sendNotification({
            receiverId: userId,
            title: 'Wallet Debited',
            body: `Your wallet has been debited by ₹${amount}. Reason: ${description || reason}`,
            moduleType: NotificationModuleType.WALLET,
            type: NotificationType.SYSTEM,
            priority: NotificationPriority.HIGH
        });

        return { wallet, transaction };
    }
}
