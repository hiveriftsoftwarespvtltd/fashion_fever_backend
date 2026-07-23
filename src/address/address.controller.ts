import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { AddressService } from './address.service';
import { AddAddressDTO, UpdateAddressDTO } from './dto/address.dto';

@UseGuards(JwtAuthGuard)
@Controller('address')
export class AddressController {
    constructor(private addreesService:AddressService){}

    @Get('fetch-addresses')
    async fetchAddress(@Req() req:any){
        return await this.addreesService.fetchAddress(req.user._id)
    }

    @Post("add-address")
    async addAddress(@Req() req:any,@Body() dto:AddAddressDTO){
        return await this.addreesService.addAddress(dto,req.user._id)
    }

    @Get("fetch-address-details/:id")
    async fetchAddressDetails(@Req() req:any,@Param('id') id:string){
        return await this.addreesService.fetchAddressDetails(req.user._id,id)
    }

    @Put('update-address/:id')
    async updateAddress(@Req() req:any,@Param('id') id:string,@Body() dto:UpdateAddressDTO){
        return this.addreesService.updateAddress(dto,req.user._id,id)
    }
}
