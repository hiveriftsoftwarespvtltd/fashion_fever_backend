import { Controller, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { QuickOrderService } from './quick-delivery-order.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';
import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import { GetAdminOrdersDto, AdminCancelOrderDto } from './dto/admin-order-update.dto';

@Controller('admin/quick-order')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminQuickOrderController {
    constructor(private readonly quickOrderService: QuickOrderService) { }

    @AdminAccess(AdminModule.VENDORS, AccessType.READ)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @Get('list')
    async getAdminOrders(@Query() query: GetAdminOrdersDto) {
        return this.quickOrderService.getAdminOrders(
            query.page || 1,
            query.limit || 10,
            query.status,
            query.startDate,
            query.endDate
        );
    }

    @AdminAccess(AdminModule.VENDORS, AccessType.WRITE)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @Put(':id/cancel')
    async cancelOrderAsAdmin(@Param('id') orderId: string, @Body() dto: AdminCancelOrderDto) {
        return this.quickOrderService.cancelOrderAsAdmin(orderId, dto.cancelledReason);
    }

    @AdminAccess(AdminModule.VENDORS, AccessType.WRITE)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @Put('vendor-order/:vendorOrderId/cancel')
    async cancelVendorOrderAsAdmin(@Param('vendorOrderId') vendorOrderId: string, @Body() dto: AdminCancelOrderDto) {
        return this.quickOrderService.cancelVendorOrderAsAdmin(vendorOrderId, dto.cancelledReason);
    }
}
