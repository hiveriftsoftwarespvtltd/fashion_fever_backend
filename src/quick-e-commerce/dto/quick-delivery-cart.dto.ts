import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CartItemDto {
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  productId: string;

  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  variantId: string;
}

export class AddToCartDto extends CartItemDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;
}

export class DecreaseCartItemDto extends CartItemDto { }

export class RemoveCartItemDto extends CartItemDto { }
