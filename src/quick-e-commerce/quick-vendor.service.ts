import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Vendor, VendorDocument } from "src/vendor/schema/vendor.schema";
import { VendorQuickOrder, VendorOrderDocument } from "./schema/quick-vendor-order.schema";

import { UpdateQuickCommerceDto, QuickVendorDashboardFilterDto } from "./dto/quick-vendor.dto";
import { ApiResponse } from "src/common/responses/api-response";

@Injectable()
export class QuickVendorService {
  constructor(
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
    @InjectModel(VendorQuickOrder.name) private vendorOrderModel: Model<VendorOrderDocument>,
  ) { }

  async updateQuickCommerceDetails(userId: string, updateDto: UpdateQuickCommerceDto) {
    const vendor = await this.vendorModel.findOne({
      $or: [
        { ownerId: Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null },
        { _id: Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null }
      ]
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Build $set fields for nested quickCommerce object
    const setFields: Record<string, any> = {};
    if (updateDto.enabled !== undefined) setFields['quickCommerce.enabled'] = Boolean(updateDto.enabled);
    if (updateDto.acceptingOrders !== undefined) setFields['quickCommerce.acceptingOrders'] = Boolean(updateDto.acceptingOrders);
    if (updateDto.serviceRadius !== undefined) setFields['quickCommerce.serviceRadius'] = Number(updateDto.serviceRadius);
    if (updateDto.maxConcurrentOrders !== undefined) setFields['quickCommerce.maxConcurrentOrders'] = Number(updateDto.maxConcurrentOrders);
    if (updateDto.defaultPreparationTime !== undefined) setFields['quickCommerce.defaultPreparationTime'] = Number(updateDto.defaultPreparationTime);

    const updated = await this.vendorModel.findOneAndUpdate(
      { _id: vendor._id },
      { $set: setFields },
      { new: true }
    );

    return ApiResponse.success(
      'Quick commerce settings saved successfully',
      updated?.quickCommerce,
    );
  }

  async getDashboardData(userId: string, filters: QuickVendorDashboardFilterDto) {
    const vendor = await this.vendorModel.findOne({
      $or: [
        { ownerId: Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null },
        { _id: Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null }
      ]
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const query: any = { vendorId: vendor._id };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }

    const orders = await this.vendorOrderModel.find(query)
      .populate({
        path: 'items.variantId',
        select: 'thumbnail images sku',
        populate: [
          { path: 'thumbnail', select: 'url publicId' },
          { path: 'images', select: 'url publicId' }
        ]
      })
      .populate({
        path: 'items.productId',
        select: 'name variants',
        populate: {
          path: 'variants',
          select: 'thumbnail images',
          populate: [
            { path: 'thumbnail', select: 'url publicId' },
            { path: 'images', select: 'url publicId' }
          ]
        }
      })
      .populate('deliveryPersonId')
      .populate({
        path: 'quickOrderId',
        select: 'customerId addressId shippingAddress paymentMethod paymentStatus grandTotal createdAt',
        populate: [
          { path: 'customerId', select: 'name email phone' },
          { path: 'addressId' }
        ]
      })
      .sort({ createdAt: -1 })
      .exec();

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

    return ApiResponse.success('Dashboard data retrieved successfully', {
      config: {
        enabled: vendor.quickCommerce?.enabled ?? false,
        acceptingOrders: vendor.quickCommerce?.acceptingOrders ?? false,
        serviceRadius: vendor.quickCommerce?.serviceRadius ?? 5,
        maxConcurrentOrders: vendor.quickCommerce?.maxConcurrentOrders ?? 20,
        defaultPreparationTime: vendor.quickCommerce?.defaultPreparationTime ?? 10,
      },
      stats: {
        totalOrders,
        totalRevenue,
      },
      orders,
    });
  }
}
