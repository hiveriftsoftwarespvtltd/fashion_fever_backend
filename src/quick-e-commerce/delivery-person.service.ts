import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { DeliveryPerson, DeliveryPersonDocument, DeliveryPersonStatus } from './schema/delivery-person.schema';
import { CreateDeliveryPersonDto, UpdateDeliveryPersonDto } from './dto/delivery-person.dto';
import { DocumentService } from '../document/document.service';
import { filteredObject } from 'src/utils/helper';
import { VendorQuickOrder, VendorOrderDocument, VendorOrderStatus } from './schema/quick-vendor-order.schema';
import { User, UserDocument, UserRole, RoleStatus } from '../user/schema/user.schema';
import { Vendor, VendorDocument } from '../vendor/schema/vendor.schema';
import * as bcrypt from 'bcryptjs';

export enum DeliveryPersonRole {
  ADMIN = 'ADMIN',
  VENDOR = 'VENDOR'
}

@Injectable()
export class DeliveryPersonService {
  constructor(
    @InjectModel(DeliveryPerson.name) private deliveryPersonModel: Model<DeliveryPersonDocument>,
    @InjectModel(VendorQuickOrder.name) private vendorOrderModel: Model<VendorOrderDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
    private documentService: DocumentService,
    @InjectConnection() private readonly connection: Connection
  ) { }

  async createDeliveryPerson(userId: string, role: DeliveryPersonRole, dto: CreateDeliveryPersonDto, vendorId?: string, file?: any) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      if (role === DeliveryPersonRole.ADMIN && dto.assignedVendorIds && dto.assignedVendorIds.length > 0) {
        const uniqueVendorIds = [...new Set(dto.assignedVendorIds)];
        const existingVendorsCount = await this.vendorModel.countDocuments({ _id: { $in: uniqueVendorIds } }).session(session);
        if (existingVendorsCount !== uniqueVendorIds.length) {
          throw new NotFoundException('One or more vendors not found');
        }
      }

      // 1. Validate email uniqueness
      const existingUser = await this.userModel.findOne({ email: dto.email }).session(session);
      if (existingUser) {
        throw new BadRequestException('Email already exists');
      }

      let profilePhotoId: string | undefined;

      if (file) {
        const media = await this.documentService.upload(file, 'delivery-persons', userId, vendorId, session);
        profilePhotoId = media._id.toString();
      }

      // 2. Create the User
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const roleStatus = new Map<string, RoleStatus>();
      roleStatus.set(UserRole.USER, RoleStatus.APPROVED);
      roleStatus.set(UserRole.DELIVERY_PERSON, RoleStatus.APPROVED);

      const newUser = new this.userModel({
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        password: hashedPassword,
        roles: [UserRole.USER, UserRole.DELIVERY_PERSON],
        roleStatus,
        avatar: profilePhotoId ? new Types.ObjectId(profilePhotoId) : undefined,
        isEmailVerified: true
      });
      await newUser.save({ session });

      // 3. Create Delivery Person
      const payload: any = { ...dto, addedBy: new Types.ObjectId(userId), userId: newUser._id };

      if (profilePhotoId) {
        payload.profilePhoto = new Types.ObjectId(profilePhotoId);
      }

      if (role === DeliveryPersonRole.VENDOR && vendorId) {
        payload.assignedVendorIds = [new Types.ObjectId(vendorId)];
      } else if (dto.assignedVendorIds) {
        payload.assignedVendorIds = dto.assignedVendorIds.map((id: string) => new Types.ObjectId(id));
      }

      const deliveryPerson = new this.deliveryPersonModel(payload);
      const savedDeliveryPerson = await deliveryPerson.save({ session });

