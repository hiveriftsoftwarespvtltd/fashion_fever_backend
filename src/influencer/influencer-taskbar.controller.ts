import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import { InfluencerTaskBarService } from "./influencer-taskbar.service";
import { CreateInfluencerTaskbarDTO, UpdateInfluencerTaskbarDTO } from "./dto/influencer.dto";
import { JwtAuthGuard } from "src/auth/jwt-auth.guad";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";
import { UserRole } from "src/user/schema/user.schema";




@Controller('influencer-taskbar')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InfluencerTaskbarController {
    constructor(private readonly influencerTaskbarService: InfluencerTaskBarService) { }

    @Roles(UserRole.INFLUENCER)
    @Post('submit-task-data')
    async submitTaskData(@Body() dto: CreateInfluencerTaskbarDTO, @Req() req: any) {
        return this.influencerTaskbarService.submitTaskbarData(req.user.influencerId, dto)
    }


    @Roles(UserRole.INFLUENCER)
    @Put('update-task-data/:id')
    async updateTaskbarData(@Req() req: any, @Body() dto: UpdateInfluencerTaskbarDTO, @Param('id') id: string) {
        return this.influencerTaskbarService.updateTaskbarData(req.user.influencerId, id, dto)
    }

    @Roles(UserRole.INFLUENCER, UserRole.SUPER_ADMIN)
    @Get('get-task-data')
    async getTaskData(@Req() req: any) {
        return this.influencerTaskbarService.getTaskdata(req.user.role)
    }

    @Roles(UserRole.INFLUENCER, UserRole.SUPER_ADMIN)
    @Delete('delete-task-data/:id')
    async deleteTaskbarData(@Req() req: any, @Param('id') id: string) {
        return this.influencerTaskbarService.deleteTaskbarList(id, req.user.influencerId)
    }


    @AdminAccess(AdminModule.INFLUENCERS, AccessType.READ)
    @Get('influencer-task-list/:influencerId')
    async getInfluencerTaskList(@Param('influencerId') influencerId: string) {
        return await this.influencerTaskbarService.getListofTaskByInfluencer(influencerId)
    }
}