import { ToNumber, ToBoolean } from '../../utils/type-tranformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import { Transform, Type } from 'class-transformer';

import { ProductStatus } from '../schema/product.schema';

import { PartialType } from '@nestjs/mapped-types';




// ================= VARIANT DTO =================

export class CreateVariantDto {

  @IsString()
  sku!: string;

  @ToNumber()
  @IsNumber()
  @Min(0)
  costPrice!: number;

  @IsOptional()
  @ToNumber()
  @IsNumber()
  @Min(0)
  salesPrice!: number;

  @IsOptional()
  @ToNumber()
  @IsNumber()
  @Min(0)
  offeredPrice!: number

  @ToNumber()
  @IsNumber()
  @Min(0)
  stock!: number;

  @ToNumber()
  @IsNumber()
  @Min(0)
  weight!: number;

  @ToNumber()
  @IsNumber()
  @Min(0)
  length!: number;

  @ToNumber()
  @IsNumber()
  @Min(0)
  width!: number;

  @ToNumber()
  @IsNumber()
  @Min(0)
  height!: number;

  // media ids after upload

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  images?: string[];

  @IsOptional()
  @IsMongoId()
  thumbnail?: string;

  @IsObject()
  attributes!: Record<string, string>;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;
}


// ================= PRODUCT DTO =================

export class CreateProductDto {

  @IsOptional()
  @IsMongoId()
  _id?: string;

  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  brand?: string

  @IsOptional()
  @ToBoolean()

  @IsBoolean()
  isShippingApply?: boolean

  @IsMongoId()
  categoryId!: string;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants!: CreateVariantDto[];

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return JSON.parse(value);
    }
    return value;
  })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tags?: string[];
}


// ================= UPDATE DTO =================

export class UpdateProductDto extends PartialType(
  CreateProductDto,
) { }