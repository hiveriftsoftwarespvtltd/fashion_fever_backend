import { Controller, Post, Get, Put, Delete, Body, Param, Req, UseGuards, UseInterceptors, UploadedFile, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { DeliveryPersonService, DeliveryPersonRole } from './delivery-person.service';
import { CreateDeliveryPersonDto, UpdateDeliveryPersonDto } from './dto/delivery-person.dto';
import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';
import { DeliveryPersonStatus } from './schema/delivery-person.schema';

@Controller('vendor/delivery-person')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR, UserRole.ADMIN)
export class VendorDeliveryPersonController {
  constructor(private readonly deliveryPersonService: DeliveryPersonService) { }

  @Post('add')
  @UseInterceptors(FileInterceptor('profilePhoto'))
  async createDeliveryPerson(
    @Body() dto: CreateDeliveryPersonDto,
    @Req() req: any,
    @UploadedFile() file: any
  ) {

    return this.deliveryPersonService.createDeliveryPerson(req.user._id, DeliveryPersonRole.VENDOR, dto, req.user.vendorId, file);
  }

  @Get('list')
  async getDeliveryPersons(@Req() req: any, @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: DeliveryPersonStatus) {
    return this.deliveryPersonService.getDeliveryPersons(req.user._id, DeliveryPersonRole.VENDOR, req.user.vendorId, page, limit, status);
  }

  @Get('available')
  async getAvailableRiders() {
    return this.deliveryPersonService.getAllActiveRiders();
  }

  @Get('details/:id')
  async getDeliveryPersonById(@Param('id') id: string, @Req() req: any) {
    return this.deliveryPersonService.getDeliveryPersonById(req.user._id, DeliveryPersonRole.VENDOR, id, req.user.vendorId);
  }

  @Put('update/:id')
  @UseInterceptors(FileInterceptor('profilePhoto'))
  async updateDeliveryPerson(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryPersonDto,
    @Req() req: any,
    @UploadedFile() file: any
  ) {
    return this.deliveryPersonService.updateDeliveryPerson(req.user._id, DeliveryPersonRole.VENDOR, id, dto, file, req.user.vendorId);
  }

  @Delete('delete/:id')
  async deleteDeliveryPerson(@Param('id') id: string, @Req() req: any) {
    return this.deliveryPersonService.deleteDeliveryPerson(req.user._id, DeliveryPersonRole.VENDOR, id, req.user.vendorId);
  }
}

