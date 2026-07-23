import { ToNumber, ToBoolean } from '../../utils/type-tranformer';
import { Type } from "class-transformer";
import { ArrayUnique, IsArray, IsBoolean, IsEnum, IsMongoId, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { CourseLanguage, CourseLevel, CourseStatus } from "../schema/course.schema";




export class AddCourseCategoryDTO {
    @IsString()
    name!: string


    @IsString()
    description!: string

    @IsString()
    label!: string

    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsString({ each: true })
    tags?: string[]

}

export class UpdateCourseCategoryDTO {

    @IsOptional()
    @IsString()
    name: string


    @IsOptional()
    @IsString()
    description?: string

    @IsOptional()
    @IsString()
    label?: string

    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsString({ each: true })
    tags?: string[]

    @IsOptional()
    @ToBoolean()

    @IsBoolean()
    isActive?: boolean
}

export class CreateCourseDTO {
    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    subtitle?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsMongoId()
    categoryId: string;

    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsString({ each: true })
    tags?: string[];

    @IsEnum(CourseLevel)
    level?: CourseLevel;

    @IsOptional()
    @IsEnum(CourseLanguage)
    language?: CourseLanguage;


    @ToNumber()
    @IsNumber()
    @Min(0)
    costPrice: number;


    @ToNumber()
    @IsNumber()
    @Min(0)
    sellingPrice: number;


    @ToNumber()
    @Min(0)
    offeredPrice: number;

    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    isFree?: boolean;
}

export class UpdateCourseDTO {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    subtitle?: string;

    @IsOptional()
    @IsString()
    description?: string;

    // @IsMongoId()
    // thumbnail: string;

    @IsOptional()
    @IsMongoId()
    categoryId?: string;

    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsEnum(CourseLevel)
    level?: CourseLevel;

    @IsOptional()
    @IsEnum(CourseLanguage)
    language?: CourseLanguage;

    @IsOptional()
    @IsEnum(CourseStatus)
    status?: CourseStatus;

    @IsOptional()
    @ToNumber()
    @IsNumber()
    @Min(0)
    costPrice?: number;

    @IsOptional()
    @ToNumber()
    @IsNumber()
    @Min(0)
    sellingPrice?: number;

    @IsOptional()
    @ToNumber()
    @Min(0)
    offeredPrice?: number;

    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    isFree?: boolean;

    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    isActive?: boolean
}