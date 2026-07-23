import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { QuickOrderStatus } from '../schema/quick-order.schema';

export class GetAdminOrdersDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(QuickOrderStatus)
  status?: QuickOrderStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsMongoId()
  deliveryPersonId?: string;
}

export class AdminCancelOrderDto {
  @IsOptional()
  @IsString()
  cancelledReason?: string;
}
