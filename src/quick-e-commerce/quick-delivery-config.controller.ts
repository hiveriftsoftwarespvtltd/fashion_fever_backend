import { Controller, Get, Put, Body, UseGuards, Post } from '@nestjs/common';
import { QuickDeliveryConfigService } from './quick-delivery-config.service';
import { UpdateQuickDeliveryConfigDto } from './dto/quick-delivery-config.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { AdminPermissionGuard } from 'src/auth/admin-permission.guards';
import { Roles } from 'src/auth/roles.decorator';
import { AdminPermission } from 'src/auth/admin-module.decorator';
import { UserRole } from 'src/user/schema/user.schema';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';

@Controller('quick-delivery-config')
export class QuickDeliveryConfigController {
    constructor(private readonly configService: QuickDeliveryConfigService) { }

    @Get('details')
    async getConfig() {
        return await this.configService.getConfig();
    }

    @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @AdminPermission(AdminModule.PLATFORM, AccessType.WRITE)
    @Post('create-or-update')
    async createOrUpdateConfig(@Body() dto: UpdateQuickDeliveryConfigDto) {
        return await this.configService.createOrUpdateConfig(dto);
    }
}
