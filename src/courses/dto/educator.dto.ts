import { ToBoolean } from '../../utils/type-tranformer';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';



export class OnBoardEducatorDTO {
    @IsOptional()
    @IsString()
    bio?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    expertise?: string[];
}

export class UpdateEducatorDTO {
    @IsOptional()
    @IsString()
    bio?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    expertise?: string[];
}

export class ApproveEducatorDTO {
    @ToBoolean()
    @IsBoolean()
    isApproved: boolean;
}