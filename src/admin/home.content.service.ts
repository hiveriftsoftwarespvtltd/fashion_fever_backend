import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HomeContent, HomeContentDocument } from './schema/home.content.schema';
import { CreateHomeContentDto, UpdateHomeContentDto } from './dto/home.content.dto';
import { DocumentService } from 'src/document/document.service';

@Injectable()
export class HomeContentService {
    constructor(
        @InjectModel(HomeContent.name) private homeContentModel: Model<HomeContentDocument>,
        private documentService: DocumentService,
    ) { }

    async create(
        createHomeContentDto: CreateHomeContentDto,
        files: { computerImage?: any[], mobileImage?: any[] },
        userId: string
    ): Promise<HomeContent> {
        let computerImageId, mobileImageId;

        if (files?.computerImage?.[0]) {
            const uploaded = await this.documentService.upload(files.computerImage[0], 'homecontent', userId);
            computerImageId = uploaded._id;
        }

        if (files?.mobileImage?.[0]) {
            const uploaded = await this.documentService.upload(files.mobileImage[0], 'homecontent', userId);
            mobileImageId = uploaded._id;
        }

        const createdHomeContent = new this.homeContentModel({
            ...createHomeContentDto,
            ...(computerImageId && { computerImage: computerImageId }),
            ...(mobileImageId && { mobileImage: mobileImageId }),
        });
        return createdHomeContent.save();
    }

    async findAll(page: number = 1, limit: number = 10): Promise<{ data: HomeContent[]; total: number; page: number; limit: number }> {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.homeContentModel
                .find()
                .sort({ displayOrder: 1, createdAt: -1 })
                .populate('computerImage', 'url _id publicId')
                .populate('mobileImage', 'url _id publicId')
                .skip(skip)
                .limit(limit)
                .exec(),
            this.homeContentModel.countDocuments().exec(),

        ]);

        return {
            data,
            total,
            page,
            limit
        };
    }

    async findOne(id: string): Promise<HomeContent> {
        const homeContent = await this.homeContentModel.findById(id).populate("computerImage", "url _id publicId").populate("mobileImage", "url _id publicId").exec();
        if (!homeContent) {
            throw new NotFoundException(`Home content with ID ${id} not found`);
        }
        return homeContent;
    }

    async update(
        id: string,
        updateHomeContentDto: UpdateHomeContentDto,
        files: { computerImage?: any[], mobileImage?: any[] },
        userId: string
    ): Promise<HomeContent> {
        const existingContent = await this.homeContentModel.findById(id).exec();
        if (!existingContent) {
            throw new NotFoundException(`Home content with ID ${id} not found`);
        }

        let computerImageId = existingContent.computerImage;
        let mobileImageId = existingContent.mobileImage;

        if (files?.computerImage?.[0]) {
            if (computerImageId) {
                await this.documentService.deleteMedia(computerImageId.toString());
            }
            const uploaded = await this.documentService.upload(files.computerImage[0], 'homecontent', userId);
            computerImageId = uploaded._id;
        }

        if (files?.mobileImage?.[0]) {
            if (mobileImageId) {
                await this.documentService.deleteMedia(mobileImageId.toString());
            }
            const uploaded = await this.documentService.upload(files.mobileImage[0], 'homecontent', userId);
            mobileImageId = uploaded._id;
        }

        const updatedHomeContent = await this.homeContentModel.findByIdAndUpdate(
            id,
            {
                ...updateHomeContentDto,
                computerImage: computerImageId,
                mobileImage: mobileImageId
            },
            { new: true, runValidators: true }
        ).exec();

        if (!updatedHomeContent) {
            throw new NotFoundException(`Home content with ID ${id} not found`);
        }

        return updatedHomeContent;
    }

    async remove(id: string): Promise<{ message: string }> {
        const deletedHomeContent = await this.homeContentModel.findById(id).exec();
        if (!deletedHomeContent) {
            throw new NotFoundException(`Home content with ID ${id} not found`);
        }

        if (deletedHomeContent.computerImage) {
            await this.documentService.deleteMedia(deletedHomeContent.computerImage.toString());
        }

        if (deletedHomeContent.mobileImage) {
            await this.documentService.deleteMedia(deletedHomeContent.mobileImage.toString());
        }

        await deletedHomeContent.deleteOne();

        return { message: 'Home content successfully deleted' };
    }
}
