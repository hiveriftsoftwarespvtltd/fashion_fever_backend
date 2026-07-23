import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { CourseEnrollmentService } from './course-enrollment.service';
import { EnrollCourseDTO, PurchaseCourseDTO, UpdateLessonProgressDTO } from './dto/course-enrollment.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';

@Controller('course-enrollment')
export class CourseEnrollmentController {
    constructor(private courseEnrollmentService: CourseEnrollmentService) { }

    @UseGuards(JwtAuthGuard)
    @Post('enroll')
    async enrollUser(@Req() req: any, @Body() dto: EnrollCourseDTO) {
        return await this.courseEnrollmentService.enrollUser(req.user._id.toString(), dto);
    }

    @UseGuards(JwtAuthGuard)
    @Post('purchase')
    async purchaseCourse(@Req() req: any, @Body() dto: PurchaseCourseDTO) {
        return await this.courseEnrollmentService.purchaseCourse(req.user._id.toString(), dto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('my-enrollments')
    async getUserEnrollments(@Req() req: any) {
        return await this.courseEnrollmentService.getUserEnrollments(req.user._id.toString());
    }

    @UseGuards(JwtAuthGuard)
    @Get('details/:courseId')
    async getEnrollmentDetails(@Req() req: any, @Param('courseId') courseId: string) {
        return await this.courseEnrollmentService.getEnrollmentDetails(req.user._id.toString(), courseId);
    }

    @UseGuards(JwtAuthGuard)
    @Put('update-progress')
    async updateLessonProgress(@Req() req: any, @Body() dto: UpdateLessonProgressDTO) {
        return await this.courseEnrollmentService.updateLessonProgress(req.user._id.toString(), dto);
    }
}
