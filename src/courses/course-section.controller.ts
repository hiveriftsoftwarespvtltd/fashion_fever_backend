import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { CourseSectionService } from './course-section.service';
import { CreateCourseSectionDTO, UpdateCourseSectionDTO } from './dto/course-content.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';
import { OptionalAuthGuard } from 'src/auth/optional-auth.guards';

@Controller('course-section')
export class CourseSectionController {
    constructor(private courseSectionService: CourseSectionService) { }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.EDUCATOR)
    @Post('create')
    async createSection(@Req() req: any, @Body() dto: CreateCourseSectionDTO) {
        return await this.courseSectionService.createSection(req.user.educatorId.toString(), dto);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.EDUCATOR)
    @Put('update/:sectionId')
    async updateSection(@Req() req: any, @Param('sectionId') sectionId: string, @Body() dto: UpdateCourseSectionDTO) {
        return await this.courseSectionService.updateSection(req.user.educatorId.toString(), sectionId, dto);
    }

    @UseGuards(OptionalAuthGuard)
    @Get('list/:courseId')
    async getSectionsByCourse(@Param('courseId') courseId: string, @Req() req: any) {
        return await this.courseSectionService.getSectionsByCourse(courseId, req.user);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.EDUCATOR)
    @Delete('delete/:sectionId')
    async deleteSection(@Req() req: any, @Param('sectionId') sectionId: string) {
        return await this.courseSectionService.deleteSection(req.user.educatorId.toString(), sectionId);
    }
}
