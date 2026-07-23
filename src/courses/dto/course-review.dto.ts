import { IsMongoId, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { ToNumber } from "../../utils/type-tranformer";

export class CreateCourseReviewDTO {
    @IsMongoId()
    courseId!: string;

    @IsString()
    @MaxLength(1000)
    review!: string;

    @ToNumber()
    @IsNumber()
    @Min(1)
    @Max(5)
    rating!: number;
}

export class UpdateCourseReviewDTO {
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    review?: string;

    @IsOptional()
    @ToNumber()
    @IsNumber()
    @Min(1)
    @Max(5)
    rating?: number;
}
