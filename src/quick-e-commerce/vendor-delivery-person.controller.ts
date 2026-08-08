import { Controller, Post, Get, Put, Delete, Body, Param, Req, UseGuards, UseInterceptors, UploadedFile, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { DeliveryPersonService, DeliveryPersonRole } from './delivery-person.service';
import { CreateDeliveryPersonDto, UpdateDeliveryPersonDto } from './dto/delivery-person.dto';
import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';
import { DeliveryPersonStatus } from './schema/delivery-person.schema';
import { ApiResponse } from 'src/common/responses/api-response';

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
    const res = await this.deliveryPersonService.createDeliveryPerson(req.user._id, DeliveryPersonRole.VENDOR, dto, req.user.vendorId, file);
    return ApiResponse.success('Delivery rider registered successfully', res);
  }

  @Get('list')
  async getDeliveryPersons(@Req() req: any, @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: DeliveryPersonStatus) {
    const res = await this.deliveryPersonService.getDeliveryPersons(req.user._id, DeliveryPersonRole.VENDOR, req.user.vendorId, page, limit, status);
    return ApiResponse.success('Delivery riders fetched successfully', res);
  }

  @Get('available')
  async getAvailableRiders() {
    const res = await this.deliveryPersonService.getAllActiveRiders();
    return ApiResponse.success('Available riders fetched successfully', res);
  }

  @Get('details/:id')
  async getDeliveryPersonById(@Param('id') id: string, @Req() req: any) {
    const res = await this.deliveryPersonService.getDeliveryPersonById(req.user._id, DeliveryPersonRole.VENDOR, id, req.user.vendorId);
    return ApiResponse.success('Delivery rider details fetched successfully', res);
  }

  @Put('update/:id')
  @UseInterceptors(FileInterceptor('profilePhoto'))
  async updateDeliveryPerson(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryPersonDto,
    @Req() req: any,
    @UploadedFile() file: any
  ) {
    const res = await this.deliveryPersonService.updateDeliveryPerson(req.user._id, DeliveryPersonRole.VENDOR, id, dto, file, req.user.vendorId);
    return ApiResponse.success('Delivery rider updated successfully', res);
  }

  @Delete('delete/:id')
  async deleteDeliveryPerson(@Param('id') id: string, @Req() req: any) {
    const res = await this.deliveryPersonService.deleteDeliveryPerson(req.user._id, DeliveryPersonRole.VENDOR, id, req.user.vendorId);
    return ApiResponse.success('Delivery rider deleted successfully', res);
  }
}

