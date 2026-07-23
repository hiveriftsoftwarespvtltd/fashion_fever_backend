import { AdminAccess } from 'src/auth/admin-access.decorator';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { CourseCommentService } from './course-comment.service';
import { CreateCourseCommentDTO, UpdateCourseCommentDTO } from './dto/course-comment.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';

@Controller('course-comment')
export class CourseCommentController {
    constructor(private readonly courseCommentService: CourseCommentService) {}

    @UseGuards(JwtAuthGuard)
    @Post('create')
    async createComment(@Req() req: any, @Body() dto: CreateCourseCommentDTO) {
        return await this.courseCommentService.createComment(req.user._id.toString(), dto);
    }

    @UseGuards(JwtAuthGuard)
    
    @Get('list/:lessonId')
    async getCommentsByLesson(@Req() req: any, @Param('lessonId') lessonId: string) {
        return await this.courseCommentService.getCommentsByLesson(req.user._id.toString(), lessonId);
    }



    @AdminAccess(AdminModule.COURSES, AccessType.WRITE)
    @Delete('delete/:commentId')
    async deleteComment(@Req() req: any, @Param('commentId') commentId: string) {
        return await this.courseCommentService.deleteComment(req.user._id.toString(), commentId);
    }

    @UseGuards(JwtAuthGuard)
    @Put('update/:commentId')
    async updateComment(@Req() req: any, @Param('commentId') commentId: string, @Body() dto: UpdateCourseCommentDTO) {
        return await this.courseCommentService.updateComment(req.user._id.toString(), commentId, dto);
    }
}
