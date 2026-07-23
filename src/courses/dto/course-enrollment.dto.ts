import { ToNumber, ToBoolean } from '../../utils/type-tranformer';
import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsMongoId, IsNumber, IsOptional } from "class-validator";
import { PaymentMethod } from "src/order/schema/order.schema";



export class EnrollCourseDTO {
    @IsMongoId()
    courseId: string;
}

export class PurchaseCourseDTO {
    @IsMongoId()
    courseId: string;

    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;

    @IsOptional()
    couponCode?: string;
}

export class UpdateLessonProgressDTO {
    @IsMongoId()
    courseId: string;

    @IsMongoId()
    lessonId: string;

    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    isCompleted?: boolean;

    @IsOptional()
    @ToNumber()
    @IsNumber()
    watchedDurationInSeconds?: number;
}
