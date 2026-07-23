import { IsEmail, IsMongoId, IsNumber, IsOptional, IsString } from "class-validator";



export class createVendorDTO{


    // @IsMongoId()
    // ownerId!:string;

    @IsString()
    businessName!:string

    @IsString()
    slug!:string

    @IsOptional()
    @IsString()
    description?:string

    @IsOptional()
    @IsString()
    address?:string

    @IsOptional()
    @IsString()
    phone?:string

    @IsOptional()
    @IsEmail()
    email?:string;

    @IsString()
    vendorPincode!:string

    @IsString()
    city!:string

    @IsString()
    state!:string

    // @IsOptional()
    // @IsNumber()
    // comissionRate?:string
}