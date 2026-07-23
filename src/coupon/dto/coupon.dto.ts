import { ToNumber } from '../../utils/type-tranformer';
// create-coupon.dto.ts

import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import {
  CouponScope,
  CouponType,
} from '../schema/coupon.schema';
import { PartialType } from '@nestjs/mapped-types';



export class CreateCouponDto {
  @IsString()
  code!: string;

  @IsEnum(CouponType)
  type!: CouponType;

  @ToNumber()


  @IsNumber()
  value!: number;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsString()
  influencerId?: string;

  @IsOptional()
  @IsEnum(CouponScope)
  scope?: CouponScope;

  @IsOptional()
  @ToNumber()

  @IsNumber()
  minimumOrderAmount?: number;

  @IsOptional()
  @ToNumber()

  @IsNumber()
  maximumDiscount?: number;

  @IsOptional()
  @ToNumber()

  @IsNumber()
  usageLimitPerUser?: number;

  @IsOptional()
  @ToNumber()

  @IsNumber()
  totalUsageLimit?: number;

  @IsOptional()
  @IsDateString()
  startsAt?: Date;

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateCouponDTO extends PartialType(
  CreateCouponDto
){}

export class ApplyCouponDTO{
  @IsString()
  couponCode!:string

  // @IsString()
  // subTotal!:number

  
  // @IsString()
  // vendorId!:string
}