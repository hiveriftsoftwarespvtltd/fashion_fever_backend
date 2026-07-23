import { ToNumber, ToBoolean } from '../../utils/type-tranformer';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsMongoId,
  IsNumber,
  IsOptional,
  isString,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { InfluencerStatus } from '../schema/influencer.schema';
import { PlatformType } from '../schema/influencer-taskbar.schema';
import { Type } from 'class-transformer';



export class CreateInfluencerDto {
  // @IsString()
  // userId!: string;
  // @IsEmail()
  // email!: string;

  @IsString()
  token!: string

  @IsString()
  password!: string;

  @IsString()
  phone!: string

  // @IsString()
  // name!: string;

  // @IsString()
  // referralCode!: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  youtube?: string;

  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  snapchat?: string;

  // @IsOptional()
  // @IsNumber()
  // commissionRate?: number;

  @IsOptional()
  @ToNumber()

  @IsNumber()
  followers?: number;
}

export class UpdateInfluencerDto {
  @IsMongoId()
  userId!: string;

  @IsString()
  name!: string;

  // @IsString()
  // referralCode!: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  youtube?: string;

  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  snapchat?: string;

  // @IsOptional()
  // @IsNumber()
  // commissionRate?: number;

  @IsOptional()
  @ToNumber()

  @IsNumber()
  followers?: number;

  @IsOptional()
  @IsString()
  status?: InfluencerStatus;

  @IsOptional()
  @ToBoolean()

  @IsBoolean()
  isActive?: boolean;
}

export class createSlabDTO {
  @ToNumber()

  @IsNumber()
  @Min(0)
  minSales!: number;

  @ToNumber()


  @IsNumber()
  @Min(0)
  maxSales!: number;

  @ToNumber()


  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate!: number;
}

export class UpdateSlabDTO {
  @IsOptional()
  @ToNumber()

  @IsNumber()
  @Min(0)
  minSales?: number;

  @IsOptional()
  @ToNumber()

  @IsNumber()
  @Min(0)
  maxSales?: number;

  @IsOptional()
  @ToNumber()

  @IsNumber()
  @Min(0)
  @Max(99)
  commissionRate?: number;

  @IsOptional()
  @ToBoolean()

  @IsBoolean()
  isActive?: boolean;
}

export class CreateInfluencerTaskbarDTO {

  @IsString()
  mediaLink!: string

  @IsString()
  platform!: PlatformType

  @Type(() => Date)
  @IsDate()
  postingDate!: Date
}

export class UpdateInfluencerTaskbarDTO {

  @IsOptional()
  @IsString()
  mediaLink?: string

  @IsOptional()
  @IsString()
  platform?: PlatformType


  @IsOptional()
  @Type(() => Date)
  @IsDate()
  postingDate?: Date
}
