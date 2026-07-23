import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from 'src/user/schema/user.schema';

export class UpdateUserRoleDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
