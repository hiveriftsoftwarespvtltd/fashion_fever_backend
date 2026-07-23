import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { VehicleType, DeliveryPersonStatus } from '../schema/delivery-person.schema';
import { PartialType } from '@nestjs/mapped-types';
import { Type, Transform } from 'class-transformer';

export class LocationDto {
  @IsEnum(['Point'])
  type: 'Point';

  @IsArray()
  @IsNumber({}, { each: true })
  coordinates: number[];
}

export class CreateDeliveryPersonDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsNotEmpty()
  @IsString()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsArray()
  @IsMongoId({ each: true })
  assignedVendorIds?: string[];

  @IsOptional()
  @IsMongoId()
  profilePhoto?: string;

  @IsNotEmpty()
  @IsString()
  aadharNumber: string;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return JSON.parse(value);
    }
    return value;
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  location?: number[];
}

export class UpdateDeliveryPersonDto extends PartialType(CreateDeliveryPersonDto) {
  @IsOptional()
  @IsEnum(DeliveryPersonStatus)
  status?: DeliveryPersonStatus;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isOnline?: boolean;
}

export class UpdateDeliveryPersonStatusDto {
  @IsOptional()
  @IsEnum(DeliveryPersonStatus)
  status?: DeliveryPersonStatus;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return JSON.parse(value);
    }
    return value;
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  location?: number[];
}
