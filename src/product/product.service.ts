import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument, ProductStatus } from './schema/product.schema';
import { Model, Types } from 'mongoose';
import {
  ProductVariant,
  ProductVariantDocument,
} from './schema/product-variant.schema';
import { Category, CategoryDocument } from './schema/category.schema';
// import { CreateCategory } from './dto/create-category.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { Media, MediaDocument } from 'src/document/schema/document.schema';
import { DocumentService } from 'src/document/document.service';
// import { StorageFactory } from 'src/document/storage/storage.factory';
import { ApiResponse } from 'src/common/responses/api-response';
// import { UpdateCategoryDTO } from './dto/update-category.dto';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { VendorOrder, VendorOrderDocument } from 'src/order/schema/vendor-order.schema';
import { QuickDeliveryCart, QuickDeliveryCartDocument } from 'src/quick-e-commerce/schema/quick-delivery-cart';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(ProductVariant.name)
    private productVariantModel: Model<ProductVariantDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Media.name) private mediaModel: Model<MediaDocument>,
    @InjectModel(VendorOrder.name) private vendorOrderModel: Model<VendorOrderDocument>,
    @InjectModel(QuickDeliveryCart.name) private quickDeliveryCartModel: Model<QuickDeliveryCartDocument>,
    private documentService: DocumentService,
    private notificationService: NotificationService,
  ) { }

  // async CreateCategory(
  //   dto: CreateCategory,
  //   file: any,
  //   userId: string,
  //   vendorId: string,
  // ) {
  //   if (!vendorId) {
  //     throw new ForbiddenException('Your account is not verified yet');
  //   }
  //   const isCategoryExist = await this.categoryModel.findOne({
  //     vendorId,
  //     $or: [{ name: dto.name }, { slug: dto.slug }],
  //   });
  //   if (isCategoryExist) {
  //     throw new ConflictException('Category exist with same name or slug');
  //   }

  //   let mediaId:any;
  //   if (file) {
  //     const mediaResponse = await this.documentService.upload(
  //       file,
  //       'category',
  //       userId,
  //       vendorId,
  //     );
  //     mediaId = mediaResponse._id;
  //   }

  //   // if (dto.attributes && typeof dto.attributes === 'string') {
  //   //   dto.attributes = JSON.parse(dto.attributes as any);
  //   // }
  //   const newcategory = await this.categoryModel.create({
  //     ...dto,
  //     vendorId,
  //     ownerId: userId,
  //     image: mediaId,
  //   });

  //   return ApiResponse.success('Category Create Successfully', newcategory);
  // }

  // async updateCategory(
  //   dto: UpdateCategoryDTO,
  //   file: any,
  //   userId: string,
  //   vendorId: string,
  //   categoryId: string,
  // ) {
  //   if (!vendorId) {
  //     throw new ForbiddenException('Your account is not verified yet');
  //   }

  //   const category = await this.categoryModel.findOne({
  //     vendorId,
  //     _id: categoryId,
  //     isDeleted: false,
  //   });

  //   if (!category) {
  //     throw new NotFoundException('Category Not Found');
  //   }

  //   if (dto.name || dto.slug) {
  //     const existingCategory = await this.categoryModel.findOne({
  //       vendorId,
  //       _id: { $ne: categoryId },

  //       $or: [
  //         ...(dto.name ? [{ name: dto.name }] : []),

  //         ...(dto.slug ? [{ slug: dto.slug }] : []),
  //       ],
  //     });

  //     if (existingCategory) {
  //       throw new ConflictException(
  //         'Category with same name or slug already exists',
  //       );
  //     }
  //   }

  //   // if (dto.attributes && typeof dto.attributes === 'string') {
  //   //   dto.attributes = JSON.parse(dto.attributes as any);
  //   // }

  //   if (file) {
  //     if (category.image) {
  //       await this.documentService.deleteMedia(category.image.toString());
  //     }

  //     const uploaded = await this.documentService.upload(
  //       file,
  //       'category',
  //       userId,
  //       vendorId,
  //     );

  //     category.image = uploaded._id;
  //   }

  //   if (dto.name !== undefined && dto.name.trim() !== '') {
  //     category.name = dto.name;
  //   }

  //   if (dto.slug !== undefined && dto.slug.trim() !== '') {
  //     category.slug = dto.slug;
  //   }

  //   if (dto.description !== undefined) {
  //     category.description = dto.description;
  //   }

  //   // if (dto.attributes !== undefined) {
  //   //   category.attributes = dto.attributes;
  //   // }

  //   await category.save();

  //   return ApiResponse.success('Category Updated Successfully', category);
  // }

  async fetchVendorCategories(vendorId: string) {
    if (!vendorId) {
      throw new ForbiddenException('Your account is not verified yet');
    }
    const categories = await this.categoryModel
      .find({ vendorId })
      .populate('image')
      .lean();
    return categories;
  }

  async deleteVendorCategory(vendorId: string, categoryId: string) {
    if (!vendorId) {
      throw new ForbiddenException('Your account is not verified yet');
    }

    const category = await this.categoryModel.findOne({
      vendorId,
      _id: categoryId,
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const productExists = await this.productModel.exists({
      categoryId: category._id,
      vendorId,
      isDeleted: false,
    });

    if (productExists) {
      throw new BadRequestException(
        'Cannot delete category because products exist under this category',
      );
    }

    if (category.image) {
      await this.documentService.deleteMedia(category.image.toString());
    }

    await category.deleteOne();

    return ApiResponse.success('Category Deleted Successfully', null);
  }

  // async createProduct(
  //   dto: CreateProductDto,
  //   files: any[],
  //   userId: string,
  //   vendorId: string,
  // ) {
  //   if (!vendorId) {
  //     throw new ForbiddenException('Your account is not verified yet');
  //   }

  //   const existingProduct = await this.productModel.findOne({
  //     vendorId,
  //     $or: [{ name: dto.name }, { slug: dto.slug }],
  //   });

  //   if (existingProduct) {
  //     throw new ConflictException('Product already exists');
  //   }

  //   const category = await this.categoryModel.findOne({
  //     _id: dto.categoryId,
  //     vendorId,
  //     isDeleted: false,
  //   });

  //   if (!category) {
  //     throw new NotFoundException('Category not found');
  //   }

  //   if (!dto.variants?.length) {
  //     throw new BadRequestException('At least one variant is required');
  //   }

  //   const product = await this.productModel.create({
  //     name: dto.name,
  //     slug: dto.slug,
  //     description: dto.description,

  //     vendorId,
  //     createdBy: userId,

  //     categoryId: new Types.ObjectId(dto.categoryId),

  //     metaTitle: dto.metaTitle,
  //     metaDescription: dto.metaDescription,

  //     status: dto.status,

  //     hasVariants: dto.variants.length > 1,
  //   });

  //   const variantIds: Types.ObjectId[] = [];

  //   for (let i = 0; i < dto.variants.length; i++) {
  //     const variant = dto.variants[i];

  //     const thumbnailFile = files.find(
  //       (file) => file.fieldname === `variant_${i}_thumbnail`,
  //     );

  //     const imageFiles = files.filter(
  //       (file) => file.fieldname === `variant_${i}_images`,
  //     );

  //     console.log("Thumbnail and Images",thumbnailFile,imageFiles)

  //     if (!thumbnailFile) {
  //       throw new BadRequestException(
  //         `Thumbnail required for variant ${i }`,
  //       );
  //     }

  //     if (!imageFiles.length) {
  //       throw new BadRequestException(`Images required for variant ${i}`);
  //     }

  //     // ========= UPLOAD THUMBNAIL =========

  //     const uploadedThumbnail = await this.documentService.upload(
  //       thumbnailFile,
  //       'product',
  //       userId,
  //       vendorId,
  //     );

  //     const uploadedImages: Types.ObjectId[] = [];

  //     for (const image of imageFiles) {
  //       const uploaded = await this.documentService.upload(
  //         image,
  //         'product',
  //         userId,
  //         vendorId,
  //       );

  //       uploadedImages.push(uploaded._id);
  //     }

  //     const createdVariant = await this.productVariantModel.create({
  //       productId: product._id,

  //       sku: variant.sku,

  //       costPrice: variant.costPrice,

  //       salesPrice: variant.salesPrice,
  //       offeredPrice:variant.offeredPrice,

  //       stock: variant.stock,

  //       attributes: variant.attributes,

  //       thumbnail: uploadedThumbnail._id,

  //       images: uploadedImages,
  //     });

  //     variantIds.push(createdVariant._id as Types.ObjectId);
  //   }

  //   product.variants = variantIds;

  //   await product.save();

  //   const finalProduct = await this.productModel
  //     .findById(product._id)
  //     .populate({
  //       path: 'variants',
  //       populate: [
  //         {
  //           path: 'thumbnail',
  //           select: 'url publicId type originalName',
  //         },
  //         {
  //           path: 'images',
  //           select: 'url publicId type originalName',
  //         },
  //       ],
  //     });

  //   return ApiResponse.success('Product created successfully', finalProduct);
  // }

  async createProduct(
    dto: CreateProductDto,
    files: any[],
    userId: string,
    vendorId: string,
  ) {
    if (!vendorId) {
      throw new ForbiddenException('Your account is not verified yet');
    }

    const existingProduct = await this.productModel.findOne({
      vendorId,
      $or: [{ name: dto.name }, { slug: dto.slug }],
    });

    if (existingProduct) {
      throw new ConflictException('Product already exists');
    }

    const category = await this.categoryModel.findOne({
      _id: dto.categoryId,
      // vendorId,
      isDeleted: false,
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (!dto.variants?.length) {
      throw new BadRequestException('At least one variant is required');
    }

    // =====================
    // UPLOAD ALL MEDIA FIRST
    // =====================

    const uploadedMediaIds: string[] = [];

    const variantMediaData: {
      thumbnailId: Types.ObjectId;
      imageIds: Types.ObjectId[];
    }[] = [];

    try {
      for (let i = 0; i < dto.variants.length; i++) {
        const thumbnailFile = files.find(
          (file) => file.fieldname === `variant_${i}_thumbnail`,
        );

        const imageFiles = files.filter(
          (file) => file.fieldname === `variant_${i}_images`,
        );

        if (!thumbnailFile) {
          throw new BadRequestException(
            `Thumbnail required for variant ${i + 1}`,
          );
        }

        if (!imageFiles.length) {
          throw new BadRequestException(`Images required for variant ${i + 1}`);
        }

        const thumbnail = await this.documentService.upload(
          thumbnailFile,
          'product',
          userId,
          vendorId,
        );

        uploadedMediaIds.push(thumbnail._id.toString());

        const imageIds: Types.ObjectId[] = [];

        for (const image of imageFiles) {
          const uploaded = await this.documentService.upload(
            image,
            'product',
            userId,
            vendorId,
          );

          uploadedMediaIds.push(uploaded._id.toString());

          imageIds.push(uploaded._id as Types.ObjectId);
        }

        variantMediaData.push({
          thumbnailId: thumbnail._id as Types.ObjectId,
          imageIds,
        });
      }

      // =====================
      // START TRANSACTION
      // =====================

      const session = await this.productModel.db.startSession();

      try {
        session.startTransaction();

        const [product] = await this.productModel.create(
          [
            {
              name: dto.name,
              slug: dto.slug,
              description: dto.description,
              vendorId: new Types.ObjectId(vendorId),
              createdBy: new Types.ObjectId(userId),
              categoryId: new Types.ObjectId(dto.categoryId),
              metaTitle: dto.metaTitle,
              metaDescription: dto.metaDescription,
              status: dto.status || ProductStatus.ACTIVE,
              isActive: true,
              hasVariants: dto.variants.length > 1,
              tags: dto.tags,
              isShippingApply: dto.isShippingApply,
              brand: dto.brand?.toLowerCase()
            },
          ],
          { session },
        );

        const variantIds: Types.ObjectId[] = [];

        for (let i = 0; i < dto.variants.length; i++) {
          const variant = dto.variants[i];
          const media = variantMediaData[i];

          if (
            variant.costPrice > variant.salesPrice ||
            variant.offeredPrice > variant.salesPrice
          ) {
            throw new BadRequestException(
              'Cost Price should be less than sales price and sales price should be greater than offered price',
            );
          }

          const [createdVariant] = await this.productVariantModel.create(
            [
              {
                productId: new Types.ObjectId(product._id),

                sku: variant.sku,
                costPrice: variant.costPrice,

                salesPrice: variant.salesPrice,

                offeredPrice: variant.offeredPrice,

                stock: variant.stock,
                weight: variant.weight,
                length: variant.length,
                width: variant.width,
                height: variant.height,

                attributes: variant.attributes,

                thumbnail: media.thumbnailId,

                images: media.imageIds,
              },
            ],
            { session },
          );

          variantIds.push(createdVariant._id as Types.ObjectId);
        }

        product.variants = variantIds;

        await product.save({ session });

        await session.commitTransaction();

        const finalProduct = await this.productModel
          .findById(product._id)
          .populate({
            path: 'variants',
            populate: [
              {
                path: 'thumbnail',
              },
              {
                path: 'images',
              },
            ],
          });

        return ApiResponse.success(
          'Product created successfully',
          finalProduct,
        );
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } catch (error) {
      // cleanup uploaded media

      await Promise.allSettled(
        uploadedMediaIds.map((id) => this.documentService.deleteMedia(id)),
      );

      throw error;
    }
  }

  async updateProduct(
    dto: UpdateProductDto,
    files: any[],
    userId: string,
    vendorId: string,
    productId: string,
  ) {
    if (!vendorId) {
      throw new ForbiddenException('Your account is not verified yet');
    }

    const product = await this.productModel.findOne({
      _id: productId,
      vendorId,
      createdBy: userId,
      isDeleted: false,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (dto.name || dto.slug) {
      const existingProduct = await this.productModel.findOne({
        vendorId,
        _id: { $ne: productId },

        $or: [
          ...(dto.name ? [{ name: dto.name }] : []),
          ...(dto.slug ? [{ slug: dto.slug }] : []),
        ],
      });

      if (existingProduct) {
        throw new ConflictException(
          'Product with same name or slug already exists',
        );
      }
    }

    if (dto.categoryId) {
      const category = await this.categoryModel.findOne({
        _id: new Types.ObjectId(dto.categoryId),
        // vendorId,
        isDeleted: false,
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    const uploadedMediaIds: string[] = [];
    const oldMediaToDelete: string[] = [];
    if (dto.name !== undefined) {
      product.name = dto.name;
    }

    if (dto.slug !== undefined) {
      product.slug = dto.slug;
    }

    if (dto.tags !== undefined) {
      product.tags = dto.tags
    }

    if (dto.description !== undefined) {
      product.description = dto.description;
    }

    if (dto.brand !== undefined) {
      product.brand = dto.brand.toLowerCase();
    }

    if (dto.isShippingApply !== undefined) {
      product.isShippingApply = dto.isShippingApply;
    }

    if (dto.categoryId !== undefined) {
      product.categoryId = new Types.ObjectId(dto.categoryId);
    }

    if (dto.metaTitle !== undefined) {
      product.metaTitle = dto.metaTitle;
    }

    if (dto.metaDescription !== undefined) {
      product.metaDescription = dto.metaDescription;
    }

    if (dto.status !== undefined) {
      product.status = dto.status;
    }

    const session = await this.productModel.db.startSession();
    try {
      session.startTransaction();
      if (dto.variants?.length) {
        const variantIds: Types.ObjectId[] = [];

        for (let i = 0; i < dto.variants.length; i++) {
          const variant = dto.variants[i];

          const thumbnailFile = files.find(
            (file) => file.fieldname === `variant_${i}_thumbnail`,
          );

          const imageFiles = files.filter(
            (file) => file.fieldname === `variant_${i}_images`,
          );

          // =========================
          // UPDATE EXISTING VARIANT
          // =========================

          if ((variant as any)._id) {
            const existingVariant = await this.productVariantModel
              .findOne({
                _id: (variant as any)._id,
                productId: product._id,
              })
              .session(session);

            if (!existingVariant) {
              throw new NotFoundException(`Variant not found`);
            }

            if (variant.sku !== undefined) {
              existingVariant.sku = variant.sku;
            }

            if (variant.costPrice !== undefined) {
              existingVariant.costPrice = Number(variant.costPrice);
            }

            if (variant.salesPrice !== undefined) {
              existingVariant.salesPrice = Number(variant.salesPrice);
            }

            if (variant.offeredPrice !== undefined) {
              existingVariant.offeredPrice = Number(variant.offeredPrice);
            }

            if (variant.stock !== undefined) {
              const newStock = Number(variant.stock);
              if (existingVariant.stock === 0 && newStock > 0) {
                this.notificationService.notifyProductRestock(
                  product._id.toString(),
                  existingVariant._id.toString(),
                  product.name
                ).catch(e => console.error('Error notifying product restock', e));
              }
              existingVariant.stock = newStock;
            }

            if (
              variant.attributes !== undefined &&
              variant.attributes !== null &&
              Object.keys(variant.attributes).length > 0
            ) {
              existingVariant.attributes = variant.attributes;
            }

            if (variant.isActive !== undefined) {
              existingVariant.isActive = variant.isActive;
            }

            if (variant.weight !== undefined) {
              existingVariant.weight = variant.weight;
            }

            if (variant.length !== undefined) {
              existingVariant.length = variant.length;
            }

            if (variant.width !== undefined) {
              existingVariant.width = variant.width;
            }

            if (variant.height !== undefined) {
              existingVariant.height = variant.height;
            }

            // ===== thumbnail update =====

            if (thumbnailFile) {
              // if (existingVariant.thumbnail) {
              //   await this.documentService.deleteMedia(
              //     existingVariant.thumbnail.toString(),
              //   );
              // }
              if (existingVariant.thumbnail) {
                oldMediaToDelete.push(existingVariant.thumbnail.toString());
              }

              // const uploadedThumbnail = await this.documentService.upload(
              //   thumbnailFile,
              //   'product',
              //   userId,
              //   vendorId,
              // );

              const uploadedThumbnail = await this.documentService.upload(
                thumbnailFile,
                'product',
                userId,
                vendorId,
              );

              uploadedMediaIds.push(uploadedThumbnail._id.toString());

              existingVariant.thumbnail = uploadedThumbnail._id;
            }

            // ===== images update =====

            if (imageFiles.length) {
              // if (existingVariant.images?.length) {
              //   for (const imageId of existingVariant.images) {
              //     await this.documentService.deleteMedia(imageId.toString());
              //   }
              // }

              for (const imageId of existingVariant.images) {
                oldMediaToDelete.push(imageId.toString());
              }

              const uploadedImages: Types.ObjectId[] = [];

              for (const image of imageFiles) {
                // const uploaded = await this.documentService.upload(
                //   image,
                //   'product',
                //   userId,
                //   vendorId,
                // );

                // uploadedImages.push(uploaded._id);

                const uploaded = await this.documentService.upload(
                  image,
                  'product',
                  userId,
                  vendorId,
                );

                uploadedMediaIds.push(uploaded._id.toString());

                uploadedImages.push(uploaded._id);
              }

              existingVariant.images = uploadedImages;
            }

            await existingVariant.save({ session });

            variantIds.push(existingVariant._id as Types.ObjectId);
          }

          // =========================
          // CREATE NEW VARIANT
          // =========================
          else {
            if (
              variant.costPrice === undefined ||
              variant.salesPrice === undefined ||
              variant.offeredPrice === undefined ||
              variant.stock === undefined ||
              !variant.sku
            ) {
              throw new BadRequestException(
                `cost price,sales price, offered price, stock and sku required for new variant`,
              );
            }

            if (
              variant.costPrice > variant.salesPrice ||
              variant.offeredPrice > variant.salesPrice
            ) {
              throw new BadRequestException(
                'Cost Price should be less than sales price and sales price should be greater than offered price',
              );
            }

            if (!thumbnailFile) {
              throw new BadRequestException(
                `Thumbnail required for new variant`,
              );
            }

            // const uploadedThumbnail = await this.documentService.upload(
            //   thumbnailFile,
            //   'product',
            //   userId,
            //   vendorId,
            // );

            const uploadedThumbnail = await this.documentService.upload(
              thumbnailFile,
              'product',
              userId,
              vendorId,
            );

            uploadedMediaIds.push(uploadedThumbnail._id.toString());

            const uploadedImages: Types.ObjectId[] = [];

            for (const image of imageFiles) {
              // const uploaded = await this.documentService.upload(
              //   image,
              //   'product',
              //   userId,
              //   vendorId,
              // );

              // uploadedImages.push(uploaded._id);

              const uploaded = await this.documentService.upload(
                image,
                'product',
                userId,
                vendorId,
              );

              uploadedMediaIds.push(uploaded._id.toString());

              uploadedImages.push(uploaded._id);
            }

            // const createdVariant = await this.productVariantModel.create({
            //   productId: product._id,

            //   sku: variant.sku,

            //   costPrice: Number(variant.costPrice),

            //   salesPrice: variant.salesPrice,

            //   offeredPrice: variant.offeredPrice,

            //   stock: Number(variant.stock),

            //   attributes: variant.attributes,

            //   thumbnail: uploadedThumbnail._id,

            //   images: uploadedImages,

            //   isActive: variant.isActive !== undefined ? variant.isActive : true,
            // });

            const [createdVariant] = await this.productVariantModel.create(
              [
                {
                  productId: product._id,

                  sku: variant.sku,

                  costPrice: Number(variant.costPrice),

                  salesPrice: variant.salesPrice,

                  offeredPrice: variant.offeredPrice,

                  stock: Number(variant.stock),

                  attributes: variant.attributes,

                  thumbnail: uploadedThumbnail._id,

                  images: uploadedImages,

                  isActive:
                    variant.isActive !== undefined ? variant.isActive : true,
                },
              ],
              { session },
            );

            variantIds.push(createdVariant._id as Types.ObjectId);
          }
        }

        product.variants = variantIds;

        product.hasVariants = variantIds.length > 1;
      }

      await product.save({ session });

      await session.commitTransaction();

      await Promise.allSettled(
        oldMediaToDelete.map((id) => this.documentService.deleteMedia(id)),
      );

      const updatedProduct = await this.productModel
        .findById(product._id)
        .populate('categoryId')
        .populate({
          path: 'variants',
          populate: [
            {
              path: 'thumbnail',
              select: 'url publicId type originalName',
            },
            {
              path: 'images',
              select: 'url publicId type originalName',
            },
          ],
        });

      return ApiResponse.success(
        'Product updated successfully',
        updatedProduct,
      );
    } catch (error) {
      await session.abortTransaction();

      await Promise.allSettled(
        uploadedMediaIds.map((id) => this.documentService.deleteMedia(id)),
      );

      throw error;
    } finally {
      await session.endSession();
    }
  }

  async deleteProduct(userId: string, vendorId: string, productId: string) {
    const product = await this.productModel.findOne({
      createdBy: userId,
      vendorId,
      _id: productId,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const isOrdered = await this.vendorOrderModel.exists({
      'items.productId': product._id,
    });

    const variants = await this.productVariantModel.find({
      productId: product._id,
    });

    if (isOrdered) {
      product.isDeleted = true;
      product.isActive = false;
      await product.save();
      for (const variant of variants) {
        variant.isDeleted = true;
        variant.isActive = false;
        await variant.save();
      }

      await this.quickDeliveryCartModel.updateMany(
        {},
        { $pull: { items: { product: product._id } } }
      );

      return ApiResponse.success('Product soft deleted because it was ordered previously', null);
    }

    for (const variant of variants) {
      // delete thumbnail
      if (variant.thumbnail) {
        await this.documentService.deleteMedia(variant.thumbnail.toString());
      }

      if (variant.images?.length) {
        for (const imageId of variant.images) {
          await this.documentService.deleteMedia(imageId.toString());
        }
      }

      await variant.deleteOne();
    }

    await product.deleteOne();

    await this.quickDeliveryCartModel.updateMany(
      {},
      { $pull: { items: { product: product._id } } }
    );

    return ApiResponse.success('Product Deleted Successfully', null);
  }

  async fetchAllProducts(userId: string, vendorId: string) {
    const products = await this.productModel
      .find({
        createdBy: userId,
        vendorId,
      })
      .populate('categoryId')
      .populate({
        path: 'variants',
        populate: [
          {
            path: 'images',
            model: 'Media',
          },
          {
            path: 'thumbnail',
            model: 'Media',
          },
        ],
      });

    return ApiResponse.success('Products Fetched Successfully', products || []);
  }

  async fetchProductDetails(
    userId: string,
    vendorId: string,
    productId: string,
  ) {
    const product = await this.productModel
      .findOne({
        vendorId,
        createdBy: userId,
        _id: productId,
      })
      .populate('categoryId')
      .populate({
        path: 'variants',

        populate: [
          {
            path: 'thumbnail',
            select: 'url publicId type originalName',
          },
          {
            path: 'images',
            select: 'url publicId type originalName',
          },
        ],
      });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return ApiResponse.success('Product Details Fetched Successfully', product);
  }

  async deleteProductVariants(
    userId: string,
    vendorId: string,
    productVariantId: string,
  ) {
    const variant = await this.productVariantModel.findById(productVariantId);

    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    const product = await this.productModel.findOne({
      _id: variant.productId,
      vendorId,
      createdBy: userId,
      isDeleted: false,
    });

    if (!product) {
      throw new ForbiddenException(
        'You are not allowed to delete this variant',
      );
    }

    const totalVariants = await this.productVariantModel.countDocuments({
      productId: product._id,
    });

    if (totalVariants <= 1) {
      throw new BadRequestException(
        'Cannot delete the last variant of product',
      );
    }

    const isOrdered = await this.vendorOrderModel.exists({
      'items.variantId': variant._id,
    });

    if (isOrdered) {
      variant.isDeleted = true;
      variant.isActive = false;
      await variant.save();

      await this.quickDeliveryCartModel.updateMany(
        {},
        { $pull: { items: { variant: variant._id } } }
      );

      return ApiResponse.success('Product Variant soft deleted because it was ordered previously', null);
    }

    if (variant.thumbnail) {
      await this.documentService.deleteMedia(variant.thumbnail.toString());
    }

    if (variant.images?.length) {
      for (const imageId of variant.images) {
        await this.documentService.deleteMedia(imageId.toString());
      }
    }

    product.variants = product.variants.filter(
      (id) => id.toString() !== productVariantId,
    );

    product.hasVariants = product.variants.length > 1;

    await product.save();

    await variant.deleteOne();

    await this.quickDeliveryCartModel.updateMany(
      {},
      { $pull: { items: { variant: variant._id } } }
    );

    return ApiResponse.success('Product Variant Deleted Successfully', null);
  }
}
