import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { TicketService } from './ticket.service';
import { CreateTicketDto, UpdateTicketStatusDto, AddTicketReplyDto } from './dto/ticket.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guad';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user/schema/user.schema';

@UseGuards(JwtAuthGuard)
@Controller('ticket')
export class TicketController {
  constructor(private readonly ticketService: TicketService) { }

  @Post('raise-a-ticket')
  @UseInterceptors(FilesInterceptor('mediaFiles', 4))
  createTicket(
    @Req() req: any,
    @Body() dto: CreateTicketDto,
    @UploadedFiles() files: any[],
  ) {
    return this.ticketService.createTicket(req.user._id, dto, files);
  }

  @Get('my-tickets')
  getMyTickets(@Req() req: any) {
    return this.ticketService.getMyTickets(req.user._id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get('vendor-tickets')
  getVendorTickets(@Req() req: any) {
    const vendorId = req.user.vendorId || req.user._id;
    return this.ticketService.getVendorTickets(vendorId);
  }

  @AdminAccess(AdminModule.PLATFORM, AccessType.READ)
  @Get('get-all-tickets')
  getAllTickets(@Query() query: any) {
    return this.ticketService.getAllTickets(query);
  }

  @Get('ticket-details/:id')
  getTicketDetails(@Param('id') id: string, @Req() req: any) {
    return this.ticketService.getTicketDetails(id, req.user);
  }

  @Post(':id/reply')
  addTicketReply(
    @Param('id') id: string,
    @Body() dto: AddTicketReplyDto,
    @Req() req: any,
  ) {
    return this.ticketService.addTicketReply(id, dto, req.user);
  }

  @Put('update-status/:id')
  updateTicketStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
    @Req() req: any,
  ) {
    return this.ticketService.updateTicketStatus(id, dto, req.user);
  }

  @AdminAccess(AdminModule.PLATFORM, AccessType.WRITE)
  @Delete('delete/:id')
  deleteTicket(@Param('id') id: string, @Req() req: any) {
    return this.ticketService.deleteTicket(id, req.user);
  }
}
