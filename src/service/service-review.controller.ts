import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ServiceReviewService } from './service-review.service';
import { CreateServiceReviewDto, UpdateServiceReviewDto } from './dto/service-review.dto';

import { UserRole } from 'src/user/schema/user.schema';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiResponse } from 'src/common/responses/api-response';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('service-reviews')
export class ServiceReviewController {
  constructor(private readonly serviceReviewService: ServiceReviewService) { }

  @UseGuards(JwtAuthGuard)
  @Post('add')
  @UseInterceptors(FilesInterceptor('images', 5))
  async createReview(
    @Req() req: any,
    @Body() createReviewDto: CreateServiceReviewDto,
    @UploadedFiles() files: any[],
  ) {
    const review = await this.serviceReviewService.createReview(req.user._id, createReviewDto, files);
    return ApiResponse.success('Review submitted successfully', review);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update/:id')
  @UseInterceptors(FilesInterceptor('images', 5))
  async updateReview(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateServiceReviewDto,
    @UploadedFiles() files: any[],
  ) {
    const review = await this.serviceReviewService.updateReview(req.user._id, id, updateReviewDto, files);
    return ApiResponse.success('Review updated successfully', review);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)

  @AdminAccess(AdminModule.SERVICE_PROVIDERS, AccessType.WRITE)
  @Delete('delete/:id')
  async deleteReview(@Param('id') id: string) {
    const result = await this.serviceReviewService.deleteReview(id);
    return ApiResponse.success(result.message);
  }

  // Public/Optional Auth Route
  @Get('service/:providerId/:serviceId')
  async getServiceReviews(@Param('providerId') providerId: string, @Param('serviceId') serviceId: string, @Query('userId') userId?: string) {
    const data = await this.serviceReviewService.getServiceReviews(providerId, serviceId, userId);
    return ApiResponse.success('Service reviews fetched successfully', data);
  }

  @Get('provider/:providerId')
  async getProviderReviews(@Param('providerId') providerId: string, @Query('userId') userId?: string) {
    const data = await this.serviceReviewService.getProviderReviews(providerId, userId);
    return ApiResponse.success('Provider reviews fetched successfully', data);
  }
}
