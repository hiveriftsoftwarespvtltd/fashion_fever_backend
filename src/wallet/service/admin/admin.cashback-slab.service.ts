import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CashbackSlabDocument, CashbackSlab } from '../../schema/cashback/cashbacks.slabs.schema';
import { CreateCashbackSlabDto, UpdateCashbackSlabDto } from '../../dto/admin.cashback-slab.dto';
import { ApiResponse } from 'src/common/responses/api-response';

@Injectable()
export class AdminCashbackSlabService {
    constructor(
        @InjectModel(CashbackSlab.name) private readonly cashbackSlabModel: Model<CashbackSlabDocument>,
    ) { }

    async createSlab(dto: CreateCashbackSlabDto) {
        if (dto.minValue > dto.maxValue) {
            throw new BadRequestException(
                'minValue cannot be greater than maxValue',
            );
        }

        const overlappingSlab = await this.cashbackSlabModel.findOne({
            minValue: { $lte: dto.maxValue },
            maxValue: { $gte: dto.minValue },
        });

        if (overlappingSlab) {
            throw new BadRequestException(
                `Cashback slab overlaps with existing slab (${overlappingSlab.minValue}-${overlappingSlab.maxValue})`,
            );
        }

        const slab = await this.cashbackSlabModel.create(dto);

        return ApiResponse.success(
            'Cashback slab created successfully',
            slab,
        );
    }

    async updateSlab(id: string, dto: UpdateCashbackSlabDto) {
        const existingSlab = await this.cashbackSlabModel.findById(id);

        if (!existingSlab) {
            throw new NotFoundException('Cashback slab not found');
        }

        const minValue = dto.minValue ?? existingSlab.minValue;
        const maxValue = dto.maxValue ?? existingSlab.maxValue;

        if (minValue > maxValue) {
            throw new BadRequestException(
                'minValue cannot be greater than maxValue',
            );
        }

        const overlappingSlab = await this.cashbackSlabModel.findOne({
            _id: { $ne: id },
            minValue: { $lte: maxValue },
            maxValue: { $gte: minValue },
        });

        if (overlappingSlab) {
            throw new BadRequestException(
                `Cashback slab overlaps with existing slab (${overlappingSlab.minValue}-${overlappingSlab.maxValue})`,
            );
        }

        const slab = await this.cashbackSlabModel.findByIdAndUpdate(
            id,
            { $set: dto },
            { new: true, runValidators: true },
        );

        return ApiResponse.success(
            'Cashback slab updated successfully',
            slab,
        );
    }


    async getSlabs() {
        const slabs = await this.cashbackSlabModel.find().sort({ minValue: 1 });
        return ApiResponse.success('Cashback slabs retrieved successfully', slabs);
    }

    async getSlabById(id: string) {
        const slab = await this.cashbackSlabModel.findById(id);
        if (!slab) throw new NotFoundException('Cashback slab not found');
        return ApiResponse.success('Cashback slab retrieved successfully', slab);
    }


    async deleteSlab(id: string) {
        const slab = await this.cashbackSlabModel.findByIdAndDelete(id);
        if (!slab) throw new NotFoundException('Cashback slab not found');
        return ApiResponse.success('Cashback slab deleted successfully', null);
    }
}
