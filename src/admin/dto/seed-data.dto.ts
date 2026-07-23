import { ToNumber } from '../../utils/type-tranformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';



export class SeedDataDto {
    @IsOptional()
    @ToNumber()
    @IsInt()
    @Min(1)
    users?: number;

    @IsOptional()
    @ToNumber()
    @IsInt()
    @Min(1)
    vendors?: number;

    @IsOptional()
    @ToNumber()
    @IsInt()
    @Min(1)
    educators?: number;

    @IsOptional()
    @ToNumber()
    @IsInt()
    @Min(1)
    providers?: number;

    @IsOptional()
    @ToNumber()
    @IsInt()
    @Min(1)
    influencers?: number;
}