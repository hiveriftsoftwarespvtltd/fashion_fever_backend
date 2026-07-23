import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { CourseAttachmentService } from './course-attachment.service';
import { CreateCourseAttachmentDTO, UpdateCourseAttachmentDTO } from './dto/course-attachment.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';
import { OptionalAuthGuard } from 'src/auth/optional-auth.guards';

@Controller('course-attachment')
export class CourseAttachmentController {
    constructor(private courseAttachmentService: CourseAttachmentService) { }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.EDUCATOR)
    @Post('create')
    async createAttachment(@Req() req: any, @Body() dto: CreateCourseAttachmentDTO) {
        return await this.courseAttachmentService.createAttachment(req.user.educatorId.toString(), dto);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.EDUCATOR)
    @Put('update/:attachmentId')
    async updateAttachment(@Req() req: any, @Param('attachmentId') attachmentId: string, @Body() dto: UpdateCourseAttachmentDTO) {
        return await this.courseAttachmentService.updateAttachment(req.user.educatorId.toString(), attachmentId, dto);
    }

   @UseGuards(OptionalAuthGuard)
    @Get('list/course/:courseId')
    async getAttachmentsByCourse(@Param('courseId') courseId: string, @Req() req: any) {
        return await this.courseAttachmentService.getAttachmentsByCourse(courseId, req.user);
    }

    @UseGuards(OptionalAuthGuard)
    @Get('list/section/:sectionId')
    async getAttachmentsBySection(@Param('sectionId') sectionId: string, @Req() req: any) {
        return await this.courseAttachmentService.getAttachmentsBySection(sectionId, req.user);
    }

    @UseGuards(OptionalAuthGuard)
    @AdminAccess(AdminModule.COURSES, AccessType.READ)
    @Get('list/lesson/:lessonId')
    async getAttachmentsByLesson(@Param('lessonId') lessonId: string, @Req() req: any) {
        return await this.courseAttachmentService.getAttachmentsByLesson(lessonId, req.user);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.EDUCATOR)
    @Delete('delete/:attachmentId')
    async deleteAttachment(@Req() req: any, @Param('attachmentId') attachmentId: string) {
        return await this.courseAttachmentService.deleteAttachment(req.user.educatorId.toString(), attachmentId);
    }
}

