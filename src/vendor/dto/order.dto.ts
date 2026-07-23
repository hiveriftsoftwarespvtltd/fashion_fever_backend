import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

import { OrderStatus, PaymentStatus } from 'src/order/schema/order.schema';

export class UpdateOrderDTO {
  // @IsString()
  // orderId!:string
  @IsOptional()
  @IsEnum(OrderStatus)
  orderStatus?: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsString()
  trackingId?: string;

  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate?: string;

  @IsOptional()
  @IsDateString()
  cancelledAt?: string;

  @IsOptional()
  @IsDateString()
  deliveredAt?: string;
}
