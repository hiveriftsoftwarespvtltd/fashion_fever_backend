import { Controller, Get, Patch, Param, Query, Req, UseGuards, Post, Body } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { OptionalAuthGuard } from '../auth/optional-auth.guards';
import { JwtAuthGuard } from '../auth/jwt-auth.guad';
import { ApiResponse } from '../common/responses/api-response';
import { ProductNotifyDTO } from './dto/notification.dto';

@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @UseGuards(OptionalAuthGuard)
    @Get('my-notifications')
    async getMyNotifications(@Req() req: any, @Query('page') page: string, @Query('limit') limit: string) {
        if (!req.user?._id) {
            return ApiResponse.success('Notifications fetched successfully', { data: [], total: 0, page: parseInt(page) || 1, limit: parseInt(limit) || 10 });
        }
        const result = await this.notificationService.getUserNotifications(req.user._id, parseInt(page) || 1, parseInt(limit) || 10);
        return ApiResponse.success('Notifications fetched successfully', result);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('update-read-status/:id')
    async markAsRead(@Param('id') id: string, @Req() req: any) {
        const result = await this.notificationService.markAsRead(id, req.user._id);
        return ApiResponse.success('Notification marked as read', result);
    }

    @UseGuards(OptionalAuthGuard)
    @Post('register-for-product-notify')
    async registerForProductNotify(@Body() dto: ProductNotifyDTO, @Req() req: any) {
        if (!req.user?._id) {
            return ApiResponse.success('Product notification registered successfully', null);
        }
        return this.notificationService.registerForProductNotifications(req.user._id, dto);
    }
}
