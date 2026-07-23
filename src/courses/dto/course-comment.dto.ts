import { IsMongoId, IsOptional, IsString } from "class-validator";

export class CreateCourseCommentDTO {
    @IsMongoId()
    courseId!: string;

    @IsMongoId()
    courseSectionId!: string;

    @IsMongoId()
    courseLessonId!: string;

    @IsString()
    comment!: string;
}

export class UpdateCourseCommentDTO {
    @IsOptional()
    @IsString()
    comment?: string;
}