      await session.commitTransaction();
      return savedDeliveryPerson;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getDeliveryPersons(userId: string, role: DeliveryPersonRole, vendorId?: string, page: number = 1, limit: number = 10, status?: DeliveryPersonStatus) {
    const query: any = { isDeleted: false };
    if (role === DeliveryPersonRole.VENDOR && vendorId) {
      query.assignedVendorIds = new Types.ObjectId(vendorId);
    }

    const skip = (page - 1) * limit;
    if (status) {
      query.status = status;
    }

    const deliveryPersons = await this.deliveryPersonModel.find(query).skip(skip).limit(limit).populate('profilePhoto', 'url _id publicId size').populate('userId', 'email roles').lean();

    const deliveryIds = deliveryPersons.map(person => person._id);

    const stats = await this.vendorOrderModel.aggregate([{
      $match: {
        deliveryPersonId: { $in: deliveryIds },
        status: VendorOrderStatus.DELIVERED,
      }
    }, {
      $project: {
        deliveryPersonId: 1,
        deliveryTime: {
          $subtract: ['$deliveredAt', '$readyAt']
        }
      }
    },
    {
      $group: {
        _id: '$deliveryPersonId',
        totalDeliveredOrders: { $sum: 1 },
        avgDeliveryTime: { $avg: '$deliveryTime' }
      },
    }])

    const statsMap = new Map(
      stats.map((s) => [
        s._id.toString(),
        {
          totalDeliveredOrders: s.totalDeliveredOrders,
          avgDeliveryTimeInMinutes: Math.round(
            s.avgDeliveryTime / (1000 * 60),
          ),
        },
      ]),
    );

    return deliveryPersons.map((person) => {
      const stat = statsMap.get(person._id.toString()) || {
        totalDeliveredOrders: 0,
        avgDeliveryTimeInMinutes: 0,
      };

      return {
        ...person,
        ...stat,
      };
    });
  }

  async getDeliveryPersonById(userId: string, role: DeliveryPersonRole, id: string, vendorId?: string) {
    const query: any = { _id: new Types.ObjectId(id), isDeleted: false };
    if (role === DeliveryPersonRole.VENDOR && vendorId) {
      query.assignedVendorIds = new Types.ObjectId(vendorId);
    }
    const deliveryPerson = await this.deliveryPersonModel.findOne(query).populate('profilePhoto', 'url _id publicId size').populate('userId', 'email roles').lean();

    if (!deliveryPerson) {
      throw new NotFoundException('Delivery person not found or you do not have permission to view it');
    }

    const stats = await this.vendorOrderModel.aggregate([{
      $match: {
        deliveryPersonId: new Types.ObjectId(id),
        status: VendorOrderStatus.DELIVERED
      }
    }, {
      $project: {
        deliveryTime: {
          $subtract: ['$deliveredAt', '$readyAt']
        }
      }
    }, {
      $group: {
        _id: null,
        totalDeliveredOrders: { $sum: 1 },
        avgDeliveryTime: { $avg: '$deliveryTime' },
      }
    }])

    const deliveryStats = stats[0] || {
      totalDeliveredOrders: 0,
      avgDeliveryTime: 0,
    };

    return {
      ...deliveryPerson,
      totalDeliveredOrders: deliveryStats.totalDeliveredOrders,
      avgDeliveryTimeInMinutes: Math.round(
        deliveryStats.avgDeliveryTime / (1000 * 60),
      ),
    };
  }

  // Get all active riders (no vendor filter) — used for vendor assign-rider dropdown
  async getAllActiveRiders() {
    const riders = await this.deliveryPersonModel
      .find({ isDeleted: false, isActive: true })
      .select('name phone vehicleType vehicleNumber status profilePhoto')
      .populate('profilePhoto', 'url')
      .lean();
    return riders;
  }

  async getDeliveryPersonsForVendor(vendorId: string) {
    const query: any = { isDeleted: false, assignedVendorIds: new Types.ObjectId(vendorId) };
    return await this.deliveryPersonModel.find(query)
      .populate('profilePhoto', 'url _id publicId size')
      .populate('userId', 'email roles')
      .lean();
  }

  async updateDeliveryPerson(userId: string, role: DeliveryPersonRole, id: string, dto: UpdateDeliveryPersonDto, file?: any, vendorId?: string) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const deliveryPerson = await this.deliveryPersonModel.findById(id).session(session);
      if (!deliveryPerson || deliveryPerson.isDeleted) {
        throw new NotFoundException('Delivery person not found');
      }

      if (role === DeliveryPersonRole.VENDOR) {
        const isOwner = deliveryPerson.addedBy?.toString() === userId.toString();
        const isAssigned = vendorId && deliveryPerson.assignedVendorIds?.some(vid => vid.toString() === vendorId.toString());
        if (!isOwner && !isAssigned) {
          throw new ForbiddenException('You can only update delivery persons associated with your store');
        }
      }

