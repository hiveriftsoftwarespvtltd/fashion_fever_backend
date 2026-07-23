import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { VendorService } from './vendor.service';
import { createVendorDTO } from './dto/create-vendor.dto';
// import { updateVendorDTO } from './dto/update-vendor.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { updateVendorDTO } from './dto/update-vendor-dto';
import { UpdateOrderDTO } from './dto/order.dto';
import { DashboardFilterDTO } from './dto/vendor-analytics.dto';


@Controller('vendor')
export class VendorController {
  constructor(private vendorService: VendorService) { }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
    ]),
  )
  @Post()
  async registerVendor(
    @Body() dto: createVendorDTO,
    @UploadedFiles()
    files: {
      logo?: any[];
      banner?: any[];
    },
    @Req() req: any,
  ) {

    return this.vendorService.registerVendor(
      dto,
      req.user._id,
      files,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
    ]),
  )
  @Put()
  async updateVendor(
    @Body() dto: updateVendorDTO,
    @UploadedFiles()
    files: {
      logo?: any[];
      banner?: any[];
    },
    @Req() req: any,
  ) {
    return this.vendorService.updateVendorDetails(
      dto,
      req.user._id,
      req.user.vendorId,
      files,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get('overview')
  async dashboardOverview(@Req() req: any) {
    return this.vendorService.overview(req.user.vendorId)
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get('top-products')
  async dashboardRevenue(@Req() req: any) {
    return this.vendorService.topSellingProducts(req.user.vendorId)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get('order-graph')
  orderGraph(@Req() req: any, @Query('days') days: number) {
    return this.vendorService.orderGraph(req.user.vendorId, days)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get('top-categories')
  topCategories(@Req() req: any) {
    return this.vendorService.topCategories(req.user.vendorId)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get('order-comparison')
  orderComparison(@Req() req: any) {
    return this.vendorService.orderComparison(req.user.vendorId)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get('vendor-details')
  async vendorDetails(@Req() req: any) {
    return await this.vendorService.getVendorDetails(
      req.user._id,
      req.user.vendorId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get('vendor-products')
  async vendorProducts(@Req() req: any, @Query('page') page: number, @Query('limit') limit: number) {
    return await this.vendorService.vendorProducts(req.user._id, req.user.vendorId, page, limit)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get('vendor-categories')
  async vendorCategories(@Req() req: any) {
    return await this.vendorService.vendorCategories(req.user._id, req.user.vendorId)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get('vendor-orders')
  async vendorOrders(@Req() req: any, @Query('page') page: number, @Query('limit') limit: number) {
    return this.vendorService.vendorOrders(req.user.vendorId, page, limit)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Delete("delete-all-products")
  async deleteAllProducts(@Req() req: any) {
    return await this.vendorService.deleteAllVendorProducts(req.user.vendorId)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get('vendor-orders/:id')
  async vendorOrdersDetails(@Req() req: any, @Param('id') id: string) {
    return this.vendorService.orderDetails(req.user.vendorId, id)
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Put('update-order/:id')
  updateOrder(@Body() dto: UpdateOrderDTO, @Param('id') id: string, @Req() req: any) {
    return this.vendorService.updateOrder(dto, id, req.user.vendorId, req.user._id);
  }

  // Analytics Endpoints


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get('dashboard/sales-performance')
  async getSalesPerformance(@Req() req: any, @Query() filter: DashboardFilterDTO) {
    return this.vendorService.getSalesPerformance(req.user.vendorId, filter);
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get('dashboard/top-products')
  async getTopSellingProducts(@Req() req: any, @Query() filter: DashboardFilterDTO) {
    return this.vendorService.getTopSellingProducts(req.user.vendorId, filter);
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get('dashboard/product-sales-percentage')
  async getProductSalesPercentage(@Req() req: any, @Query() filter: DashboardFilterDTO) {
    return this.vendorService.getProductSalesPercentage(req.user.vendorId, filter);
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get('dashboard/customer-demographics')
  async getCustomerDemographics(@Req() req: any, @Query() filter: DashboardFilterDTO) {
    return this.vendorService.getCustomerDemographics(req.user.vendorId, filter);
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get('dashboard/export-orders')
  async exportVendorOrders(@Req() req: any, @Query() filter: DashboardFilterDTO, @Res() res: any) {
    const csvData = await this.vendorService.exportVendorOrders(req.user.vendorId, filter);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="vendor_orders.csv"');
    return res.send(csvData);
  }
}