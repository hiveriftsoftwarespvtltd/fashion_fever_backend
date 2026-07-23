import { IsEmail, IsString } from 'class-validator';

export class ForgotPasswordOTPDTO {
  @IsEmail()
  email!: string;

  @IsString()
  otp!: string;

  @IsString()
  newPassword!: string;

  @IsString()
  confirmPassword!: string;
}