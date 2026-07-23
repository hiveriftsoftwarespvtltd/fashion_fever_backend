import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Rental, RentalServiceDocument, RentalServiceGender } from "./schema/rental-service.schema";
import { Connection, Model } from "mongoose";
import { AddRentalServiceDTO } from "./dto/rental-service.dto";
import { ServiceProvider, ServiceProviderDocument } from "./schema/service-provider.schema";
import { Types } from "mongoose";
import { DocumentService } from "src/document/document.service";
import { MediaFolderName } from "src/constants";
import { ServiceCategory, ServiceCategoryDocument } from "./schema/service-category.schema";
import { ServiceType } from "./schema/service.schema";




@Injectable()
export class RentalService {
    constructor(@InjectModel(Rental.name) private rentalServiceModal: Model<RentalServiceDocument>, @InjectModel(ServiceProvider.name) private serviceProviderModel: Model<ServiceProviderDocument>, @InjectModel(ServiceCategory.name) private serviceCategoryModel: Model<ServiceCategoryDocument>, @InjectConnection() private connection: Connection, private documentService: DocumentService) { }

    async createrentalService(userId: string, serviceProviderId: string, dto: AddRentalServiceDTO, files?: any) {
        const session = await this.connection.startSession()
        try {
            session.startTransaction()
            const provider = await this.serviceProviderModel
                .findOne({
                    userId: new Types.ObjectId(userId),
                    isDeleted: false,
                })
                .session(session);

            if (!provider) {
                throw new NotFoundException('Service provider profile not found');
            }

            // Upload images via DocumentService
            const imageIds: Types.ObjectId[] = [];
            if (files && files.length > 0) {
                for (const file of files) {
                    const uploaded = await this.documentService.upload(
                        file,
                        MediaFolderName.ServiceImages,
                        userId,
                        undefined,
                        session,
                    );
                    imageIds.push(uploaded._id);
                }
            }

            const providerAny = provider as any;
            const serviceGender = dto.rentalServiceGender || providerAny.providedGenderService;
            if (providerAny.providedGenderService !== RentalServiceGender.UNISEX && serviceGender !== providerAny.providedGenderService) {
                throw new BadRequestException(`Provider only serves ${providerAny.providedGenderService}, cannot create a service for ${serviceGender}`);
            }

            const category = await this.serviceCategoryModel.findById(dto.serviceCategoryId);
            if (!category) {
                throw new BadRequestException('Invalid category ID');
            }

            // if(category.serviceType !== ServiceType.RENTAL){
            //     throw new BadRequestException('Invalid category type');
            // }

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }
    }
}