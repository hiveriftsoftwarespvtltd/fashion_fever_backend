import { ToNumber } from '../../utils/type-tranformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PaymentMethod, VendorPayoutStatus } from 'src/vendor/schema/vendor-payout.schema';



export enum VendorStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
export class UpdateVendorDTO {
  // @IsOptional()
  // @IsBoolean()
  // isActive?:boolean

  @IsOptional()
  @ToNumber()

  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @IsOptional()
  @IsEnum(VendorStatus)
  status?: VendorStatus;
}

export class vendorPayDTO {
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  transactionId!: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsArray()
  @ArrayNotEmpty()
  payoutIds!: []
}

export class updateVendorPayoutDTO {
  // @IsString()
  // orderId!:string

  // @IsString()
  // vendorOrderId!:string

  @IsString()
  vendorPayoutId!: string

  @IsEnum(VendorPayoutStatus)
  status!: VendorPayoutStatus
}
