import { Controller, Post, Get, Body, Req, UseGuards, Param, Query, ParseIntPipe, DefaultValuePipe } from "@nestjs/common";
import { QuickOrderService } from "./quick-delivery-order.service";
import { JwtAuthGuard } from "src/auth/jwt-auth.guad";
import { PlaceQuickOrderDto } from "./dto/quick-order.dto";
import { QuickOrderStatus } from "./schema/quick-order.schema";

@Controller('quick-order')
export class QuickOrderController {
    constructor(private readonly quickOrderService: QuickOrderService) { }

    @UseGuards(JwtAuthGuard)
    @Post('place-order')
    async placeQuickOrder(@Req() req: any, @Body() dto: PlaceQuickOrderDto) {
        return await this.quickOrderService.placeOrder(req.user._id, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('my-orders')
    async getUserOrders(
        @Req() req: any,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query('status') status?: QuickOrderStatus
    ) {
        return await this.quickOrderService.getUserOrders(req.user._id, page, limit, status);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/cancel')
    async cancelOrder(
        @Req() req: any,
        @Param('id') orderId: string,
        @Body('reason') reason?: string
    ) {
        return await this.quickOrderService.cancelOrder(req.user._id, orderId, reason);
    }

    @UseGuards(JwtAuthGuard)
    @Post('vendor-order/:vendorOrderId/cancel')
    async cancelVendorOrder(
        @Req() req: any,
        @Param('vendorOrderId') vendorOrderId: string,
        @Body('reason') reason?: string
    ) {
        return await this.quickOrderService.cancelVendorOrderAsUser(req.user._id, vendorOrderId, reason);
    }
}