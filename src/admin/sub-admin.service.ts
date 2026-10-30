import * as bcrypt from 'bcryptjs';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Admin,
  AdminDocument,
  AccessType,
  AdminModule,
} from './schema/admin.schema';
import {
  User,
  UserDocument,
  UserRole,
  RoleStatus,
} from 'src/user/schema/user.schema';
import { CreateSubAdminDto, UpdateSubAdminDto } from './dto/sub-admin.dto';
import { ApiResponse } from 'src/common/responses/api-response';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { filteredObject } from 'src/utils/helper';

const TAB_TO_MODULE_MAP: Record<string, AdminModule> = {
  dashboard: AdminModule.DASHBOARD,
  users: AdminModule.USERS,
  'service-providers': AdminModule.SERVICE_PROVIDERS,
  educators: AdminModule.COURSES,
  'all-educators': AdminModule.COURSES,
  vendors: AdminModule.VENDORS,
  pending: AdminModule.VENDORS,
  'vendor-payouts': AdminModule.VENDORS,
  'affiliate-dashboard': AdminModule.INFLUENCERS,
  influencers: AdminModule.INFLUENCERS,
  'commission-slabs': AdminModule.INFLUENCERS,
  'influencer-commissions': AdminModule.INFLUENCERS,
  categories: AdminModule.VENDORS,
  'course-categories': AdminModule.COURSES,
  products: AdminModule.VENDORS,
  coupons: AdminModule.INFLUENCERS,
  'subscription-plans': AdminModule.SERVICE_PROVIDERS,
  orders: AdminModule.VENDORS,
  'beauty-services': AdminModule.SERVICE_PROVIDERS,
  'service-categories': AdminModule.SERVICE_PROVIDERS,
  'admin-service-leads': AdminModule.SERVICE_PROVIDERS,
  'home-content': AdminModule.HOME_CONTENT,
  'home-booking-cards': AdminModule.HOME_CONTENT,
  'cashback-slabs': AdminModule.FINANCE,
  'wallet-balances': AdminModule.FINANCE,
  'bank-accounts': AdminModule.FINANCE,
  tickets: AdminModule.TICKETS,
  notifications: AdminModule.NOTIFICATION,
};

@Injectable()
export class SubAdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async createAdmin(dto: CreateSubAdminDto) {
    const existingUser = await this.userModel.findOne({ email: dto.email });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    const user = new this.userModel({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      phone: dto.phone,
      roles: [UserRole.ADMIN, UserRole.USER],
      isEmailVerified: true,
      isActive: true,
    });
    user.roleStatus.set(UserRole.ADMIN, RoleStatus.APPROVED);
    user.roleStatus.set(UserRole.USER, RoleStatus.APPROVED);

    await user.save();

    let computedModuleAccess = dto.moduleAccess || [];
    if (
      (!computedModuleAccess || computedModuleAccess.length === 0) &&
      dto.allowedTabs &&
      dto.allowedTabs.length > 0
    ) {
      const uniqueModules = new Set<AdminModule>();
      dto.allowedTabs.forEach((tab) => {
        const mod = TAB_TO_MODULE_MAP[tab];
        if (mod) uniqueModules.add(mod);
      });
      computedModuleAccess = Array.from(uniqueModules).map((module) => ({
        module,
        access: [AccessType.READ, AccessType.WRITE, AccessType.DELETE],
      }));
    }

    const admin = new this.adminModel({
      userId: user._id,
      roleTitle: dto.roleTitle,
      moduleAccess: computedModuleAccess,
      allowedTabs: dto.allowedTabs || [],
    });

    await admin.save();

    return ApiResponse.success('Admin created successfully', admin);
  }

  async updateAdmin(id: string, dto: UpdateSubAdminDto) {
    const admin = await this.adminModel.findById(id);
    if (!admin || admin.isDeleted) {
      throw new NotFoundException('Admin not found');
    }

    const updateAdminFields: any = {};
    if (dto.roleTitle !== undefined && dto.roleTitle !== '') {
      updateAdminFields.roleTitle = dto.roleTitle;
    }
    if (dto.allowedTabs !== undefined) {
      updateAdminFields.allowedTabs = dto.allowedTabs;
      if (dto.moduleAccess === undefined) {
        const uniqueModules = new Set<AdminModule>();
        dto.allowedTabs.forEach((tab) => {
          const mod = TAB_TO_MODULE_MAP[tab];
          if (mod) uniqueModules.add(mod);
        });
        updateAdminFields.moduleAccess = Array.from(uniqueModules).map(
          (module) => ({
            module,
            access: [AccessType.READ, AccessType.WRITE, AccessType.DELETE],
          }),
        );
      }
    }
    if (dto.moduleAccess !== undefined) {
      updateAdminFields.moduleAccess = dto.moduleAccess;
    }
    if (dto.isActive !== undefined) {
      updateAdminFields.isActive = dto.isActive;
    }

    if (Object.keys(updateAdminFields).length > 0) {
      await this.adminModel.findByIdAndUpdate(id, { $set: updateAdminFields });
    }

    // Update user details if provided
    if (admin.userId) {
      const updateUserFields: any = {};
      if (dto.name) updateUserFields.name = dto.name;
      if (dto.phone) updateUserFields.phone = dto.phone;
      if (dto.isActive !== undefined) updateUserFields.isActive = dto.isActive;
      if (dto.password && dto.password.trim().length > 0) {
        const salt = await bcrypt.genSalt(10);
        updateUserFields.password = await bcrypt.hash(dto.password, salt);
      }
      if (Object.keys(updateUserFields).length > 0) {
        await this.userModel.findByIdAndUpdate(admin.userId, {
          $set: updateUserFields,
        });
      }
    }

    const updatedAdmin = await this.adminModel
      .findById(id)
      .populate('userId', 'name email phone avatar');

    return ApiResponse.success('Admin updated successfully', updatedAdmin);
  }

  async deleteAdmin(id: string) {
    const admin = await this.adminModel.findById(id);
    if (!admin || admin.isDeleted) {
      throw new NotFoundException('Admin not found');
    }

    await this.adminModel.findByIdAndUpdate(id, {
      $set: { isDeleted: true, isActive: false },
    });

    if (admin.userId) {
      await this.userModel.findByIdAndUpdate(admin.userId, {
        $pull: { roles: UserRole.ADMIN },
      });
    }

    return ApiResponse.success('Admin deleted successfully');
  }

  async getAllAdmins() {
    const admins = await this.adminModel
      .find({ isDeleted: false })
      .populate('userId', 'name email phone avatar');
    return ApiResponse.success('Admins fetched successfully', admins);
  }

  async getAdminDetails(id: string) {
    const admin = await this.adminModel
      .findOne({
        _id: new Types.ObjectId(id),
        isDeleted: false,
      })
      .populate('userId', 'name email phone avatar');
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }
    return ApiResponse.success('Admin details fetched successfully', admin);
  }
}
