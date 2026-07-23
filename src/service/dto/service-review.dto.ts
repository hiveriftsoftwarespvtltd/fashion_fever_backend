import { ToNumber } from '../../utils/type-tranformer';
import { PartialType } from '@nestjs/mapped-types';
import { Type, Transform, plainToInstance } from 'class-transformer';
import { IsMongoId, IsNumber, IsOptional, IsString, Max, Min, IsArray, ValidateNested } from 'class-validator';





export class ServiceReviewItemDto {
  @IsMongoId()
  serviceId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  serviceRating: number;

  @IsOptional()
  @IsString()
  serviceReview?: string;
}

export class CreateServiceReviewDto {
  @IsMongoId()
  bookingId!: string;

  @IsMongoId()
  serviceProviderId!: string;

  @IsNumber()
  @ToNumber()
  @Min(1)
  @Max(5)
  providerRating!: number;

  @IsOptional()
  @IsString()
  providerReview?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceReviewItemDto)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return plainToInstance(ServiceReviewItemDto, parsed);
      } catch (e) {
        return value;
      }
    } else if (Array.isArray(value)) {
      return plainToInstance(ServiceReviewItemDto, value);
    }
    return value;
  })
  services!: ServiceReviewItemDto[];
}


export class UpdateServiceReviewItemDto {
  @IsMongoId()
  serviceId!: string;

  @IsOptional()
  @IsNumber()
  @ToNumber()
  @Min(1)
  @Max(5)
  serviceRating?: number;

  @IsOptional()
  @IsString()
  serviceReview?: string;
}

export class UpdateServiceReviewDto {
  @IsOptional()
  @IsNumber()
  @ToNumber()
  @Min(1)
  @Max(5)
  providerRating?: number;

  @IsOptional()
  @IsString()
  providerReview?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateServiceReviewItemDto)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return plainToInstance(UpdateServiceReviewItemDto, parsed);
      } catch (e) {
        return value;
      }
    } else if (Array.isArray(value)) {
      return plainToInstance(UpdateServiceReviewItemDto, value);
    }
    return value;
  })
  services?: UpdateServiceReviewItemDto[];
}
