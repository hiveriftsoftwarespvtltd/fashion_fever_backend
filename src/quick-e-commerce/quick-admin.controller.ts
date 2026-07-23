import { Controller, Get, UseGuards, Query } from "@nestjs/common";
import { QuickAdminService } from "./quick-admin.service";
import { AdminQuickCommerceDashboardFilterDto } from "./dto/quick-admin.dto";
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('quick-admin')
export class QuickAdminController {
  constructor(private readonly quickAdminService: QuickAdminService) { }

  @Get('vendors')
  async getVendors(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return await this.quickAdminService.getQuickCommerceVendors(page || 1, limit || 10);
  }

  @Get('dashboard')
  async getDashboard(@Query() filters: AdminQuickCommerceDashboardFilterDto) {
    return await this.quickAdminService.getOverallDashboardData(filters);
  }
}
