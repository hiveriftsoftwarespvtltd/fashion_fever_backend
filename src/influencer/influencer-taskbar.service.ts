import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { InfluencerTaskBar, InfluencerTaskbarDocument } from "./schema/influencer-taskbar.schema";
import { Model, Types } from "mongoose";
import { CreateInfluencerTaskbarDTO, UpdateInfluencerTaskbarDTO } from "./dto/influencer.dto";
import { ApiResponse } from "src/common/responses/api-response";
import { UserRole } from "src/user/schema/user.schema";
import { takeLast } from "rxjs";


@Injectable()
export class InfluencerTaskBarService {
    constructor(@InjectModel(InfluencerTaskBar.name) private influencerTaskbarModel: Model<InfluencerTaskbarDocument>) { }


    async submitTaskbarData(influencerId: string, dto: CreateInfluencerTaskbarDTO) {
        const existingTaskbar = await this.influencerTaskbarModel.findOne({
            influencerId: new Types.ObjectId(influencerId),
            mediaLink: dto.mediaLink
        })

        if (existingTaskbar) {
            throw new ConflictException("This link already added by you")
        }

        const newTask = await this.influencerTaskbarModel.create({
            influencerId: new Types.ObjectId(influencerId),
            mediaLink: dto.mediaLink,
            postingDate: dto.postingDate,
            platform: dto.platform
        })

        return ApiResponse.success('Taskbar data submitted successfully', newTask);
    }

    async updateTaskbarData(influencerId: string, taskdataId: string, dto: UpdateInfluencerTaskbarDTO) {
        const taskbardata = await this.influencerTaskbarModel.findOne({ influencerId: new Types.ObjectId(influencerId), _id: new Types.ObjectId(taskdataId) })
        if (!taskbardata) {
            throw new NotFoundException("Task data not found")
        }
        const existingTaskbar = await this.influencerTaskbarModel.findOne({
            influencerId: new Types.ObjectId(influencerId),
            mediaLink: dto.mediaLink,
            _id: { $ne: new Types.ObjectId(taskdataId) }
        })

        if (existingTaskbar) {
            throw new ConflictException("This link already added by you")
        }

        const filteredData = Object.fromEntries(
            Object.entries(dto).filter(([_, value]) => {
                if (value === null || value === undefined) {
                    return false;
                }

                if (typeof value === 'string') {
                    return value.trim() !== '';
                }

                return true;
            }),
        );

        Object.assign(taskbardata, filteredData)
        await taskbardata.save()

        return ApiResponse.success("Taskbar data updated successfully", taskbardata)
    }

    async getTaskdata(role: string, influencerId?: string) {
        const query = {}
        if (role === UserRole.INFLUENCER && influencerId) {
            query['influencerId'] = new Types.ObjectId(influencerId)
        }

        const taskBarList = await this.influencerTaskbarModel.find(query).populate({
            path: 'influencerId',
            select: 'name bio instagram youtube snapchat facebook'
        }).sort({ createdAt: -1 })

        return ApiResponse.success("Taskbar data fetched successfully", taskBarList)
    }

    async deleteTaskbarList(taskDataId: string, influencerId?: string) {
        const query = { _id: new Types.ObjectId(taskDataId) }
        if (influencerId) {
            query['influencerId'] = new Types.ObjectId(influencerId)
        }
        const taskData = await this.influencerTaskbarModel.findOne(query)
        if (!taskData) {
            throw new NotFoundException("Task data not found")
        }

        await taskData.deleteOne()

        return ApiResponse.success("Task data deleted successfully", taskData)
    }

    async getListofTaskByInfluencer(influencerId: string) {
        const taskBarList = await this.influencerTaskbarModel.find({
            influencerId: new Types.ObjectId(influencerId)
        }).sort({ createdAt: -1 })

        return ApiResponse.success("Taskbar data fetched successfully", taskBarList || [])
    }
}