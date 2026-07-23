import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

// Wallet schemas
import { UserWalletDocument, UserWallet } from '../../schema/user/user.wallet.schema';
import { PlatformWalletDocument, PlatformWallet } from '../../schema/platform/platform.wallet.schema';

// Collection schemas
import { UserDocument, User } from 'src/user/schema/user.schema';

@Injectable()
export class AdminWalletService {
    constructor(
        @InjectModel(UserWallet.name) private readonly userWalletModel: Model<UserWalletDocument>,
        @InjectModel(PlatformWallet.name) private readonly platformWalletModel: Model<PlatformWalletDocument>,
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    ) { }

    async initializeUserWallet(userId: string) {
        const existingWallet = await this.userWalletModel.findOne({ userId: new Types.ObjectId(userId) });
        if (existingWallet) {
            throw new BadRequestException('Wallet already exists for this user');
        }

        const newWallet = await this.userWalletModel.create({
            userId: new Types.ObjectId(userId),
            balance: 0,
            totalCredits: 0,
            totalDebits: 0,
            isActive: true,
        });

        return newWallet;
    }

    async syncAllWallets() {
        const results = {
            usersCreated: 0,
            platformWalletCreated: 0,
        };

        // Sync Users
        const users = await this.userModel.find();
        for (const user of users) {
            const existing = await this.userWalletModel.findOne({ userId: user._id });
            if (!existing) {
                await this.userWalletModel.create({ userId: user._id });
                results.usersCreated++;
            }
        }

        // Sync Platform Wallet
        const platformWallet = await this.platformWalletModel.findOne();
        if (!platformWallet) {
            await this.platformWalletModel.create({});
            results.platformWalletCreated++;
        }

        return { message: 'Wallet sync completed successfully', results };
    }
}
