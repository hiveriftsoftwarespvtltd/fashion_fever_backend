import { IsBoolean, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsString, Min } from "class-validator";
import { RentalServiceGender, RentalStatus } from "../schema/rental-service.schema";
import { Type } from "class-transformer";


export class AddRentalServiceDTO {
    @IsMongoId()
    @IsNotEmpty()
    serviceCategoryId!: string

    @IsString()
    @IsNotEmpty()
    title!: string

    @IsString()
    @IsNotEmpty()
    description!: string

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    @Type(() => Number)
    rentalPrice: number;

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    @Type(() => Number)
    securityDeposit: number;

    @IsNumber()
    @Min(1)
    @IsNotEmpty()
    @Type(() => Number)
    totalQuantity: number;

    @IsEnum(RentalStatus)
    status: RentalStatus;

    @IsEnum(RentalServiceGender)
    rentalServiceGender: RentalServiceGender;

    @IsBoolean()
    @Type(() => Boolean)
    isActive!: boolean
}