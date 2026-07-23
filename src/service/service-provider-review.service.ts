import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ServiceReview, ServiceReviewDocument } from './schema/service-review.schema';

@Injectable()
export class ServiceProviderReviewService {
  constructor(
    @InjectModel(ServiceReview.name) private reviewModel: Model<ServiceReviewDocument>,
  ) { }

  async getProviderReviews(providerId: string, userId?: string) {
    const reviews = await this.reviewModel
      .find({
        serviceProviderId: new Types.ObjectId(providerId),
      })
      .populate('userId', 'name avatar')
      .populate('serviceId', 'title')
      .populate('images')
      .sort({ createdAt: -1 })
      .lean();

    let isReviewed = false;
    let userReview: any = null;

    if (userId) {
      userReview = reviews.find(r => r.userId?._id?.toString() === userId.toString()) || null;
      if (userReview) {
        isReviewed = true;
      }
    }

    return {
      isReviewed,
      userReview,
      reviews,
    };
  }
}
