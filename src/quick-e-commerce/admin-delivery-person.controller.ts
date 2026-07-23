import { Controller, Post, Get, Put, Delete, Body, Param, Req, UseGuards, UseInterceptors, UploadedFile, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { DeliveryPersonService, DeliveryPersonRole } from './delivery-person.service';
import { CreateDeliveryPersonDto, UpdateDeliveryPersonDto } from './dto/delivery-person.dto';
import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';
import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import { DeliveryPersonStatus } from './schema/delivery-person.schema';

@Controller('admin/delivery-person')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminDeliveryPersonController {
  constructor(private readonly deliveryPersonService: DeliveryPersonService) { }

  @AdminAccess(AdminModule.VENDORS, AccessType.WRITE)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('add')
  @UseInterceptors(FileInterceptor('profilePhoto'))
  async createDeliveryPerson(
    @Body() dto: CreateDeliveryPersonDto,
    @Req() req: any,
    @UploadedFile() file: any
  ) {
    return this.deliveryPersonService.createDeliveryPerson(req.user._id, DeliveryPersonRole.ADMIN, dto, undefined, file);
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.READ)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('list')
  async getDeliveryPersons(@Req() req: any, @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: DeliveryPersonStatus) {
    return this.deliveryPersonService.getDeliveryPersons(req.user._id, DeliveryPersonRole.ADMIN, undefined, page, limit, status);
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.READ)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('details/:id')
  async getDeliveryPersonById(@Param('id') id: string, @Req() req: any) {
    return this.deliveryPersonService.getDeliveryPersonById(req.user._id, DeliveryPersonRole.ADMIN, id);
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.READ)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('vendor/:vendorId')
  async getDeliveryPersonsForVendor(@Param('vendorId') vendorId: string) {
    return this.deliveryPersonService.getDeliveryPersonsForVendor(vendorId);
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.WRITE)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Put('update/:id')
  @UseInterceptors(FileInterceptor('profilePhoto'))
  async updateDeliveryPerson(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryPersonDto,
    @Req() req: any,
    @UploadedFile() file: any
  ) {
    return this.deliveryPersonService.updateDeliveryPerson(req.user._id, DeliveryPersonRole.ADMIN, id, dto, file);
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.WRITE)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Delete('delete/:id')
  async deleteDeliveryPerson(@Param('id') id: string, @Req() req: any) {
    return this.deliveryPersonService.deleteDeliveryPerson(req.user._id, DeliveryPersonRole.ADMIN, id);
  }
}

