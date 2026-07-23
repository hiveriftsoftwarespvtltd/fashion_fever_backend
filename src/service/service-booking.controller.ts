import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import {
  Controller,
  Post,
  Put,
  Get,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ServiceBookingService } from './service-booking.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';
import { CreateBookingDTO, RescheduleBookingDTO } from './dto/service.dto';
import { BookingPaymentStatus, BookingStatus } from './schema/service-booking.schema';

@Controller('service-booking')
export class ServiceBookingController {
  constructor(private readonly serviceBookingService: ServiceBookingService) { }

  @Post('create-booking')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  createBooking(@Req() req: any, @Body() dto: CreateBookingDTO) {
    return this.serviceBookingService.createBooking(req.user._id, dto);
  }

  @Put('cancel-service-booking/:id')
  @UseGuards(JwtAuthGuard)
  cancelBooking(@Req() req: any, @Param('id') bookingId: string) {
    // Basic implementation: User cancels their own booking
    return this.serviceBookingService.cancelBooking(req.user._id, bookingId);
  }

  @Put('reschedule/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  rescheduleBooking(
    @Req() req: any,
    @Param('id') bookingId: string,
    @Body() dto: RescheduleBookingDTO,
  ) {
    return this.serviceBookingService.rescheduleBooking(req.user._id, bookingId, dto);
  }

  @Put(':id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SERVICE_PROVIDER)
  confirmBooking(@Req() req: any, @Param('id') bookingId: string) {
    // The provider confirms the booking
    return this.serviceBookingService.confirmBooking(req.user._id, bookingId);
  }

  @Get('user-service-booking-history')
  @UseGuards(JwtAuthGuard)
  getBookingHistory(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.serviceBookingService.getUserBookingHistory(
      req.user._id,
      status,
      startDate,
      endDate,
    );
  }

  @Put('update-service-booking/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SERVICE_PROVIDER)
  updateServiceBooking(@Req() req: any, @Param('id') bookingId: string, @Body('bookingStatus') bookingStatus?: BookingStatus, @Body('paymentStatus') paymentStatus?: BookingPaymentStatus) {

    return this.serviceBookingService.updateServiceBooking(req.user.serviceProviderId, bookingId, bookingStatus, paymentStatus);
  }

  @Get('provider/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SERVICE_PROVIDER)
  getProviderBookings(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.serviceBookingService.getProviderBookings(
      req.user.serviceProviderId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      status,
    );
  }

    @AdminAccess(AdminModule.SERVICE_PROVIDERS, AccessType.READ)
  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)

  getAdminBookings(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('providerId') providerId?: string,
  ) {
    return this.serviceBookingService.getAdminBookings(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      status,
      providerId,
    );
  }

    @AdminAccess(AdminModule.SERVICE_PROVIDERS, AccessType.READ)
  @Get('details/:id')
  @UseGuards(JwtAuthGuard)
  getBookingDetails(@Req() req: any, @Param('id') bookingId: string) {
    return this.serviceBookingService.getBookingDetails(bookingId, req.user);
  }
}
