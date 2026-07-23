import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { ServiceReview, ServiceReviewDocument } from './schema/service-review.schema';
import { ServiceBooking, ServiceBookingDocument, BookingStatus, BookingPaymentStatus } from './schema/service-booking.schema';
import { Service, ServiceDocument } from './schema/service.schema';
import { ServiceProvider, ServiceProviderDocument } from './schema/service-provider.schema';
import { CreateServiceReviewDto, UpdateServiceReviewDto } from './dto/service-review.dto';
import { DocumentService } from 'src/document/document.service';

@Injectable()
export class ServiceReviewService {
  constructor(
    @InjectModel(ServiceReview.name) private reviewModel: Model<ServiceReviewDocument>,
    @InjectModel(ServiceBooking.name) private bookingModel: Model<ServiceBookingDocument>,
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
    @InjectModel(ServiceProvider.name) private providerModel: Model<ServiceProviderDocument>,
    private documentService: DocumentService,
    @InjectConnection() private connection: Connection,
  ) { }

  async createReview(userId: string, dto: CreateServiceReviewDto, files?: any[]) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const booking = await this.bookingModel.findOne({
        _id: new Types.ObjectId(dto.bookingId),
        userId: new Types.ObjectId(userId),
        providerId: new Types.ObjectId(dto.serviceProviderId),
        bookingStatus: BookingStatus.COMPLETED,
        paymentStatus: BookingPaymentStatus.PAID,
      }).session(session);

      if (!booking) {
        throw new BadRequestException('You can only review services that have been completed and paid for.');
      }

      // Check if all requested services exist in the booking
      const bookedServiceIds = booking.items.map(item => item.serviceId.toString());
      if (!dto.services || dto.services.length === 0) {
        throw new BadRequestException('No services provided for review.');
      }
      for (const service of dto.services) {
        if (!bookedServiceIds.includes(service.serviceId)) {
          throw new BadRequestException(`Service ${service.serviceId} is not part of this booking.`);
        }
      }

      // Check for duplicate review
      const serviceIdsToReview = dto.services.map(s => new Types.ObjectId(s.serviceId));
      const existingReviews = await this.reviewModel.find({
        userId: new Types.ObjectId(userId),
        bookingId: new Types.ObjectId(dto.bookingId),
        serviceId: { $in: serviceIdsToReview },
      }).session(session);

      if (existingReviews.length > 0) {
        throw new BadRequestException('You have already reviewed one or more of these services.');
      }

      const imageIds: Types.ObjectId[] = [];
      if (files && files.length > 0) {
        for (const file of files) {
          const uploaded = await this.documentService.upload(file, 'service-reviews', userId);
          imageIds.push(new Types.ObjectId(uploaded._id as any));
        }
      }

      const reviewDocs = dto.services.map(serviceReview => ({
        userId: new Types.ObjectId(userId),
        bookingId: new Types.ObjectId(dto.bookingId),
        serviceId: new Types.ObjectId(serviceReview.serviceId),
        serviceProviderId: new Types.ObjectId(dto.serviceProviderId),
        providerRating: dto.providerRating,
        providerReview: dto.providerReview,
        serviceRating: serviceReview.serviceRating,
        serviceReview: serviceReview.serviceReview,
        images: imageIds,
      }));

      const reviews = await this.reviewModel.insertMany(reviewDocs, { session });

      for (const service of dto.services) {
        await this.updateRatings(service.serviceId, dto.serviceProviderId, session);
      }

      await session.commitTransaction();
      return reviews;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async updateReview(userId: string, targetId: string, dto: UpdateServiceReviewDto, files?: any[]) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      // Try to find if targetId is a reviewId
      const reviewByTarget = await this.reviewModel.findOne({
        _id: new Types.ObjectId(targetId),
        userId: new Types.ObjectId(userId),
      }).session(session);

      let bookingIdToUse = new Types.ObjectId(targetId);
      if (reviewByTarget) {
        bookingIdToUse = reviewByTarget.bookingId;
      }

      // Fetch all reviews for this booking
      const reviews = await this.reviewModel.find({
        bookingId: bookingIdToUse,
        userId: new Types.ObjectId(userId),
      }).session(session);

      if (reviews.length === 0) {
        throw new NotFoundException('Review(s) not found');
      }

