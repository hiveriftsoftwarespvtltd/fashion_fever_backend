import { Controller, Post, Body, Get, Query, Req, UseGuards, Param, Patch, Delete } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/notification.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guad';
import { RolesGuard } from '../auth/roles.guard';
import { AdminAccess } from '../auth/admin-access.decorator';
import { AdminModule, AccessType } from '../admin/schema/admin.schema';
import { ApiResponse } from '../common/responses/api-response';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/notification')
export class AdminNotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @AdminAccess(AdminModule.PLATFORM, AccessType.WRITE)
    @Post('add-campaign')
    async createCampaign(@Body() dto: CreateCampaignDto, @Req() req: any) {
        const result = await this.notificationService.createCampaign(dto, req.user._id);
        return ApiResponse.success('Campaign created successfully', result);
    }

    @AdminAccess(AdminModule.PLATFORM, AccessType.WRITE)
    @Patch('update-campaign/:id')
    async updateCampaign(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
        const result = await this.notificationService.updateCampaign(id, dto);
        return ApiResponse.success('Campaign updated successfully', result);
    }

    @AdminAccess(AdminModule.PLATFORM, AccessType.WRITE)
    @Delete('delete-campaign/:id')
    async deleteCampaign(@Param('id') id: string) {
        const result = await this.notificationService.deleteCampaign(id);
        return ApiResponse.success('Campaign deleted successfully', result);
    }

    @AdminAccess(AdminModule.PLATFORM, AccessType.READ)
    @Get('all-campaigns')
    async getCampaigns(@Query('page') page: string, @Query('limit') limit: string) {
        const result = await this.notificationService.getAllCampaigns(parseInt(page) || 1, parseInt(limit) || 10);
        return ApiResponse.success('Campaigns fetched successfully', result);
    }

    @AdminAccess(AdminModule.PLATFORM, AccessType.READ)
    @Get('all-notifications')
    async getAllNotifications(@Query('page') page: string, @Query('limit') limit: string) {
        const result = await this.notificationService.getAllNotifications(parseInt(page) || 1, parseInt(limit) || 10);
        return ApiResponse.success('Notifications fetched successfully', result);
    }
}
