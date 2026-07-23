import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { QuickDeliveryConfiguration, QuickDeliveryConfigurationDocument } from './schema/quickDeliveryConfig';
import { UpdateQuickDeliveryConfigDto } from './dto/quick-delivery-config.dto';

@Injectable()
export class QuickDeliveryConfigService {
    constructor(
        @InjectModel(QuickDeliveryConfiguration.name) private configModel: Model<QuickDeliveryConfigurationDocument>,
    ) { }

    async getConfig() {
        let config = await this.configModel.findOne().exec();

        // If no config exists, create a default one
        if (!config) {
            config = await this.configModel.create({
                minimumValueForFreeDelivery: 49,
                deliveryFee: 25,
            });
        }

        return {
            message: 'Quick delivery configuration retrieved successfully',
            data: config,
        };
    }

    async createOrUpdateConfig(dto: UpdateQuickDeliveryConfigDto) {
        let config = await this.configModel.findOneAndUpdate({}, dto, { upsert: true, new: true }).exec();

        // if (!config) {
        //     config = await this.configModel.create(dto);
        // } else {
        //     config.minimumValueForFreeDelivery = dto.minimumValueForFreeDelivery;
        //     config.deliveryFee = dto.deliveryFee;
        //     await config.save();
        // }

        return {
            message: 'Quick delivery configuration updated successfully',
            data: config,
        };
    }
}
