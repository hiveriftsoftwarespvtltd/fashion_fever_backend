import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CommissionRate,
  CommissionRateDocument,
} from './schema/commission-rate.schema';
import {
  CreateCommissionRateDto,
  UpdateCommissionRateDto,
} from './dto/commission-rate.dto';

@Injectable()
export class AdminCommissionRateService {
  constructor(
    @InjectModel(CommissionRate.name)
    private readonly commissionRateModel: Model<CommissionRateDocument>,
  ) {}

  /**
   * Returns the single commission-rate document.
   * Throws 404 if it hasn't been set yet.
   */
  async get(): Promise<CommissionRate> {
    const rate = await this.commissionRateModel.findOne().exec();
    if (!rate) {
      throw new NotFoundException('Commission rate configuration not found');
    }
    return rate;
  }

  /**
   * Upserts the single commission-rate document.
   * Creates one if it doesn't exist, replaces the commissions array if it does.
   */
  async set(
    dto: CreateCommissionRateDto | UpdateCommissionRateDto,
  ): Promise<CommissionRate> {
    const existing = await this.commissionRateModel.findOne().exec();

    if (existing) {
      if (dto.commissions !== undefined) {
        existing.commissions = dto.commissions as any;
      }
      return existing.save();
    }

    const created = new this.commissionRateModel(dto);
    return created.save();
  }
}
