import { Controller, Get, Patch, Param, Query, Req, UseGuards, Post, Body } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guad';
import { ApiResponse } from '../common/responses/api-response';
import { ProductNotifyDTO } from './dto/notification.dto';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Get('my-notifications')
    async getMyNotifications(@Req() req: any, @Query('page') page: string, @Query('limit') limit: string) {
        const result = await this.notificationService.getUserNotifications(req.user._id, parseInt(page) || 1, parseInt(limit) || 10);
        return ApiResponse.success('Notifications fetched successfully', result);
    }

    @Patch('update-read-status/:id')
    async markAsRead(@Param('id') id: string, @Req() req: any) {
        const result = await this.notificationService.markAsRead(id, req.user._id);
        return ApiResponse.success('Notification marked as read', result);
    }

    @Post('register-for-product-notify')
    async registerForProductNotify(@Body() dto:ProductNotifyDTO,@Req() req:any){
        return this.notificationService.registerForProductNotifications(req.user._id,dto)
    }
}
