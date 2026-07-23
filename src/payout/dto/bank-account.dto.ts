import { ToBoolean } from '../../utils/type-tranformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BankAccountStatus, BankAccountType } from '../schema/bank-account.schema';



export class CreateBankAccountDto {
    @IsNotEmpty()
    @IsString()
    accountHolderName!: string;

    @IsNotEmpty()
    @IsString()
    bankName!: string;

    @IsNotEmpty()
    @IsString()
    ifscCode!: string;

    @IsNotEmpty()
    @IsString()
    accountNumber!: string;

    @IsOptional()
    @IsEnum(BankAccountType)
    accountType?: BankAccountType;

    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    isPrimary?: boolean;
}

export class UpdateBankAccountDto {
    @IsOptional()
    @IsString()
    accountHolderName?: string;

    @IsOptional()
    @IsString()
    bankName?: string;

    @IsOptional()
    @IsString()
    ifscCode?: string;

    @IsOptional()
    @IsString()
    accountNumber?: string;

    @IsOptional()
    @IsEnum(BankAccountType)
    accountType?: BankAccountType;

    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    isPrimary?: boolean;
}

export class UpdateBankAccountStatusDto {
    @IsNotEmpty()
    @IsEnum(BankAccountStatus)
    status!: BankAccountStatus;

    @IsOptional()
    @IsString()
    verificationReference?: string;

    @IsOptional()
    @IsString()
    rejectionReason?: string;
}
