import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiResponse } from 'src/common/responses/api-response';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';
import {
  UpdateVendorDTO,
  updateVendorPayoutDTO,
  vendorPayDTO,
} from './dto/vendor.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateCategoryDTO, UpdateCategoryDTO } from './dto/category.dto';
import { InfluencerService } from 'src/influencer/influencer.service';
import {
  CreateInfluencerDto,
  createSlabDTO,
  UpdateSlabDTO,
} from 'src/influencer/dto/influencer.dto';

@UseGuards(JwtAuthGuard, RolesGuard)

@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private influencerService: InfluencerService,
  ) { }

  @AdminAccess(AdminModule.VENDORS, AccessType.READ)
  @Get('vendors')
  async getAllVendors(@Query('page') page: number, @Query('limit') limit: number) {
    return await this.adminService.fetchAllVendors(page, limit);
  }

  @AdminAccess(AdminModule.USERS, AccessType.READ)
  @Get('users')
  async getAllUsers(@Query('page') page: number, @Query('limit') limit: number) {
    return await this.adminService.fetchAllUsers(page, limit);
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.READ)
  @Get('pending-vendors')
  async fetAllPendingVendors(@Query('page') page: number, @Query('limit') limit: number) {
    return this.adminService.fetchPendingVendors(page, limit);
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.READ)
  @Get('products')
  async fetAllProducts(@Query('page') page: number, @Query('limit') limit: number) {
    return this.adminService.fetchProducts(page, limit);
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.READ)
  @Get('orders')
  async fetchAllOrders(@Query('page') page: number, @Query('limit') limit: number) {
    return this.adminService.fetchAllOrders(page, limit);
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.WRITE)
  @Delete('delete-all-products')
  async deleteAllProducts() {
    return await this.adminService.deleteAllProducts();
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.WRITE)
  @Delete('delete-all-categories')
  async deleteAllCategories() {
    return this.adminService.deleteAllCategories();
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.WRITE)
  @Post('create-category')
  @UseInterceptors(FileInterceptor('file'))
  createCategory(
    @UploadedFile()
    file: any,

    @Req()
    req: any,

    @Body()
    dto: CreateCategoryDTO,
  ) {
    return this.adminService.createCategory(dto, file, req.user._id);
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.READ)
  @Get('fetch-categories')
  async getAllCategories() {
    return await this.adminService.fetchAllCategories();
  }

  @AdminAccess(AdminModule.FINANCE, AccessType.READ)
  @Get('vendor-payouts')
  async allVendorPayouts(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.adminService.allVendorPayouts(limit, page, status, month, year);
  }

  @AdminAccess(AdminModule.FINANCE, AccessType.READ)
  @Get('vendor-payouts/:vendorId')
  async vendorPayoutDetails(
    @Param('vendorId') vendorId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.adminService.vendorPayoutDetails(
      vendorId,
      limit,
      page,
      status,
      month,
      year,
    );
  }

  @AdminAccess(AdminModule.INFLUENCERS, AccessType.WRITE)
  @Post('create-influencer-commission-slab')
  createInfluencerCommissonSlab(@Body() dto: createSlabDTO) {
    return this.influencerService.createSlab(dto);
  }

  @AdminAccess(AdminModule.INFLUENCERS, AccessType.READ)
  @Get('influencer-commissions')
  async allInfluencerCommissions(
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return await this.adminService.allInfluencerCommission(
      +limit,
      +page,
      status,
      month ? +month : undefined,
      year ? +year : undefined,
    );
  }

  @AdminAccess(AdminModule.INFLUENCERS, AccessType.WRITE)
  @Post('send-influencer-invitation-link')
  async sendInfluencerInvitationLink(@Body('email') email: string, @Body('name') name: string, @Req() req: any) {
    return await this.influencerService.sendInfluencerInvitationLink(email, name, req.user._id)
  }

  @AdminAccess(AdminModule.INFLUENCERS, AccessType.WRITE)
  //  @Post('onboard-influencer')
  //   create(@Body() dto: CreateInfluencerDto) {
  //     return this.influencerService.create(dto);
  //   }

  @AdminAccess(AdminModule.INFLUENCERS, AccessType.READ)
  @Get('all-influencer-commission-slabs')
  getAllCommissionSlabs(@Query('page') page: number, @Query('limit') limit: number) {
    return this.influencerService.getAllCommissionSlabs(page, limit);
  }

  @AdminAccess(AdminModule.PLATFORM, AccessType.WRITE)
  // @Post('vendor-payout/settle')
  // settleVendorPayout(@Body() dto: SettleVendorPayoutDto) {
  //   return this.payoutService.settleVendorPayout(dto);
  // }

  @AdminAccess(AdminModule.INFLUENCERS, AccessType.READ)
  @Get('influencer-commissions/:influencerId')
  async influencerCommissionDetails(
    @Param('influencerId') influencerId: string,

    @Query('month') month?: number,

    @Query('year') year?: number,
  ) {
    return this.adminService.influencerCommissionDetails(
      influencerId,
      month,
      year,
    );
  }

  @AdminAccess(AdminModule.INFLUENCERS, AccessType.WRITE)
  @Put('update-commission-slab/:slabId')
  updateCommissonSlab(
    @Param('slabId') slabId: string,
    @Body() dto: UpdateSlabDTO,
  ) {
    return this.influencerService.updateSlab(slabId, dto);
  }

  @AdminAccess(AdminModule.INFLUENCERS, AccessType.READ)
  @Get('slab-details/:slabId')
  slabDetails(@Param('slabId') slabId: string) {
    return this.influencerService.getCommissionSlabDetails(slabId);
  }

  @AdminAccess(AdminModule.INFLUENCERS, AccessType.WRITE)
  @Delete('delete-slab/:slabId')
  deleteSlab(@Param('slabId') slabId: string) {
    return this.influencerService.deleteSlab(slabId);
  }

  @AdminAccess(AdminModule.INFLUENCERS, AccessType.READ)
  // @Get('vendor-payout/:vendorId')
  // async vendorPayoutDetails(
  //   @Param('vendorId') vendorId: string,
  //   @Query('page') page: number,
  //   @Query('limit') limit: number,
  //   @Query('status') status: string,
  //   @Query('fromDate') fromDate: any,
  //   @Query('toDate') toDate: any,
  // ) {
  //   return this.adminService.vendorPayoutDetails(
  //     vendorId,
  //     page,
  //     limit,
  //     fromDate,
  //     toDate,
  //     status,
  //   );
  // }

  @AdminAccess(AdminModule.PLATFORM, AccessType.WRITE)
  // @Post('vendor-pays/:vendorId')
  // async payVendor(
  //   @Req() req: any,
  //   @Param('vendorId') vendorId: string,
  //   @Body() dto: vendorPayDTO,
  // ) {
  //   return await this.adminService.payVendorPayouts(
  //     req.user._id,
  //     vendorId,
  //     dto,
  //   );
  // }

  @AdminAccess(AdminModule.FINANCE, AccessType.WRITE)
  @Put('update-vendor-payout-status/:vendorId')
  async updateVendorPayoutStatus(
    @Param('vendorId') vendorId: string,
    @Body() dto: updateVendorPayoutDTO,
  ) {
    return await this.adminService.updateVendorPayoutStatus(vendorId, dto);
  }
  @AdminAccess(AdminModule.VENDORS, AccessType.READ)
  @Get('fetch-catoegry/:categoryId')
  async fetchCategoryDetails(@Param('categoryId') categoryId: string) {
    return this.adminService.fetchCategoryDetails(categoryId);
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.WRITE)
  @Delete('delete-category/:categoryId')
  async deleteCategory(@Param('categoryId') categoryId: string) {
    return await this.adminService.deleteCategory(categoryId);
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.WRITE)
  @Put('update-category/:id')
  @UseInterceptors(FileInterceptor('file'))
  updateCategory(
    @Param('id') id: string,

    @UploadedFile()
    file: any,

    @Req()
    req: any,

    @Body()
    dto: UpdateCategoryDTO,
  ) {
    return this.adminService.updateCategory(dto, file, req.user._id, id);
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.READ)
  @Get('orderDetails/:id')
  async orderDetails(@Param('id') id: string) {
    return this.adminService.fetchOrderDetails(id);
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.WRITE)
  @Delete('order-delete/:id')
  async deleteOrder(@Param('id') id: string) {
    return this.adminService.deleteOrder(id);
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.READ)
  @Get('vendors/:id')
  async vendorDetails(@Param('id') id: string) {
    return await this.adminService.fetchVendorDetails(id);
  }

  @AdminAccess(AdminModule.USERS, AccessType.READ)
  @Get('users/:id')
  async userDetails(@Param('id') id: string) {
    return await this.adminService.fetchUserDetails(id);
  }

  @AdminAccess(AdminModule.USERS, AccessType.WRITE)
  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return await this.adminService.deleteUser(id);
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.WRITE)
  @Delete('vendors/:id')
  async deleteVendor(@Param('id') id: string) {
    return await this.adminService.deleteVendor(id);
  }

  @AdminAccess(AdminModule.INFLUENCERS, AccessType.WRITE)
  @Delete('delete-influencer/:id')
  async deleteInfluencer(@Param('id') id: string) {
    return await this.adminService.deleteInfluencer(id);
  }

  @AdminAccess(AdminModule.COURSES, AccessType.WRITE)
  @Delete('delete-educator/:id')
  async deleteEducator(@Param('id') id: string) {
    return await this.adminService.deleteEducator(id);
  }

  @AdminAccess(AdminModule.SERVICE_PROVIDERS, AccessType.WRITE)
  @Delete('delete-service-provider/:id')
  async deleteServiceProvider(@Param('id') id: string) {
    return await this.adminService.deleteServiceProvider(id);
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.WRITE)
  @Patch('vendor-update/:vendorId')
  async updateVendor(
    @Param('vendorId') vendorId: string,
    @Body() dto: UpdateVendorDTO,
  ) {
    return this.adminService.updateVendorDetails(dto, vendorId);
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.WRITE)
  @Patch('vendors/toggle-active/:id')
  async toogleActiveVendor(@Param('id') id: string) {
    return await this.adminService.toggleActiveVendor(id);
  }

  @AdminAccess(AdminModule.USERS, AccessType.WRITE)
  @Patch('users/toggle-active/:id')
  async toggleActiveUser(@Param('id') id: string) {
    return await this.adminService.toggleActiveUser(id);
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.WRITE)
  @Patch('accept-vendor/:id')
  async acceptVendorRequest(@Param('id') id: string) {
    return await this.adminService.acceptPendingVendor(id);
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.WRITE)
  @Patch('reject-vendor/:id')
  async rejectVendorRequest(@Param('id') id: string) {
    return await this.adminService.rejectPendingVendor(id);
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.WRITE)
  @Delete('delete-product/:vendorId/:productId')
  async deleteProduct(
    @Param('vendorId') vendorId: string,
    @Param('productId') productId: string,
  ) {
    return await this.adminService.deleteVendorProduct(vendorId, productId);
  }

  @AdminAccess(AdminModule.USERS, AccessType.WRITE)
  @Patch('restore-user/:id')
  async restoreUser(@Param('id') id: string) {
    return await this.adminService.restoreUser(id);
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.WRITE)
  @Patch('restore-vendor/:id')
  async restoreVendor(@Param('id') id: string) {
    return await this.adminService.restoreVendor(id);
  }

  @AdminAccess(AdminModule.INFLUENCERS, AccessType.WRITE)
  @Patch('restore-influencer/:id')
  async restoreInfluencer(@Param('id') id: string) {
    return await this.adminService.restoreInfluencer(id);
  }

  @AdminAccess(AdminModule.COURSES, AccessType.WRITE)
  @Patch('restore-educator/:id')
  async restoreEducator(@Param('id') id: string) {
    return await this.adminService.restoreEducator(id);
  }

  @AdminAccess(AdminModule.SERVICE_PROVIDERS, AccessType.WRITE)
  @Patch('restore-service-provider/:id')
  async restoreServiceProvider(@Param('id') id: string) {
    return await this.adminService.restoreServiceProvider(id);
  }

  @AdminAccess(AdminModule.PLATFORM, AccessType.READ)
  @Get('cloudinary-storage-size')
  async getCloudinaryStorageSize() {
    const data = await this.adminService.getCloudinaryStorageSize();
    return ApiResponse.success('Storage size fetched successfully', data);
  }
}
