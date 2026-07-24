import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
    Req,
    UploadedFile,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ServiceService } from './service.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';
import {
    CreateServiceCategoryDTO,
    CreateServiceSubscriptionPlanDTO,
    UpdateServiceCategoryDTO,
    UpdateServiceSubscriptionPlanDTO,
    CreateServiceProviderDTO,
    UpdateServiceProviderDTO,
    CreateServiceDTO,
    UpdateServiceDTO,
    CreateStaffDTO,
    UpdateStaffDTO,
    UpdateAvailabilityListDTO,
    CreateBookingDTO,
    UpdateBookingStatusDTO,
    CreateReviewDTO,
    CreateLeadDTO,
    CreateProviderAvailabilityDTO,
    BookLeadDTO,
    GetSlotsDTO
} from './dto/service.dto';
import { ServiceProviderVerificationStatus } from './schema/service-provider.schema';

@Controller('service')
export class ServiceController {
    constructor(private readonly serviceService: ServiceService) { }

    // ===================================================
    // SERVICE CATEGORY (Admin)
    // ===================================================

    @AdminAccess(AdminModule.SERVICE_PROVIDERS, AccessType.WRITE)
    @Post('create-service-category')
    @UseGuards(JwtAuthGuard, RolesGuard)

    @UseInterceptors(FileInterceptor('file'))
    createCategory(
        @UploadedFile() file: any,
        @Req() req: any,
        @Body() dto: CreateServiceCategoryDTO,
    ) {
        return this.serviceService.createServiceCategory(dto, file, req.user._id);
    }

