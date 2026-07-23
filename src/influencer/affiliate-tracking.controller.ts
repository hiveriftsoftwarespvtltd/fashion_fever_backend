import { Controller, Post, Get, Param, Body, Req, Res, Redirect } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AffiliateTrackingService } from './affiliate-tracking.service';
import { TrackClickDto } from './dto/track-click.dto';

@Controller('affiliate-tracking')
export class AffiliateTrackingController {
    constructor(private readonly affiliateTrackingService: AffiliateTrackingService) { }

    @Post('click')
    async trackClick(
        @Body() trackClickDto: TrackClickDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response
    ) {
        const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString();
        const userAgent = req.headers['user-agent'] || '';

        const result = await this.affiliateTrackingService.trackClick(
            trackClickDto.referralCode,
            ipAddress,
            userAgent
        );

        // Store the referral code in browser cookies (valid for 30 days)
        res.cookie('referralCode', trackClickDto.referralCode, {
            httpOnly: false, // False so frontend can read/clear it on signup if needed
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        return result;
    }

    // @Get(':referralCode')
    // async handleAffiliateLink(
    //     @Param('referralCode') referralCode: string,
    //     @Req() req: Request,
    //     @Res({ passthrough: true }) res: Response
    // ) {
    //     const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString();
    //     const userAgent = req.headers['user-agent'] || '';

    //     try {
    //         await this.affiliateTrackingService.trackClick(
    //             referralCode,
    //             ipAddress,
    //             userAgent
    //         );
    //     } catch (error) {
    //         // Soft fail tracking if code is invalid
    //     }

    //     // Store the referral code in browser cookies
    //     res.cookie('referralCode', referralCode, {
    //         httpOnly: false,
    //         maxAge: 30 * 24 * 60 * 60 * 1000
    //     });

    //     // Redirect to the frontend homepage
    //     const frontendUrl = process.env.NODE_ENV === 'production'
    //         ? 'https://wakeup-makeup.com'
    //         : 'https://wakeup-makeup.com';

    //     return { url: `${frontendUrl}?ref=${referralCode}`, statusCode: 302 };
    // }

    @Get(':referralCode')
    async handleAffiliateLink(
        @Param('referralCode') referralCode: string,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const ipAddress =
            (req.headers['x-forwarded-for'] ||
                req.socket.remoteAddress ||
                '').toString();

        const userAgent =
            req.headers['user-agent'] || '';

        try {
            await this.affiliateTrackingService.trackClick(
                referralCode,
                ipAddress,
                userAgent,
            );
        } catch (error) {
            console.error('Affiliate tracking error:', error);
        }

        // Store referral code for 30 days
        res.cookie('referralCode', referralCode, {
            httpOnly: false,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: 'lax',
        });

        const frontendUrl =
            process.env.NODE_ENV === 'production'
                ? 'https://wakeup-makeup.com'
                : 'http://localhost:5173';

        console.log(
            `Redirecting to ${frontendUrl}?ref=${referralCode}`,
        );

        return res.redirect(
            `${frontendUrl}?ref=${referralCode}`,
        );
    }
}
