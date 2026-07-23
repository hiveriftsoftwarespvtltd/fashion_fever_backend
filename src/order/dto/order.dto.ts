import { ToNumber } from '../../utils/type-tranformer';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';
import { OrderStatus, PaymentMethod } from '../schema/order.schema';



export class CreateOrderItemDto {
  @IsMongoId()
  productId!: string;

  @IsMongoId()
  variantId!: string;

  @ToNumber()


  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {

    
  @IsMongoId()
  addressId!: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  // @IsString()
  // vendorId!:string
}

export class UpdateUserOrderDTO{
  @IsOptional()
  @IsEnum(OrderStatus)
  orderStatus!:OrderStatus

  @IsOptional()
  @IsString()
  cancellationReason?:string

  @IsOptional()
  @IsString()
  returnReason?:string
}