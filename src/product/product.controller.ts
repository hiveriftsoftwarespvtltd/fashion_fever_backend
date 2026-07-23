import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import {
  AnyFilesInterceptor,
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';

import { ProductService } from './product.service';
// import { CreateCategory } from './dto/create-category.dto';

import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

import { UserRole } from 'src/user/schema/user.schema';
// import { UpdateCategoryDTO } from './dto/update-category.dto';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Controller('product')
export class ProductController {
  constructor(private productService: ProductService) { }

  // @Post('create-category')
  // @UseInterceptors(FileInterceptor('file'))
  // createCategory(
  //   @UploadedFile()
  //   file: any,

  //   @Req()
  //   req: any,

  //   @Body()
  //   dto: CreateCategory,
  // ) {
  //   return this.productService.CreateCategory(
  //     dto,
  //     file,
  //     req.user._id,
  //     req.user.vendorId,
  //   );
  // }

  @Get('fetch-categories')
  fetchCategories(@Req() req: any) {
    return this.productService.fetchVendorCategories(req.user.vendorId);
  }

  @Get('fetch-products')
  fetchProducts(@Req() req: any) {
    return this.productService.fetchAllProducts(
      req.user._id,
      req.user.vendorId,
    );
  }

  @Post('create-product')
  @UseInterceptors(AnyFilesInterceptor())
  async createProduct(
    @Body() body: any,
    @Req() req: any,
    @UploadedFiles() files: any[],
  ) {
    const dto: any = {
      name: body.name,
      slug: body.slug,
      description: body.description,
      categoryId: body.categoryId,
      metaTitle: body.metaTitle,
      metaDescription: body.metaDescription,
      status: body.status,
      variants: [],
      tags: body.tags || [],
      brand: body.brand,
      isShippingApply: body.isShippingApply
    };

    const variantsMap = {};

    Object.keys(body).forEach((key) => {
      const match = key.match(/^variants\[(\d+)\]\.(.+)$/);

      if (!match) return;

      const index = match[1];

      const field = match[2];

      if (!variantsMap[index]) {
        variantsMap[index] = {
          attributes: {},
        };
      }

      const numericFields = [
        'salesPrice',
        'costPrice',
        'offeredPrice',
        'stock',
        'weight',
        'length',
        'width',
        'height',
      ];

      // attributes.color
      if (field.startsWith('attributes.')) {
        const attrKey = field.replace('attributes.', '');

        variantsMap[index].attributes[attrKey] = body[key];
      } else if (numericFields.includes(field)) {
        variantsMap[index][field] = Number(body[key]);
      } else {
        variantsMap[index][field] = body[key];
      }
    });

    dto.variants = Object.values(variantsMap);

    return this.productService.createProduct(
      dto,
      files,
      req.user._id,
      req.user.vendorId,
    );
  }

  // @Put('update-category/:id')
  // @UseInterceptors(FileInterceptor('file'))
  // updateCategory(
  //   @Param('id') id: string,
  //   @UploadedFile() file: any,
  //   @Req() req: any,
  //   @Body() dto: UpdateCategoryDTO,
  // ) {
  //   return this.productService.updateCategory(
  //     dto,
  //     file,
  //     req.user._id,
  //     req.user.vendorId,
  //     id,
  //   );
  // }

  @Delete('delete-category/:id')
  deleteCategory(@Param('id') id: string, @Req() req: any) {
    return this.productService.deleteVendorCategory(req.user.vendorId, id);
  }

  // products

  @Put('update-product/:id')
  @UseInterceptors(AnyFilesInterceptor())
  async updateProduct(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
    @UploadedFiles() files: any[],
  ) {
    const dto: any = {
      name: body.name,
      slug: body.slug,
      description: body.description,
      categoryId: body.categoryId,
      metaTitle: body.metaTitle,
      metaDescription: body.metaDescription,
      status: body.status,
      variants: [],
      tags: body.tags || [],
      brand: body.brand,
      isShippingApply: body.isShippingApply
    };

    // =========================
    // Transform variants
    // =========================

    const variantsMap = {};

    Object.keys(body).forEach((key) => {
      const match = key.match(/^variants\[(\d+)\]\.(.+)$/);

      if (!match) return;

      const index = match[1];

      const field = match[2];

      if (!variantsMap[index]) {
        variantsMap[index] = {
          attributes: {},
        };
      }

      const numericFields = [
        'salesPrice',
        'costPrice',
        'offeredPrice',
        'stock',
        'weight',
        'length',
        'width',
        'height',
      ];

      // attributes.color
      if (field.startsWith('attributes.')) {
        const attrKey = field.replace('attributes.', '');

        variantsMap[index].attributes[attrKey] = body[key];
      } else if (numericFields.includes(field)) {
        variantsMap[index][field] = Number(body[key]);
      } else {
        variantsMap[index][field] = body[key];
      }
    });

    dto.variants = Object.values(variantsMap);


    return this.productService.updateProduct(
      dto,
      files,
      req.user._id,
      req.user.vendorId,
      id,
    );
  }

  @Get('product-details/:id')
  async productdetails(@Param('id') id: string, @Req() req: any) {
    return this.productService.fetchProductDetails(
      req.user._id,
      req.user.vendorId,
      id,
    );
  }

  @Delete('delete-product/:id')
  async deleteProduct(@Param('id') id: string, @Req() req: any) {
    return this.productService.deleteProduct(
      req.user._id,
      req.user.vendorId,
      id,
    );
  }

  @Delete('delete-product-variant/:id')
  async deleteProductVariant(@Param('id') id: string, @Req() req: any) {
    return this.productService.deleteProductVariants(
      req.user._id,
      req.user.vendorId,
      id,
    );
  }
}
