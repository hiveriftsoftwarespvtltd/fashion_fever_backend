import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole, RoleStatus } from 'src/user/schema/user.schema';
import { Vendor, VendorDocument } from 'src/vendor/schema/vendor.schema';
import { Influencer, InfluencerDocument } from 'src/influencer/schema/influencer.schema';
import { Educator, EducatorDocument } from 'src/courses/schema/educator.schema';
import { ServiceProvider, ServiceProviderDocument } from 'src/service/schema/service-provider.schema';
import { Admin, AdminDocument } from './schema/admin.schema';
import { ApiResponse } from 'src/common/responses/api-response';
import { UpdateUserRoleDto } from './dto/user-management.dto';

@Injectable()
export class UserManagementService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
    @InjectModel(Influencer.name) private influencerModel: Model<InfluencerDocument>,
    @InjectModel(Educator.name) private educatorModel: Model<EducatorDocument>,
    @InjectModel(ServiceProvider.name) private serviceProviderModel: Model<ServiceProviderDocument>,
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
  ) { }

  async getAllUsers(
    page: number = 1,
    limit: number = 10,
    roles?: UserRole[],
    isActive?: boolean,
    isDeleted?: boolean,
  ) {
    const query: any = {};

    if (roles && roles.length > 0) {
      query.roles = { $in: roles };
    }

    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    if (isDeleted !== undefined) {
      query.isDeleted = isDeleted;
    }

    const skip = (page - 1) * limit;

    const users = await this.userModel
      .find(query)
      .select('-password -otp -otpExpiresAt')
      .populate('avatar', 'url type')
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await this.userModel.countDocuments(query);

    return ApiResponse.success('Users fetched successfully', {
      users,
      total,
      page,
      limit,
    });
  }

  async getUserDetails(userId: string) {
    const userQuery = this.userModel
      .findById(userId)
      .select('-password -otp -otpExpiresAt')
      .populate('avatar', 'url type publicId');

    const userToPopulate = await userQuery.lean() as any;

    if (!userToPopulate) {
      throw new NotFoundException('User not found');
    }

    if (userToPopulate.roles?.includes(UserRole.VENDOR) && userToPopulate.vendorId) {
      await this.userModel.populate(userToPopulate, {
        path: 'vendorId',
        populate: [
          { path: 'logo', select: 'url _id publicId' },
          { path: 'banner', select: 'url _id publicId' }
        ]
      });
    }

    if (userToPopulate.roles?.includes(UserRole.INFLUENCER) && userToPopulate.influencerId) {
      await this.userModel.populate(userToPopulate, {
        path: 'influencerId',
        populate: [
          { path: 'profilePicture', select: 'url _id publicId' }
        ]
      });
    }

    if (userToPopulate.roles?.includes(UserRole.EDUCATOR) && userToPopulate.educatorId) {
      await this.userModel.populate(userToPopulate, { path: 'educatorId' });
    }

    if (userToPopulate.roles?.includes(UserRole.SERVICE_PROVIDER) && userToPopulate.serviceProviderId) {
      await this.userModel.populate(userToPopulate, { path: 'serviceProviderId' });
    }

    if (userToPopulate.roles?.includes(UserRole.ADMIN)) {
      const adminDetails = await this.adminModel.findOne({ userId: userToPopulate._id }).lean();
      userToPopulate.adminProfile = adminDetails;
    }

    return ApiResponse.success('User details fetched successfully', userToPopulate);
  }

  async updateUser(userId: string, updateData: UpdateUserRoleDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateData.role && updateData.isActive !== undefined) {
      const role = updateData.role;
      const isActive = updateData.isActive;

      const newRoleStatus = isActive ? RoleStatus.APPROVED : RoleStatus.DEACTIVATED;

      if (!user.roleStatus) {
        user.roleStatus = new Map();
      }
      user.roleStatus.set(role, newRoleStatus);

      if (role === UserRole.VENDOR && user.vendorId) {
        await this.vendorModel.findByIdAndUpdate(user.vendorId, { isActive });
      } else if (role === UserRole.INFLUENCER && user.influencerId) {
        await this.influencerModel.findByIdAndUpdate(user.influencerId, { status: isActive ? 'active' : 'blocked' });
      } else if (role === UserRole.EDUCATOR && user.educatorId) {
        await this.educatorModel.findByIdAndUpdate(user.educatorId, { isActive });
      } else if (role === UserRole.SERVICE_PROVIDER && user.serviceProviderId) {
        await this.serviceProviderModel.findByIdAndUpdate(user.serviceProviderId, { isActive });
      } else if (role === UserRole.ADMIN) {
        await this.adminModel.findOneAndUpdate({ userId }, { isActive });
      }
    }

    await user.save();

    const updatedUser = await this.userModel.findById(userId)
      .select('-password -otp -otpExpiresAt')
      .populate('avatar', 'url type');

    return ApiResponse.success('User updated successfully', updatedUser);
  }
}
