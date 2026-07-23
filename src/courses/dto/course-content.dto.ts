import { ToNumber, ToBoolean } from '../../utils/type-tranformer';
import { Type } from "class-transformer";
import { IsBoolean, IsDate, IsEnum, IsMongoId, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { LessonType } from '../schema/course-lesson.schema';



export class CreateCourseSectionDTO {
    @IsMongoId()
    courseId: string;

    @IsString()
    title: string;

    @ToNumber()

    @IsNumber()
    @ToNumber()
    @Min(0)
    order: number;
}

export class UpdateCourseSectionDTO {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @ToNumber()
    @Min(0)

    @IsNumber()
    order?: number;
}

export class CreateCourseLessonDTO {
    @IsMongoId()
    courseId: string;

    @IsMongoId()
    sectionId: string;

    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    videoUrl: string;

    @IsOptional()
    @IsString()
    videoId?: string;

    @IsOptional()
    @Min(0)
    @ToNumber()
    @IsNumber()
    durationInSeconds?: number;

    @Min(0)
    @ToNumber()
    @IsNumber()
    order: number;

    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    isPreview?: boolean;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    liveClassStartTime?: Date

    @IsOptional()
    @IsEnum(LessonType)
    lessonType?: LessonType
}

export class UpdateCourseLessonDTO {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    videoUrl?: string;

    @IsOptional()
    @IsString()
    videoId?: string;

    @IsOptional()
    @Min(0)
    @ToNumber()
    @IsNumber()
    durationInSeconds?: number;

    @IsOptional()
    @ToNumber()
    @Min(0)
    @IsNumber()
    order?: number;

    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    isPreview?: boolean;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    liveClassStartTime?: Date

    @IsOptional()
    @IsEnum(LessonType)
    lessonType?: LessonType
}
