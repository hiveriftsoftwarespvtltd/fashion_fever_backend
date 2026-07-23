import { Controller, Get, Put, Body, Param, Query, Req, UseGuards, UseInterceptors, UploadedFiles, BadRequestException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { QuickOrderService } from './quick-delivery-order.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';
import { GetVendorOrdersDto, UpdateVendorOrderStatusDto, AssignDeliveryPersonDto, VendorCancelOrderDto, MarkOrderDeliveredDto } from './dto/vendor-order-update.dto';

@Controller('vendor/quick-order')
@UseGuards(JwtAuthGuard)
export class VendorQuickOrderController {
    constructor(private readonly quickOrderService: QuickOrderService) { }

    @Get('list')
    async getVendorOrders(@Req() req: any, @Query() query: GetVendorOrdersDto) {
        return this.quickOrderService.getVendorOrders(
            req.user.vendorId || req.user._id,
            query.page || 1,
            query.limit || 10,
            query.status,
            query.deliveryPersonId
        );
    }

    @Put(':id/assign')
    async assignDeliveryPerson(@Req() req: any, @Param('id') orderId: string, @Body() dto: AssignDeliveryPersonDto) {
        return this.quickOrderService.assignDeliveryPerson(req.user.vendorId || req.user._id, orderId, dto.deliveryPersonId);
    }

    @Put(':id/update')
    @UseInterceptors(FilesInterceptor('deliveryProofImages', 4))
    async updateVendorOrder(
        @Req() req: any,
        @Param('id') orderId: string,
        @Body() dto: UpdateVendorOrderStatusDto,
        @UploadedFiles() files: Express.Multer.File[]
    ) {
        return this.quickOrderService.updateVendorOrder(
            req.user.vendorId || req.user._id,
            orderId,
            dto,
            files
        );
    }

    @Put(':id/cancel')
    async cancelVendorOrder(@Req() req: any, @Param('id') orderId: string, @Body() dto: VendorCancelOrderDto) {
        return this.quickOrderService.cancelVendorOrder(req.user.vendorId || req.user._id, orderId, dto.cancelledReason);
    }

    @Put(':id/deliver')
    async markOrderDelivered(@Req() req: any, @Param('id') orderId: string, @Body() dto: MarkOrderDeliveredDto) {
        return this.quickOrderService.markVendorOrderAsDelivered(
            orderId,
            [],
            req.user?.vendorId || req.user?._id,
            'VENDOR'
        );
    }
}
