import { ToNumber } from '../../utils/type-tranformer';
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsEnum, IsBoolean, Min, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { QuotationItemType } from '../schema/service-quotation.schema';



export class QuotationItemDto {
    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    title!: string;

    @ToNumber()
    @IsNumber()
    @Min(1)
    quantity!: number;

    @ToNumber()
    @IsNumber()
    @Min(0)
    unitPrice!: number;

    @ToNumber()
    @IsNumber()
    @Min(0)
    totalPrice!: number;

    @IsOptional()
    @ToNumber()
    @IsNumber()
    @Min(0)
    durationMinutes?: number;

    @ToNumber()
    @IsNumber()
    @Min(0)
    displayOrder!: number;
}

export class CreateServiceQuotationDto {
    @IsString()
    leadId!: string;

    @IsOptional()
    @IsString()
    note?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => QuotationItemDto)
    items!: QuotationItemDto[];

    @IsOptional()
    @IsString()
    notes?: string;

    @Type(() => Date)
    @IsDate()
    validTill!: Date;

    @Type(() => Date)
    @IsDate()
    serviceDate!: Date;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    slotStartTime?: Date;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    slotEndTime?: Date;

    @ToNumber()
    @IsNumber()
    @Min(1)
    requiredStaffCount!: number;

    // @ToNumber()
    // @IsNumber()
    // @Min(0)
    // totalDurationMinutes!: number;
}

export class UpdateServiceQuotationDto {
    // @IsOptional()
    // @IsString()
    // note?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => QuotationItemDto)
    items?: QuotationItemDto[];

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    validTill?: Date;
}
