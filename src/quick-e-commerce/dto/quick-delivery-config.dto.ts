import { IsNumber, Min } from 'class-validator';

export class UpdateQuickDeliveryConfigDto {
  @IsNumber()
  @Min(0)
  minimumValueForFreeDelivery!: number;

  @IsNumber()
  @Min(0)
  deliveryFee!: number;

  @IsNumber()
  @Min(0)
  packagingCharge!: number

  @IsNumber()
  @Min(0)
  tax!: number

  @IsNumber()
  @Min(0)
  deliveryPersonChargeForPerDelivery!: number
}
