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
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { InfluencerService } from './influencer.service';
import { CreateInfluencerDto, UpdateInfluencerDto } from './dto/influencer.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';
import { InfluencerStatus } from './schema/influencer.schema';

@Controller('influencers')
export class InfluencerController {
  constructor(private readonly influencerService: InfluencerService) { }
  @UseGuards(JwtAuthGuard, RolesGuard)

    @AdminAccess(AdminModule.INFLUENCERS, AccessType.WRITE)
  // @Post('onboard-influencer')
  // create(@Body() dto: CreateInfluencerDto) {
  //   return this.influencerService.create(dto);
  // }
  @UseGuards(JwtAuthGuard, RolesGuard)

    @AdminAccess(AdminModule.INFLUENCERS, AccessType.READ)
  @Get('all-influencers')
  findAll(@Query('page') page: number, @Query('limit') limit: number) {
    return this.influencerService.findAll(page, limit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)

    @AdminAccess(AdminModule.INFLUENCERS, AccessType.READ)
  @Get('influencer-details/:id')
  findOne(@Param('id') id: string) {
    return this.influencerService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)

    @AdminAccess(AdminModule.INFLUENCERS, AccessType.WRITE)
  @Put('update-influencer/:id')
  updateInfluencer(@Param('id') id: string, @Body() dto: UpdateInfluencerDto) {
    return this.influencerService.updateInfluencer(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)

    @AdminAccess(AdminModule.INFLUENCERS, AccessType.WRITE)
  @Delete('delete-influencer/:id')
  udeleteInfluencer(@Param('id') id: string) {
    return this.influencerService.deleteInfluencer(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INFLUENCER)
  @Get('overview')
  overView(@Req() req: any) {
    return this.influencerService.overview(req.user.influencerId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INFLUENCER)
  @Get('analytics')
  analytics(@Req() req: any, @Query('days') days: number) {
    return this.influencerService.influencerAnalytics(req.user.influencerId, days)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)

    @AdminAccess(AdminModule.INFLUENCERS, AccessType.READ)
  @Get('influencer-requests')
  async getInfluencerRequests(@Query('page') page: number, @Query('limit') limit: number) {
    return await this.influencerService.getAllPendingInfluencersRequests(page, limit)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)

    @AdminAccess(AdminModule.INFLUENCERS, AccessType.WRITE)
  @Put('update-influencer-status/:influencerId')
  async updateInfluencerStatus(@Param('influencerId') influencerId: string, @Body('status') status: InfluencerStatus) {
    return await this.influencerService.changeInfluencerStatus(influencerId, status)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.INFLUENCER)
  @Post('send-influencer-invitation-link')
  async sendInfluencerInvitationLink(@Body('email') email: string, @Body('name') name: string, @Req() req: any) {
    return await this.influencerService.sendInfluencerInvitationLink(email, name, req.user._id)
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INFLUENCER)
  @Post('submit-story')
  async submitStoryLink(@Req() req: any, @Body('storyUrl') storyUrl: string) {
    return await this.influencerService.submitStoryLink(req.user.influencerId, storyUrl);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INFLUENCER)
  @Put('upload-profile-picture')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePicture(@Req() req: any, @UploadedFile() file: any) {
    return await this.influencerService.uploadProfilePicture(req.user.influencerId, file);
  }

  @Get('get-influencer-stories')
  async getPublicStories() {
    return await this.influencerService.getPublicStories();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.INFLUENCER)
  @Delete('delete-story/:storyId')
  async deleteStory(@Req() req: any, @Param('storyId') storyId: string) {
    return await this.influencerService.deleteStory(storyId, req.user.roles, req.user.influencerId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INFLUENCER)
  @Delete('delete-profile-picture')
  async deleteProfilePicture(@Req() req: any) {
    return await this.influencerService.deleteProfilePicture(req.user.influencerId);
  }

}
