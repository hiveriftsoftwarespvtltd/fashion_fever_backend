import { Transform } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  ArrayUnique,
} from 'class-validator';

export class CreateCategoryDTO {
  @IsString()
  name!: string;

  @IsString()
  label!:string

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

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



export class UpdateCategoryDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
   @IsString()
  label?:string

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

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