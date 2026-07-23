
import * as bcrypt from 'bcryptjs';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Admin, AdminDocument } from './schema/admin.schema';
import { User, UserDocument, UserRole, RoleStatus } from 'src/user/schema/user.schema';
import { CreateSubAdminDto, UpdateSubAdminDto } from './dto/sub-admin.dto';
import { ApiResponse } from 'src/common/responses/api-response';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { filteredObject } from 'src/utils/helper';

@Injectable()
export class SubAdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) { }

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

    const admin = new this.adminModel({
      userId: user._id,
      roleTitle: dto.roleTitle,
      moduleAccess: dto.moduleAccess || [],
    });

    await admin.save();

    return ApiResponse.success('Admin created successfully', admin);
  }

  async updateAdmin(id: string, dto: UpdateSubAdminDto) {
    const admin = await this.adminModel.findById(id);
    if (!admin || admin.isDeleted) {
      throw new NotFoundException('Admin not found');
    }

    const filteredObject = Object.fromEntries(Object.entries(dto).filter(([key, value]) => (value !== undefined && value !== null && value !== "")))

    Object.assign(admin, filteredObject);
    await admin.save();

    return ApiResponse.success('Admin updated successfully', admin);
  }

  async deleteAdmin(id: string) {
    const admin = await this.adminModel.findById(id);
    if (!admin || admin.isDeleted) {
      throw new NotFoundException('Admin not found');
    }

    admin.isDeleted = true;
    admin.isActive = false;
    await admin.save();

    const user = await this.userModel.findById(admin.userId);
    if (user) {
      user.roles = user.roles.filter((role) => role !== UserRole.ADMIN);

      await user.save();
    }

    return ApiResponse.success('Admin deleted successfully');
  }

  async getAllAdmins() {
    const admins = await this.adminModel.find({ isDeleted: false }).populate('userId', 'name email phone avatar');
    return ApiResponse.success('Admins fetched successfully', admins);
  }

  async getAdminDetails(id: string) {
    
    const admin = await this.adminModel.findOne({ _id: new Types.ObjectId(id), isDeleted: false, isActive: true }).populate('userId', 'name email phone avatar');
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }
    return ApiResponse.success('Admin details fetched successfully', admin);
  }
}

