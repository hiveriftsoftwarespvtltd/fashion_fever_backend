import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import { LearnerService } from './learner.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { Response } from 'express';

@Controller('learner')
export class LearnerController {
    constructor(private readonly learnerService: LearnerService) { }

    @UseGuards(JwtAuthGuard)
    @Get('enrolled-courses')
    async getEnrolledCourses(@Req() req: any) {
        return await this.learnerService.getEnrolledCourses(req.user._id.toString());
    }

    @UseGuards(JwtAuthGuard)
    @Get('course/:courseId/certificate')
    async downloadCertificate(
        @Req() req: any,
        @Param('courseId') courseId: string,
        @Res() res: any
    ) {
        const pdfDoc = await this.learnerService.generateCertificate(req.user._id.toString(), courseId);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="certificate-${courseId}.pdf"`);

        pdfDoc.pipe(res);
        pdfDoc.end();
    }
}
