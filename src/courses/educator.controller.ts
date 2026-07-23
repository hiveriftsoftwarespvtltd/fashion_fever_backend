import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Put,
    Query,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';
import { EducatorService } from './educator.service';
import { ApproveEducatorDTO, OnBoardEducatorDTO, UpdateEducatorDTO } from './dto/educator.dto';

@Controller('educator')
export class EducatorController {
    constructor(private readonly educatorService: EducatorService) { }

    // ===================================================
    // EDUCATOR ONBOARDING
    // ===================================================

    @Post('onboard')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file'))
    onboard(
        @Req() req: any,
        @Body() dto: OnBoardEducatorDTO,
        @UploadedFile() file?: any,
    ) {
        return this.educatorService.onboardEducator(req.user._id, dto, file);
    }

    // ===================================================
    // EDUCATOR — MY PROFILE
    // ===================================================

    @Get('my-profile')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.EDUCATOR)
    getMyProfile(@Req() req: any) {
        return this.educatorService.getMyProfile(req.user._id);
    }

    @Put('update-profile')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.EDUCATOR)
    @UseInterceptors(FileInterceptor('file'))
    updateProfile(
        @Req() req: any,
        @Body() dto: UpdateEducatorDTO,
        @UploadedFile() file?: any,
    ) {
        return this.educatorService.updateProfile(req.user._id, dto, file);
    }

    // ===================================================
    // EDUCATOR DASHBOARD STATS
    // ===================================================

    @Get('dashboard-stats')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.EDUCATOR)
    getDashboardStats(@Req() req: any) {
        return this.educatorService.getDashboardStats(req.user._id);
    }

    // ===================================================
    // PUBLIC ROUTES
    // ===================================================

    @Get('list')
    listAllEducators(@Query('page') page: number, @Query('limit') limit: number) {
        return this.educatorService.listAllEducators(page, limit);
    }

    @Get('details/:educatorId')
    getEducatorDetails(@Param('educatorId') educatorId: string) {
        return this.educatorService.getEducatorDetails(educatorId);
    }

    // ===================================================
    // ADMIN ROUTES
    // ===================================================

    @AdminAccess(AdminModule.COURSES, AccessType.READ)
    @Get('pending-approvals')
    @UseGuards(JwtAuthGuard, RolesGuard)

    listPendingEducators(@Query('page') page: number, @Query('limit') limit: number) {
        return this.educatorService.listPendingEducators(page, limit);
    }

    @AdminAccess(AdminModule.COURSES, AccessType.WRITE)
    @Put('approve/:educatorId')
    @UseGuards(JwtAuthGuard, RolesGuard)

    approveEducator(
        @Param('educatorId') educatorId: string,
        @Body() dto: ApproveEducatorDTO,
    ) {
        return this.educatorService.approveEducator(educatorId, dto.isApproved);
    }

    @AdminAccess(AdminModule.COURSES, AccessType.WRITE)
    @Put('toggle-active/:educatorId')
    @UseGuards(JwtAuthGuard, RolesGuard)

    toggleActive(
        @Param('educatorId') educatorId: string,
        @Body('isActive') isActive: boolean,
    ) {
        return this.educatorService.toggleActiveStatus(educatorId, isActive);
    }
}
