import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Cart, CartDocument } from './schema/cart.schema';

import { Model, Types } from 'mongoose';

import {
  Product,
  ProductDocument,
  ProductStatus,
} from 'src/product/schema/product.schema';

import {
  ProductVariant,
  ProductVariantDocument,
} from 'src/product/schema/product-variant.schema';
import { ShiprocketService } from 'src/shiprocket/shiprocket.service';
import { Vendor, VendorDocument } from 'src/vendor/schema/vendor.schema';
import { Address, AddressDocument } from 'src/address/schema/address.schema';
import { UserWallet, UserWalletDocument } from 'src/wallet/schema/user/user.wallet.schema';
import { ApiResponse } from 'src/common/responses/api-response';

export interface VendorShippingEstimate {
  vendorId: Types.ObjectId;
  vendorName: string;

  courierCompanyId: number;
  courierName: string;

  shippingCharge: number;
  freightCharge: number;
  codCharge: number;

  estimatedDays: number;
  estimatedDate: string;

  trackingPerformance: number;
  rating: number;

  itemCount: number;
}

export interface CartShippingEstimateResponse {
  shippingSummary: VendorShippingEstimate[];

  totalShippingCharge: number;

  estimatedDeliveryDays: number;
}
@Injectable()
export class CartService {

  constructor(
    @InjectModel(Cart.name)
    private cartModel: Model<CartDocument>,

    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,

    @InjectModel(ProductVariant.name)
    private productVariantModel: Model<ProductVariantDocument>,

    @InjectModel(Vendor.name)
    private vendorModel: Model<VendorDocument>,

    @InjectModel(Address.name)
    private addressModel: Model<AddressDocument>,

    @InjectModel(UserWallet.name)
    private userWalletModel: Model<UserWalletDocument>,

    private shipRocketService: ShiprocketService,

  ) { }

  private async cleanInvalidCartItems(
    cart: CartDocument,
  ): Promise<CartDocument> {
    if (!cart.items.length) {
      return cart;
    }

    const productIds = cart.items.map((item) => item.product);
    const variantIds = cart.items.map((item) => item.variant);


    const products = await this.productModel.find({
      _id: { $in: productIds },
      isDeleted: false,
      isActive: true,
    });

    const variants = await this.productVariantModel.find({
      _id: { $in: variantIds },
      isDeleted: false,
      isActive: true,
    });


    const productMap = new Map(
      products.map((product) => [product._id.toString(), product]),
    );

    const variantMap = new Map(
      variants.map((variant) => [variant._id.toString(), variant]),
    );


    const validItems = cart.items.filter((item) => {
      // const product = productMap.get(item.product.toString());
      const productId =
        item.product instanceof Types.ObjectId
          ? item.product.toString()
          : (item.product as any)._id.toString();

      const product = productMap.get(productId);

      if (!product) {
        return false;
      }

      // const variant = variantMap.get(item.variant.toString());
      const variantId =
        item.variant instanceof Types.ObjectId
          ? item.variant.toString()
          : (item.variant as any)._id.toString();

      const variant = variantMap.get(variantId);

      if (!variant) {
        return false;
      }

      // ensure variant belongs to product
      if (variant.productId.toString() !== product._id.toString()) {
        return false;
      }

      return true;
    });



    if (validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }



    return cart;
  }

