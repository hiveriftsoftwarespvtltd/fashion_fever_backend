import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotFoundError } from 'rxjs';
import { ApiResponse } from 'src/common/responses/api-response';
import { DocumentService } from 'src/document/document.service';
import {
  Order,
  OrderDocument,
  PaymentStatus,
} from 'src/order/schema/order.schema';
import { Category, CategoryDocument } from 'src/product/schema/category.schema';
import {
  ProductVariant,
  ProductVariantDocument,
} from 'src/product/schema/product-variant.schema';
import { Product, ProductDocument } from 'src/product/schema/product.schema';
import { User, UserDocument, UserRole } from 'src/user/schema/user.schema';
import {
  Vendor,
  VendorDocument,
  VendorSchema,
} from 'src/vendor/schema/vendor.schema';
import { UpdateVendorDTO } from './dto/vendor.dto';
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
  VendorPayout,
  VendorPayoutDocument,
} from 'src/vendor/schema/vendor-payout.schema';
import {
  Influencer,
  InfluencerDocument,
} from 'src/influencer/schema/influencer.schema';

@Injectable()
export class AdminDashboardService {
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
    @InjectModel(Influencer.name)
    private influencerModel: Model<InfluencerDocument>,
  ) {}

  async TopVendors(limit = 10) {
    return this.vendorOrderModel.aggregate([
      {
        $group: {
          _id: '$vendorId',
          totalOrders: {
            $sum: 1,
          },
          totalRevenue: {
            $sum: '$grandTotal',
          },
        },
      },
      {
        $sort: {
          totalRevenue: -1,
        },
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'vendors',
          localField: '_id',
          foreignField: '_id',
          as: 'Vendor',
        },
      },
      {
        $unwind: '$vendor',
      },
      {
        $project: {
          _id: 0,
          vendorId: '$vendor._id',
          vendorName: '$vendor.businessName',
          totalOrders: 1,
          totalRevenue: 1,
        },
      },
    ]);
  }

  async topCategories(limit = 10) {
    limit = Number(limit) || 10;

    return this.vendorOrderModel.aggregate([
      {
        $unwind: '$items',
      },

      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product',
        },
      },

      {
        $unwind: '$product',
      },

      {
        $lookup: {
          from: 'categories',
          localField: 'product.categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },

      {
        $unwind: '$category',
      },

      // populate category image
      {
        $lookup: {
          from: 'media',
          localField: 'category.image',
          foreignField: '_id',
          as: 'categoryImage',
        },
      },

      {
        $unwind: {
          path: '$categoryImage',
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $group: {
          _id: '$category._id',

          category: {
            $first: {
              _id: '$category._id',
              name: '$category.name',
              label: '$category.label',
              slug: '$category.slug',
              description: '$category.description',

              image: '$categoryImage',
            },
          },

          totalSales: {
            $sum: '$items.finalPrice',
          },

          totalOrders: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          totalSales: -1,
        },
      },

      {
        $limit: limit,
      },

      {
        $project: {
          _id: 0,

          category: 1,

          totalSales: 1,

          totalOrders: 1,
        },
      },
    ]);
  }

  async orderStatusAnalytics() {
    return this.orderModel.aggregate([
      {
        $group: {
          _id: '$orderStatus',

          count: {
            $sum: 1,
          },
        },
      },

      {
        $project: {
          _id: 0,

          status: '$_id',

          count: 1,
        },
      },

      {
        $sort: {
          count: -1,
        },
      },
    ]);
  }

  async getAdminOverview() {
    const [
      totalUser,
      totalVendors,
      totalInfluencers,
      totalOrders,
      revenue,
      pendingPayouts,
      pendingComissions,
    ] = await Promise.all([
      this.userModel.countDocuments({ role: UserRole.USER, isDeleted: false }),
      this.vendorModel.countDocuments({ isDeleted: false }),
      this.userModel.countDocuments({
        role: UserRole.INFLUENCER,
        isDeleted: false,
      }),
      this.orderModel.countDocuments({ isDeleted: false }),
      this.orderModel.aggregate([
        {
          $match: {
            paymentStatus: PaymentStatus.PAID,
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: 'grandTotal',
            },
          },
        },
      ]),
      this.vendorPayoutModel.aggregate([
        {
          $match: { isSettled: false },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: '$payoutAmount',
            },
          },
        },
      ]),
      this.influencerCommisionModel.aggregate([
        {
          $match: {
            isSettled: false,
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: '$comissionAmount',
            },
          },
        },
      ]),
    ]);

    return ApiResponse.success('Admin Dashboard Overview', {
      totalUser,
      totalVendors,
      totalInfluencers,
      totalOrders,
      totalRevenue: revenue[0]?.total || 0,
      pendingVendorPayouts: pendingPayouts[0]?.total,
      pendingInfluencerCommissions: pendingComissions[0]?.total,
    });
  }

  async getRevenueTrend(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.orderModel.aggregate([
      {
        $match: {
          paymentStatus: PaymentStatus.PAID,
          createdAt: {
            $gte: startDate,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
            },
          },
          revenue: {
            $sum: '$grandTotal',
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);
  }

  async categoryDistribution() {
    const result = await this.productModel.aggregate([
      {
        $match: {
          isDeleted: false,
        },
      },

      {
        $group: {
          _id: '$categoryId',

          productCount: {
            $sum: 1,
          },
        },
      },

      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },

      {
        $unwind: '$category',
      },

      {
        $group: {
          _id: null,

          totalProducts: {
            $sum: '$productCount',
          },

          categories: {
            $push: {
              categoryId: '$category._id',

              categoryName: '$category.label',

              productCount: '$productCount',
            },
          },
        },
      },

      {
        $unwind: '$categories',
      },

      {
        $project: {
          _id: 0,

          categoryId: '$categories.categoryId',

          categoryName: '$categories.categoryName',

          productCount: '$categories.productCount',

          percentage: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: ['$categories.productCount', '$totalProducts'],
                  },
                  100,
                ],
              },
              2,
            ],
          },
        },
      },

      {
        $sort: {
          productCount: -1,
        },
      },
    ]);

    return result;
  }

  async orderStatusGraph() {
    return this.orderModel.aggregate([
      {
        $group: {
          _id: '$orderStatus',

          count: {
            $sum: 1,
          },
        },
      },

      {
        $group: {
          _id: null,

          total: {
            $sum: '$count',
          },

          data: {
            $push: {
              status: '$_id',
              count: '$count',
            },
          },
        },
      },

      {
        $unwind: '$data',
      },

      {
        $project: {
          _id: 0,

          status: '$data.status',

          count: '$data.count',

          percentage: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: ['$data.count', '$total'],
                  },
                  100,
                ],
              },
              2,
            ],
          },
        },
      },
    ]);
  }

  async monthlyAnalytics(year: number) {
    year = Number(year);

    const startDate = new Date(`${year}-01-01`);

    const endDate = new Date(`${year}-12-31`);

    const [users, vendors, influencers, orders] = await Promise.all([
      this.userModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },

        {
          $group: {
            _id: {
              month: {
                $month: '$createdAt',
              },
            },

            count: {
              $sum: 1,
            },
          },
        },
      ]),

      this.vendorModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },

        {
          $group: {
            _id: {
              month: {
                $month: '$createdAt',
              },
            },

            count: {
              $sum: 1,
            },
          },
        },
      ]),

      this.influencerModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },

        {
          $group: {
            _id: {
              month: {
                $month: '$createdAt',
              },
            },

            count: {
              $sum: 1,
            },
          },
        },
      ]),

      this.orderModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },

        {
          $group: {
            _id: {
              month: {
                $month: '$createdAt',
              },
            },

            count: {
              $sum: 1,
            },

            revenue: {
              $sum: '$grandTotal',
            },
          },
        },
      ]),
    ]);

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const result = months.map((month, index) => {
      const monthNumber = index + 1;

      return {
        month,

        users: users.find((u) => u._id.month === monthNumber)?.count || 0,

        vendors: vendors.find((v) => v._id.month === monthNumber)?.count || 0,

        influencers:
          influencers.find((i) => i._id.month === monthNumber)?.count || 0,

        orders: orders.find((o) => o._id.month === monthNumber)?.count || 0,

        revenue: orders.find((o) => o._id.month === monthNumber)?.revenue || 0,
      };
    });

    return result;
  }

  async yearlyAnalytics() {
    return this.orderModel.aggregate([
      {
        $group: {
          _id: {
            year: {
              $year: '$createdAt',
            },
          },

          orders: {
            $sum: 1,
          },

          revenue: {
            $sum: '$grandTotal',
          },
        },
      },

      {
        $project: {
          _id: 0,

          year: '$_id.year',

          orders: 1,

          revenue: 1,
        },
      },

      {
        $sort: {
          year: 1,
        },
      },
    ]);
  }

  async analyticsGraph(year: number) {
    year = Number(year);

    const startDate = new Date(`${year}-01-01`);

    const endDate = new Date(`${year}-12-31`);

    const [orders, users, vendors, influencers] = await Promise.all([
      this.orderModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },

        {
          $group: {
            _id: {
              month: {
                $month: '$createdAt',
              },
            },

            orders: {
              $sum: 1,
            },

            revenue: {
              $sum: '$grandTotal',
            },
          },
        },
      ]),

      this.userModel.aggregate([
        {
          $match: {
            role: UserRole.USER,

            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },

        {
          $group: {
            _id: {
              month: {
                $month: '$createdAt',
              },
            },

            users: {
              $sum: 1,
            },
          },
        },
      ]),

      this.vendorModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },

        {
          $group: {
            _id: {
              month: {
                $month: '$createdAt',
              },
            },

            vendors: {
              $sum: 1,
            },
          },
        },
      ]),

      this.influencerModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },

        {
          $group: {
            _id: {
              month: {
                $month: '$createdAt',
              },
            },

            influencers: {
              $sum: 1,
            },
          },
        },
      ]),
    ]);

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    return months.map((month, index) => {
      const monthNumber = index + 1;

      const orderData = orders.find((o) => o._id.month === monthNumber);

      const userData = users.find((u) => u._id.month === monthNumber);

      const vendorData = vendors.find((v) => v._id.month === monthNumber);

      const influencerData = influencers.find(
        (i) => i._id.month === monthNumber,
      );

      return {
        label: month,

        revenue: orderData?.revenue || 0,

        orders: orderData?.orders || 0,

        users: userData?.users || 0,

        vendors: vendorData?.vendors || 0,

        influencers: influencerData?.influencers || 0,
      };
    });
  }

  async topVendorsGraph(
  limit = 10,
) {
  limit = Number(limit) || 10;

  return this.vendorOrderModel.aggregate([
    {
      $group: {
        _id: '$vendorId',

        totalRevenue: {
          $sum: '$grandTotal',
        },

        totalOrders: {
          $sum: 1,
        },
      },
    },

    {
      $sort: {
        totalRevenue: -1,
      },
    },

    {
      $limit: limit,
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

    // populate logo
    {
      $lookup: {
        from: 'media',
        localField: 'vendor.logo',
        foreignField: '_id',
        as: 'logo',
      },
    },

    {
      $unwind: {
        path: '$logo',
        preserveNullAndEmptyArrays: true,
      },
    },

    // populate banner
    {
      $lookup: {
        from: 'media',
        localField: 'vendor.banner',
        foreignField: '_id',
        as: 'banner',
      },
    },

    {
      $unwind: {
        path: '$banner',
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        _id: 0,

        totalRevenue: 1,

        totalOrders: 1,

        vendor: {
          _id: '$vendor._id',

          businessName:
            '$vendor.businessName',

          slug: '$vendor.slug',

          description:
            '$vendor.description',

          address:
            '$vendor.address',

          phone:
            '$vendor.phone',

          email:
            '$vendor.email',

          city:
            '$vendor.city',

          state:
            '$vendor.state',

          vendorPincode:
            '$vendor.vendorPincode',

          commissionRate:
            '$vendor.commissionRate',

          status:
            '$vendor.status',

          logo: '$logo',

          banner: '$banner',
        },
      },
    },
  ]);
}
}
