import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { SubAdminService } from './sub-admin.service';
import { CreateSubAdminDto, UpdateSubAdminDto } from './dto/sub-admin.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/sub-admins')
export class SubAdminController {
  constructor(private readonly subAdminService: SubAdminService) { }

  @Post('add')
  async createAdmin(@Body() dto: CreateSubAdminDto) {
    return await this.subAdminService.createAdmin(dto);
  }

  @Get('all')
  async getAllAdmins() {
    return await this.subAdminService.getAllAdmins();
  }

  @Get('sub-admin-details/:id')
  async getAdminDetails(@Param('id') id: string) {
    return await this.subAdminService.getAdminDetails(id);
  }

  @Put('update-sub-admin/:id')
  async updateAdmin(@Param('id') id: string, @Body() dto: UpdateSubAdminDto) {
    return await this.subAdminService.updateAdmin(id, dto);
  }

  @Delete('delete-sub-admin/:id')
  async deleteAdmin(@Param('id') id: string) {
    return await this.subAdminService.deleteAdmin(id);
  }
}
