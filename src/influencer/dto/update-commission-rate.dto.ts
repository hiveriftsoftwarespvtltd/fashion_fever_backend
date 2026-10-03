import { IsNumber, IsOptional, Max, Min, ValidateIf } from 'class-validator';

export class UpdateCommissionRateDto {
  @IsOptional()
  @ValidateIf((o) => o.commissionRate !== null && o.commissionRate !== undefined)
  @IsNumber({}, { message: 'Commission rate must be a valid number' })
  @Min(0, { message: 'Commission rate cannot be less than 0%' })
  @Max(100, { message: 'Commission rate cannot exceed 100%' })
  commissionRate?: number | null;
}
