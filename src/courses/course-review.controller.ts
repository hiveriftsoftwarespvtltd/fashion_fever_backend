import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { CourseReviewService } from './course-review.service';
import { CreateCourseReviewDTO, UpdateCourseReviewDTO } from './dto/course-review.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';

@Controller('course-review')
export class CourseReviewController {
    constructor(private readonly courseReviewService: CourseReviewService) { }

    @UseGuards(JwtAuthGuard)
    @Post('create')
    async createReview(@Req() req: any, @Body() dto: CreateCourseReviewDTO) {
        return await this.courseReviewService.createReview(req.user._id.toString(), dto);
    }

    @Get('list/:courseId')
    async getReviewsByCourse(@Param('courseId') courseId: string) {
        return await this.courseReviewService.getReviewsByCourse(courseId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('delete/:reviewId')
    async deleteReview(@Req() req: any, @Param('reviewId') reviewId: string) {
        return await this.courseReviewService.deleteReview(req.user._id.toString(), reviewId);
    }

    @UseGuards(JwtAuthGuard)
    @Put('update/:reviewId')
    async updateReview(@Req() req: any, @Param('reviewId') reviewId: string, @Body() dto: UpdateCourseReviewDTO) {
        return await this.courseReviewService.updateReview(req.user._id.toString(), reviewId, dto);
    }
}
