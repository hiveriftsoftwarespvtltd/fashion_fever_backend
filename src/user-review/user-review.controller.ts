import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ReviewService } from './user-review.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { OptionalAuthGuard } from 'src/auth/optional-auth.guards';
import { CreateReviewDto, UpdateReviewDto } from './dto/reviewDTO';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';



@Controller('user-reviews')
export class ReviewController {
  constructor(
    private readonly reviewService: ReviewService,
  ) { }

  @Post('add')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 4, {
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
        return cb(new BadRequestException('Only image files are allowed!'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 }
  }))
  async createReview(
    @Req() req: any,
    @Body() dto: CreateReviewDto,
    @UploadedFiles() files: any[]
  ) {
    return this.reviewService.createReview(
      req.user._id,
      dto,
      files
    );
  }

  @Patch('update/:id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 4, {
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
        return cb(new BadRequestException('Only image files are allowed!'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 }
  }))
  async updateReview(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
    @UploadedFiles() files: any[]
  ) {
    return this.reviewService.updateReview(
      req.user._id,
      id,
      dto,
      files
    );
  }

  @AdminAccess(AdminModule.VENDORS, AccessType.WRITE)
  @Delete('delete/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)

  async deleteReview(
    @Param('id') id: string,
  ) {
    return this.reviewService.deleteReview(
      id,
    );
  }

  
  @Get('product-reviews/:productId')
  @UseGuards(OptionalAuthGuard)
  async getProductReviews(
    @Req() req: any,
    @Param('productId') productId: string,
  ) {
    return this.reviewService.getProductReviews(
      productId,
      req.user?._id,
    );
  }
}