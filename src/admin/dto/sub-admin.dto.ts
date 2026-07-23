import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested, IsBoolean } from 'class-validator';
import { AccessType, AdminModule } from '../schema/admin.schema';

export class ModuleAccessDto {
    @IsEnum(AdminModule)
    @IsNotEmpty()
    module: AdminModule;

    @IsArray()
    @IsEnum(AccessType, { each: true })
    access: AccessType[];
}

export class CreateSubAdminDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsString()
    email: string;

    @IsNotEmpty()
    @IsString()
    password: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsNotEmpty()
    @IsString()
    roleTitle: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ModuleAccessDto)
    moduleAccess: ModuleAccessDto[];
}

export class UpdateSubAdminDto {
    @IsOptional()
    @IsString()
    roleTitle?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ModuleAccessDto)
    moduleAccess?: ModuleAccessDto[];
    
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
