import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UploadedFile, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { AddCourseCategoryDTO, UpdateCourseCategoryDTO, CreateCourseDTO, UpdateCourseDTO } from './dto/course.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';
import { OptionalAuthGuard } from 'src/auth/optional-auth.guards';

@Controller('courses')
export class CoursesController {
    constructor(private courseService: CoursesService) { }


    @UseGuards(JwtAuthGuard, RolesGuard)

    @AdminAccess(AdminModule.COURSES, AccessType.WRITE)
    @Post('add-course-category')
    @UseInterceptors(FileInterceptor('file'))
    async createCourseCategory(@Body() dto: AddCourseCategoryDTO, @Req() req: any, @UploadedFile() file: Express.Multer.File) {
       
        return await this.courseService.addCategory(req.user._id, file, dto)
    }

    @Get('get-all-course-categories')
    @UseGuards(OptionalAuthGuard)
    async getAllCourseCategories(@Req() req: any) {
        
        return await this.courseService.getCourseCategories(req.user?.role)
    }

    @Get('course-category-details/:courseCategoryId')
    @UseGuards(OptionalAuthGuard)
    async getCourseCategoryDetails(@Param('courseCategoryId') courseCategoryId: string, @Req() req: any) {
        return await this.courseService.courseCategoryDetails(courseCategoryId, req.user?.role)
    }

    @UseGuards(JwtAuthGuard, RolesGuard)

    @AdminAccess(AdminModule.COURSES, AccessType.WRITE)
    @Delete('delete-course-category/:courseCategoryId')
    async deleteCourseCategory(@Param('courseCategoryId') courseCategoryId: string) {
        return await this.courseService.deleteCourseCategory(courseCategoryId)
    }

    @UseGuards(JwtAuthGuard, RolesGuard)

    @AdminAccess(AdminModule.COURSES, AccessType.WRITE)
    @Put('update-course-category/:courseCategoryId')
    @UseInterceptors(FileInterceptor('file'))
    async updateCourseCategory(@Param('courseCategoryId') courseCategoryId: string, @Body() dto: UpdateCourseCategoryDTO, @Req() req: any, @UploadedFile() file: Express.Multer.File) {
        return await this.courseService.updateCourseCategory(req.user._id, courseCategoryId, dto, file)
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.EDUCATOR)
    @Post('add-course')
    @UseInterceptors(FileInterceptor('file'))
    async addCourse(@Req() req: any, @UploadedFile() file: Express.Multer.File, @Body() dto: CreateCourseDTO) {
        return await this.courseService.addCourse(req.user.educatorId, file, dto);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.EDUCATOR)
    @Put('update-course/:courseId')
    @UseInterceptors(FileInterceptor('file'))
    async updateCourse(@Param('courseId') courseId: string, @Req() req: any, @UploadedFile() file: Express.Multer.File, @Body() dto: UpdateCourseDTO) {
       
        return await this.courseService.updateCourse(req.user.educatorId, courseId, dto, file);
    }

    @UseGuards(OptionalAuthGuard)
    @Get('user-course-details/:courseId')
    async getCourseDetails(@Param('courseId') courseId: string, @Req() req: any) {
        return await this.courseService.getCourseDetails(courseId, req.user);
    }

    @UseGuards(OptionalAuthGuard)
    @Get('public-user-course-list')
    async listPublicUserCourses(
        @Req() req: any,
        @Query('educatorId') educatorId?: string,
        @Query('categoryId') categoryId?: string,
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10'
    ) {
        return await this.courseService.listUserCourses(req.user, educatorId, categoryId, Number(page), Number(limit));
    }

    @UseGuards(OptionalAuthGuard)
    @Get('search')
    async searchCourses(
        @Query('keyword') keyword: string,
        @Req() req: any,
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10'
    ) {
        return await this.courseService.searchCourses(keyword, req.user, Number(page), Number(limit));
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.EDUCATOR)
    @Delete('delete-course/:courseId')
    async deleteCourse(@Param('courseId') courseId: string, @Req() req: any) {
        return await this.courseService.deleteCourse(req.user.educatorId, courseId);
    }
}