      if (role === DeliveryPersonRole.ADMIN && dto.assignedVendorIds && dto.assignedVendorIds.length > 0) {
        const uniqueVendorIds = [...new Set(dto.assignedVendorIds)];
        const existingVendorsCount = await this.vendorModel.countDocuments({ _id: { $in: uniqueVendorIds } }).session(session);
        if (existingVendorsCount !== uniqueVendorIds.length) {
          throw new NotFoundException('One or more vendors not found');
        }
      }

      let profilePhotoId = dto.profilePhoto;

      if (file) {
        if (deliveryPerson.profilePhoto) {
          const mediaResponse: any = await this.documentService.replace(deliveryPerson.profilePhoto.toString(), file, session);
          profilePhotoId = mediaResponse.data._id.toString();
        } else {
          const media = await this.documentService.upload(file, 'delivery-persons', userId, undefined, session);
          profilePhotoId = media._id.toString();
        }
      } else if (dto.profilePhoto && deliveryPerson.profilePhoto && deliveryPerson.profilePhoto.toString() !== dto.profilePhoto) {
        try {
          await this.documentService.deleteMedia(deliveryPerson.profilePhoto.toString(), session);
        } catch (err) {
          console.error('Failed to delete old profile photo:', err);
        }
      }

      // Update User if needed
      if (dto.email || dto.password || dto.name || dto.phone || profilePhotoId) {
        const linkedUser = await this.userModel.findById(deliveryPerson.userId).session(session);
        if (linkedUser) {
          if (dto.email && dto.email !== linkedUser.email) {
            const emailExists = await this.userModel.findOne({ email: dto.email }).session(session);
            if (emailExists) throw new BadRequestException('Email already exists');
            linkedUser.email = dto.email;
          }
          if (dto.password) {
            linkedUser.password = await bcrypt.hash(dto.password, 10);
          }
          if (dto.name) linkedUser.name = dto.name;
          if (dto.phone) linkedUser.phone = dto.phone;
          if (profilePhotoId) linkedUser.avatar = new Types.ObjectId(profilePhotoId);
          await linkedUser.save({ session });
        }
      }

      const filteredFields: any = filteredObject(dto);
      if (profilePhotoId) {
        filteredFields.profilePhoto = new Types.ObjectId(profilePhotoId);
      }

      // Passwords and emails are stored in User schema, we can remove password from payload just in case
      delete filteredFields.password;
      delete filteredFields.email;

      if (role === DeliveryPersonRole.VENDOR) {
        delete filteredFields.assignedVendorIds;
      } else if (filteredFields.assignedVendorIds) {
        filteredFields.assignedVendorIds = filteredFields.assignedVendorIds.map((vid: string) => new Types.ObjectId(vid));
      }

      const updated = await this.deliveryPersonModel.findByIdAndUpdate(
        id,
        { $set: filteredFields },
        { new: true, session }
      );

      await session.commitTransaction();
      return updated;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async deleteDeliveryPerson(userId: string, role: DeliveryPersonRole, id: string, vendorId?: string) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const deliveryPerson = await this.deliveryPersonModel.findById(id).session(session);
      if (!deliveryPerson || deliveryPerson.isDeleted) {
        throw new NotFoundException('Delivery person not found');
      }

      if (role === DeliveryPersonRole.VENDOR) {
        const isOwner = deliveryPerson.addedBy?.toString() === userId.toString();
        const isAssigned = vendorId && deliveryPerson.assignedVendorIds?.some(vid => vid.toString() === vendorId.toString());
        if (!isOwner && !isAssigned) {
          throw new ForbiddenException('You can only delete delivery persons associated with your store');
        }
      }

      if (deliveryPerson.profilePhoto) {
        try {
          await this.documentService.deleteMedia(deliveryPerson.profilePhoto.toString(), session);
        } catch (err) {
          console.error('Failed to delete profile photo:', err);
        }
      }

      const hasOrders = await this.vendorOrderModel.exists({
        deliveryPersonId: new Types.ObjectId(id)
      }).session(session);

