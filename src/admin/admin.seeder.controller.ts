import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AdminSeederService } from './admin.seeder.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';
import { SeedDataDto } from './dto/seed-data.dto';



@Controller('admin/seeder')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminSeederController {
  constructor(private readonly adminSeederService: AdminSeederService) { }


  // @AdminAccess(AdminModule.HOME_CONTENT, AccessType.WRITE)
  @Roles(UserRole.SUPER_ADMIN)
  @Post('seed-data')
  async seedData(@Body() dto: SeedDataDto) {
    const counts = {
      users: dto.users || 5,
      vendors: dto.vendors || 3,
      educators: dto.educators || 2,
      providers: dto.providers || 3,
      influencers: dto.influencers || 2,
    };
    return await this.adminSeederService.seedData(counts);
  }
}
