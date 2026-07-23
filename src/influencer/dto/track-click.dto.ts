import { IsNotEmpty, IsString } from 'class-validator';

export class TrackClickDto {
    @IsNotEmpty()
    @IsString()
    referralCode!: string;
}
