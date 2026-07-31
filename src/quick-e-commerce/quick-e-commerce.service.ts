import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument, ProductStatus } from 'src/product/schema/product.schema';
import { ProductVariant, ProductVariantDocument } from 'src/product/schema/product-variant.schema';
import { Vendor, VendorDocument } from 'src/vendor/schema/vendor.schema';
import { Address, AddressDocument } from 'src/address/schema/address.schema';
import { QuickECommerceQueryDto } from './dto/quick-e-commerce-query.dto';

@Injectable()
export class QuickECommerceService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(ProductVariant.name) private productVariantModel: Model<ProductVariantDocument>,
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
    @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
  ) { }

  async getProducts(query: QuickECommerceQueryDto, user: any) {
    const { page = 1, limit = 10, search, category, minPrice, maxPrice, addressId, pincode } = query;
    const skip = (page - 1) * limit;

    const matchStage: any = {
      isActive: true,
      isDeleted: false,
      status: ProductStatus.ACTIVE,
    };

    let resolvedPincode = pincode;

    if (!resolvedPincode && user && addressId) {
      const address = await this.addressModel.findOne({
        _id: new Types.ObjectId(addressId),
        user: new Types.ObjectId(user._id),
      });
      if (address) {
        resolvedPincode = address.pincode?.toString();
      }
    }

    // Find all vendors who have enabled Quick Commerce or are accepting orders
    let qcVendors = await this.vendorModel.find({
      $or: [
        { 'quickCommerce.acceptingOrders': true },
        { 'quickCommerce.enabled': true }
      ]
    });

    if (qcVendors.length > 0) {
      if (resolvedPincode) {
        const cleanPincode = resolvedPincode.toString().trim();
        const pincodeMatched = qcVendors.filter(v => v.vendorPincode === cleanPincode);
        if (pincodeMatched.length > 0) {
          matchStage.vendorId = { $in: pincodeMatched.map(v => v._id) };
        } else {
          // Fallback to all active QC vendors so products are never hidden
          matchStage.vendorId = { $in: qcVendors.map(v => v._id) };
        }
      } else {
        matchStage.vendorId = { $in: qcVendors.map(v => v._id) };
      }
    }

    if (category) {
      if (Types.ObjectId.isValid(category)) {
        matchStage.categoryId = new Types.ObjectId(category);
      } else {
        matchStage.category = { $regex: category, $options: 'i' };
      }
    }

    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceQuery: any = { isActive: true, isDeleted: false };
      const priceMatch: any = {};
      if (minPrice !== undefined) priceMatch.$gte = minPrice;
      if (maxPrice !== undefined) priceMatch.$lte = maxPrice;
      priceQuery.offeredPrice = priceMatch;

      const matchingVariants = await this.productVariantModel.find(priceQuery).select('productId');
      const matchingProductIds = matchingVariants.map(v => v.productId);

      matchStage._id = { $in: matchingProductIds };
    }


    const [products, total] = await Promise.all([
      this.productModel
        .find(matchStage)
        .populate({
          path: 'variants',
          populate: [
            { path: 'thumbnail', select: 'url publicId type originalName' },
            { path: 'images', select: 'url publicId type originalName' },
          ],
        })
        .populate({ path: 'categoryId', select: 'name' })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.productModel.countDocuments(matchStage).exec(),
    ]);

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

