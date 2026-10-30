import { ToNumber } from '../../utils/type-tranformer';
// create-coupon.dto.ts

import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { CouponScope, CouponType } from '../schema/coupon.schema';
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

export class UpdateCouponDTO extends PartialType(CreateCouponDto) {}

export class ApplyCouponDTO {
  @IsString()
  couponCode!: string;
}

// ── Service-Provider Coupon DTOs ─────────────────────────────────────────────
import { Transform } from 'class-transformer';

export class CreateServiceCouponDto {
  @IsString()
  code!: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const v = value.toLowerCase().trim();
      if (v === 'flat') return CouponType.FIXED;
      return v as CouponType;
    }
    return value;
  })
  @IsEnum(CouponType)
  type!: CouponType;

  @IsNumber()
  value!: number;

  /** The SINGLE service this coupon applies to. Must belong to the authenticated provider. */
  @IsMongoId()
  linkedServiceId!: string;

  @IsOptional()
  @IsNumber()
  minimumOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  maximumDiscount?: number;

  @IsOptional()
  @IsNumber()
  usageLimitPerUser?: number;

  @IsOptional()
  @IsNumber()
  totalUsageLimit?: number;

  @IsOptional()
  @IsDateString()
  startsAt?: Date;

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateServiceCouponDto extends PartialType(
  CreateServiceCouponDto,
) {}

/** DTO for customer-facing coupon validation during booking (Step 4) */
export class ValidateServiceCouponDTO {
  @IsString()
  couponCode!: string;

  @IsMongoId()
  serviceId!: string;

  @IsMongoId()
  providerId!: string;
}