  async addToCart(
    userId: string,
    productId: string,
    variantId: string,
    quantity: number = 1,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const product = await this.productModel.findOne({
      _id: productId,
      isDeleted: false,
      isActive: true,
      status: ProductStatus.ACTIVE,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const variant = await this.productVariantModel.findOne({
      _id: variantId,
      productId: product._id,
      isActive: true,
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    if (variant.stock < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    let cart = await this.cartModel.findOne({
      user: new Types.ObjectId(userId),
    });



    if (!cart) {
      cart = await this.cartModel.create({
        user: new Types.ObjectId(userId),
        items: [],
      });
    }

    await this.cleanInvalidCartItems(cart);




    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === productId &&
        item.variant.toString() === variantId,
    );




    if (existingItem) {
      const updatedQty = existingItem.quantity + quantity;

      if (updatedQty > variant.stock) {
        throw new BadRequestException('Quantity exceeds stock');
      }

      existingItem.quantity = updatedQty;
    } else {
      cart.items.push({
        product: new Types.ObjectId(productId),
        variant: new Types.ObjectId(variantId),
        quantity,
      } as any);
    }



    await cart.save();



    // return await this.fetchUserCart(userId);
    return ApiResponse.success("Item added to cart successfully", cart)
  }

  async fetchUserCart(userId: string) {


    const cart = await this.cartModel
      .findOne({ user: userId })
      .populate({
        path: 'items.product',
        populate: {
          path: 'categoryId',
        },
      })
      .populate({
        path: 'items.variant',
        populate: [
          {
            path: 'thumbnail',
            select: 'url _id publicId'
          },
          {
            path: 'images',
            select: 'url _id publicId'
          },
        ],
      });

    if (!cart) {
      return ApiResponse.success('Cart not found', { items: [] });
    }



    await this.cleanInvalidCartItems(cart);



    return ApiResponse.success('Cart fetched successfully', cart);
  }

  async clearUserCart(userId: string) {
    const cart = await this.cartModel.findOne({
      user: userId,
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }


    cart.items = [];

    await cart.save();

    return {
      message: 'Cart cleared successfully',
    };
  }

  async removeItemFromCart(userId: string, variantId: string) {
    const cart = await this.cartModel.findOne({
      user: userId,
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    await this.cleanInvalidCartItems(cart);

    const existingItem = cart.items.find(
      (item) => item.variant.toString() === variantId,
    );

    if (!existingItem) {
      throw new NotFoundException('Item not found in cart');
    }

    cart.items = cart.items.filter(
      (item) => item.variant.toString() !== variantId,
    );

    await cart.save();

    return await this.fetchUserCart(userId);
  }

  async decreaseItemQuantity(
    userId: string,
    variantId: string,
    quantity: number = 1,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const cart = await this.cartModel.findOne({
      user: new Types.ObjectId(userId),
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    await this.cleanInvalidCartItems(cart);


    const cartItem = cart.items.find(
      (item) => item.variant.toString() === variantId,
    );

    if (!cartItem) {
      throw new NotFoundException('Item not found in cart');
    }

    cartItem.quantity -= quantity;

    if (cartItem.quantity <= 0) {
      cart.items = cart.items.filter(
        (item) => item.variant.toString() !== variantId,
      );
    }

    await cart.save();

    return await this.fetchUserCart(userId);
  }

  async estimateCartSummary(userId: string, addressId: string) {
    console.log("UserId and AddressId in line 375 : ", userId, addressId)
    const address = await this.addressModel
      .findOne({
        user: new Types.ObjectId(userId),
        _id: new Types.ObjectId(addressId),
      })
      .lean();

    if (!address) {
      throw new NotFoundException('Address Not Found');
    }


    const userPinCode = address.pincode;
    const cart = await this.cartModel
      .findOne({
        user: new Types.ObjectId(userId),
      })
      .lean();






    if (!cart || !cart.items.length) {
      return {
        cartItems: [],
        cartSummary: {
          totalItems: 0,
          subTotal: 0,
          discount: 0,
          shippingCharge: 0,
          codCharge: 0,
          finalTotal: 0,
          estimatedDeliveryDays: 0,
          estimatedDeliveryDate: null,
        },
        shippingSummary: [],
        appliedCoupon: null,
      };
    }

    await this.cleanInvalidCartItems(cart);

    const productIds = cart.items.map((item) => item.product);

    const variantIds = cart.items.map((item) => item.variant);

    const products = await this.productModel
      .find({
        _id: { $in: productIds },
      })
      .lean();

    const variants = await this.productVariantModel
      .find({
        _id: { $in: variantIds },
      }).populate({ path: "thumbnail", select: "url" })
      .lean();

    const productsMap = new Map(products.map((p) => [p._id.toString(), p]));

    const variantsMap = new Map(variants.map((v) => [v._id.toString(), v]));

    const vendorIds = [
      ...new Set(products.map((product) => product.vendorId.toString())),
    ];

    const vendors = await this.vendorModel
      .find({
        _id: { $in: vendorIds },
      })
      .lean();

    const vendorMap = new Map(
      vendors.map((vendor) => [vendor._id.toString(), vendor]),
    );

    const vendorsGroup = new Map<string, typeof cart.items>();

    const cartItems: any[] = [];

    let subTotal = 0;

    for (const item of cart.items) {
      const product = productsMap.get(item.product.toString());

      const variant = variantsMap.get(item.variant.toString());

      if (!product || !variant) {
        continue;
      }

      const price =
        variant.offeredPrice

      const totalPrice = price * item.quantity;

      subTotal += totalPrice;

      cartItems.push({
        productId: product._id,
        productName: product.name,

        variantId: variant._id,

        quantity: item.quantity,

        thumbnail: variant.thumbnail,
        attributes: variant.attributes,

        unitPrice: price,

        totalPrice,

        shippingApplicable: product.isShippingApply,
      });

      // only group items which require shipping
      if (!product.isShippingApply) {
        continue;
      }

      const vendorId = product.vendorId.toString();

      if (!vendorsGroup.has(vendorId)) {
        vendorsGroup.set(vendorId, []);
      }

      vendorsGroup.get(vendorId)!.push(item);
    }

    const shippingSummary: any[] = [];

    let totalShippingCharge = 0;
    let totalCodCharge = 0;

    for (const [vendorId, vendorItems] of vendorsGroup.entries()) {
      const vendor = vendorMap.get(vendorId);

      if (!vendor) {
        continue;
      }

      let totalWeight = 0;
      let declaredValue = 0;

      let length = 0;
      let width = 0;
      let height = 0;

      for (const item of vendorItems) {
        const product = productsMap.get(item.product.toString());

        const variant = variantsMap.get(item.variant.toString());

        if (!product || !variant) {
          continue;
        }

        const price =
          variant.offeredPrice ?? variant.salesPrice ?? variant.costPrice;

        declaredValue += price * item.quantity;

        totalWeight += variant.weight * item.quantity;

        length = Math.max(length, variant.length);

        width = Math.max(width, variant.width);

        height += variant.height * item.quantity;
      }

      const shipping = await this.shipRocketService.getShippingOptions({
        pickupPincode: vendor.vendorPincode,

        deliveryPincode: userPinCode,

        weightKg: totalWeight,

        declaredValue,

        isCOD: 1,

        length,
        breadth: width,
        height,
      });

      console.log("Shipping Charge", shipping)

      totalShippingCharge += shipping.shippingCharge;

      totalCodCharge += shipping.codCharge;

      shippingSummary.push({
        vendorId: vendor._id,

        vendorName: vendor.businessName,

        courierName: shipping.courierName,

        shippingCharge: shipping.shippingCharge,

        codCharge: shipping.codCharge,

        estimatedDays: shipping.estimatedDays,

        estimatedDate: shipping.estimatedDate,

        items: vendorItems.map((item) => {
          const product = productsMap.get(item.product.toString());

          const variant = variantsMap.get(item.variant.toString());

          const unitPrice =
            variant?.offeredPrice ??
            variant?.salesPrice ??
            variant?.costPrice ??
            0;

          return {
            productId: product?._id,

            productName: product?.name,

            variantId: variant?._id,

            quantity: item.quantity,

            unitPrice,

            totalPrice: unitPrice * item.quantity,

            shippingApplicable: product?.isShippingApply,
          };
        }),
      });
    }

    let estimatedDeliveryDays = 0;
    let estimatedDeliveryDate: string | null = null;

    if (shippingSummary.length) {
      const slowestShipment = shippingSummary.reduce((prev, current) =>
        current.estimatedDays > prev.estimatedDays ? current : prev,
      );

      estimatedDeliveryDays = slowestShipment.estimatedDays;

      estimatedDeliveryDate = slowestShipment.estimatedDate;
    }

    return {
      cartItems,

      shippingSummary,

      appliedCoupon: null,

      cartSummary: {
        totalItems: cart.items.length,

        subTotal,

        discount: 0,

        shippingCharge: totalShippingCharge,

        codCharge: totalCodCharge,

        finalTotal: subTotal + totalShippingCharge + totalCodCharge,

        estimatedDeliveryDays,

        estimatedDeliveryDate,
      },
    };
  }

  async applyWallet(userId: string, dto: any) {
    // =========================
    // FETCH USER CART
    // =========================
    const cart = await this.cartModel.findOne({
      user: new Types.ObjectId(userId),
    });

    if (!cart || !cart.items.length) {
      throw new BadRequestException('Cart is empty');
    }

    await this.cleanInvalidCartItems(cart);

    // =========================
    // CALCULATE SUBTOTAL
    // =========================
    let subTotal = 0;
    const cartItems: any[] = [];

    for (const item of cart.items) {
      const product = await this.productModel.findById(item.product);

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (!product.isActive || product.isDeleted) {
        throw new BadRequestException(`${product.name} is unavailable`);
      }

      const variant = await this.productVariantModel.findById(item.variant)
        .populate("images", "url publicId _id")
        .populate("thumbnail", "url publicId _id");

      if (!variant) {
        throw new NotFoundException('Variant not found');
      }

      if (!variant.isActive) {
        throw new BadRequestException(`${product.name} variant unavailable`);
      }

      if (
        !product.variants.some((id) => id.toString() === variant._id.toString())
      ) {
        throw new BadRequestException('Invalid cart item');
      }

      if (variant.stock < item.quantity) {
        throw new BadRequestException(`${product.name} is out of stock`);
      }

      const sellingPrice = variant.offeredPrice ?? variant.salesPrice ?? variant.costPrice ?? 0;
      const totalPrice = sellingPrice * item.quantity;
      subTotal += totalPrice;

      cartItems.push({
        productId: product,
        variantId: variant,
        quantity: item.quantity,
        price: sellingPrice,
        totalPrice,
      });
    }

    // =========================
    // APPLY WALLET BALANCE
    // =========================
    const wallet = await this.userWalletModel.findOne({ userId: new Types.ObjectId(userId) });

    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    if (!wallet.isActive) {
      throw new BadRequestException('Wallet is inactive');
    }

    let appliedWalletAmount = 0;
    if (wallet.balance >= subTotal) {
      appliedWalletAmount = subTotal;
    } else {
      appliedWalletAmount = wallet.balance;
    }

    const finalTotal = subTotal - appliedWalletAmount;

    return ApiResponse.success('Wallet applied successfully', {
      wallet: {
        balance: wallet.balance,
      },
      cartSummary: {
        totalItems: cart.items.length,
        subTotal,
        walletAmountUsed: appliedWalletAmount,
        finalTotal,
      },
      appliedWallet: {
        amount: appliedWalletAmount,
      },
      cartItems,
    });
  }
}