      if (hasOrders) {
        await this.deliveryPersonModel.findByIdAndUpdate(
          id,
          { $set: { isDeleted: true, isActive: false, profilePhoto: null } },
          { new: true, session }
        );

        // Optionally deactivate the User
        if (deliveryPerson.userId) {
          await this.userModel.findByIdAndUpdate(
            deliveryPerson.userId,
            { isDeleted: true },
            { session }
          );
        }
      } else {
        await this.deliveryPersonModel.findByIdAndDelete(id).session(session);

        // Hard delete user as well
        if (deliveryPerson.userId) {
          await this.userModel.findByIdAndDelete(deliveryPerson.userId).session(session);
        }
      }

      await session.commitTransaction();
      return { message: 'Delivery person deleted successfully' };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async updateStatus(userId: string, status?: DeliveryPersonStatus, coordinates?: number[]) {
    let deliveryPerson = await this.deliveryPersonModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!deliveryPerson) {
      deliveryPerson = new this.deliveryPersonModel({
        userId: new Types.ObjectId(userId),
        name: 'Express Rider',
        phone: '9999999999',
        status: status || DeliveryPersonStatus.AVAILABLE,
        location: {
          type: 'Point',
          coordinates: coordinates && coordinates.length === 2 ? coordinates : [77.1025, 28.7041]
        }
      });
    } else {
      if (status) deliveryPerson.status = status;
      if (coordinates && coordinates.length === 2) {
        deliveryPerson.location = {
          type: 'Point',
          coordinates
        };
      }
    }

    await deliveryPerson.save();
    return { success: true, message: 'Status updated successfully', data: deliveryPerson };
  }

  async getOwnProfile(userId: string) {
    let deliveryPerson = await this.deliveryPersonModel.findOne({ userId: new Types.ObjectId(userId), isDeleted: false })
      .populate('profilePhoto', 'url _id publicId size')
      .populate('userId', 'name email phone roles avatar')
      .lean();

    const user = await this.userModel.findById(userId).lean();

    if (!deliveryPerson) {
      return {
        _id: null,
        userId,
        name: user?.name || 'Express Rider',
        email: user?.email || '',
        phone: user?.phone || '',
        status: DeliveryPersonStatus.OFFLINE,
        vehicleType: 'scooter',
        vehicleNumber: 'N/A',
        totalDeliveredOrders: 0,
        avgDeliveryTimeInMinutes: 0
      };
    }

    const stats = await this.vendorOrderModel.aggregate([
      {
        $match: {
          deliveryPersonId: deliveryPerson._id,
          status: VendorOrderStatus.DELIVERED
        }
      },
      {
        $project: {
          deliveryTime: { $subtract: ['$deliveredAt', '$readyAt'] }
        }
      },
      {
        $group: {
          _id: null,
          totalDeliveredOrders: { $sum: 1 },
          avgDeliveryTime: { $avg: '$deliveryTime' }
        }
      }
    ]);

    const deliveryStats = stats[0] || { totalDeliveredOrders: 0, avgDeliveryTime: 0 };

    return {
      ...deliveryPerson,
      name: deliveryPerson.name || user?.name || 'Express Rider',
      email: (deliveryPerson.userId as any)?.email || user?.email || '',
      phone: deliveryPerson.phone || user?.phone || '',
      totalDeliveredOrders: deliveryStats.totalDeliveredOrders,
      avgDeliveryTimeInMinutes: Math.round((deliveryStats.avgDeliveryTime || 0) / (1000 * 60))
    };
  }

  async updateOwnProfile(userId: string, dto: UpdateDeliveryPersonDto, file?: any) {
    let deliveryPerson = await this.deliveryPersonModel.findOne({ userId: new Types.ObjectId(userId), isDeleted: false });

    if (!deliveryPerson) {
      deliveryPerson = new this.deliveryPersonModel({
        userId: new Types.ObjectId(userId),
        name: dto.name || 'Express Rider',
        phone: dto.phone || '9999999999',
        email: dto.email || 'rider@express.com',
        vehicleType: dto.vehicleType || 'scooter',
        vehicleNumber: dto.vehicleNumber || '',
        status: DeliveryPersonStatus.AVAILABLE
      });
      await deliveryPerson.save();
    }

    return this.updateDeliveryPerson(userId, DeliveryPersonRole.ADMIN, deliveryPerson._id.toString(), dto, file);
  }
}
