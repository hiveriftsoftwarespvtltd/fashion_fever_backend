import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AdminProfileService } from './admin-profile.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/profile')
export class AdminProfileController {
  constructor(private readonly adminProfileService: AdminProfileService) {}

  @Get('me')
  async getMyProfile(@Req() req: any) {
    return await this.adminProfileService.getAdminProfile(req.user._id);
  }
}
