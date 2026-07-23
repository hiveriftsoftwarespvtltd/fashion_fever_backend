import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserReview, UserReviewDocument } from './schema/user-review.schema';
import { Product, ProductDocument } from 'src/product/schema/product.schema';
import { VendorOrder, VendorOrderDocument } from 'src/order/schema/vendor-order.schema';
import { CreateReviewDto, UpdateReviewDto } from './dto/reviewDTO';
import { OrderStatus, PaymentStatus } from 'src/order/schema/order.schema';
import { DocumentService } from 'src/document/document.service';

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(UserReview.name)
    private reviewModel: Model<UserReviewDocument>,

    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,

    @InjectModel(VendorOrder.name)
    private vendorOrderModel: Model<VendorOrderDocument>,

    private documentService: DocumentService,
  ) { }

  async createReview(
    userId: string,
    dto: CreateReviewDto,
    files?: any[]
  ) {
    const product = await this.productModel.findById(
      dto.productId,
    );

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // prevent duplicate review
    const existingReview = await this.reviewModel.findOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(dto.productId),
      isDeleted: false,
    });

    if (existingReview) {
      throw new BadRequestException(
        'You already reviewed this product',
      );
    }

    // verified purchase check
    const vendorOrder = await this.vendorOrderModel.findOne({
      userId: new Types.ObjectId(userId),
      orderStatus: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      'items.productId': new Types.ObjectId(dto.productId),
    });

    if (!vendorOrder) {
      throw new BadRequestException(
        'You can only review products that have been delivered and paid for',
      );
    }

    const imageIds: Types.ObjectId[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const uploaded = await this.documentService.upload(file, 'reviews', userId);
        imageIds.push(new Types.ObjectId(uploaded._id as any));
      }
    }

    const review = await this.reviewModel.create({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(dto.productId),
      rating: dto.rating,
      title: dto.title,
      review: dto.review,
      images: imageIds,
      vendorOrderId: new Types.ObjectId(vendorOrder?._id),
      isVerifiedPurchase: !!vendorOrder,
    });

    await this.updateProductRating(dto.productId);

    return review;
  }

  async updateReview(
    userId: string,
    reviewId: string,
    dto: UpdateReviewDto,
    files?: any[]
  ) {
    const review = await this.reviewModel.findOne({
      _id: new Types.ObjectId(reviewId),
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (dto.rating !== undefined) review.rating = dto.rating;
    if (dto.title !== undefined) review.title = dto.title;
    if (dto.review !== undefined) review.review = dto.review;

    if (files && files.length > 0) {
      const imageIds: Types.ObjectId[] = [];
      for (const file of files) {
        const uploaded = await this.documentService.upload(file, 'reviews', userId);
        imageIds.push(new Types.ObjectId(uploaded._id as any));
      }
      review.images = imageIds;
    }

    await review.save();

    await this.updateProductRating(
      review.productId.toString(),
    );

    return review;
  }

  async deleteReview(
    reviewId: string,
  ) {
    const review = await this.reviewModel.findOne({
      _id: new Types.ObjectId(reviewId),
      isDeleted: false,
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    review.isDeleted = true;

    await review.save();

    await this.updateProductRating(
      review.productId.toString(),
    );

    return {
      message: 'Review deleted successfully',
    };
  }

  async getProductReviews(productId: string, userId?: string) {
    const reviews = await this.reviewModel
      .find({
        productId: new Types.ObjectId(productId),
        isDeleted: false,
        isActive: true,
      })
      .populate('userId', 'name avatar')
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

  async updateProductRating(productId: string) {
    const stats = await this.reviewModel.aggregate([
      {
        $match: {
          productId: new Types.ObjectId(productId),
          isDeleted: false,
          isActive: true,
        },
      },

      {
        $group: {
          _id: '$productId',
          averageRating: {
            $avg: '$rating',
          },
          totalReviews: {
            $sum: 1,
          },
        },
      },
    ]);

    const averageRating =
      stats.length > 0
        ? Number(stats[0].averageRating.toFixed(1))
        : 0;

    const totalReviews =
      stats.length > 0
        ? stats[0].totalReviews
        : 0;

    await this.productModel.findByIdAndUpdate(
      productId,
      {
        averageRating,
        totalReviews,
      },
    );
  }
}