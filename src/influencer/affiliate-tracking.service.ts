import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AffliateProgram,
  AffliateProgramDocument,
} from './schema/affliate-program.schema';
import {
  AffliateClickTracking,
  AffliateClickTrackingDocument,
} from './schema/affliate-click-tracking.schema';
import {
  AffliateClickRateLimit,
  AffliateClickRateLimitDocument,
} from './schema/affliate-click-rate-limit.schema';
import {
  AffliateSignup,
  AffliateSignupDocument,
} from './schema/affliate-signup.schema';
import {
  AffliateCommission,
  AffliateCommissionDocument,
} from './schema/affliate-commission.schema';

const BOT_USER_AGENT_REGEX =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegrambot|curl|wget|python-requests|node-fetch|axios|httpclient/i;

@Injectable()
export class AffiliateTrackingService {
  constructor(
    @InjectModel(AffliateProgram.name)
    private affliateProgramModel: Model<AffliateProgramDocument>,
    @InjectModel(AffliateClickTracking.name)
    private affliateClickTrackingModel: Model<AffliateClickTrackingDocument>,
    @InjectModel(AffliateSignup.name)
    private affliateSignupModel: Model<AffliateSignupDocument>,
    @InjectModel(AffliateCommission.name)
    private affliateCommissionModel: Model<AffliateCommissionDocument>,
    @Optional()
    @InjectModel(AffliateClickRateLimit.name)
    private affliateRateLimitModel?: Model<AffliateClickRateLimitDocument>,
  ) {}

  async trackClick(referralCode: string, ipAddress: string, userAgent: string) {
    const program = await this.affliateProgramModel.findOne({
      referralCode,
      isActive: true,
      isDeleted: false,
    });

    if (!program) {
      throw new NotFoundException('Affiliate program not found');
    }

    // 1. Bot & Crawler Rejection: Discard immediately without tracking or incrementing counters
    if (userAgent && BOT_USER_AGENT_REGEX.test(userAgent)) {
      return program;
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 2. Concurrency-Safe Rolling 24-Hour Sliding Window Lease
    if (this.affliateRateLimitModel) {
      let leaseAcquired = false;
      try {
        const rateLimitResult =
          await this.affliateRateLimitModel.findOneAndUpdate(
            {
              influencerId: program.influencerId,
              ipAddress,
              $or: [
                { lastEligibleClickAt: { $lt: twentyFourHoursAgo } },
                { lastEligibleClickAt: { $exists: false } },
              ],
            },
            {
              $set: { lastEligibleClickAt: now },
              $setOnInsert: { influencerId: program.influencerId, ipAddress },
            },
            { upsert: true, returnDocument: 'after' },
          );

        if (rateLimitResult) {
          leaseAcquired = true;
        }
      } catch (err: any) {
        // Duplicate key error on concurrent upsert (code 11000) means another request won the race
        if (err.code === 11000) {
          leaseAcquired = false;
        } else {
          throw err;
        }
      }

      if (!leaseAcquired) {
        // Throttled: repeat click within rolling 24 hours or lost race condition
        return program;
      }
    } else {
      // Fallback if rate limit model is not provided (e.g. legacy/mock environments)
      const existingTracking = await this.affliateClickTrackingModel.findOne({
        influencerId: program.influencerId,
        ipAddress,
        clickedAt: { $gte: twentyFourHoursAgo },
      });

      if (existingTracking) {
        return program;
      }
    }

    // 3. Record tracking document for legitimate winner
    await this.affliateClickTrackingModel.create({
      programId: program._id,
      influencerId: program.influencerId,
      ipAddress,
      userAgent: userAgent || '',
      clickedAt: now,
    });

    // 4. Atomically increment totalClicks
    await this.affliateProgramModel.updateOne(
      { _id: program._id },
      {
        $inc: {
          totalClicks: 1,
        },
      },
    );

    return program;
  }

  async trackSignup(userId: string | Types.ObjectId, referralCode: string) {
    const program = await this.affliateProgramModel.findOne({
      referralCode,
      isActive: true,
      isDeleted: false,
    });
    if (!program) {
      return; // Soft fail, we don't want to stop the registration process if code is invalid
    }

    const existing = await this.affliateSignupModel.findOne({
      userId,
    });

    if (existing) {
      return;
    }

    const signup = new this.affliateSignupModel({
      userId: new Types.ObjectId(userId.toString()),
      affliateProgramId: program._id,
      signupAt: new Date(),
    });

    await signup.save();

    await this.affliateProgramModel.findByIdAndUpdate(program._id, {
      $inc: { totalSignups: 1 },
    });
    return program;
  }

  async createPendingCommission(
    userId: string | Types.ObjectId,
    itemType: string,
    itemId: string | Types.ObjectId,
    orderAmount: number,
  ) {
    const signup = await this.affliateSignupModel.findOne({
      userId: new Types.ObjectId(userId.toString()),
    });
    if (!signup) {
      return; // User was not referred by any affiliate
    }

    const program = await this.affliateProgramModel.findById(
      signup.affliateProgramId,
    );
    if (!program) {
      return;
    }

    const commission = new this.affliateCommissionModel({
      programId: program._id,
      influencerId: program.influencerId,
      customerId: new Types.ObjectId(userId.toString()),
      itemId: new Types.ObjectId(itemId.toString()),
      itemType,
      orderAmount,
      status: 'PENDING',
    });

    await commission.save();

    const incObj: any = { totalOrders: 1, totalRevenueGenerated: orderAmount };
    if (itemType === 'PRODUCT') incObj.productSalesCount = 1;
    if (itemType === 'SERVICE') incObj.serviceBookingCount = 1;
    if (itemType === 'COURSE') incObj.coursePurchaseCount = 1;

    await this.affliateProgramModel.findByIdAndUpdate(program._id, {
      $inc: incObj,
    });
  }

  async updateCommissionStatus(
    itemId: string | Types.ObjectId,
    itemType: string,
    status: string,
  ) {
    const commission = await this.affliateCommissionModel.findOne({
      itemId: new Types.ObjectId(itemId.toString()),
      itemType,
    });
    if (!commission) {
      return; // No commission to update
    }

    commission.status = status;
    await commission.save();
  }
}
