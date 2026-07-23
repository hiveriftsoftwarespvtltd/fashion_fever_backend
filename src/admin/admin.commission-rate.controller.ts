import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AdminCommissionRateService } from './admin.commission-rate.service';
import {
  CreateCommissionRateDto,
  UpdateCommissionRateDto,
} from './dto/commission-rate.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';

@UseGuards(JwtAuthGuard, RolesGuard)

@Controller('admin/commission-rates')
export class AdminCommissionRateController {
  constructor(
    private readonly commissionRateService: AdminCommissionRateService,
  ) { }

  /** GET the single global commission-rate configuration */
  // @AdminAccess(AdminModule.HOME_CONTENT, AccessType.READ)
  @Roles(UserRole.SUPER_ADMIN)
  @Get()
  async get() {
    return this.commissionRateService.get();
  }

  /** SET (upsert) the global commission-rate slabs */
  // @AdminAccess(AdminModule.HOME_CONTENT, AccessType.WRITE)
  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  async set(@Body() dto: CreateCommissionRateDto) {
    return this.commissionRateService.set(dto);
  }
}
