import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { CourseLessonService } from './course-lesson.service';
import { CreateCourseLessonDTO, UpdateCourseLessonDTO } from './dto/course-content.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';
import { OptionalAuthGuard } from 'src/auth/optional-auth.guards';

@Controller('course-lesson')
export class CourseLessonController {
    constructor(private courseLessonService: CourseLessonService) { }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.EDUCATOR)
    @Post('create')
    async createLesson(@Req() req: any, @Body() dto: CreateCourseLessonDTO) {
        return await this.courseLessonService.createLesson(req.user.educatorId.toString(), dto);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.EDUCATOR)
    @Put('update/:lessonId')
    async updateLesson(@Req() req: any, @Param('lessonId') lessonId: string, @Body() dto: UpdateCourseLessonDTO) {
        return await this.courseLessonService.updateLesson(req.user.educatorId.toString(), lessonId, dto);
    }

    @UseGuards(OptionalAuthGuard)
    @Get('list/section/:sectionId')
    async getLessonsBySection(@Param('sectionId') sectionId: string, @Req() req: any) {
        return await this.courseLessonService.getLessonsBySection(sectionId, req.user);
    }

    // @UseGuards(OptionalAuthGuard)
    @AdminAccess(AdminModule.COURSES, AccessType.READ)
    @Get('list/course/:courseId')
    async getLessonsByCourse(@Param('courseId') courseId: string, @Req() req: any) {
        return await this.courseLessonService.getLessonsByCourse(courseId, req.user);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.EDUCATOR)
    @Delete('delete/:lessonId')
    async deleteLesson(@Req() req: any, @Param('lessonId') lessonId: string) {
        return await this.courseLessonService.deleteLesson(req.user.educatorId.toString(), lessonId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('upcoming-live-classes/:courseId')
    async getUpcomingLiveClasses(@Param('courseId') courseId: string, @Req() req: any) {
        return await this.courseLessonService.getUpcomingLiveClasses(courseId, req.user._id.toString());
    }
}

