import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { UserRole } from 'src/user/schema/user.schema';
import { AdminDashboardService } from './admin.dashboard.service';



@Controller('admin-dashboard')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) { }
  @AdminAccess(AdminModule.PLATFORM, AccessType.READ)
  @Get('overview')
  async adminOverview() {
    return await this.adminDashboardService.getAdminOverview();
  }

  @AdminAccess(AdminModule.PLATFORM, AccessType.READ)
  @Get('revenue-trend')
  async adminRevenueTrend(@Query('days') days: number) {
    return await this.adminDashboardService.getRevenueTrend(days);
  }

  @AdminAccess(AdminModule.PLATFORM, AccessType.READ)
  @Get('top-vendors')
  async topVendors(@Query('limit') limit: number) {
    return this.adminDashboardService.TopVendors(limit)
  }

  @AdminAccess(AdminModule.PLATFORM, AccessType.READ)
  @Get('top-categories')
  async topCategories(@Query('limit') limit: number) {
    return this.adminDashboardService.topCategories(limit)
  }

  @AdminAccess(AdminModule.PLATFORM, AccessType.READ)
  @Get('order-status-analytics')
  async orderStatusAnalytics() {
    return this.adminDashboardService.orderStatusAnalytics()
  }

  @AdminAccess(AdminModule.PLATFORM, AccessType.READ)
  @Get('category-distribution')
  async categoryDistribution() {
    return this.adminDashboardService.categoryDistribution()
  }

  @AdminAccess(AdminModule.PLATFORM, AccessType.READ)
  @Get('order-status-graph')
  async orderStatusGraph() {
    return this.adminDashboardService.orderStatusGraph()
  }

  @AdminAccess(AdminModule.PLATFORM, AccessType.READ)
  @Get('monthly-analytics')
  async monthlyAnalytics(@Query('year') year: number) {
    return this.adminDashboardService.monthlyAnalytics(year)
  }

  @AdminAccess(AdminModule.PLATFORM, AccessType.READ)
  @Get('yearly-analytics')
  async yearlyAnalytics() {
    return this.adminDashboardService.yearlyAnalytics()
  }

  @AdminAccess(AdminModule.PLATFORM, AccessType.READ)
  @Get('analytics-graph')
  async analyticsGraph(@Query('year') year: number) {
    return this.adminDashboardService.analyticsGraph(year)
  }

  @AdminAccess(AdminModule.PLATFORM, AccessType.READ)
  @Get('top-vendors-graph')
  async topVendorsGraph(@Query('limit') limit: number) {
    return this.adminDashboardService.topVendorsGraph(limit)
  }
}
