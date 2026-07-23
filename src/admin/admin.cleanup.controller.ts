import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import { Controller, Delete, UseGuards } from '@nestjs/common';
import { AdminCleanupService } from './admin.cleanup.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

import { UserRole } from 'src/user/schema/user.schema';

@Controller('admin/cleanup')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminCleanupController {
    constructor(private readonly adminCleanupService: AdminCleanupService) { }


    // @AdminAccess(AdminModule.HOME_CONTENT, AccessType.WRITE)
    @Roles(UserRole.SUPER_ADMIN)
    @Delete('all-data')
    async wipeAllData() {
        return await this.adminCleanupService.wipeAllData(['shiprockettokens']);
    }
}
