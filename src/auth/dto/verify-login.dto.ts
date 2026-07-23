import { IsEmail, IsNumber, IsString } from "class-validator";

export class VerifyLoginDTO {

  @IsEmail()

  email!: string;

  @IsString()
  otp!: string;
}