import { IsEmail, IsString } from 'class-validator';

export class ResetPasswordDTO {
  @IsEmail()
  email!: string;

  @IsString()
  oldPassword!: string;

  @IsString()
  newPassword!: string;

  @IsString()
  confirmPassword!: string;
}