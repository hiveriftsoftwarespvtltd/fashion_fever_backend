import { IsString,IsEmail,IsMongoId, IsOptional } from "class-validator";


export class LoginDTO{

    @IsEmail()
    email!:string

    @IsOptional()
    password!:string

    @IsMongoId()
    @IsOptional()
    tenantId!:string
}