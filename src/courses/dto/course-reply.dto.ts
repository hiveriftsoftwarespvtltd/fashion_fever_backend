import { IsMongoId, IsOptional, IsString } from "class-validator";

export class CreateCourseReplyDTO {
    @IsMongoId()
    courseId!: string;

    @IsMongoId()
    courseSectionId!: string;

    @IsMongoId()
    courseLessonId!: string;

    @IsString()
    comment!: string;

    @IsMongoId()
    parentId!: string;
}

export class UpdateCourseReplyDTO {
    @IsOptional()
    @IsString()
    comment?: string;
}
