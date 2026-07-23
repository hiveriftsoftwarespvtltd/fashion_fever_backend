import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsEnum,
  isEnum,
  IsNumber
} from 'class-validator';

import { PaymentMode, PaymentMethod as PaymentTransactionMethod, TransactionStatus, ReferenceType } from '../schema/payment-transaction.schema';
import { EarningRole, EarningReferenceType, EarningStatus } from '../schema/market-place-earning.schema';
import { PayoutStatus, PaymentMethod as MarketplacePaymentMethod, PaymentMethod } from '../schema/market-place-payout.schema';
import { CashSettlementStatus, CollectedBy } from '../schema/cash-settlement.schema';
import { UserRole, PaymentDirection, SettlementStatus } from '../schema/settlement.schema';

export class DepositCashDto {
  @IsMongoId()
  @IsNotEmpty()
  paymentTransactionId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  depositedAmount?: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}
export class SettleVendorPayoutDto {
  @IsMongoId()
  vendorId!: string;

  @IsArray()
  @IsMongoId({ each: true })
  vendorOrderIds!: string[];

  @IsString()
  @IsNotEmpty()
  transactionId!: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  month?: number;

  @IsOptional()
  @IsInt()
  @Min(2024)
  year?: number;
}

export class SettleInfluencerPayoutDto {
  @IsMongoId()
  influencerId!: string;

  @IsArray()
  @IsMongoId({ each: true })
  commissionIds!: string[];

  @IsString()
  @IsNotEmpty()
  transactionId!: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  month?: number;

  @IsOptional()
  @IsInt()
  @Min(2024)
  year?: number;
}

export class SettleVendorPendingBalanceDto {
  @IsMongoId()
  vendorId!: string;

  @IsArray()
  @IsMongoId({ each: true })
  vendorOrderIds!: string[];
}

export class SettleInfluencerPendingBalanceDto {
  @IsMongoId()
  influencerId!: string;

  @IsArray()
  @IsMongoId({ each: true })
  commissionIds!: string[];
}

export class SettleServiceProviderPendingBalanceDto {
  @IsMongoId()
  serviceProviderId!: string;

  @IsArray()
  @IsMongoId({ each: true })
  serviceBookingIds!: string[];
}

export class SettleEducatorPendingBalanceDto {
  @IsMongoId()
  educatorId!: string;

  @IsArray()
  @IsMongoId({ each: true })
  coursePurchaseIds!: string[];
}

export class UpdatePaymentTransactionDto {
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  transactionReference?: string;

  @IsOptional()
  @IsEnum(PaymentMode)
  paymentMode?: PaymentMode;

  @IsOptional()
  @IsEnum(PaymentTransactionMethod)
  paymentMethod?: PaymentTransactionMethod;
}

export class UpdateCashSettlementDto {
  @IsOptional()
  @IsEnum(CashSettlementStatus)
  status?: CashSettlementStatus;

  @IsOptional()
  @Min(0)
  depositedAmount?: number;

  @IsOptional()
  depositedAt?: Date;


  @IsOptional()
  @IsString()
  remarks?: string;
}

export class UpdateSettlementDto {
  @IsOptional()
  @IsEnum(SettlementStatus)
  status?: SettlementStatus;

  @IsOptional()
  @IsMongoId()
  paymentTransactionId?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  paidAt?: Date;
}

export class PaginationQueryDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class PaymentTransactionQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(TransactionStatus) status?: TransactionStatus;
  @IsOptional() @IsEnum(PaymentMode) paymentMode?: PaymentMode;
  @IsOptional() @IsEnum(PaymentTransactionMethod) paymentMethod?: PaymentTransactionMethod;
  @IsOptional() @IsEnum(ReferenceType) referenceType?: ReferenceType;
  @IsOptional() @IsMongoId() customerId?: string;
  @IsOptional() @IsMongoId() userId?: string;
  @IsOptional() @IsString() transactionId?: string;
}

export class MarketplaceEarningQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(EarningStatus) status?: EarningStatus;
  @IsOptional() @IsEnum(EarningRole) role?: EarningRole;
  @IsOptional() @IsEnum(EarningReferenceType) referenceType?: EarningReferenceType;
  @IsOptional() @IsMongoId() userId?: string;
  @IsOptional() @IsMongoId() payoutId?: string;
  @IsOptional() @IsMongoId() paymentTransactionId?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
}

export class MarketplacePayoutQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(PayoutStatus) status?: PayoutStatus;
  @IsOptional() @IsEnum(MarketplacePaymentMethod) paymentMethod?: MarketplacePaymentMethod;
  @IsOptional() @IsMongoId() userId?: string;
}

export class CashSettlementQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(CashSettlementStatus) status?: CashSettlementStatus;
  @IsOptional() @IsEnum(CollectedBy) collectedBy?: CollectedBy;
  @IsOptional() @IsEnum(ReferenceType) referenceType?: ReferenceType;
  @IsOptional() @IsMongoId() collectedByReferenceId?: string;
  @IsOptional() @IsMongoId() paymentTransactionId?: string;
  @IsOptional() @IsMongoId() userId?: string;
}

export class SettlementQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(SettlementStatus) status?: SettlementStatus;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsEnum(PaymentDirection) paymentDirection?: PaymentDirection;
  @IsOptional() @IsEnum(ReferenceType) referenceType?: ReferenceType;
  @IsOptional() @IsMongoId() userId?: string;
  @IsOptional() @IsMongoId() marketplacePayoutId?: string;
  @IsOptional() @IsMongoId() paymentTransactionId?: string;
}

export class ProcessEarningsPayoutDto {
  @IsArray()
  @IsMongoId({ each: true })
  earningIds!: string[];

  @IsEnum(EarningRole)
  role!: EarningRole;

  @IsOptional()
  @IsString()
  transactionReference?: string;


  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  remarks?: string;
}