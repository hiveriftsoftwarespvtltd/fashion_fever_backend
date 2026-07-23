import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Vendor, VendorDocument } from "src/vendor/schema/vendor.schema";
import { VendorQuickOrder, VendorOrderDocument } from "./schema/quick-vendor-order.schema";

import { AdminQuickCommerceDashboardFilterDto } from "./dto/quick-admin.dto";

@Injectable()
export class QuickAdminService {
  constructor(
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
    @InjectModel(VendorQuickOrder.name) private vendorOrderModel: Model<VendorOrderDocument>,
  ) { }

  async getQuickCommerceVendors(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const query = { 'quickCommerce.enabled': true };

    const vendors = await this.vendorModel
      .find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    const total = await this.vendorModel.countDocuments(query);

    return {
      message: 'Quick commerce vendors retrieved successfully',
      data: {
        vendors,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getOverallDashboardData(filters: AdminQuickCommerceDashboardFilterDto) {
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.vendorId) {
      query.vendorId = filters.vendorId;
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

    const orders = await this.vendorOrderModel.find(query).sort({ createdAt: -1 }).exec();

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

    return {
      message: 'Admin quick commerce dashboard data retrieved successfully',
      data: {
        stats: {
          totalOrders,
          totalRevenue,
        },
        orders,
      },
    };
  }
}
