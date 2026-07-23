import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RoleStatus, User, UserDocument, UserRole } from './schema/user.schema';
import { Model, Types } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Media, MediaDocument } from 'src/document/schema/document.schema';
import { DocumentService } from 'src/document/document.service';

import { StorageFactory } from 'src/document/storage/storage.factory';
import { ApiResponse } from 'src/common/responses/api-response';
import {
  Product,
  ProductDocument,
  ProductStatus,
} from 'src/product/schema/product.schema';
import { AddressService } from 'src/address/address.service';
import { AddAddressDTO, UpdateAddressDTO } from 'src/address/dto/address.dto';
import {
  Wishlist,
  WishlistDocument,
} from 'src/wishlist/schema/wishlist.schema';
import { ShiprocketService } from 'src/shiprocket/shiprocket.service';
import { Address, AddressDocument } from 'src/address/schema/address.schema';
import { VendorOrder, VendorOrderDocument } from 'src/order/schema/vendor-order.schema';
import { Cart, CartDocument } from 'src/cart/schema/cart.schema';
import { OrderStatus } from 'src/order/schema/order.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Media.name) private mediaModel: Model<MediaDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Wishlist.name) private wishlistModel: Model<WishlistDocument>,
    @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
    private documentService: DocumentService,
    private StorageFactory: StorageFactory,
    private addressService: AddressService,
    private shiprocketService: ShiprocketService,
    @InjectModel(VendorOrder.name) private vendorOrderModel: Model<VendorOrderDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
  ) { }

  async create(dto: CreateUserDto) {
    return this.userModel.create(dto);
  }

  async findAll() {
    return this.userModel.find().select('-password');
  }

  async findById(id: string) {
    const user = await this.userModel.findById(id).select('-password');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string) {
    const user = await this.userModel.findOne({ email });
    return user;
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    const user = await this.userModel
      .findById(userId)
      .select('email name phone role');
    if (!user) {
      throw new NotFoundException('User Not Found');
    }

    if (dto.name.trim()) user.name = dto.name;
    if (dto.phone.trim()) user.phone = dto.phone;

    await user.save();
    return ApiResponse.success('Your changes updated successfully', user, 200);
  }

  async removeUser(id: string) {
    const user = await this.userModel.findByIdAndDelete(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { message: 'User deleted successfully' };
  }

  async deletAccount(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found ');
    }

    user.isDeleted = true;
    user.save();

    return ApiResponse.success('Your Account deleted Successfully', null, 200);
  }

  async uploadAvatar(userId: string, file: any) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!file) {
      throw new BadRequestException('File is required');
    }
    const response = await this.documentService.upload(file, 'avatar', userId);

    const newMedia = response;

    if (user.avatar) {
      const oldMedia = await this.mediaModel.findById(user.avatar);

      if (oldMedia) {
        const storage = this.StorageFactory.getStorage(oldMedia.storage);
        await storage.delete(oldMedia.publicId);
        await oldMedia.deleteOne();
      }
    }

    if (!newMedia || !newMedia._id) {
      throw new BadRequestException('Upload failed');
    }

    user.avatar = newMedia._id;
    await user.save();

    return ApiResponse.success(
      'User Avatar Changes Successfully',
      newMedia.url,
      200,
    );
  }

  async deleteUserAvatar(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.avatar) {
      throw new NotFoundException('Avatar not found for this user');
    }

    const media = await this.mediaModel.findById(user.avatar);
    if (media) {
      const storage = await this.StorageFactory.getStorage(media.storage);
      await storage.delete(media.publicId);
      await media.deleteOne();
    }

    user.avatar = undefined;
    await user.save();
    return ApiResponse.success('Avatar Deleted Successfully', 200);
  }

  async getUserAvatar(userId: string) {
    const user = await this.userModel.findById(userId).populate('avatar');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.avatar) {
      throw new NotFoundException('User Avatar not found');
    }
    return ApiResponse.success('User avatar fetched successfully', user, 200);
  }


  async fetchProducts(
    userId: string,
    category?: string,
    minPrice?: number,
    maxPrice?: number,
    search?: string,
    page = 1,
    limit = 10,
    brand?: string,
    isShippingApply?: boolean,
  ) {
    page = Math.max(1, Number(page) || 1);
    limit = Math.max(1, Number(limit) || 10);

    const skip = (page - 1) * limit;

    const matchStage: any = {
      isDeleted: false,
      isActive: true,
      status: ProductStatus.ACTIVE,
    };

    const pipeline: any[] = [
      {
        $match: matchStage,
      },


      // Brand Filter
      ...(brand
        ? [
          {
            $match: {
              brand: {
                $regex: brand,
                $options: 'i',
              },
            },
          },
        ]
        : []),

      ...(isShippingApply !== undefined
        ? [
          {
            $match: {
              isShippingApply,
            },
          },
        ]
        : []),

      // Category Lookup
      {
        $lookup: {
          from: 'categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },

      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true,
        },
      },

      // Category Filter
      ...(category
        ? [
          {
            $match: {
              'category.name': {
                $regex: category,
                $options: 'i',
              },
            },
          },
        ]
        : []),

      // Variants Lookup
      {
        $lookup: {
          from: 'productvariants',
          localField: 'variants',
          foreignField: '_id',
          as: 'variants',
        },
      },

      // Search Filter
      ...(search
        ? [
          {
            $match: {
              $or: [
                {
                  name: {
                    $regex: search,
                    $options: 'i',
                  },
                },
                {
                  tags: {
                    $elemMatch: {
                      $regex: search,
                      $options: 'i',
                    },
                  },
                },
                {
                  'category.name': {
                    $regex: search,
                    $options: 'i',
                  },
                },
                {
                  'variants.sku': {
                    $regex: search,
                    $options: 'i',
                  },
                },
              ],
            },
          },
        ]
        : []),

      // Offered Price Filter
      ...(minPrice || maxPrice
        ? [
          {
            $match: {
              variants: {
                $elemMatch: {
                  offeredPrice: {
                    ...(minPrice
                      ? { $gte: Number(minPrice) }
                      : {}),
                    ...(maxPrice
                      ? { $lte: Number(maxPrice) }
                      : {}),
                  },
                },
              },
            },
          },
        ]
        : []),

      // Vendor Lookup
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

      // Thumbnail Lookup
      {
        $lookup: {
          from: 'media',
          localField: 'variants.thumbnail',
          foreignField: '_id',
          as: 'thumbnails',
        },
      },

      // Images Lookup
      {
        $lookup: {
          from: 'media',
          localField: 'variants.images',
          foreignField: '_id',
          as: 'images',
        },
      },

      {
        $project: {
          name: 1,
          slug: 1,
          description: 1,
          averageRating: 1,
          totalReviews: 1,
          isShippingApply: 1,
          createdAt: 1,

          category: {
            _id: '$category._id',
            name: '$category.name',
            label: '$category.label',
            slug: '$category.slug',
          },

          vendor: {
            _id: '$vendor._id',
            businessName: '$vendor.businessName',
            vendorPincode: '$vendor.vendorPincode',
          },

          variants: {
            $filter: {
              input: {
                $map: {
                  input: '$variants',
                  as: 'variant',
                  in: {
                    _id: '$$variant._id',
                    sku: '$$variant.sku',

                    costPrice: '$$variant.costPrice',
                    salesPrice: '$$variant.salesPrice',
                    offeredPrice: '$$variant.offeredPrice',

                    stock: '$$variant.stock',

                    weight: '$$variant.weight',
                    length: '$$variant.length',
                    width: '$$variant.width',
                    height: '$$variant.height',

                    attributes: '$$variant.attributes',

                    thumbnail: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$thumbnails',
                            as: 'thumb',
                            cond: {
                              $eq: [
                                '$$thumb._id',
                                '$$variant.thumbnail',
                              ],
                            },
                          },
                        },
                        0,
                      ],
                    },

                    images: {
                      $filter: {
                        input: '$images',
                        as: 'image',
                        cond: {
                          $in: [
                            '$$image._id',
                            '$$variant.images',
                          ],
                        },
                      },
                    },
                  },
                },
              },

              // Return only matching variants when price filter is applied
              as: 'variant',
              cond:
                minPrice || maxPrice
                  ? {
                    $and: [
                      ...(minPrice
                        ? [
                          {
                            $gte: [
                              '$$variant.offeredPrice',
                              Number(minPrice),
                            ],
                          },
                        ]
                        : []),
                      ...(maxPrice
                        ? [
                          {
                            $lte: [
                              '$$variant.offeredPrice',
                              Number(maxPrice),
                            ],
                          },
                        ]
                        : []),
                    ],
                  }
                  : true,
            },
          },
        },
      },

      // Remove products having no variants after filtering
      ...(minPrice || maxPrice
        ? [
          {
            $match: {
              'variants.0': { $exists: true },
            },
          },
        ]
        : []),

      {
        $sort: {
          createdAt: -1,
        },
      },

      {
        $facet: {
          data: [
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
          ],

          totalCount: [
            {
              $count: 'count',
            },
          ],
        },
      },
    ];

    const result = await this.productModel.aggregate(pipeline);

    const products = result?.[0]?.data || [];

    const total =
      result?.[0]?.totalCount?.[0]?.count || 0;

    const totalPages = Math.ceil(total / limit);

    let userPincode: string | null = null;

    if (userId) {
      const defaultAddress = await this.addressModel.findOne({
        user: new Types.ObjectId(userId),
      });

      if (defaultAddress) {
        userPincode = defaultAddress.pincode;
      }
    }

    const updatedProducts = await Promise.all(
      products.map(async (product: any) => {
        const variants = await Promise.all(
          product.variants.map(async (variant: any) => {
            let shipping: any = null;

            if (
              userPincode &&
              product.vendor?.vendorPincode &&
              product.isShippingApply
            ) {
              try {
                shipping =
                  await this.shiprocketService.calculateShippingForVariant(
                    product.vendor.vendorPincode,
                    userPincode,
                    variant,
                    0,
                  );
              } catch (error) {
                shipping = null;
              }
            }

            return {
              ...variant,
              shipping,
            };
          }),
        );

        return {
          ...product,
          variants,
        };
      }),
    );

    return ApiResponse.success(
      'Products fetched successfully',
      {
        products: updatedProducts,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    );
  }
  async fetchProductDetails(userId: string, productId: string) {
    const product = await this.productModel
      .findById(new Types.ObjectId(productId))
      .populate('categoryId')
      .populate('vendorId')
      .populate({
        path: 'variants',
        populate: [
          {
            path: 'thumbnail',
            select: '_id url publicId'
          },
          {
            path: 'images',
            select: '_id url publicId'
          }
        ],
      })
      .lean();
    if (!product) {
      throw new NotFoundException('Product Not Found');
    }

    let vendor: any = null;
    vendor = product.vendorId;

    if (userId) {
      const wishlist = await this.wishlistModel.findOne({
        user: new Types.ObjectId(userId),
        'items.product': new Types.ObjectId(productId),
      });

      product['isWishlisted'] = !!wishlist;
    }

    let userPincode: string | null = null;

    if (userId) {
      const defaultAddress = await this.addressModel.findOne({
        user: new Types.ObjectId(userId),

      });

      if (defaultAddress) {
        userPincode = defaultAddress.pincode;
      }
    }

    const updatedVariants = await Promise.all(
      product.variants.map(async (variant: any) => {
        let shipping: any = null;

        if (userPincode) {
          shipping = await this.shiprocketService.calculateShippingForVariant(
            vendor.vendorPincode,
            userPincode,
            variant,
            0,
          );
        }

        return {
          ...variant,
          shipping,
        };
      }),
    );

    product['variants'] = updatedVariants;

    return ApiResponse.success('Product Details Fetched!', product);
  }

  async getBrands() {
    const brands = await this.productModel.aggregate([
      {
        $match: {
          isDeleted: false,
          isActive: true,
          status: ProductStatus.ACTIVE,
          brand: {
            $exists: true,
            $ne: '',
          },
        },
      },
      {
        $group: {
          _id: '$brand',
          totalProducts: { $sum: 1 },
          firstVariantId: { $first: { $arrayElemAt: ['$variants', 0] } },
        },
      },
      {
        $lookup: {
          from: 'productvariants',
          localField: 'firstVariantId',
          foreignField: '_id',
          as: 'variantDetails',
        },
      },
      {
        $unwind: {
          path: '$variantDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'media',
          localField: 'variantDetails.thumbnail',
          foreignField: '_id',
          as: 'thumbnailMedia',
        },
      },
      {
        $unwind: {
          path: '$thumbnailMedia',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          brand: '$_id',
          totalProducts: 1,
          image: '$thumbnailMedia.url',
        },
      },
      {
        $sort: {
          brand: 1,
        },
      },
    ]);

    return ApiResponse.success(
      'Brands fetched successfully',
      brands,
    );
  }

  async addAddress(dto: AddAddressDTO, userId: string) {
    return await this.addressService.addAddress(dto, userId);
  }

  async fetchAddresses(userId: string) {
    return await this.addressService.fetchAddress(userId);
  }

  async fetchAddressDetails(userId: string, addressId: string) {
    return await this.addressService.fetchAddressDetails(userId, addressId);
  }

  async updateAddress(
    dto: UpdateAddressDTO,
    userId: string,
    addressId: string,
  ) {
    return await this.addressService.updateAddress(dto, userId, addressId);
  }

  async deleteAddress(userId: string, addressId: string) {
    return await this.addressService.deleteAddress(userId, addressId);
  }

  async getTopSellingProducts(limit: number = 10) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 90);

    const matchStage = {
      createdAt: { $gte: thirtyDaysAgo },
      orderStatus: { $nin: [OrderStatus.CANCELLED, OrderStatus.PARTIALLY_CANCELLED, OrderStatus.RETURNED, OrderStatus.PARTIALLY_RETURNED] }
    };

    const topSelling = await this.vendorOrderModel.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalQuantitySold: { $sum: '$items.quantity' }
        }
      },
      { $sort: { totalQuantitySold: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'productvariants',
          localField: 'product.variants',
          foreignField: '_id',
          as: 'product.variants'
        }
      },
      {
        $lookup: {
          from: 'media',
          localField: 'product.variants.thumbnail',
          foreignField: '_id',
          as: 'thumbnails'
        }
      },
      {
        $lookup: {
          from: 'media',
          localField: 'product.variants.images',
          foreignField: '_id',
          as: 'images'
        }
      },
      {
        $project: {
          _id: 0,
          totalQuantitySold: 1,
          product: {
            _id: '$product._id',
            name: '$product.name',
            slug: '$product.slug',
            description: '$product.description',
            brand: '$product.brand',
            averageRating: '$product.averageRating',
            totalReviews: '$product.totalReviews',
            isShippingApply: '$product.isShippingApply',
            variants: {
              $map: {
                input: '$product.variants',
                as: 'variant',
                in: {
                  _id: '$$variant._id',
                  sku: '$$variant.sku',
                  salesPrice: '$$variant.salesPrice',
                  offeredPrice: '$$variant.offeredPrice',
                  stock: '$$variant.stock',
                  thumbnail: {
                    $let: {
                      vars: {
                        thumb: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: '$thumbnails',
                                as: 'thumb',
                                cond: { $eq: ['$$thumb._id', '$$variant.thumbnail'] }
                              }
                            },
                            0
                          ]
                        }
                      },
                      in: {
                        _id: '$$thumb._id',
                        publicId: '$$thumb.publicId',
                        url: '$$thumb.url'
                      }
                    }
                  },
                  images: {
                    $map: {
                      input: {
                        $filter: {
                          input: '$images',
                          as: 'image',
                          cond: { $in: ['$$image._id', '$$variant.images'] }
                        }
                      },
                      as: 'image',
                      in: {
                        _id: '$$image._id',
                        publicId: '$$image.publicId',
                        url: '$$image.url'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]);

    return ApiResponse.success('Top selling products fetched successfully', topSelling);
  }

  async getTrendingProducts(limit: number = 10) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 90);

    const ordersQuery = [
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
          orderStatus: { $nin: [OrderStatus.CANCELLED, OrderStatus.PARTIALLY_CANCELLED, OrderStatus.RETURNED, OrderStatus.PARTIALLY_RETURNED] }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          score: { $sum: { $multiply: ['$items.quantity', 3] } } // Weight purchases by 3
        }
      }
    ];

    const cartsQuery = [
      {
        $match: {
          updatedAt: { $gte: sevenDaysAgo }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          score: { $sum: '$items.quantity' } // Weight cart adds by 1
        }
      }
    ];

    const [recentSales, recentCarts] = await Promise.all([
      this.vendorOrderModel.aggregate(ordersQuery),
      this.cartModel.aggregate(cartsQuery)
    ]);

    const productScores = new Map<string, number>();

    recentSales.forEach(item => {
      const id = item._id.toString();
      productScores.set(id, (productScores.get(id) || 0) + item.score);
    });

    recentCarts.forEach(item => {
      const id = item._id.toString();
      productScores.set(id, (productScores.get(id) || 0) + item.score);
    });

    // Sort map by score descending
    const sortedProducts = Array.from(productScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(entry => ({ productId: entry[0], trendScore: entry[1] }));

    if (sortedProducts.length === 0) {
      return ApiResponse.success('Trending products fetched successfully', []);
    }

    const productIds = sortedProducts.map(p => new Types.ObjectId(p.productId));

    const productsData = await this.productModel.aggregate([
      { $match: { _id: { $in: productIds }, isDeleted: false, isActive: true, status: ProductStatus.ACTIVE } },
      {
        $lookup: {
          from: 'productvariants',
          localField: 'variants',
          foreignField: '_id',
          as: 'variants'
        }
      },
      {
        $lookup: {
          from: 'media',
          localField: 'variants.thumbnail',
          foreignField: '_id',
          as: 'thumbnails'
        }
      },
      {
        $lookup: {
          from: 'media',
          localField: 'variants.images',
          foreignField: '_id',
          as: 'images'
        }
      },
      {
        $project: {
          name: 1,
          slug: 1,
          description: 1,
          brand: 1,
          averageRating: 1,
          totalReviews: 1,
          isShippingApply: 1,
          variants: {
            $map: {
              input: '$variants',
              as: 'variant',
              in: {
                _id: '$$variant._id',
                sku: '$$variant.sku',
                salesPrice: '$$variant.salesPrice',
                offeredPrice: '$$variant.offeredPrice',
                stock: '$$variant.stock',
                thumbnail: {
                  $let: {
                    vars: {
                      thumb: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$thumbnails',
                              as: 'thumb',
                              cond: { $eq: ['$$thumb._id', '$$variant.thumbnail'] }
                            }
                          },
                          0
                        ]
                      }
                    },
                    in: {
                      _id: '$$thumb._id',
                      publicId: '$$thumb.publicId',
                      url: '$$thumb.url'
                    }
                  }
                },
                images: {
                  $map: {
                    input: {
                      $filter: {
                        input: '$images',
                        as: 'image',
                        cond: { $in: ['$$image._id', '$$variant.images'] }
                      }
                    },
                    as: 'image',
                    in: {
                      _id: '$$image._id',
                      publicId: '$$image.publicId',
                      url: '$$image.url'
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]);

    // Map back the scores to the products and order them
    const trendingList = sortedProducts.map(sp => {
      const prod = productsData.find(p => p._id.toString() === sp.productId);
      return prod ? { ...prod, trendScore: sp.trendScore } : null;
    }).filter(p => p !== null);

    return ApiResponse.success('Trending products fetched successfully', trendingList);
  }

  async getRequestedRoles(userId: string) {
    const user = await this.userModel.findById(new Types.ObjectId(userId));
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const roleStatus = user.roleStatus;
    return ApiResponse.success('Requested roles fetched successfully', roleStatus);
  }

  async applyRoles(userId: string, roles: UserRole[]) {
    const user = await this.userModel.findById(new Types.ObjectId(userId));
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const allowedRoles = [UserRole.EDUCATOR, UserRole.VENDOR, UserRole.SERVICE_PROVIDER];
    let isModified = false;

    for (const role of roles) {
      if (!allowedRoles.includes(role)) {
        throw new BadRequestException(`You cannot apply for the ${role} role directly.`);
      }

      if (!user.roleStatus.has(role)) {
        user.roleStatus.set(role, RoleStatus.NOT_ONBOARDED);
        isModified = true;
      } else {
        throw new BadRequestException(`You have already applied for the ${role} role.`);
      }
    }

    if (isModified) {
      await user.save();
    }

    return ApiResponse.success('Applied for roles successfully', user.roleStatus);
  }
}
