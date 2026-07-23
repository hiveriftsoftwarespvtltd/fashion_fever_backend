import { IsDate, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator"
import { ReferenceType } from "../schema/payment-transaction.schema"
import { CashSettlementStatus, CollectedBy } from "../schema/cash-settlement.schema"



export class CreateCashSettlementDTO {

    @IsMongoId()
    @IsNotEmpty()
    paymentTransactionId!: string

    @IsEnum(ReferenceType)
    referenceType: ReferenceType

    @IsMongoId()
    referenceId!: string

    @IsNumber()
    @IsNotEmpty()
    amount!: number

    @IsEnum(CollectedBy)
    @IsNotEmpty()
    collectedBy!: CollectedBy

    @IsMongoId()
    @IsNotEmpty()
    collectedByReferenceId!: string

    @IsNumber()
    @IsNotEmpty()
    depositedAmount!: number

    @IsEnum(CashSettlementStatus)
    @IsNotEmpty()
    status: CashSettlementStatus

    @IsDate()
    depositedAt!: Date
}

export class GenerateCashSettlementDto {
    @IsMongoId()
    @IsNotEmpty()
    transactionId!: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    depositedAmount?: number;

    @IsOptional()
    @IsString()
    remarks?: string;
}