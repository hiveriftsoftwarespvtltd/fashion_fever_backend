import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AffiliateProgramService } from './affiliate-program.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guad';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/user/schema/user.schema';

@Controller('affiliate-program')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AffiliateProgramController {
    constructor(private readonly affiliateProgramService: AffiliateProgramService) { }

    @Post('generate-link')
    @Roles(UserRole.INFLUENCER)
    async generateLink(@Req() req: any) {
        const influencerId = req.user.influencerId;
        if (!influencerId) {
            return { success: false, message: 'Influencer profile not found' };
        }
        return this.affiliateProgramService.generateAffiliateLink(influencerId);
    }
}
