import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { NotFoundError } from 'rxjs';
import { ApiResponse } from 'src/common/responses/api-response';
import { DocumentService } from 'src/document/document.service';
import {
  Order,
  OrderDocument,
  OrderStatus,
  // PaymentMethod,
  PaymentStatus,
} from 'src/order/schema/order.schema';
import { Category, CategoryDocument } from 'src/product/schema/category.schema';
import {
  ProductVariant,
  ProductVariantDocument,
} from 'src/product/schema/product-variant.schema';
import { Product, ProductDocument } from 'src/product/schema/product.schema';
import { User, UserDocument, UserRole, RoleStatus } from 'src/user/schema/user.schema';
import {
  Vendor,
  VendorDocument,
  VendorSchema,
} from 'src/vendor/schema/vendor.schema';
import {
  UpdateVendorDTO,
  updateVendorPayoutDTO,
  vendorPayDTO,
} from './dto/vendor.dto';
// import { CreateCategory } from 'src/product/dto/create-category.dto';
import { CreateCategoryDTO, UpdateCategoryDTO } from './dto/category.dto';
import { Connection } from 'mongoose';
import {
  VendorOrder,
  VendorOrderDocument,
} from 'src/order/schema/vendor-order.schema';
import {
  InfluencerCommission,
  InfluencerCommissionDocument,
} from 'src/influencer/schema/influencer-commision-rate.schema';
import {
  PaymentMethod,
  VendorPayout,
  VendorPayoutDocument,
  VendorPayoutStatus,
} from 'src/vendor/schema/vendor-payout.schema';
import {
  InfluencerCommissionSlabDocument,
  influencerCommissonSlab,
} from 'src/influencer/schema/influencer-commission-slab';
import { Influencer, InfluencerDocument } from 'src/influencer/schema/influencer.schema';
import { InfluencerPayout, InfluencerPayoutDocument } from 'src/influencer/schema/influencer-payout.schema';
import { ServiceProvider, ServiceProviderDocument } from 'src/service/schema/service-provider.schema';
import { Cart, CartDocument } from 'src/cart/schema/cart.schema';
import { ServiceBooking, ServiceBookingDocument } from 'src/service/schema/service-booking.schema';
import { CoursePurchase, CoursePurchaseDocument } from 'src/courses/schema/course-purchase.schema';
import { UserWallet, UserWalletDocument } from 'src/wallet/schema/user/user.wallet.schema';
import { Wishlist, WishlistDocument } from 'src/wishlist/schema/wishlist.schema';
import { WalletTransaction, WalletTransactionDocument } from 'src/wallet/schema/user/user.wallet.transactions';
import { Educator, EducatorDocument } from 'src/courses/schema/educator.schema';
import { Course, CourseDocument } from 'src/courses/schema/course.schema';
import { CourseEnrollment, CourseEnrollmentDocument } from 'src/courses/schema/course-enrollement.schema';
import { ServiceQuotation, ServiceQuotationDocument } from 'src/service/schema/service-quotation.schema';
import { ProviderSubscription, ProviderSubscriptionDocument } from 'src/service/schema/provider-subscription.schema';
import { ServiceReview, ServiceReviewDocument } from 'src/service/schema/service-review.schema';
import { Service, ServiceDocument } from 'src/service/schema/service.schema';
import { ServiceStaff, ServiceStaffDocument } from 'src/service/schema/service-staff.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(ProductVariant.name)
    private productVariantModel: Model<ProductVariantDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,

    @InjectConnection()
    private readonly connection: Connection,

    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private documentService: DocumentService,

    @InjectModel(VendorOrder.name)
    private vendorOrderModel: Model<VendorOrderDocument>,
    @InjectModel(InfluencerCommission.name)
    private influencerCommisionModel: Model<InfluencerCommissionDocument>,
    @InjectModel(VendorPayout.name)
    private vendorPayoutModel: Model<VendorPayoutDocument>,
    @InjectModel(influencerCommissonSlab.name)
    private influencerCommissionSlabModel: Model<InfluencerCommissionSlabDocument>,
    @InjectModel(Influencer.name) private influencerModel: Model<InfluencerDocument>,
    @InjectModel(InfluencerPayout.name) private influencerPayoutModel: Model<InfluencerPayoutDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(ServiceStaff.name) private serviceStaffModel: Model<ServiceStaffDocument>,
    @InjectModel(ServiceBooking.name) private serviceBookingModel: Model<ServiceBookingDocument>,
    @InjectModel(CoursePurchase.name) private coursePurchaseModel: Model<CoursePurchaseDocument>,
    @InjectModel(UserWallet.name) private userWalletModel: Model<UserWalletDocument>,
    @InjectModel(Wishlist.name) private wishlistModel: Model<WishlistDocument>,
    @InjectModel(WalletTransaction.name) private walletTransactionModel: Model<WalletTransactionDocument>,
    @InjectModel(Educator.name) private educatorModel: Model<EducatorDocument>,
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    @InjectModel(CourseEnrollment.name) private courseEnrollmentModel: Model<CourseEnrollmentDocument>,
    @InjectModel(ServiceProvider.name) private serviceProviderModel: Model<ServiceProviderDocument>,
    @InjectModel(ServiceQuotation.name) private serviceQuotationModel: Model<ServiceQuotationDocument>,
    @InjectModel(ProviderSubscription.name) private providerSubscriptionModel: Model<ProviderSubscriptionDocument>,
    @InjectModel(ServiceReview.name) private serviceReviewModel: Model<ServiceReviewDocument>,
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>
  ) { }

  async fetchAllVendors(page?: number, limit?: number, search?: string) {
    const pageNumber = Number(page) || 1;
    const pageSize = Number(limit) || 10;
    const skip = (pageNumber - 1) * pageSize;

    const filter: any = { roles: UserRole.VENDOR };
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const [data, total] = await Promise.all([
      this.userModel
        .find(filter)
        .populate('vendorId')
        .skip(skip)
        .limit(pageSize)
        .lean(),
      this.userModel.countDocuments(filter),
    ]);

    return { data, total, page: pageNumber, limit: pageSize };
  }

  async fetchAllUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    return await this.userModel
      .find({ role: UserRole.USER })
      .select('-password')
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async fetchVendorDetails(vendorId: string) {
    const vendor = await this.vendorModel
      .findById(vendorId)
      .populate('ownerId', '-password -otpExpiresAt -otp')
      .lean();

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const vendorProducts = await this.productModel.find({
      vendorId: new Types.ObjectId(vendorId),
      isDeleted: false,
    });

    // const vendorCategories = await this.categoryModel.find({
    //   vendorId: new Types.ObjectId(vendorId),
    //   isDeleted: false,
    // });

    return {
      vendor,
      vendorProducts,
      // vendorCategories,
    };
  }

  async fetchUserDetails(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password')
      .lean();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async deleteUser(userId: string) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const user = await this.userModel.findById(userId, null, { session }).select('-password');
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check essential data
      const ordersCount = await this.orderModel.countDocuments({ userId: user._id }).session(session);
      const bookingsCount = await this.serviceBookingModel.countDocuments({ userId: user._id }).session(session);
      const coursesCount = await this.coursePurchaseModel.countDocuments({ learnerId: user._id }).session(session);

      let hasWalletTxs = false;
      const wallet = await this.userWalletModel.findOne({ userId: user._id }, null, { session });
      if (wallet && (wallet.totalCredits > 0 || wallet.totalDebits > 0)) {
        hasWalletTxs = true;
      } else {
        const txsCount = await this.walletTransactionModel.countDocuments({ userId: user._id }).session(session);
        if (txsCount > 0) hasWalletTxs = true;
      }

      if (ordersCount > 0 || bookingsCount > 0 || coursesCount > 0 || hasWalletTxs) {
        // Soft delete
        user.isDeleted = true;
        user.isActive = false;
        await user.save({ session });

        if (!user.isVendorOnboardingCompleted && user.vendorId) {
          await this.vendorModel.findByIdAndUpdate(user.vendorId, { isDeleted: true, isActive: false }, { session });
        }
        if (!user.isServiceProviderOnboardingCompleted && user.serviceProviderId) {
          await this.serviceProviderModel.findByIdAndUpdate(user.serviceProviderId, { isDeleted: true, isActive: false }, { session });
        }
        if (!user.isInfluencerOnboardingCompleted && user.influencerId) {
          await this.influencerModel.findByIdAndUpdate(user.influencerId, { isDeleted: true, isActive: false }, { session });
        }
        if (!user.isEducatorOnboardingCompleted && user.educatorId) {
          await this.educatorModel.findByIdAndUpdate(user.educatorId, { isDeleted: true, isActive: false }, { session });
        }

        await session.commitTransaction();
        return { message: 'User soft deleted successfully due to existing essential data' };
      } else {
        // Hard delete
        await this.cartModel.deleteMany({ userId: user._id }, { session });
        await this.wishlistModel.deleteMany({ userId: user._id }, { session });

        if (!user.isVendorOnboardingCompleted && user.vendorId) {
          await this.vendorModel.findByIdAndDelete(user.vendorId, { session });
        }
        if (!user.isServiceProviderOnboardingCompleted && user.serviceProviderId) {
          await this.serviceProviderModel.findByIdAndDelete(user.serviceProviderId, { session });
        }
        if (!user.isInfluencerOnboardingCompleted && user.influencerId) {
          await this.influencerModel.findByIdAndDelete(user.influencerId, { session });
        }
        if (!user.isEducatorOnboardingCompleted && user.educatorId) {
          await this.educatorModel.findByIdAndDelete(user.educatorId, { session });
        }

        await user.deleteOne({ session });
        await session.commitTransaction();

        if (user.avatar) {
          try {
            await this.documentService.deleteMedia(user.avatar.toString());
          } catch (error: any) {
            console.log('Failed to delete avatar media:', error.message);
          }
        }
        return { message: 'User hard deleted successfully' };
      }
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async deleteVendor(vendorId: string) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const vendor = await this.vendorModel.findById(vendorId, null, { session });
      if (!vendor) {
        throw new NotFoundException('Vendor not found');
      }

      // Check vendor essential data
      const vendorOrdersCount = await this.vendorOrderModel.countDocuments({ vendorId: vendor._id }).session(session);
      const payoutsCount = await this.vendorPayoutModel.countDocuments({ vendorId: vendor._id }).session(session);

      if (vendorOrdersCount > 0 || payoutsCount > 0) {
        // Soft delete vendor
        vendor.isDeleted = true;
        vendor.isActive = false;
        await vendor.save({ session });

        // Soft delete linked user
        const linkedUser = await this.userModel.findOne({ vendorId: vendor._id }, null, { session });
        if (linkedUser) {
          linkedUser.isDeleted = true;
          linkedUser.isActive = false;
          await linkedUser.save({ session });
        }

        // Soft delete related products and variants
        await this.productModel.updateMany(
          { vendorId: vendor._id },
          { $set: { isDeleted: true, isActive: false } },
          { session }
        );
        const products = await this.productModel.find({ vendorId: vendor._id }, null, { session });
        const productIds = products.map(p => p._id);
        if (productIds.length > 0) {
          await this.productVariantModel.updateMany(
            { productId: { $in: productIds } },
            { $set: { isDeleted: true, isActive: false } },
            { session }
          );
        }

        await session.commitTransaction();
        return { message: 'Vendor and linked user soft deleted successfully due to existing essential data' };
      } else {
        // Hard delete vendor
        const mediaIdsToDelete: string[] = [];

        // 1. Delete vendor's products, product variants and their media
        const products = await this.productModel.find({ vendorId: vendor._id }, null, { session });
        for (const product of products) {
          const variants = await this.productVariantModel.find({ productId: product._id }, null, { session });
          for (const variant of variants) {
            if (variant.thumbnail) {
              mediaIdsToDelete.push(variant.thumbnail.toString());
            }
            if (variant.images?.length) {
              mediaIdsToDelete.push(...variant.images.map(img => img.toString()));
            }
            await variant.deleteOne({ session });
          }
          await product.deleteOne({ session });
        }

        // 2. Delete vendor's logo and banner
        if (vendor.logo) {
          mediaIdsToDelete.push(vendor.logo.toString());
        }
        if (vendor.banner) {
          mediaIdsToDelete.push(vendor.banner.toString());
        }

        // 3. Delete vendor document
        await vendor.deleteOne({ session });

        // 4. Handle linked user
        const linkedUser = await this.userModel.findOne({ vendorId: vendor._id }, null, { session });
        if (linkedUser) {
          // Check if linked user has their own essential data
          const ordersCount = await this.orderModel.countDocuments({ userId: linkedUser._id }).session(session);
          const bookingsCount = await this.serviceBookingModel.countDocuments({ userId: linkedUser._id }).session(session);
          const coursesCount = await this.coursePurchaseModel.countDocuments({ learnerId: linkedUser._id }).session(session);

          let hasWalletTxs = false;
          const wallet = await this.userWalletModel.findOne({ userId: linkedUser._id }, null, { session });
          if (wallet && (wallet.totalCredits > 0 || wallet.totalDebits > 0)) {
            hasWalletTxs = true;
          } else {
            const txsCount = await this.walletTransactionModel.countDocuments({ userId: linkedUser._id }).session(session);
            if (txsCount > 0) hasWalletTxs = true;
          }

          if (ordersCount > 0 || bookingsCount > 0 || coursesCount > 0 || hasWalletTxs) {
            linkedUser.isDeleted = true;
            await linkedUser.save({ session });
          } else {
            // Hard delete linked user
            await this.cartModel.deleteMany({ userId: linkedUser._id }, { session });
            await this.wishlistModel.deleteMany({ userId: linkedUser._id }, { session });
            if (linkedUser.avatar) {
              mediaIdsToDelete.push(linkedUser.avatar.toString());
            }
            await linkedUser.deleteOne({ session });
          }
        }

        await session.commitTransaction();

        // Delete media outside of transaction
        await Promise.allSettled(
          mediaIdsToDelete.map((id) => this.documentService.deleteMedia(id).catch(() => { }))
        );

        return { message: 'Vendor and linked user hard deleted successfully' };
      }
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async deleteInfluencer(influencerId: string) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const influencer = await this.influencerModel.findById(influencerId, null, { session });
      if (!influencer) {
        throw new NotFoundException('Influencer not found');
      }

      let hasEssentialData = false;
      const payoutsCount = await this.influencerPayoutModel.countDocuments({ influencerId: influencer._id }).session(session);
      if (payoutsCount > 0) hasEssentialData = true;

      const orderCount = await this.orderModel.countDocuments({
        'appliedCoupon.influencerId': influencer._id,
        orderStatus: { $ne: OrderStatus.CANCELLED }
      }).session(session);
      if (orderCount > 0) hasEssentialData = true;


      if (hasEssentialData) {
        influencer.isDeleted = true;
        influencer.isActive = false;
        await influencer.save({ session });

        const linkedUser = await this.userModel.findById(influencer.userId, null, { session });
        if (linkedUser) {
          linkedUser.isDeleted = true;
          linkedUser.isActive = false;
          await linkedUser.save({ session });
        }
        await session.commitTransaction();
        return { message: 'Influencer and linked user soft deleted successfully due to existing essential data' };
      } else {
        await influencer.deleteOne({ session });

        const linkedUser = await this.userModel.findById(influencer.userId, null, { session });
        if (linkedUser) {
          const userOrders = await this.orderModel.countDocuments({ userId: linkedUser._id }).session(session);
          const userBookings = await this.serviceBookingModel.countDocuments({ userId: linkedUser._id }).session(session);
          const userCourses = await this.coursePurchaseModel.countDocuments({ learnerId: linkedUser._id }).session(session);
          let userWalletTxs = false;
          const uWallet = await this.userWalletModel.findOne({ userId: linkedUser._id }, null, { session });
          if (uWallet && (uWallet.totalCredits > 0 || uWallet.totalDebits > 0)) {
            userWalletTxs = true;
          } else {
            const txsCount = await this.walletTransactionModel.countDocuments({ userId: linkedUser._id }).session(session);
            if (txsCount > 0) userWalletTxs = true;
          }

          if (userOrders > 0 || userBookings > 0 || userCourses > 0 || userWalletTxs) {
            linkedUser.isDeleted = true;
            await linkedUser.save({ session });
          } else {
            await this.cartModel.deleteMany({ userId: linkedUser._id }, { session });
            await this.wishlistModel.deleteMany({ userId: linkedUser._id }, { session });
            const mediaToDelete: string[] = [];
            if (linkedUser.avatar) mediaToDelete.push(linkedUser.avatar.toString());
            await linkedUser.deleteOne({ session });

            await session.commitTransaction();
            await Promise.allSettled(
              mediaToDelete.map(id => this.documentService.deleteMedia(id).catch(() => { }))
            );
            return { message: 'Influencer and linked user hard deleted successfully' };
          }
        }
        await session.commitTransaction();
        return { message: 'Influencer hard deleted successfully' };
      }
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async deleteEducator(educatorId: string) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const educator = await this.educatorModel.findById(educatorId, null, { session });
      if (!educator) {
        throw new NotFoundException('Educator not found');
      }

      let hasEssentialData = false;

      const courses = await this.courseModel.find({ educatorId: educator._id }, null, { session });
      const courseIds = courses.map(c => c._id);

      if (courseIds.length > 0) {
        const enrollmentsCount = await this.courseEnrollmentModel.countDocuments({ courseId: { $in: courseIds } }).session(session);
        const purchasesCount = await this.coursePurchaseModel.countDocuments({ courseId: { $in: courseIds } }).session(session);
        if (enrollmentsCount > 0 || purchasesCount > 0) hasEssentialData = true;
      }

      if (hasEssentialData) {
        educator.isDeleted = true;
        educator.isActive = false;
        await educator.save({ session });

        const linkedUser = await this.userModel.findById(educator.userId, null, { session });
        if (linkedUser) {
          linkedUser.isDeleted = true;
          linkedUser.isActive = false;
          await linkedUser.save({ session });
        }

        await this.courseModel.updateMany(
          { educatorId: educator._id },
          { $set: { isDeleted: true, isActive: false } },
          { session }
        );

        await session.commitTransaction();
        return { message: 'Educator and linked user soft deleted successfully due to existing essential data' };
      } else {
        const mediaToDelete: string[] = [];

        for (const course of courses) {
          if (course.thumbnail) mediaToDelete.push(course.thumbnail.toString());
          await course.deleteOne({ session });
        }

        if (educator.profileImage) mediaToDelete.push(educator.profileImage.toString());
        await educator.deleteOne({ session });

        const linkedUser = await this.userModel.findById(educator.userId, null, { session });
        if (linkedUser) {
          const userOrders = await this.orderModel.countDocuments({ userId: linkedUser._id }).session(session);
          const userBookings = await this.serviceBookingModel.countDocuments({ userId: linkedUser._id }).session(session);
          const userCourses = await this.coursePurchaseModel.countDocuments({ learnerId: linkedUser._id }).session(session);
          let userWalletTxs = false;
          const uWallet = await this.userWalletModel.findOne({ userId: linkedUser._id }, null, { session });
          if (uWallet && (uWallet.totalCredits > 0 || uWallet.totalDebits > 0)) {
            userWalletTxs = true;
          } else {
            const txsCount = await this.walletTransactionModel.countDocuments({ userId: linkedUser._id }).session(session);
            if (txsCount > 0) userWalletTxs = true;
          }

          if (userOrders > 0 || userBookings > 0 || userCourses > 0 || userWalletTxs) {
            linkedUser.isDeleted = true;
            linkedUser.isActive = false;
            await linkedUser.save({ session });
          } else {
            await this.cartModel.deleteMany({ userId: linkedUser._id }, { session });
            await this.wishlistModel.deleteMany({ userId: linkedUser._id }, { session });
            if (linkedUser.avatar) mediaToDelete.push(linkedUser.avatar.toString());
            await linkedUser.deleteOne({ session });
          }
        }

        await session.commitTransaction();

        await Promise.allSettled(
          mediaToDelete.map(id => this.documentService.deleteMedia(id).catch(() => { }))
        );
        return { message: 'Educator and linked user hard deleted successfully' };
      }
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async deleteServiceProvider(serviceProviderId: string) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const provider = await this.serviceProviderModel.findById(serviceProviderId, null, { session });
      if (!provider) {
        throw new NotFoundException('Service provider not found');
      }

      let hasEssentialData = false;
      const subsCount = await this.providerSubscriptionModel.countDocuments({ providerId: provider._id }).session(session);
      const quotesCount = await this.serviceQuotationModel.countDocuments({ providerId: provider._id }).session(session);
      const bookingsCount = await this.serviceBookingModel.countDocuments({ providerId: provider._id }).session(session);
      const reviewsCount = await this.serviceReviewModel.countDocuments({ serviceProviderId: provider._id }).session(session);

      if (subsCount > 0 || quotesCount > 0 || bookingsCount > 0 || reviewsCount > 0) hasEssentialData = true;


      if (hasEssentialData) {
        provider.isDeleted = true;
        provider.isActive = false;
        await provider.save({ session });

        const linkedUser = await this.userModel.findById(provider.userId, null, { session });
        if (linkedUser) {
          linkedUser.isDeleted = true;
          linkedUser.isActive = false;
          await linkedUser.save({ session });
        }

        await this.serviceModel.updateMany(
          { providerId: provider._id },
          { $set: { isDeleted: true, isActive: false } },
          { session }
        );

        await session.commitTransaction();
        return { message: 'Service Provider and linked user soft deleted successfully due to existing essential data' };
      } else {
        const mediaToDelete: string[] = [];

        const services = await this.serviceModel.find({ providerId: provider._id }, null, { session });
        for (const service of services) {
          if (service.images && service.images.length > 0) {
            mediaToDelete.push(...service.images.map(i => i.toString()));
          }
          await service.deleteOne({ session });
        }

        const staffMembers = await this.serviceStaffModel.find({ providerId: provider._id }, null, { session });
        for (const staff of staffMembers) {
          if (staff.image) mediaToDelete.push(staff.image.toString());
          await staff.deleteOne({ session });
        }

        await provider.deleteOne({ session });

        const linkedUser = await this.userModel.findById(provider.userId, null, { session });
        if (linkedUser) {
          const userOrders = await this.orderModel.countDocuments({ userId: linkedUser._id }).session(session);
          const userBookings = await this.serviceBookingModel.countDocuments({ userId: linkedUser._id }).session(session);
          const userCourses = await this.coursePurchaseModel.countDocuments({ learnerId: linkedUser._id }).session(session);
          let userWalletTxs = false;
          const uWallet = await this.userWalletModel.findOne({ userId: linkedUser._id }, null, { session });
          if (uWallet && (uWallet.totalCredits > 0 || uWallet.totalDebits > 0)) {
            userWalletTxs = true;
          } else {
            const txsCount = await this.walletTransactionModel.countDocuments({ userId: linkedUser._id }).session(session);
            if (txsCount > 0) userWalletTxs = true;
          }

          if (userOrders > 0 || userBookings > 0 || userCourses > 0 || userWalletTxs) {
            linkedUser.isDeleted = true;
            linkedUser.isActive = false;
            await linkedUser.save({ session });
          } else {
            await this.cartModel.deleteMany({ userId: linkedUser._id }, { session });
            await this.wishlistModel.deleteMany({ userId: linkedUser._id }, { session });
            if (linkedUser.avatar) mediaToDelete.push(linkedUser.avatar.toString());
            await linkedUser.deleteOne({ session });
          }
        }

        await session.commitTransaction();

        await Promise.allSettled(
          mediaToDelete.map(id => this.documentService.deleteMedia(id).catch(() => { }))
        );
        return { message: 'Service Provider and linked user hard deleted successfully' };
      }
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async toggleActiveUser(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = !user.isActive;

    await user.save();

    return {
      message: `User ${user.isActive ? 'activated' : 'deactivated'
        } successfully`,
      user,
    };
  }

  // async toggleActiveVendor(vendorId: string) {
  //   const vendor = await this.vendorModel.findById(vendorId);

  //   if (!vendor) {
  //     throw new NotFoundException('Vendor not found');
  //   }

  //   const user = await this.userModel.findOne({ vendorId:new Types.ObjectId(vendor) });
  //   if (!user) {
  //     throw new NotFoundException('User Not found');
  //   }

  //   vendor.isActive = !vendor.isActive;
  //   user.isActive = !user.isActive;
  //   user.isVendorOnboardingCompleted = false;

  //   await vendor.save();
  //   user.save();

  //   return {
  //     message: `Vendor ${
  //       vendor.isActive ? 'activated' : 'deactivated'
  //     } successfully`,
  //     vendor,
  //   };
  // }

  async toggleActiveVendor(vendorId: string) {
    const vendor = await this.vendorModel.findById(vendorId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const newStatus = !vendor.isActive;

    await this.vendorModel.updateOne(
      { _id: vendorId },
      { $set: { isActive: newStatus } },
    );

    await this.userModel.updateOne(
      { vendorId: new Types.ObjectId(vendorId) },
      {
        $set: {
          isActive: newStatus,
          isVendorOnboardingCompleted: false,
        },
      },
    );

    return {
      message: `Vendor ${newStatus ? 'activated' : 'deactivated'} successfully`,
    };
  }

  async fetchPendingVendors(page?: number, limit?: number, search?: string) {
    const pageNumber = Number(page) || 1;
    const pageSize = Number(limit) || 10;
    const skip = (pageNumber - 1) * pageSize;

    const filter: any = { status: 'PENDING' };
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { businessName: regex },
        { businessEmail: regex },
        { businessPhone: regex },
      ];
    }

    const [data, total] = await Promise.all([
      this.vendorModel
        .find(filter)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      this.vendorModel.countDocuments(filter),
    ]);

    return { data, total, page: pageNumber, limit: pageSize };
  }

  async acceptPendingVendor(vendorId: string) {
    const vendor = await this.vendorModel.findById(vendorId);
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (vendor.status === 'APPROVED') {
      throw new ConflictException('this vendor already approved');
    }

    const user = await this.userModel.findOne({ vendorId: new Types.ObjectId(vendorId) })
    if (!user) {
      throw new NotFoundException("User Not Exist")
    }

    vendor.status = 'APPROVED';
    await vendor.save();

    user.roleStatus.set(UserRole.VENDOR, RoleStatus.APPROVED);
    if (!user.roles.includes(UserRole.VENDOR)) {
      user.roles.push(UserRole.VENDOR);
    }
    await user.save();


    return vendor;
  }

  async rejectPendingVendor(vendorId: string) {
    const vendor = await this.vendorModel.findById(vendorId);
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (vendor.status === 'REJECTED') {
      throw new ConflictException('this vendor is already rejected');
    }

    vendor.status = 'REJECTED';
    await vendor.save();

    const user = await this.userModel.findOne({ vendorId });
    if (user) {
      user.roleStatus.set(UserRole.VENDOR, RoleStatus.REJECTED);
      await user.save();
    }

    return vendor;
  }

  async deleteVendorProduct(vendorId: string, productId: string) {
    let targetProductId = productId;
    if (!targetProductId || targetProductId === 'undefined' || targetProductId === 'null') {
      targetProductId = vendorId;
    }
    if (vendorId === '[object Object]' || vendorId === 'undefined' || vendorId === 'null') {
      targetProductId = productId || vendorId;
    }

    if (!targetProductId || !Types.ObjectId.isValid(targetProductId)) {
      throw new BadRequestException('Invalid Product ID');
    }

    const product = await this.productModel.findById(targetProductId);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const isOrdered = await this.vendorOrderModel.exists({
      'items.productId': product._id,
    });

    // fetch all variants
    const variants = await this.productVariantModel.find({
      productId: product._id,
    });

    if (isOrdered) {
      product.isDeleted = true;
      product.isActive = false;
      await product.save();
      for (const variant of variants) {
        variant.isDeleted = true;
        variant.isActive = false;
        await variant.save();
      }
      return ApiResponse.success('Product soft deleted because it was ordered previously', null);
    }

    // delete media + variants safely
    for (const variant of variants) {
      // delete thumbnail
      if (variant.thumbnail) {
        try {
          await this.documentService.deleteMedia(variant.thumbnail.toString());
        } catch (_) {}
      }

      // delete images
      if (variant.images?.length) {
        for (const imageId of variant.images) {
          try {
            await this.documentService.deleteMedia(imageId.toString());
          } catch (_) {}
        }
      }

      // delete variant
      try {
        await variant.deleteOne();
      } catch (_) {}
    }

    // delete product
    await product.deleteOne();

    return ApiResponse.success('Product deleted successfully', null);
  }

  async fetchProducts(page?: number, limit?: number) {
    const pageNumber = Number(page) || 1;
    const pageSize = Number(limit) || 10;
    const skip = (pageNumber - 1) * pageSize;

    const products = await this.productModel
      .find({}).populate([
        {
          path: 'vendorId', select: 'businessName location vendorPincode',
          populate: [
            { path: 'logo', select: 'url publicId _id' },
            { path: 'banner', select: 'url publicId _id' },
            { path: 'ownerId', select: '_id name email phone roles' }
          ]
        },
        { path: 'categoryId', select: 'name label slug' },
        {
          path: 'variants', select: '-createdAt',
          populate: [
            { path: 'thumbnail', select: '_id url publicId size' },
            { path: 'images', select: '_id url publicId size' }
          ],
        },
      ])
      .skip(skip)
      .limit(pageSize);

    return ApiResponse.success('Products Fetched Successfully', products || []);
  }

  // async fetchAllOrders() {
  //   return this.orderModel
  //     .find()
  //     .populate('userId', '-password')
  //     .populate('vendorId')
  //     .populate('addressId')
  //     .populate('items.productId')
  //     .populate('items.variantId')
  //     .sort({ createdAt: -1 })
  //     .lean();
  // }

  // async fetchOrderDetails(orderId: string) {
  //   const order = await this.orderModel
  //     .findById(new Types.ObjectId(orderId))
  //     .populate('userId')
  //     // .populate('vendorId')
  //     // .populate('addressId')
  //     .populate('items.productId')
  //     .populate('items.variantId')
  //     .lean();
  //   if (!order) {
  //     throw new NotFoundException('Order Not Found');
  //   }
  //   return ApiResponse.success('OrderDetails Fetched Successfully', order);
  // }

  // async deleteOrder(orderId: string) {
  //   const order = await this.orderModel.findById(new Types.ObjectId(orderId));
  //   if (!order) {
  //     throw new NotFoundException('Order not Found');
  //   }
  //   return ApiResponse.success('Order Deleted Successfully');
  // }

  async fetchAllOrders(page?: number, limit?: number) {
    const pageNumber = Number(page) || 1;
    const pageSize = Number(limit) || 10;
    const skip = (pageNumber - 1) * pageSize;

    const orders = await this.orderModel
      .find({ isDeleted: false })
      .populate('userId', '-password')
      .populate({
        path: 'vendorOrders',
        populate: [
          {
            path: 'vendorId',
            select: '-password',
          },
          {
            path: 'items.productId',
          },
          {
            path: 'items.variantId',
          },
        ],
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    return ApiResponse.success('Orders Fetched Successfully', orders);
  }

  async fetchOrderDetails(orderId: string) {
    const order = await this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        isDeleted: false,
      })
      .populate('userId', '-password')
      .populate({
        path: 'vendorOrders',
        populate: [
          {
            path: 'vendorId',
            select: '-password',
          },
          {
            path: 'items.productId',
          },
          {
            path: 'items.variantId',
          },
        ],
      })
      .lean();

    if (!order) {
      throw new NotFoundException('Order Not Found');
    }

    return ApiResponse.success('Order Details Fetched Successfully', order);
  }

  async deleteOrder(orderId: string) {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      isDeleted: false,
    });

    if (!order) {
      throw new NotFoundException('Order Not Found');
    }

    await this.orderModel.updateOne(
      { _id: order._id },
      {
        $set: {
          isDeleted: true,
        },
      },
    );

    return ApiResponse.success('Order Deleted Successfully');
  }

  async updateVendorDetails(dto: UpdateVendorDTO, vendorId: string) {

    const filteredObject = Object.fromEntries(
      Object.entries(dto).filter(
        ([_, value]) =>
          value !== undefined &&
          value !== null &&
          !(typeof value === 'string' && value.trim() === ''),
      ),
    );

    const vendor = await this.vendorModel.findByIdAndUpdate(
      new Types.ObjectId(vendorId),
      { $set: filteredObject },
      { new: true, runValidators: true },
    );

    if (!vendor) {
      throw new NotFoundException('Vendor Not Found');
    }

    return ApiResponse.success('Vendor Updated Successfully', vendor);
  }

  async adminDeleteCategory(categoryId: string) {
    const category = await this.categoryModel.findById(categoryId);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const products = await this.productModel.find({
      categoryId: category._id,
    });

    if (products.length) {
      throw new BadRequestException('Cannot delete category with products');
    }

    if (category.image) {
      await this.documentService.deleteMedia(category.image.toString());
    }

    await category.deleteOne();

    return ApiResponse.success('Category deleted successfully');
  }

  async deleteAllProducts() {
    const session = await this.productModel.db.startSession();

    try {
      session.startTransaction();

      const products = await this.productModel.find({}).session(session);

      const productIds = products.map((product) => product._id);

      const variants = await this.productVariantModel
        .find({
          productId: { $in: productIds },
        })
        .session(session);

      const mediaIds: string[] = [];

      for (const variant of variants) {
        if (variant.thumbnail) {
          mediaIds.push(variant.thumbnail.toString());
        }

        if (variant.images?.length) {
          mediaIds.push(...variant.images.map((img) => img.toString()));
        }
      }

      await this.productVariantModel.deleteMany({}, { session });

      await this.productModel.deleteMany({}, { session });

      await session.commitTransaction();

      await Promise.allSettled(
        mediaIds.map((id) => this.documentService.deleteMedia(id)),
      );

      return ApiResponse.success('All products deleted successfully');
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async deleteAllCategories() {
    const session = await this.categoryModel.db.startSession();

    try {
      session.startTransaction();

      const categories = await this.categoryModel
        .find(
          {},
          {
            _id: 1,
            image: 1,
          },
        )
        .lean()
        .session(session);

      if (!categories.length) {
        throw new NotFoundException('No categories found');
      }

      const mediaIds: string[] = [];

      for (const category of categories) {
        if (category.image) {
          mediaIds.push(category.image.toString());
        }
      }

      await this.categoryModel.deleteMany({}, { session });

      await session.commitTransaction();

      // Delete media only after successful commit
      await Promise.allSettled(
        mediaIds.map((id) => this.documentService.deleteMedia(id)),
      );

      return ApiResponse.success('All categories deleted successfully');
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async createCategory(
    dto: CreateCategoryDTO,
    file: any,
    userId: string,
  ) {
    const existingCategory = await this.categoryModel.findOne({
      isDeleted: false,
      $or: [
        { name: dto.name.toLowerCase() },
        { slug: dto.slug.toLowerCase() },
        { label: dto.label },
      ],
    });

    if (existingCategory) {
      throw new ConflictException(
        'Category with same name, label or slug already exists',
      );
    }

    let mediaId: Types.ObjectId | undefined;

    if (file) {
      const uploaded = await this.documentService.upload(
        file,
        'category',
        userId,
      );

      mediaId = uploaded._id;
    }

    const category = await this.categoryModel.create({
      name: dto.name.toLowerCase(),
      slug: dto.slug.toLowerCase(),
      description: dto.description,
      label: dto.label,
      tags: dto.tags ?? [],
      image: mediaId,
    });

    return ApiResponse.success('Category Created Successfully', category);
  }

  async updateCategory(
    dto: UpdateCategoryDTO,
    file: any,
    userId: string,
    categoryId: string,
  ) {
    const category = await this.categoryModel.findOne({
      _id: categoryId,
      isDeleted: false,
    });

    if (!category) {
      throw new NotFoundException('Category Not Found');
    }

    if (dto.name || dto.slug) {
      const existingCategory = await this.categoryModel.findOne({
        _id: { $ne: categoryId },
        isDeleted: false,
        $or: [
          ...(dto.name ? [{ name: dto.name.toLowerCase() }] : []),

          ...(dto.slug ? [{ slug: dto.slug.toLowerCase() }] : []),
          ...(dto.label ? [{ label: dto.label }] : []),
        ],
      });

      if (existingCategory) {
        throw new ConflictException(
          'Category with same name,label or slug already exists',
        );
      }
    }

    if (file) {
      if (category.image) {
        await this.documentService.deleteMedia(category.image.toString());
      }

      const uploaded = await this.documentService.upload(
        file,
        'category',
        userId,
      );

      category.image = uploaded._id;
    }

    if (dto.name !== undefined && dto.name.trim() !== '') {
      // const isNameExist = await this.categoryModel.findOne({name:dto.name,_id:{$ne:categoryId}})
      // if(isNameExist){
      //   throw new BadRequestException("This Category name already exist")
      // }
      category.name = dto.name.toLowerCase();
    }

    if (dto.slug !== undefined && dto.slug.trim() !== '') {
      category.slug = dto.slug.toLowerCase();
    }

    if (dto.description !== undefined) {
      category.description = dto.description;
    }

    if (dto.label !== undefined) {
      category.label = dto.label;
    }

    if (dto.tags !== undefined) {
      category.tags = dto.tags.map((tag) => tag.toLowerCase().trim());
    }

    await category.save();

    return ApiResponse.success('Category Updated Successfully', category);
  }

  async fetchAllCategories() {
    const categories = await this.categoryModel
      .find({ isActive: true, isDeleted: false })
      .populate('image', 'url')
      .lean();
    return ApiResponse.success('Fetch all categories', categories);
  }

  async deleteCategory(categoryId: string) {
    const session = await this.connection.startSession();



    try {
      session.startTransaction();

      const category = await this.categoryModel.findOne(
        {
          _id: new Types.ObjectId(categoryId),
        },
        null,
        { session },
      );

      if (!category) {
        throw new NotFoundException('Category not found');
      }


      const productExists = await this.productModel.exists({
        categoryId: category._id,
        isDeleted: false,
      });

      // Products are using this category
      if (productExists) {
        category.isDeleted = true;
        category.isActive = false;

        await category.save({ session });

        await session.commitTransaction();

        return ApiResponse.success(
          'Category marked as deleted because products are associated with it',
          category,
        );
      }

      // No products => hard delete

      if (category.image) {
        await this.documentService.deleteMedia(category.image.toString());
      }

      await this.categoryModel.deleteOne(
        {
          _id: category._id,
        },
        { session },
      );

      await session.commitTransaction();

      return ApiResponse.success('Category deleted successfully', null);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async fetchCategoryDetails(categoryId: string) {
    const category = await this.categoryModel
      .findById(new Types.ObjectId(categoryId))
      .populate('image', 'url');
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return ApiResponse.success(
      'Category details fetched successfully!',
      category,
    );
  }

  async vendorPayoutDetails(
    vendorId: string,
    limit = 10,
    page = 1,
    status?: string,
    month?: number,
    year?: number,
  ) {
    page = Number(page) || 1;
    limit = Number(limit) || 10;

    const skip = (page - 1) * limit;

    const now = new Date();

    month = month || now.getMonth() + 1;
    year = year || now.getFullYear();

    const startDate = new Date(year, month - 1, 1);

    const endDate = new Date(year, month, 0);

    endDate.setHours(23, 59, 59, 999);

    const match: any = {
      vendorId: new Types.ObjectId(vendorId),

      orderStatus: OrderStatus.DELIVERED,

      deliveredAt: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (status === 'pending') {
      match.isVendorSettled = false;
    }

    if (status === 'paid') {
      match.isVendorSettled = true;
    }

    const vendor = await this.vendorModel.findById(vendorId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const summary = await this.vendorOrderModel.aggregate([
      {
        $match: match,
      },

      {
        $group: {
          _id: null,

          totalOrders: {
            $sum: 1,
          },

          totalSales: {
            $sum: '$grandTotal',
          },

          totalPlatformCommission: {
            $sum: '$commissionAmount',
          },

          totalInfluencerCommission: {
            $sum: '$influencerCommissionAmount',
          },

          totalGrossProfit: {
            $sum: '$grossProfit',
          },

          totalNetProfit: {
            $sum: '$netProfit',
          },

          totalVendorPayout: {
            $sum: '$payoutAmount',
          },
        },
      },
    ]);

    const total = await this.vendorOrderModel.countDocuments(match);

    const orders = await this.vendorOrderModel
      .find(match)
      .populate('userId', 'name email phone')
      .sort({
        deliveredAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean();

    return ApiResponse.success('Vendor payout details fetched', {
      vendor: {
        _id: vendor._id,
        businessName: vendor.businessName,
      },

      filters: {
        month,
        year,
        status: status || 'all',
      },

      summary: summary[0] || {},

      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },

      orders,
    });
  }



  async updateVendorPayoutStatus(vendorId: string, dto: updateVendorPayoutDTO) {
    const vendor = await this.vendorModel.findById(
      new Types.ObjectId(vendorId),
    );

    if (!vendor) {
      throw new NotFoundException('Vendor Not Found');
    }

    const vendorPayout = await this.vendorPayoutModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(dto.vendorPayoutId),

        vendorId: new Types.ObjectId(vendorId),
      },

      {
        $set: {
          status: dto.status,
        },
      },

      {
        new: true,
      },
    );

    if (!vendorPayout) {
      throw new NotFoundException('Vendor payout not found');
    }

    return ApiResponse.success(
      'Vendor payout status updated successfully',
      vendorPayout,
    );
  }

  async allInfluencerCommission(
    limit = 10,
    page = 1,
    status?: string,
    month?: number,
    year?: number,
  ) {
    page = Number(page) || 1;
    limit = Number(limit) || 10;

    const skip = (page - 1) * limit;

    // Default current month/year
    const currentDate = new Date();

    if (!month) {
      month = currentDate.getMonth() + 1;
    }

    if (!year) {
      year = currentDate.getFullYear();
    }

    const match: any = {
      isDelivered: true,
      commissionMonth: month,
      commissionYear: year,
    };

    if (status?.toLowerCase() === 'pending') {
      match.isSettled = false;
    }

    if (status?.toLowerCase() === 'paid') {
      match.isSettled = true;
    }

    const pipeline: any = [
      {
        $match: match,
      },

      {
        $group: {
          _id: '$influencerId',

          influencerUserId: {
            $first: '$influencerUserId',
          },

          totalOrders: {
            $sum: 1,
          },

          totalSales: {
            $sum: '$finalOrderAmount',
          },

          totalProfit: {
            $sum: '$platformCommissionAmount',
          },

          earnedCommission: {
            $sum: '$commissionAmount',
          },

          settledCount: {
            $sum: {
              $cond: ['$isSettled', 1, 0],
            },
          },

          unsettledCount: {
            $sum: {
              $cond: ['$isSettled', 0, 1],
            },
          },

          commissionIds: {
            $push: '$_id',
          },
        },
      },

      {
        $lookup: {
          from: 'influencers',
          localField: '_id',
          foreignField: '_id',
          as: 'influencer',
        },
      },

      {
        $unwind: {
          path: '$influencer',
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          influencerId: '$_id',

          influencerName: '$influencer.name',

          influencerUserId: 1,

          totalOrders: 1,

          totalSales: 1,

          totalProfit: 1,

          earnedCommission: 1,

          settledCount: 1,

          unsettledCount: 1,

          commissionIds: 1,
        },
      },

      {
        $sort: {
          totalSales: -1,
        },
      },
    ];

    const aggregatedData =
      await this.influencerCommisionModel.aggregate(pipeline);

    const slabs = await this.influencerCommissionSlabModel
      .find({
        isActive: true,
      })
      .sort({
        minSales: 1,
      })
      .lean();

    const transformedData = aggregatedData.map((item) => {
      const slab = slabs.find(
        (s) => item.totalSales >= s.minSales && item.totalSales <= s.maxSales,
      );

      const commissionRate = slab?.commissionRate || 0;

      const calculatedPayout = Number(
        ((item.totalPlatformCommission * commissionRate) / 100).toFixed(2),
      );

      return {
        influencerId: item.influencerId,

        influencerName: item.influencerName || '',

        totalOrders: item.totalOrders,

        totalSales: item.totalSales,

        totalProfit: item.totalProfit,

        earnedCommission: item.earnedCommission,

        commissionRate,

        calculatedPayout,

        slab: slab
          ? {
            minSales: slab.minSales,
            maxSales: slab.maxSales,
            commissionRate: slab.commissionRate,
          }
          : null,

        settledCount: item.settledCount,

        unsettledCount: item.unsettledCount,

        payoutStatus: item.unsettledCount > 0 ? 'pending' : 'paid',
      };
    });

    const total = transformedData.length;

    const paginatedData = transformedData.slice(skip, skip + limit);

    return ApiResponse.success('Influencer commissions fetched successfully', {
      filters: {
        month,
        year,
        status: status || 'all',
      },

      summary: {
        totalInfluencers: total,

        totalSales: transformedData.reduce(
          (sum, item) => sum + item.totalSales,
          0,
        ),

        totalProfit: transformedData.reduce(
          (sum, item) => sum + item.totalProfit,
          0,
        ),

        totalPayout: transformedData.reduce(
          (sum, item) => sum + item.calculatedPayout,
          0,
        ),
      },

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },

      data: paginatedData,
    });
  }

  async allVendorPayouts(
    limit = 10,
    page = 1,
    status?: string,
    month?: number,
    year?: number,
  ) {
    page = Number(page) || 1;
    limit = Number(limit) || 10;

    const skip = (page - 1) * limit;

    const now = new Date();

    month = month || now.getMonth() + 1;
    year = year || now.getFullYear();

    const startDate = new Date(year, month - 1, 1);

    const endDate = new Date(year, month, 0);

    endDate.setHours(23, 59, 59, 999);

    const match: any = {
      orderStatus: OrderStatus.DELIVERED,

      deliveredAt: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (status === 'pending') {
      match.isVendorSettled = false;
    }

    if (status === 'paid') {
      match.isVendorSettled = true;
    }

    const summary = await this.vendorOrderModel.aggregate([
      {
        $match: match,
      },
      {
        $group: {
          _id: null,

          totalOrders: {
            $sum: 1,
          },

          totalSales: {
            $sum: '$grandTotal',
          },

          totalPlatformCommission: {
            $sum: '$commissionAmount',
          },

          totalInfluencerCommission: {
            $sum: '$influencerCommissionAmount',
          },

          totalGrossProfit: {
            $sum: '$grossProfit',
          },

          totalNetProfit: {
            $sum: '$netProfit',
          },

          totalVendorPayout: {
            $sum: '$payoutAmount',
          },
        },
      },
    ]);

    const vendorPipeline: any = [
      {
        $match: match,
      },

      {
        $group: {
          _id: '$vendorId',

          totalOrders: {
            $sum: 1,
          },

          totalSales: {
            $sum: '$grandTotal',
          },

          totalPlatformCommission: {
            $sum: '$commissionAmount',
          },

          // totalInfluencerCommission: {
          //   $sum:
          //     '$influencerCommissionAmount',
          // },

          totalGrossProfit: {
            $sum: '$grossProfit',
          },

          totalNetProfit: {
            $sum: '$netProfit',
          },

          totalVendorPayout: {
            $sum: '$payoutAmount',
          },

          settledOrders: {
            $sum: {
              $cond: ['$isVendorSettled', 1, 0],
            },
          },

          unsettledOrders: {
            $sum: {
              $cond: ['$isVendorSettled', 0, 1],
            },
          },
        },
      },

      {
        $lookup: {
          from: 'vendors',
          localField: '_id',
          foreignField: '_id',
          as: 'vendor',
        },
      },

      {
        $unwind: '$vendor',
      },

      {
        $project: {
          vendorId: '$_id',

          vendorName: '$vendor.businessName',

          totalOrders: 1,

          settledOrders: 1,

          unsettledOrders: 1,

          totalSales: 1,

          totalPlatformCommission: 1,

          totalInfluencerCommission: 1,

          totalGrossProfit: 1,

          totalNetProfit: 1,

          totalVendorPayout: 1,
        },
      },

      {
        $sort: {
          totalSales: -1,
        },
      },
    ];

    const vendors = await this.vendorOrderModel.aggregate(vendorPipeline);

    const total = vendors.length;

    return ApiResponse.success('Vendor payout dashboard fetched', {
      filters: {
        month,
        year,
        status: status || 'all',
      },

      summary: summary[0] || {},

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },

      data: vendors.slice(skip, skip + limit),
    });
  }

  async influencerCommissionDetails(
    influencerId: string,
    month?: number,
    year?: number,
  ) {
    const currentDate = new Date();

    month = Number(month) || currentDate.getMonth() + 1;
    year = Number(year) || currentDate.getFullYear();

    const influencer = await this.influencerModel.findById(influencerId).lean();

    if (!influencer) {
      throw new NotFoundException('Influencer not found');
    }

    const commissions = await this.influencerCommisionModel.aggregate([
      {
        $match: {
          influencerId: new Types.ObjectId(influencerId),

          isDelivered: true,

          commissionMonth: month,

          commissionYear: year,
        },
      },

      {
        $lookup: {
          from: 'vendororders',
          localField: 'vendorOrderId',
          foreignField: '_id',
          as: 'vendorOrder',
        },
      },

      {
        $unwind: {
          path: '$vendorOrder',
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: 'vendors',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor',
        },
      },

      {
        $unwind: {
          path: '$vendor',
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          vendorOrderId: 1,

          orderId: 1,

          orderAmount: '$finalOrderAmount',

          netProfit: 1,

          platformCommissionAmount: 1,

          status: 1,

          isSettled: 1,

          settledAt: 1,

          deliveredAt: 1,

          vendorName: '$vendor.businessName',

          orderNumber: '$vendorOrder.orderNumber',
        },
      },

      {
        $sort: {
          deliveredAt: -1,
        },
      },
    ]);

    const totalOrders = commissions.length;

    const totalSales = commissions.reduce(
      (sum, item) => sum + (item.orderAmount || 0),
      0,
    );

    const totalPlatformCommission = commissions.reduce(
      (sum, item) => sum + (item.platformCommissionAmount || 0),
      0,
    );

    const slabs = await this.influencerCommissionSlabModel
      .find({
        isActive: true,
      })
      .sort({
        minSales: 1,
      })
      .lean();

    const slab = slabs.find(
      (s) => totalSales >= s.minSales && totalSales <= s.maxSales,
    );

    const commissionRate = slab?.commissionRate || 0;

    const calculatedPayout = Number(
      ((totalPlatformCommission * commissionRate) / 100).toFixed(2),
    );

    const settledAmount = Number(
      commissions
        .filter((x) => x.isSettled)
        .reduce((sum, item) => sum + (item.platformCommissionAmount || 0), 0) *
      (commissionRate / 100),
    );

    const pendingAmount = Number((calculatedPayout - settledAmount).toFixed(2));

    const payoutHistory = await this.influencerPayoutModel
      .find({
        influencerId: new Types.ObjectId(influencerId),

        payoutMonth: month,

        payoutYear: year,
      })
      .sort({
        createdAt: -1,
      })
      .lean();

    return ApiResponse.success('Influencer commission details fetched', {
      influencer: {
        influencerId: influencer._id,

        name: influencer.name,

        totalOrders: influencer.totalOrders,

        totalSales: influencer.totalSales,

        pendingCommission: influencer.pendingCommission,

        paidCommission: influencer.paidCommission,
      },

      filters: {
        month,
        year,
      },

      summary: {
        totalOrders,

        totalSales,

        totalPlatformCommission,

        commissionRate,

        calculatedPayout,

        settledAmount,

        pendingAmount,
      },

      slab: slab
        ? {
          minSales: slab.minSales,

          maxSales: slab.maxSales,

          commissionRate: slab.commissionRate,
        }
        : null,

      payouts: payoutHistory,

      commissions,
    });
  }

  async sendInfluencerInvitationLink(email: string, name: string) {
  }

  async restoreUser(userId: string) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();
      const user = await this.userModel.findById(userId, null, { session });
      if (!user) throw new NotFoundException('User not found');

      user.isDeleted = false;
      user.isActive = true;
      await user.save({ session });

      await session.commitTransaction();
      return { message: 'User restored successfully' };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async restoreVendor(vendorId: string) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();
      const vendor = await this.vendorModel.findById(vendorId, null, { session });
      if (!vendor) throw new NotFoundException('Vendor not found');

      vendor.isDeleted = false;
      vendor.isActive = true;
      await vendor.save({ session });

      const user = await this.userModel.findOne({ vendorId: vendor._id }, null, { session });
      if (user) {
        user.isDeleted = false;
        user.isActive = true;
        await user.save({ session });
      }

      await this.productModel.updateMany(
        { vendorId: vendor._id },
        { $set: { isDeleted: false, isActive: true } },
        { session }
      );
      const products = await this.productModel.find({ vendorId: vendor._id }, null, { session });
      const productIds = products.map(p => p._id);
      if (productIds.length > 0) {
        await this.productVariantModel.updateMany(
          { productId: { $in: productIds } },
          { $set: { isDeleted: false, isActive: true } },
          { session }
        );
      }

      await session.commitTransaction();
      return { message: 'Vendor and related products restored successfully' };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async restoreEducator(educatorId: string) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();
      const educator = await this.educatorModel.findById(educatorId, null, { session });
      if (!educator) throw new NotFoundException('Educator not found');

      educator.isDeleted = false;
      educator.isActive = true;
      await educator.save({ session });

      const user = await this.userModel.findById(educator.userId, null, { session });
      if (user) {
        user.isDeleted = false;
        user.isActive = true;
        await user.save({ session });
      }

      await this.courseModel.updateMany(
        { educatorId: educator._id },
        { $set: { isDeleted: false, isActive: true } },
        { session }
      );

      await session.commitTransaction();
      return { message: 'Educator and related courses restored successfully' };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async restoreServiceProvider(providerId: string) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();
      const provider = await this.serviceProviderModel.findById(providerId, null, { session });
      if (!provider) throw new NotFoundException('Service Provider not found');

      provider.isDeleted = false;
      provider.isActive = true;
      await provider.save({ session });

      const user = await this.userModel.findById(provider.userId, null, { session });
      if (user) {
        user.isDeleted = false;
        user.isActive = true;
        await user.save({ session });
      }

      await this.serviceModel.updateMany(
        { providerId: provider._id },
        { $set: { isDeleted: false, isActive: true } },
        { session }
      );

      await session.commitTransaction();
      return { message: 'Service Provider and related services restored successfully' };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async restoreInfluencer(influencerId: string) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();
      const influencer = await this.influencerModel.findById(influencerId, null, { session });
      if (!influencer) throw new NotFoundException('Influencer not found');

      influencer.isDeleted = false;
      influencer.isActive = true;
      await influencer.save({ session });

      const user = await this.userModel.findById(influencer.userId, null, { session });
      if (user) {
        user.isDeleted = false;
        user.isActive = true;
        await user.save({ session });
      }

      await session.commitTransaction();
      return { message: 'Influencer restored successfully' };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async getCloudinaryStorageSize() {
    const MediaModel = this.connection.model('Media');
    const result = await MediaModel.aggregate([
      { $match: { storage: 'cloudinary' } },
      { $group: { _id: null, totalSize: { $sum: '$size' } } }
    ]);

    const totalSizeBytes = result.length > 0 ? result[0].totalSize : 0;
    const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);
    const totalSizeGB = (totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2);

    return {
      storageType: 'cloudinary',
      totalSizeBytes,
      totalSizeMB: parseFloat(totalSizeMB),
      totalSizeGB: parseFloat(totalSizeGB),
    };
  }
}
