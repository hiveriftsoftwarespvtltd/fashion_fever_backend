import { ToNumber, ToBoolean } from '../../utils/type-tranformer';
import { IsEnum, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { CashbackType } from '../schema/cashback/cashbacks.slabs.schema';



export class CreateCashbackSlabDto {
    @ToNumber()
    @IsNumber()
    minValue!: number;

    @ToNumber()

    @IsNumber()
    maxValue!: number;

    @ToNumber()

    @IsNumber()
    cashbackValue!: number;

    @IsEnum(CashbackType)
    @IsOptional()
    cashbackType?: CashbackType;

    @ToNumber()

    @IsNumber()
    @IsOptional()
    maxCashback?: number;

    @ToBoolean()

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class UpdateCashbackSlabDto {
    @ToNumber()
    @IsNumber()
    @IsOptional()
    minValue?: number;

    @ToNumber()

    @IsNumber()
    @IsOptional()
    maxValue?: number;

    @ToNumber()

    @IsNumber()
    @IsOptional()
    cashbackValue?: number;

    @IsEnum(CashbackType)
    @IsOptional()
    cashbackType?: CashbackType;

    @ToNumber()

    @IsNumber()
    @IsOptional()
    maxCashback?: number;

    @ToBoolean()

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
