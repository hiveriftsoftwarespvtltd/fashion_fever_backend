import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { CourseReplyService } from './course-reply.service';
import { CreateCourseReplyDTO, UpdateCourseReplyDTO } from './dto/course-reply.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';

@Controller('course-comment-reply')
export class CourseReplyController {
    constructor(private readonly courseReplyService: CourseReplyService) { }

    @UseGuards(JwtAuthGuard)
    @Post('create')
    async createReply(@Req() req: any, @Body() dto: CreateCourseReplyDTO) {
        return await this.courseReplyService.createReply(req.user._id.toString(), dto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('list/:commentId')
    async getRepliesByComment(@Req() req: any, @Param('commentId') commentId: string) {
        return await this.courseReplyService.getRepliesByComment(req.user._id.toString(), commentId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('delete/:replyId')
    async deleteReply(@Req() req: any, @Param('replyId') replyId: string) {
        return await this.courseReplyService.deleteReply(req.user._id.toString(), replyId);
    }

    @UseGuards(JwtAuthGuard)
    @Put('update/:replyId')
    async updateReply(@Req() req: any, @Param('replyId') replyId: string, @Body() dto: UpdateCourseReplyDTO) {
        return await this.courseReplyService.updateReply(req.user._id.toString(), replyId, dto);
    }
}
