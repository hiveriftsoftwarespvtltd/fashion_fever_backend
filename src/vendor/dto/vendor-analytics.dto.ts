import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { OrderStatus, PaymentStatus } from 'src/order/schema/order.schema';

export class DashboardFilterDTO {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsEnum(OrderStatus)
  orderStatus?: OrderStatus;
}
