import { IsString } from "class-validator";

export class VerifyEmailDTO {

  @IsString()
  email!: string;

  @IsString()
  otp!: string;
}