    @AdminAccess(AdminModule.SERVICE_PROVIDERS, AccessType.WRITE)
    @Put('update-service-category/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)

    @UseInterceptors(FileInterceptor('file'))
    updateCategory(
        @Param('id') id: string,
        @UploadedFile() file: any,
        @Req() req: any,
        @Body() dto: UpdateServiceCategoryDTO,
    ) {
        return this.serviceService.updateCategory(dto, file, req.user._id, id);
    }

    @Get('get-all-service-categories')
    getAllCategories() {
        return this.serviceService.getAllServiceCategories();
    }

    @Get('get-service-category-details/:id')
    getCategoryDetails(@Param('id') id: string) {
        return this.serviceService.serviceCategoryDetails(id);
    }

    @AdminAccess(AdminModule.SERVICE_PROVIDERS, AccessType.WRITE)
    @Delete('delete-service-category/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)

    deleteCategory(@Param('id') id: string) {
        return this.serviceService.deleteServiceCategory(id);
    }

    // ===================================================
    // SUBSCRIPTION PLAN (Admin)
    // ===================================================

    @AdminAccess(AdminModule.SERVICE_PROVIDERS, AccessType.WRITE)
    @Post('create-service-subscription-plan')
    @UseGuards(JwtAuthGuard, RolesGuard)

    createSubscriptionPlan(@Body() dto: CreateServiceSubscriptionPlanDTO) {
        return this.serviceService.createServiceSubscriptionPlan(dto);
    }

    @AdminAccess(AdminModule.SERVICE_PROVIDERS, AccessType.WRITE)
    @Put('update-service-subscription-plan/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)

    updateSubscriptionPlan(
        @Param('id') id: string,
        @Body() dto: UpdateServiceSubscriptionPlanDTO,
    ) {
        return this.serviceService.updateServiceSubscriptionPlan(dto, id);
    }

    @Get('get-all-service-subscription-plans')
    allSubscriptionPlans() {
        return this.serviceService.allSubscriptionPlans();
    }

    @Get('get-service-subscription-plan-details/:id')
    subscriptionPlanDetails(@Param('id') id: string) {
        return this.serviceService.subscriptionPlanDetails(id);
    }

    @AdminAccess(AdminModule.SERVICE_PROVIDERS, AccessType.WRITE)
    @Delete('delete-service-subscription-plan/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)

    deleteSubscriptionPlan(@Param('id') id: string) {
        return this.serviceService.deletePlan(id);
    }

    // ===================================================
    // SERVICE PROVIDER
    // ===================================================

    
    @Post('register-service-provider')
    @UseGuards(JwtAuthGuard)

    @UseInterceptors(FileInterceptor('file'))
    registerProvider(
        @Req() req: any,
        @Body() dto: CreateServiceProviderDTO,
        @UploadedFile() file: any,
    ) {
        return this.serviceService.registerServiceProvider(
            req.user._id,
            dto,
            file,
        );
    }

    @Put('update-service-provider')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SERVICE_PROVIDER)
    updateProvider(@Req() req: any, @Body() dto: UpdateServiceProviderDTO) {
        return this.serviceService.updateServiceProvider(req.user._id, dto);
    }

    @Get('service-provider-profile')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SERVICE_PROVIDER)
    getProviderProfile(@Req() req: any) {
        return this.serviceService.getServiceProviderProfile(req.user._id);
    }

    @Get('get-service-provider-details/:id')
    getProviderById(@Param('id') id: string) {
        return this.serviceService.getServiceProviderById(id);
    }

    @Get('get-all-service-providers')
    listProviders(@Query('page') page: number, @Query('limit') limit: number) {
        return this.serviceService.listServiceProviders(page, limit);
    }

    @AdminAccess(AdminModule.SERVICE_PROVIDERS, AccessType.WRITE)
    @Put('service-provider/:id/verify')
    @UseGuards(JwtAuthGuard, RolesGuard)

    approveProvider(
        @Param('id') id: string,
        @Body('status') status: ServiceProviderVerificationStatus,
    ) {
        return this.serviceService.approveServiceProvider(id, status);
    }

    // ===================================================
    // SERVICE CRUD
    // ===================================================

    // @AdminAccess(AdminModule.SERVICE_PROVIDERS, AccessType.WRITE)
    @Post('create-service')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SERVICE_PROVIDER)
    @UseInterceptors(AnyFilesInterceptor())
    createService(
        @Req() req: any,
        @Body() dto: CreateServiceDTO,
        @UploadedFiles() files: any[],
    ) {
        return this.serviceService.createService(req.user._id, dto, files);
    }

    @Put('update-service/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SERVICE_PROVIDER)
    @UseInterceptors(AnyFilesInterceptor())
    updateService(
        @Param('id') id: string,
        @Req() req: any,
        @Body() dto: UpdateServiceDTO,
        @UploadedFiles() files: any[],
    ) {
        return this.serviceService.updateService(req.user._id, id, dto, files);
    }

    @Delete('delete-service/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SERVICE_PROVIDER)
    deleteService(@Param('id') id: string, @Req() req: any) {
        return this.serviceService.deleteService(req.user._id, id);
    }

    @Get('details/:id')
    getServiceDetails(@Param('id') id: string) {
        return this.serviceService.getServiceDetails(id);
    }

    @Get('list')
    listServices(
        @Query('categoryId') categoryId?: string,
        @Query('providerId') providerId?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.serviceService.listServices(categoryId, providerId, page, limit);
    }

    @Get('get-all-services/:providerId')
    listServicesByProvider(@Param('providerId') providerId: string, @Query('page') page: number, @Query('limit') limit: number) {
        return this.serviceService.listServices(undefined, providerId, page, limit);
    }

    // ===================================================
    // STAFF
    // ===================================================

    @Post('add-service-staff')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SERVICE_PROVIDER)
    @UseInterceptors(FileInterceptor('file'))
    addStaff(
        @Req() req: any,
        @Body() dto: CreateStaffDTO,
        @UploadedFile() file: any,
    ) {
        return this.serviceService.addStaff(req.user._id, dto, file);
    }

    @Put('update-service-staff/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SERVICE_PROVIDER)
    @UseInterceptors(FileInterceptor('file'))
    updateStaff(
        @Param('id') id: string,
        @Req() req: any,
        @Body() dto: UpdateStaffDTO,
        @UploadedFile() file: any,
    ) {
        return this.serviceService.updateStaff(req.user._id, id, dto, file);
    }

    @Delete('delete-service-staff/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SERVICE_PROVIDER)
    deleteStaff(@Param('id') id: string, @Req() req: any) {
        return this.serviceService.deleteStaff(req.user._id, id);
    }

    @Get('get-all-service-staff/:providerId')
    listStaff(@Param('providerId') providerId: string) {
        return this.serviceService.listStaff(providerId);
    }

    @Get('get-service-staff/:providerId/:staffId')
    getStaffDetails(@Param('providerId') providerId: string, @Param('staffId') staffId: string) {
        return this.serviceService.getStaffDetails(providerId, staffId);
    }

    // ===================================================
    // AVAILABILITY & SLOTS
    // ===================================================

    @Post('create-provider-availability')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SERVICE_PROVIDER)
    createProviderAvailability(@Req() req: any, @Body() dto: CreateProviderAvailabilityDTO) {
        return this.serviceService.createProviderAvailability(req.user._id, dto);
    }

    @Put('update-provider-availability')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SERVICE_PROVIDER)
    updateAvailability(@Req() req: any, @Body() dto: UpdateAvailabilityListDTO) {
        return this.serviceService.updateAvailability(
            req.user._id,
            dto.availabilities,
        );
    }

    @Get('get-availability/:providerId')
    getAvailability(@Param('providerId') providerId: string) {
        return this.serviceService.getAvailability(providerId);
    }

    @Post('slots/:providerId')
    getAvailableSlots(
        @Param('providerId') providerId: string,
        @Body() dto: GetSlotsDTO,
    ) {
        return this.serviceService.getAvailableSlots(
            providerId,
            dto,
        );
    }

    // ===================================================
    // BOOKING (Moved to ServiceBookingController)
    // ===================================================

    // ===================================================
    // REVIEWS
    // ===================================================

    // @Post('review')
    // @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles(UserRole.USER)
    // createReview(@Req() req: any, @Body() dto: CreateReviewDTO) {
    //     return this.serviceService.createReview(req.user._id, dto);
    // }

    // ===================================================
    // LEADS
    // ===================================================

    @Post('create-lead')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.USER)
    createLead(@Req() req: any, @Body() dto: CreateLeadDTO) {
        return this.serviceService.createLead(req.user._id, dto);
    }

    @Get('user-service-leads')
    @UseGuards(JwtAuthGuard)
    userListLeads(@Req() req: any, @Query('categoryId') categoryId?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
        return this.serviceService.userListLeads(req.user._id, categoryId, page, limit);
    }
    
}
