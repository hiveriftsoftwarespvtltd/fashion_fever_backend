import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BankAccount, BankAccountDocument, BankAccountOwnerType, BankAccountStatus } from './schema/bank-account.schema';
import { CreateBankAccountDto, UpdateBankAccountDto, UpdateBankAccountStatusDto } from './dto/bank-account.dto';
import { encrypt, decrypt } from '../utils/encryption.util';

import { UserRole } from '../user/schema/user.schema';

@Injectable()
export class BankAccountService {
    constructor(
        @InjectModel(BankAccount.name) private bankAccountModel: Model<BankAccountDocument>,

    ) { }

    private determineOwnerTypes(roles: string[]): BankAccountOwnerType[] {
        const ownerTypes: BankAccountOwnerType[] = [];
        if (!roles || roles.length === 0) return [BankAccountOwnerType.USER];
        for (const role of roles) {
            switch (role) {
                case UserRole.VENDOR:
                    ownerTypes.push(BankAccountOwnerType.VENDOR);
                    break;
                case UserRole.INFLUENCER:
                    ownerTypes.push(BankAccountOwnerType.INFLUENCER);
                    break;
                case UserRole.SERVICE_PROVIDER:
                    ownerTypes.push(BankAccountOwnerType.SERVICE_PROVIDER);
                    break;
                case UserRole.EDUCATOR:
                    ownerTypes.push(BankAccountOwnerType.EDUCATOR);
                    break;
                case UserRole.USER:
                case UserRole.ADMIN:
                default:
                    ownerTypes.push(BankAccountOwnerType.USER);
                    break;
            }
        }
        return [...new Set(ownerTypes)];
    }

    private async hasTransactions(accountId: string): Promise<boolean> {
        return false; // Temporarily returning false until marketplace payout references bank account id directly
    }

    async addBankAccount(userId: string, roles: string[], dto: CreateBankAccountDto) {
        const ownerTypes = this.determineOwnerTypes(roles);

        // Check if it's the first account
        const existingAccountsCount = await this.bankAccountModel.countDocuments({
            ownerId: new Types.ObjectId(userId),
            isDeleted: false,
        });

        const isPrimary = existingAccountsCount === 0 || dto.isPrimary;

        if (isPrimary && existingAccountsCount > 0) {
            // Unset current primary
            await this.bankAccountModel.updateMany(
                { ownerId: new Types.ObjectId(userId) },
                { $set: { isPrimary: false } }
            );
        }

        const account = await this.bankAccountModel.create({
            ownerId: new Types.ObjectId(userId),
            ownerTypes,
            accountHolderName: dto.accountHolderName,
            bankName: dto.bankName,
            ifscCode: encrypt(dto.ifscCode),
            accountNumber: encrypt(dto.accountNumber),
            accountType: dto.accountType,
            isPrimary,
        });

        // Return decrypted view to the creator
        return this.decryptAccountInfo(account);
    }

    async updateBankAccount(userId: string, accountId: string, dto: UpdateBankAccountDto) {
        const account = await this.bankAccountModel.findOne({
            _id: new Types.ObjectId(accountId),
            ownerId: new Types.ObjectId(userId),
            isDeleted: false,
        });

        if (!account) {
            throw new NotFoundException('Bank account not found');
        }

        const hasTx = await this.hasTransactions(accountId);
        if (hasTx) {
            throw new ConflictException('Cannot update a bank account that has been used in transactions');
        }

        if (dto.isPrimary) {
            await this.bankAccountModel.updateMany(
                { ownerId: new Types.ObjectId(userId) },
                { $set: { isPrimary: false } }
            );
        }

        if (dto.accountHolderName) account.accountHolderName = dto.accountHolderName;
        if (dto.bankName) account.bankName = dto.bankName;
        if (dto.accountType) account.accountType = dto.accountType;
        if (dto.isPrimary !== undefined) account.isPrimary = dto.isPrimary;
        if (dto.ifscCode) account.ifscCode = encrypt(dto.ifscCode);
        if (dto.accountNumber) account.accountNumber = encrypt(dto.accountNumber);

        await account.save();

        return this.decryptAccountInfo(account);
    }

    async deleteBankAccount(userId: string, accountId: string) {
        const account = await this.bankAccountModel.findOne({
            _id: new Types.ObjectId(accountId),
            ownerId: new Types.ObjectId(userId),
            isDeleted: false,
        });

        if (!account) {
            throw new NotFoundException('Bank account not found');
        }

        const hasTx = await this.hasTransactions(accountId);
        if (hasTx) {
            throw new ConflictException('Cannot delete a bank account that has been used in transactions');
        }

        account.isDeleted = true;
        await account.save();

        return { message: 'Bank account deleted successfully' };
    }

    async getMyBankAccounts(userId: string) {
        const accounts = await this.bankAccountModel.find({
            ownerId: new Types.ObjectId(userId),
            isDeleted: false,
        });

        return accounts.map(acc => this.decryptAccountInfo(acc));
    }

    async getAllBankAccounts() {
        const accounts = await this.bankAccountModel.find({ isDeleted: false });
        return accounts.map(acc => this.decryptAccountInfo(acc));
    }

    async getBankAccountById(accountId: string) {
        const account = await this.bankAccountModel.findOne({
            _id: new Types.ObjectId(accountId),
            isDeleted: false,
        });

        if (!account) {
            throw new NotFoundException('Bank account not found');
        }

        return this.decryptAccountInfo(account);
    }

    async updateBankAccountStatus(accountId: string, dto: UpdateBankAccountStatusDto) {
        const account = await this.bankAccountModel.findOne({
            _id: new Types.ObjectId(accountId),
            isDeleted: false,
        });

        if (!account) {
            throw new NotFoundException('Bank account not found');
        }

        if (dto.status === BankAccountStatus.REJECTED && !dto.rejectionReason) {
            throw new BadRequestException('Rejection reason is required when rejecting a bank account');
        }

        account.status = dto.status;
        if (dto.verificationReference) {
            account.verificationReference = dto.verificationReference;
        }

        if (dto.status === BankAccountStatus.VERIFIED) {
            account.verifiedAt = new Date();
            account.rejectionReason = undefined;
            account.rejectedAt = undefined;
        } else if (dto.status === BankAccountStatus.REJECTED) {
            account.rejectedAt = new Date();
            account.rejectionReason = dto.rejectionReason;
            account.verifiedAt = undefined;
        }

        await account.save();

        return this.decryptAccountInfo(account);
    }

    private decryptAccountInfo(account: BankAccountDocument) {
        const doc = account.toObject();
        doc.ifscCode = decrypt(doc.ifscCode);
        doc.accountNumber = decrypt(doc.accountNumber);
        return doc;
    }
}
