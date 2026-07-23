import { IsNotEmpty, IsOptional, IsString, IsEnum, IsArray } from 'class-validator';
import { UserRole } from 'src/user/schema/user.schema';

export class GoogleLoginDTO {
    @IsNotEmpty()
    @IsString()
    idToken: string;

    @IsOptional()
    @IsArray()
    @IsEnum(UserRole, { each: true })
    roles?: UserRole[];
}
