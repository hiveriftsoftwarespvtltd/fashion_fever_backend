import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import { Controller, Post, Get, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AdminCashbackSlabService } from '../../service/admin/admin.cashback-slab.service';
import { CreateCashbackSlabDto, UpdateCashbackSlabDto } from '../../dto/admin.cashback-slab.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';

@UseGuards(JwtAuthGuard, RolesGuard)

@Controller('wallet/admin/cashback-slabs')
export class AdminCashbackSlabController {
    constructor(private readonly adminCashbackSlabService: AdminCashbackSlabService) { }

    @AdminAccess(AdminModule.FINANCE, AccessType.WRITE)
    @Post('add-cashback-slab')
    async createSlab(@Body() dto: CreateCashbackSlabDto) {
        return this.adminCashbackSlabService.createSlab(dto);
    }

    @AdminAccess(AdminModule.FINANCE, AccessType.READ)
    @Get('list-cashback-slab')
    async getSlabs() {
        return this.adminCashbackSlabService.getSlabs();
    }

    @AdminAccess(AdminModule.FINANCE, AccessType.READ)
    @Get('get-cashback-slab/:id')
    async getSlabById(@Param('id') id: string) {
        return this.adminCashbackSlabService.getSlabById(id);
    }

    @AdminAccess(AdminModule.FINANCE, AccessType.WRITE)
    @Put('update-cashback-slab/:id')
    async updateSlab(@Param('id') id: string, @Body() dto: UpdateCashbackSlabDto) {
        return this.adminCashbackSlabService.updateSlab(id, dto);
    }

    @AdminAccess(AdminModule.FINANCE, AccessType.WRITE)
    @Delete('delete-cashback-slab/:id')
    async deleteSlab(@Param('id') id: string) {
        return this.adminCashbackSlabService.deleteSlab(id);
    }
}
