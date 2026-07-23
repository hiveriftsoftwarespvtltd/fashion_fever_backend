import { IsArray, IsEnum, ArrayNotEmpty } from 'class-validator';
import { UserRole } from '../schema/user.schema';

export class ApplyRolesDTO {
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];
}
