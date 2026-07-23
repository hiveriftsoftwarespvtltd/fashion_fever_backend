import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Admin, AdminDocument } from './schema/admin.schema';
import { User, UserDocument } from 'src/user/schema/user.schema';
import { ApiResponse } from 'src/common/responses/api-response';

@Injectable()
export class AdminProfileService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) { }

  async getAdminProfile(userId: string) {
    const user = await this.userModel.findById(userId).select('-password');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const admin = await this.adminModel.findOne({ userId: new Types.ObjectId(userId) });

    return ApiResponse.success('Admin profile fetched successfully', {
      user,
      adminAccess: admin ? admin.moduleAccess : [],
      roleTitle: admin ? admin.roleTitle : null,
      isActive: admin ? admin.isActive : user.isActive,
    });
  }
}
