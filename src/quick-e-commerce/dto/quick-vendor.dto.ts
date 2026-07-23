import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { VendorOrderStatus } from '../schema/quick-vendor-order.schema';

export class UpdateQuickCommerceDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  acceptingOrders?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  autoPause?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  defaultPreparationTime?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  serviceRadius?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxConcurrentOrders?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minimumAvailableDeliveryBoys?: number;

  @IsOptional()
  @IsString()
  pausedReason?: string;

  @IsOptional()
  @IsDateString()
  pausedAt?: Date;
}

export class QuickVendorDashboardFilterDto {
  @IsOptional()
  @IsEnum(VendorOrderStatus)
  status?: VendorOrderStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