      let imageIds: Types.ObjectId[] | undefined;
      if (files && files.length > 0) {
        imageIds = [];
        for (const file of files) {
          const uploaded = await this.documentService.upload(file, 'service-reviews', userId);
          imageIds.push(new Types.ObjectId(uploaded._id as any));
        }
      }

      // Apply general provider updates to all matched reviews
      for (const review of reviews) {
        let hasChanges = false;
        if (dto.providerRating !== undefined) {
          review.providerRating = dto.providerRating;
          hasChanges = true;
        }
        if (dto.providerReview !== undefined) {
          review.providerReview = dto.providerReview;
          hasChanges = true;
        }
        if (imageIds) {
          review.images = imageIds;
          hasChanges = true;
        }

        if (hasChanges) {
          await review.save({ session });
        }
      }

      // Apply service specific updates
      if (dto.services && dto.services.length > 0) {
        for (const serviceUpdate of dto.services) {
          const reviewToUpdate = reviews.find(r => r.serviceId.toString() === serviceUpdate.serviceId);
          if (reviewToUpdate) {
            if (serviceUpdate.serviceRating !== undefined) reviewToUpdate.serviceRating = serviceUpdate.serviceRating;
            if (serviceUpdate.serviceReview !== undefined) reviewToUpdate.serviceReview = serviceUpdate.serviceReview;
            await reviewToUpdate.save({ session });
          }
        }
      }

      const providerId = reviews[0].serviceProviderId.toString();
      const serviceIds = [...new Set(reviews.map(r => r.serviceId.toString()))];
      for (const sId of serviceIds) {
        await this.updateRatings(sId, providerId, session);
      }

      await session.commitTransaction();
      return reviews;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async deleteReview(reviewId: string) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const review = await this.reviewModel.findOne({
        _id: new Types.ObjectId(reviewId),
      }).session(session);

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      // Delete media
      if (review.images && review.images.length > 0) {
        for (const mediaId of review.images) {
          await this.documentService.deleteMedia(mediaId.toString());
        }
      }

      await review.deleteOne({ session });

      await this.updateRatings(review.serviceId.toString(), review.serviceProviderId.toString(), session);

      await session.commitTransaction();
      return { message: 'Review deleted successfully' };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getServiceReviews(providerId: string, serviceId: string, userId?: string) {
    const reviews = await this.reviewModel
      .find({
        serviceId: new Types.ObjectId(serviceId),
        serviceProviderId: new Types.ObjectId(providerId),
      })
      .populate('userId', 'name avatar')
      .populate('images', 'url _id publicId')
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

  async getProviderReviews(providerId: string, userId?: string) {
    const reviews = await this.reviewModel
      .find({
        serviceProviderId: new Types.ObjectId(providerId),
      })
      .populate('userId', 'name avatar')
      .populate('serviceId', 'title images')
      .populate('images', 'url _id publicId')
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

  private async updateRatings(serviceId: string, providerId: string, session?: any) {
    // Update Service Rating
    const serviceStats = await this.reviewModel.aggregate([
      { $match: { serviceId: new Types.ObjectId(serviceId) } },
      {
        $group: {
          _id: '$serviceId',
          averageRating: { $avg: '$serviceRating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]).session(session);

    const serviceAverage = serviceStats.length > 0 ? Number(serviceStats[0].averageRating.toFixed(1)) : 0;
    const serviceTotal = serviceStats.length > 0 ? serviceStats[0].totalReviews : 0;

    await this.serviceModel.findByIdAndUpdate(serviceId, {
      averageRating: serviceAverage,
      totalReviews: serviceTotal,
    }, { session });

    // Update Provider Rating
    const providerStats = await this.reviewModel.aggregate([
      { $match: { serviceProviderId: new Types.ObjectId(providerId) } },
      {
        $group: {
          _id: '$serviceProviderId',
          averageRating: { $avg: '$providerRating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]).session(session);

    const providerAverage = providerStats.length > 0 ? Number(providerStats[0].averageRating.toFixed(1)) : 0;
    const providerTotal = providerStats.length > 0 ? providerStats[0].totalReviews : 0;

    await this.providerModel.findByIdAndUpdate(providerId, {
      rating: providerAverage,
      totalReviews: providerTotal,
    }, { session });
  }
}
