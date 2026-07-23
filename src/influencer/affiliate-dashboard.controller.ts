import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AffiliateDashboardService } from './affiliate-dashboard.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';

@Controller('affiliate-dashboard')
export class AffiliateDashboardController {
    constructor(private readonly affiliateDashboardService: AffiliateDashboardService) {}

    @UseGuards(JwtAuthGuard, RolesGuard)

    @AdminAccess(AdminModule.INFLUENCERS, AccessType.READ)
    @Get('admin')
    getAdminDashboard(
        @Query('month') month?: string,
        @Query('year') year?: string
    ) {
        return this.affiliateDashboardService.getAdminDashboardStats(month, year);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.INFLUENCER)
    @Get('influencer')
    getInfluencerDashboard(
        @Req() req: any,
        @Query('month') month?: string,
        @Query('year') year?: string
    ) {
        return this.affiliateDashboardService.getInfluencerDashboardStats(req.user.influencerId, month, year);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)

    @AdminAccess(AdminModule.INFLUENCERS, AccessType.READ)
    @Get('ranking')
    getInfluencerRanking(
        @Query('month') month?: string,
        @Query('year') year?: string
    ) {
        return this.affiliateDashboardService.getInfluencerRanking(month, year);
    }
}
