import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsArray,
  Matches,
} from 'class-validator';

/**
 * DTO for creator-initiated payout request.
 * At least one of bankAccountId or upiId should be provided so Admin can
 * process the external transfer. The service builds a bankAccountSnapshot
 * from whichever is supplied.
 */
export class RequestInfluencerPayoutDto {
  @IsOptional()
  @IsMongoId()
  bankAccountId?: string;

  /**
   * UPI VPA in the format "handle@bank" (e.g. priya@ybl, creator@paytm).
   * Validated against standard VPA pattern; must not contain spaces.
   */
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/, {
    message: 'upiId must be a valid UPI VPA (e.g. name@ybl, handle@paytm)',
  })
  upiId?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class SettleInfluencerPayoutAdminDto {
  @IsOptional()
  @IsMongoId()
  payoutId?: string;

  @IsOptional()
  @IsMongoId()
  influencerId?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  commissionIds?: string[];

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  transactionId!: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class RejectInfluencerPayoutAdminDto {
  @IsMongoId()
  @IsNotEmpty()
  payoutId!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  reason!: string;
}

export class FailInfluencerPayoutAdminDto {
  @IsMongoId()
  @IsNotEmpty()
  payoutId!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  reason!: string;
}
