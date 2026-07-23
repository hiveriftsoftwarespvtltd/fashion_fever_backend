import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { PaymentMethod } from '../schema/quick-order.schema';

export class PlaceQuickOrderDto {
  @IsString()
  @IsNotEmpty()
  addressId!: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  couponCode?: string;
}
