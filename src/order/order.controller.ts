import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';

import { OrderService } from './order.service';
import { CreateOrderDto, UpdateUserOrderDTO } from './dto/order.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';


@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('place-order')
  createOrder(@Body() dto: CreateOrderDto, @Req() req: any) {
    return this.orderService.placeOrder(dto, req.user._id);
  }

  @Get('user-orders')
  allOrders(@Req() req: any) {
    return this.orderService.userOrders(req.user._id);
  }

  
  @Get('/:id')
  orderDetails(@Req() req: any, @Param('id') id: string) {
    return this.orderService.userOrderDetails(req.user._id, id);
  }

  @Put('cancel-order/:id')
  cancelOrder(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserOrderDTO,
  ) {
    return this.orderService.cancelOrder(req.user._id, id, dto);
  }
}
