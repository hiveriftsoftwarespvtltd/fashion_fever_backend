import { IsDateString, IsOptional } from 'class-validator';

export class DashboardQueryDTO {
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}
