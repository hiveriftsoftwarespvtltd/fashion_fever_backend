import { IsNotEmpty, IsString, IsOptional, IsDateString } from 'class-validator';

export class InsertShiprocketTokenDto {
    @IsNotEmpty()
    @IsString()
    token: string;

    @IsOptional()
    @IsDateString()
    expiresAt?: string;
}
