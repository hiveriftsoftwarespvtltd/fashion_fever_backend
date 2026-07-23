import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ServiceQuotationService } from './service-quotation.service';
import { CreateServiceQuotationDto, UpdateServiceQuotationDto } from './dto/service-quotation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guad';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user/schema/user.schema';

@Controller('service-quotations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceQuotationController {
    constructor(private readonly serviceQuotationService: ServiceQuotationService) { }

    @Post('add')
    @Roles(UserRole.SERVICE_PROVIDER)
    createQuotation(@Req() req: any, @Body() createServiceQuotationDto: CreateServiceQuotationDto) {
        return this.serviceQuotationService.createQuotation(req.user.serviceProviderId, createServiceQuotationDto);
    }

    @Get('user-lead-quotations-list/:leadId')
    @Roles(UserRole.USER)
    getLeadQuotations(@Req() req: any, @Param('leadId') leadId: string) {
        return this.serviceQuotationService.getLeadQuotations(req.user._id, leadId);
    }

    @Patch('update-quotation/:id')
    @Roles(UserRole.SERVICE_PROVIDER)
    updateQuotation(@Req() req: any, @Param('id') id: string, @Body() updateServiceQuotationDto: UpdateServiceQuotationDto) {
        return this.serviceQuotationService.updateQuotation(req.user.serviceProviderId, id, updateServiceQuotationDto);
    }

    @Delete('delete-quotation/:id')
    @Roles(UserRole.SERVICE_PROVIDER)
    deleteQuotation(@Req() req: any, @Param('id') id: string) {
        return this.serviceQuotationService.deleteQuotation(req.user.serviceProviderId, id);
    }

    @Patch('user-accept-quotation/:id')
    @Roles(UserRole.USER)
    acceptQuotation(@Req() req: any, @Param('id') id: string) {
        return this.serviceQuotationService.acceptQuotation(req.user._id, id);
    }

    @Patch('service-lead-completed/:id')
    @Roles(UserRole.SERVICE_PROVIDER)
    completeQuotation(@Req() req: any, @Param('id') id: string) {
        return this.serviceQuotationService.completeQuotation(req.user.serviceProviderId, id);
    }
}
