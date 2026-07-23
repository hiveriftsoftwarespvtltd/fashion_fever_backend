import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import { Controller, Get, Post, Body, Param, Delete, Put, Query, UseGuards, UseInterceptors, UploadedFiles, Req, BadRequestException } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { HomeContentService } from './home.content.service';
import { CreateHomeContentDto, UpdateHomeContentDto } from './dto/home.content.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';


@Controller('admin/home-content')
export class HomeContentController {
    constructor(private readonly homeContentService: HomeContentService) { }

    @UseGuards(JwtAuthGuard, RolesGuard)

    @AdminAccess(AdminModule.PLATFORM, AccessType.WRITE)
    @Post('add')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'computerImage', maxCount: 1 },
        { name: 'mobileImage', maxCount: 1 },
    ], {
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
                return cb(new BadRequestException('Only image files (png, jpeg, jpg, webp) are allowed!'), false);
            }
            cb(null, true);
        },
    }))
    create(
        @Body() createHomeContentDto: CreateHomeContentDto,
        @UploadedFiles() files: { computerImage?: any[], mobileImage?: any[] },
        @Req() req: any
    ) {
        return this.homeContentService.create(createHomeContentDto, files, req.user._id);
    }

    @Get('get-all')
    findAll(@Query('page') page: string, @Query('limit') limit: string) {
        return this.homeContentService.findAll(page ? +page : 1, limit ? +limit : 10);
    }


    @UseGuards(JwtAuthGuard, RolesGuard)

    @AdminAccess(AdminModule.PLATFORM, AccessType.READ)
    @Get('get-details/:id')
    findOne(@Param('id') id: string) {
        return this.homeContentService.findOne(id);
    }


    @UseGuards(JwtAuthGuard, RolesGuard)

    @AdminAccess(AdminModule.PLATFORM, AccessType.WRITE)
    @Put('update/:id')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'computerImage', maxCount: 1 },
        { name: 'mobileImage', maxCount: 1 },
    ], {
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
                return cb(new BadRequestException('Only image files (png, jpeg, jpg, webp) are allowed!'), false);
            }
            cb(null, true);
        },
    }))
    update(
        @Param('id') id: string,
        @Body() updateHomeContentDto: UpdateHomeContentDto,
        @UploadedFiles() files: { computerImage?: any[], mobileImage?: any[] },
        @Req() req: any
    ) {
        return this.homeContentService.update(id, updateHomeContentDto, files, req.user._id);
    }


    @UseGuards(JwtAuthGuard, RolesGuard)

    @AdminAccess(AdminModule.PLATFORM, AccessType.WRITE)
    @Delete('delete-home-content/:id')
    remove(@Param('id') id: string) {
        return this.homeContentService.remove(id);
    }
}
