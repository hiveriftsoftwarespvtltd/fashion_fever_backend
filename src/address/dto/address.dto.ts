import { IsMongoId, IsOptional, IsString, Length } from 'class-validator';

export class AddAddressDTO {

  @IsString()
  line1!: string;

  @IsOptional()
  @IsString()
  line2?: string;

  @IsString()
  @Length(10, 10)
  phone1!: string;

  @IsOptional()
  @IsString()
  @Length(10, 10)
  phone2?: string;

  @IsOptional()
  @IsString()
  landmark?: string;

  @IsString()
  @Length(6, 6)
  pincode!: string;

  @IsString()
  city!: string;

  @IsString()
  state!: string;

  @IsOptional()
  location?: {
    type: 'Point';
    coordinates: number[];
  };
}




export class UpdateAddressDTO {

  @IsOptional()
  @IsString()
  line1?: string;

  @IsOptional()
  @IsString()
  line2?: string;

  @IsOptional()
  @IsString()
  @Length(10, 10)
  phone1?: string;

  @IsOptional()
  @IsString()
  @Length(10, 10)
  phone2?: string;

  @IsOptional()
  @IsString()
  landmark?: string;

  @IsOptional()
  @IsString()
  @Length(6, 6)
  pincode?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  location?: {
    type: 'Point';
    coordinates: number[];
  };
}