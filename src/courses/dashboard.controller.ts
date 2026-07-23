import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDTO } from './dto/dashboard.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';

@Controller('course-dashboard')
export class DashboardController {
    constructor(private dashboardService: DashboardService) { }

    @UseGuards(JwtAuthGuard, RolesGuard)

    @AdminAccess(AdminModule.COURSES, AccessType.READ)
    @Get('admin/overview')
    async getAdminOverview(@Query() query: DashboardQueryDTO) {
        return await this.dashboardService.getAdminOverview(query);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)

    @AdminAccess(AdminModule.COURSES, AccessType.READ)
    @Get('admin/educators')
    async getAdminEducatorsList() {
        return await this.dashboardService.getAdminEducatorsList();
    }

    @UseGuards(JwtAuthGuard, RolesGuard)

    @AdminAccess(AdminModule.COURSES, AccessType.READ)
    @Get('admin/educator/:educatorId/details')
    async getEducatorParticularDetails(@Param('educatorId') educatorId: string) {
        return await this.dashboardService.getEducatorParticularDetails(educatorId);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.EDUCATOR)
    @Get('educator/overview')
    async getEducatorOverview(@Req() req: any, @Query() query: DashboardQueryDTO) {
        return await this.dashboardService.getEducatorOverview(req.user.educatorId.toString(), query);
    }
}
