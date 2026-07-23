import { ToNumber } from '../../utils/type-tranformer';
import { Type } from "class-transformer";
import { IsEnum, IsMongoId, IsNumber, IsOptional, IsString, IsUrl } from "class-validator";
import { CourseAttachmentType } from "../schema/course-attachments.schema";



export class CreateCourseAttachmentDTO {
    @IsMongoId()
    courseId: string;

    @IsOptional()
    @IsMongoId()
    sectionId?: string;

    @IsOptional()
    @IsMongoId()
    lessonId?: string;

    @IsEnum(CourseAttachmentType)
    @IsOptional()
    type?: CourseAttachmentType;

    @IsUrl()
    url: string;

    @IsOptional()
    @ToNumber()
    @IsNumber()
    @ToNumber()
    duration?: number;
}

export class UpdateCourseAttachmentDTO {
    @IsEnum(CourseAttachmentType)
    @IsOptional()
    type?: CourseAttachmentType;

    @IsOptional()
    @IsUrl()
    url?: string;

    @IsOptional()
    @ToNumber()
    @IsNumber()
    @ToNumber()
    duration?: number;
}
