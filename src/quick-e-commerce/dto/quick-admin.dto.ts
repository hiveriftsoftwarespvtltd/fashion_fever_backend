import { IsDateString, IsOptional, IsString } from 'class-validator';

export class AdminQuickCommerceDashboardFilterDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  vendorId?: string;
}
