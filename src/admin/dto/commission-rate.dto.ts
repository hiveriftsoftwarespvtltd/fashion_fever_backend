import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CommissionEntityType, CommissionOn } from '../schema/commission-rate.schema';

export class CommissionRateSlabDto {
  @IsEnum(CommissionEntityType)
  entityType: CommissionEntityType;

  @IsEnum(CommissionOn)
  commissionOn: CommissionOn;

  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercentage: number;
}

export class CreateCommissionRateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommissionRateSlabDto)
  commissions: CommissionRateSlabDto[];
}

export class UpdateCommissionRateDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommissionRateSlabDto)
  commissions?: CommissionRateSlabDto[];
}
