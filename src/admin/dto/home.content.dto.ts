import { ToNumber, ToBoolean, ToDate } from '../../utils/type-tranformer';
import { IsString, IsOptional, IsArray, IsEnum, IsBoolean, IsNumber, IsDateString, IsObject } from 'class-validator';
import { ContentType, RedirectType } from '../schema/home.content.schema';
import { Type } from 'class-transformer';



export class CreateHomeContentDto {
    @IsOptional()
    @IsString()
    title!: string;

    @IsOptional()
    @IsString()
    subTitle?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    labels?: string[];

    @IsOptional()
    @IsString()
    computerImage?: string;

    @IsOptional()
    @IsString()
    mobileImage?: string;

    @IsOptional()
    @IsEnum(ContentType)
    contentType?: ContentType;

    @IsOptional()
    @IsEnum(RedirectType)
    redirectType?: RedirectType;

    @IsOptional()
    @IsString()
    redirectId?: string;

    @IsOptional()
    @IsString()
    redirectUrl?: string;

    @IsOptional()
    @IsString()
    backgroundColor?: string;

    @IsOptional()
    @IsString()
    textColor?: string;

    @IsOptional()
    @ToNumber()
    @IsNumber()
    displayOrder?: number;

    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @ToDate()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @ToDate()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @Type(() => Object)
    @IsObject()
    metaData?: Record<string, any>;

    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    isFeatured?: boolean;

    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    buttonText?: string;
}

export class UpdateHomeContentDto extends CreateHomeContentDto { }
