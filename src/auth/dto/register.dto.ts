import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsMongoId, IsArray } from "class-validator";
import { UserRole } from "src/user/schema/user.schema";

export class RegisterDTO {
    @IsString()
    name!: string

    @IsEmail()
    email!: string

    @IsString()
    @MinLength(6)
    password!: string

    // @IsOptional()
    @IsString()
    phone?: string

    @IsArray()
    @IsEnum(UserRole, { each: true })
    @IsOptional()
    roles?: UserRole[]

    @IsMongoId()
    @IsOptional()
    tenantId!: string

    @IsOptional()
    isActive?: boolean

    @IsString()
    @IsOptional()
    referralCode?: string
}