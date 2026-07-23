import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ServiceProviderReviewService } from './service-provider-review.service';
import { ApiResponse } from 'src/common/responses/api-response';

@Controller('service-provider-reviews')
export class ServiceProviderReviewController {
  constructor(private readonly serviceProviderReviewService: ServiceProviderReviewService) { }

  // Public/Optional Auth Route
  @Get('provider/:providerId')
  async getProviderReviews(@Param('providerId') providerId: string, @Query('userId') userId?: string) {
    const data = await this.serviceProviderReviewService.getProviderReviews(providerId, userId);
    return ApiResponse.success('Service provider reviews fetched successfully', data);
  }
}
