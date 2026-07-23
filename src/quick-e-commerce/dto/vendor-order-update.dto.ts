import { IsEnum, IsMongoId, IsNumber, IsOptional, IsString, Min, IsArray, IsNotEmpty, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { VendorOrderStatus } from '../schema/quick-vendor-order.schema';

export class GetVendorOrdersDto {
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
  @IsString()
  status?: string;

  @IsOptional()
  @IsMongoId()
  deliveryPersonId?: string;
}

export class UpdateVendorOrderStatusDto {
  @IsOptional()
  @IsEnum(VendorOrderStatus)
  status?: VendorOrderStatus;

  @IsOptional()
  @IsNumber()
  estimatedDeliveryMinutes?: number;

  @IsOptional()
  @IsNumber()
  estimatedPreparationMinutes?: number;

  @IsOptional()
  @IsString()
  cancelledReason?: string;
}

export class AssignDeliveryPersonDto {
  @IsMongoId()
  deliveryPersonId!: string;
}

export class VendorCancelOrderDto {
  @IsOptional()
  @IsString()
  cancelledReason?: string;
}

export class MarkOrderDeliveredDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  deliveryProofImages?: any;
}
