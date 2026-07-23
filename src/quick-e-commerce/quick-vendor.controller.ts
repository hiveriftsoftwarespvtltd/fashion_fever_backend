import { Controller, Get, Put, Body, UseGuards, Req, Query } from "@nestjs/common";
import { QuickVendorService } from "./quick-vendor.service";
import { UpdateQuickCommerceDto, QuickVendorDashboardFilterDto } from "./dto/quick-vendor.dto";
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Controller('quick-vendor')
export class QuickVendorController {
    constructor(private readonly quickVendorService: QuickVendorService) {}

    @Put('commerce-config')
    async updateConfig(@Req() req: any, @Body() updateDto: UpdateQuickCommerceDto) {
      return await this.quickVendorService.updateQuickCommerceDetails(req.user._id, updateDto);
    }
  
    @Get('dashboard')
    async getDashboard(@Req() req: any, @Query() filters: QuickVendorDashboardFilterDto) {
      return await this.quickVendorService.getDashboardData(req.user._id, filters);
    }
}