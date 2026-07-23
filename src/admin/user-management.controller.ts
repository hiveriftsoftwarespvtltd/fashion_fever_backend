import { Controller, Get, Put, Query, Param, Body, UseGuards } from '@nestjs/common';
import { UserManagementService } from './user-management.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';
import { UpdateUserRoleDto } from './dto/user-management.dto';
import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AccessType, AdminModule } from './schema/admin.schema';

// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('admin/user-management')
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) { }


  @Get('users')
  @AdminAccess(AdminModule.USERS, AccessType.READ)
  async getAllUsers(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('roles') roles: string | string[],
    @Query('isActive') isActive: string,
    @Query('isDeleted') isDeleted: string,
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    let rolesArray: UserRole[] = [];
    if (roles) {
      if (Array.isArray(roles)) {
        rolesArray = roles as UserRole[];
      } else {
        rolesArray = roles.split(',') as UserRole[];
      }
    }

    let isActiveBool: boolean | undefined = undefined;
    if (isActive === 'true') isActiveBool = true;
    if (isActive === 'false') isActiveBool = false;

    let isDeletedBool: boolean | undefined = undefined;
    if (isDeleted === 'true') isDeletedBool = true;
    if (isDeleted === 'false') isDeletedBool = false;

    return await this.userManagementService.getAllUsers(
      pageNum,
      limitNum,
      rolesArray.length > 0 ? rolesArray : undefined,
      isActiveBool,
      isDeletedBool,
    );
  }

  @Get('users/:userId')
  @AdminAccess(AdminModule.USERS, AccessType.READ)
  async getUserDetails(@Param('userId') userId: string) {
    return await this.userManagementService.getUserDetails(userId);
  }

  @Put('update-users/:userId')
  @AdminAccess(AdminModule.USERS, AccessType.WRITE)
  async updateUser(
    @Param('userId') userId: string,
    @Body() updateData: UpdateUserRoleDto
  ) {
    return await this.userManagementService.updateUser(userId, updateData);
  }
}
