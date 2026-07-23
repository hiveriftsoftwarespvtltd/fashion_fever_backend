import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AffliateProgram, AffliateProgramDocument } from './schema/affliate-program.schema';
import { randomBytes } from 'crypto';

@Injectable()
export class AffiliateProgramService {
    constructor(
        @InjectModel(AffliateProgram.name) private affliateProgramModel: Model<AffliateProgramDocument>
    ) { }

    async generateAffiliateLink(influencerId: string) {
        let program = await this.affliateProgramModel.findOne({ influencerId: new Types.ObjectId(influencerId), isActive: true, isDeleted: false });

        if (!program) {
            const referralCode = randomBytes(4).toString('hex').toUpperCase();
            program = new this.affliateProgramModel({
                influencerId: new Types.ObjectId(influencerId),
                referralCode,
                isActive: true,
                isDeleted: false
            });
            await program.save();
        }

        const apiUrl = process.env.API_URL || (process.env.NODE_ENV === 'production' ? process.env.SERVER_BASE_URL : `http://localhost:${process.env.PORT}`);
        const affiliateLink = `${apiUrl}/api/v1/affiliate-tracking/${program.referralCode}`;

        return {
            success: true,
            message: 'Affiliate link generated successfully',
            referralCode: program.referralCode,
            affiliateLink
        };
    }
}
