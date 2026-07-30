import { IsOptional, IsString, IsNumber, Min, Allow } from 'class-validator';
import { Type } from 'class-transformer';

export class QuickECommerceQueryDto {
  @Allow()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @Allow()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  limit?: number = 10;

  @Allow()
  @IsOptional()
  @IsString()
  search?: string = '';

  @Allow()
  @IsOptional()
  @IsString()
  category?: string = '';

  @Allow()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minPrice?: number;

  @Allow()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  maxPrice?: number;

  @Allow()
  @IsOptional()
  @IsString()
  addressId?: string = '';

  @Allow()
  @IsOptional()
  @IsString()
  pincode?: string = '';

  @Allow()
  @IsOptional()
  @IsString()
  locationMode?: string = ''; // 'gps' | 'manual' — controls fallback behavior
}
