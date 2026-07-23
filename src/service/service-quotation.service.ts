import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { ServiceQuotation, ServiceQuotationDocument, ServiceQuotationStatus, QuotationItemType } from './schema/service-quotation.schema';
import { ServiceLead, ServiceLeadDocument, ServiceLeadStatus } from './schema/service-lead.schema';
import { MarketplaceEarning, MarketplaceEarningDocument, EarningRole, EarningReferenceType, EarningStatus } from 'src/payout/schema/market-place-earning.schema';
import { LeadBooking, LeadBookingDocument } from './schema/service-lead-booking.schema';
import { StaffAllocation, StaffAllocationDocument, StaffAllocationStatus, AllocationType } from './schema/staff-allocation.schema';
import { ServiceStaff, ServiceStaffDocument } from './schema/service-staff.schema';
import { ServiceProvider, ServiceProviderDocument } from './schema/service-provider.schema';
import { CreateServiceQuotationDto, UpdateServiceQuotationDto, QuotationItemDto } from './dto/service-quotation.dto';
import { ApiResponse } from '../common/responses/api-response';
import { formatDateIST, formatTimeIST } from 'src/utils/helper';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationModuleType, NotificationType, NotificationPriority } from 'src/notification/schema/notification.schema';

@Injectable()
export class ServiceQuotationService {
    constructor(
        @InjectModel(ServiceQuotation.name) private quotationModel: Model<ServiceQuotationDocument>,
        @InjectModel(ServiceLead.name) private leadModel: Model<ServiceLeadDocument>,
        @InjectModel(LeadBooking.name) private leadBookingModel: Model<LeadBookingDocument>,
        @InjectModel(StaffAllocation.name) private staffAllocationModel: Model<StaffAllocationDocument>,
        @InjectModel(ServiceStaff.name) private serviceStaffModel: Model<ServiceStaffDocument>,
        @InjectModel(ServiceProvider.name) private providerModel: Model<ServiceProviderDocument>,
        @InjectModel(MarketplaceEarning.name) private marketplaceEarningModel: Model<MarketplaceEarningDocument>,
        @InjectConnection() private connection: Connection,
        private notificationService: NotificationService,
    ) { }

    private computeTotals(items: QuotationItemDto[]) {
        let subtotal = 0;
        const processedItems = items.map(item => {
            const totalPrice = item.quantity * item.unitPrice;
            subtotal += totalPrice;
            return {
                ...item,
                totalPrice
            };
        });
        return { items: processedItems, subtotal, finalAmount: subtotal };
    }

    private async checkStaffAvailability(providerId: string, serviceDate: Date, slotStartTime: Date | undefined, slotEndTime: Date | undefined, requiredStaffCount: number) {
        const startOfDay = new Date(serviceDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(serviceDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch all active staff for this provider
        const staff = await this.serviceStaffModel.find({
            providerId: new Types.ObjectId(providerId),
            isActive: true,
        }).lean();

        if (staff.length < requiredStaffCount) {
            throw new BadRequestException(`Provider only has ${staff.length} active staff, but ${requiredStaffCount} are required.`);
        }

        // Fetch all existing allocations for the given date
        const existingBookings = await this.staffAllocationModel.find({
            serviceProviderId: new Types.ObjectId(providerId),
            bookingDate: {
                $gte: startOfDay,
                $lte: endOfDay,
            },
            status: {
                $in: [
                    StaffAllocationStatus.ASSIGNED,
                    StaffAllocationStatus.CONFIRMED,
                    StaffAllocationStatus.ON_LEAVE,
                    StaffAllocationStatus.OFF,
                ],
            },
        }).lean();

        let availableStaff = staff;

        if (slotStartTime && slotEndTime) {
            const slotStartMin = slotStartTime.getHours() * 60 + slotStartTime.getMinutes();
            const slotEndMin = slotEndTime.getHours() * 60 + slotEndTime.getMinutes();

            // Count how many staff members are actually available (not overlapping)
            availableStaff = staff.filter(staffMember => {
                const hasBooking = existingBookings.some(booking => {
                    if (booking.staffId?.toString() !== staffMember._id.toString()) {
                        return false;
                    }

                    if (!booking.slotStartTime || !booking.slotEndTime) {
                        return true; // Overlaps with an all-day/unspecified time booking
                    }

                    const bookingDateObjStart = new Date(booking.slotStartTime);
                    const bookingDateObjEnd = new Date(booking.slotEndTime);

                    const bookingStart = bookingDateObjStart.getHours() * 60 + bookingDateObjStart.getMinutes();
                    const bookingEnd = bookingDateObjEnd.getHours() * 60 + bookingDateObjEnd.getMinutes();

                    return (slotStartMin < bookingEnd && slotEndMin > bookingStart);
                });
                return !hasBooking;
            });
        }

        if (availableStaff.length < requiredStaffCount) {
            throw new BadRequestException(`Insufficient staff available for this time and duration. Only ${availableStaff.length} staff are available.`);
        }

        return availableStaff;
    }

    async createQuotation(providerId: string, dto: CreateServiceQuotationDto) {
        const lead = await this.leadModel.findById(new Types.ObjectId(dto.leadId));
        if (!lead) {
            throw new NotFoundException('Service lead not found');
        }

        const provider = await this.providerModel.findById(new Types.ObjectId(providerId));
        if (!provider) {
            throw new NotFoundException('Service provider not found');
        }

        if (dto.serviceDate && lead.preferredDateAndTime) {
            const dtoServiceDate = new Date(dto.serviceDate);
            const leadPreferredDate = new Date(lead.preferredDateAndTime as any);

            if (
                dtoServiceDate.getFullYear() !== leadPreferredDate.getFullYear() ||
                dtoServiceDate.getMonth() !== leadPreferredDate.getMonth() ||
                dtoServiceDate.getDate() !== leadPreferredDate.getDate()
            ) {
                throw new BadRequestException('Quotation service date must match the lead\'s preferred date');
            }
        }

        const providerAny = provider as any;
        if (providerAny.providedGenderService !== 'BOTH') {
            const expectedGender = providerAny.providedGenderService === 'ONLY_MEN' ? 'MALE' : 'FEMALE';
            if (lead.gender !== expectedGender) {
                throw new BadRequestException('Provider gender specialization does not match lead gender');
            }
        }

        if (dto.slotStartTime && dto.slotEndTime) {
            await this.checkStaffAvailability(
                providerId,
                dto.serviceDate,
                dto.slotStartTime,
                dto.slotEndTime,
                dto.requiredStaffCount
            );
        }

        const { items, subtotal, finalAmount } = this.computeTotals(dto.items);

        const user = await this.connection.models.User.findById(lead.userId);

        let calculatedDuration = 0;
        if (dto.slotStartTime && dto.slotEndTime) {
            calculatedDuration = Math.round((dto.slotEndTime.getTime() - dto.slotStartTime.getTime()) / 60000);
            if (calculatedDuration < 0) {
                throw new BadRequestException('slotEndTime must be after slotStartTime');
            }
        }

        const quotation = await this.quotationModel.create({
            leadId: new Types.ObjectId(dto.leadId),
            providerId: new Types.ObjectId(providerId),
            serviceDate: dto.serviceDate,
            slotStartTime: dto.slotStartTime,
            slotEndTime: dto.slotEndTime,
            totalDurationMinutes: calculatedDuration,
            requiredStaffCount: dto.requiredStaffCount,
            // note: dto.note,
            items,
            subtotal,
            finalAmount,
            notes: dto.notes,
            validTill: dto.validTill,
            customerName: user ? user.name : lead.name,
            customerPhone: lead.phoneNumber,
            customerEmail: lead.email,
            serviceAddress: `${lead.address}, ${lead.city}, ${lead.state} - ${lead.pincode}`,
            status: ServiceQuotationStatus.PENDING,
            version: 1
        });

        if (lead.userId) {
            await this.notificationService.sendNotification({
                receiverId: lead.userId.toString(),
                title: 'New Service Quotation',
                body: `You have received a new quotation from ${provider.businessName}.`,
                moduleType: NotificationModuleType.SERVICE_BOOKINGS,
                type: NotificationType.SYSTEM,
                priority: NotificationPriority.HIGH
            });
        }

        return ApiResponse.success('Quotation created successfully', quotation);
    }

    async getLeadQuotations(userId: string, leadId: string): Promise<any> {
        const lead = await this.leadModel.findById(new Types.ObjectId(leadId));
        if (!lead) {
            throw new NotFoundException('Service lead not found');
        }

        // Verify the lead belongs to the user
        if (lead.userId.toString() !== userId.toString()) {
            throw new ForbiddenException('You do not have access to this lead');
        }

        const quotations = await this.quotationModel.find({ leadId: new Types.ObjectId(leadId) }).lean();
        const formattedQuotations = quotations.map(q => {
            return {
                ...q,
                serviceDate: q.serviceDate ? formatDateIST(q.serviceDate) : q.serviceDate,
                slotStartTime: q.slotStartTime ? formatTimeIST(q.slotStartTime) : q.slotStartTime,
                slotEndTime: q.slotEndTime ? formatTimeIST(q.slotEndTime) : q.slotEndTime,
            };
        });
        return ApiResponse.success('Quotations fetched successfully', formattedQuotations);
    }

    async deleteQuotation(providerId: string, id: string) {
        const quotation = await this.quotationModel.findById(new Types.ObjectId(id));
        if (!quotation) {
            throw new NotFoundException('Quotation not found');
        }

        if (quotation.providerId.toString() !== String(providerId)) {
            throw new ForbiddenException('You do not have permission to delete this quotation');
        }

        if (quotation.status !== ServiceQuotationStatus.PENDING) {
            throw new BadRequestException(`Cannot delete quotation with status ${quotation.status}`);
        }

        await quotation.deleteOne();
        return ApiResponse.success('Quotation deleted successfully');
    }

    async updateQuotation(providerId: string, id: string, dto: UpdateServiceQuotationDto) {
        const quotation = await this.quotationModel.findById(new Types.ObjectId(id));
        if (!quotation) {
            throw new NotFoundException('Quotation not found');
        }


        if (quotation.providerId.toString() !== String(providerId)) {
            throw new ForbiddenException('You do not have permission to update this quotation');
        }

        if (quotation.status !== ServiceQuotationStatus.PENDING) {
            throw new BadRequestException('Can only update quotations in PENDING state');
        }

        if (dto.items) {
            const { items, subtotal, finalAmount } = this.computeTotals(dto.items);
            quotation.items = items as any;
            quotation.subtotal = subtotal;
            quotation.finalAmount = finalAmount;
            quotation.version += 1;
        }

        // if (dto.note !== undefined) quotation.note = dto.note;
        if (dto.notes !== undefined) quotation.notes = dto.notes;
        if (dto.validTill !== undefined) quotation.validTill = dto.validTill;

        await quotation.save();
        return ApiResponse.success('Quotation updated successfully', quotation);
    }

    async acceptQuotation(userId: string, id: string) {
        const session = await this.connection.startSession();
        try {
            session.startTransaction();

            const quotation = await this.quotationModel.findById(new Types.ObjectId(id)).session(session);
            if (!quotation) {
                throw new NotFoundException('Quotation not found');
            }

            const lead = await this.leadModel.findById(quotation.leadId).session(session);
            if (!lead || lead.userId.toString() !== userId.toString()) {
                throw new ForbiddenException('You do not have permission to accept this quotation');
            }

            if (quotation.status !== ServiceQuotationStatus.PENDING) {
                throw new BadRequestException('Can only accept quotations in PENDING state');
            }

            const availableStaff = await this.checkStaffAvailability(
                quotation.providerId.toString(),
                quotation.serviceDate,
                quotation.slotStartTime,
                quotation.slotEndTime,
                quotation.requiredStaffCount
            );

            const assignedStaffIds = availableStaff
                .slice(0, quotation.requiredStaffCount)
                .map(staff => staff._id);

            quotation.status = ServiceQuotationStatus.CONVERTED_TO_BOOKING;
            quotation.isAccepted = true;
            quotation.acceptedAt = new Date();
            quotation.acceptedBy = new Types.ObjectId(userId);

            await quotation.save({ session });

            lead.status = ServiceLeadStatus.BOOKED;
            await lead.save({ session });

            const [leadBooking] = await this.leadBookingModel.create([{
                leadId: lead._id,
                quotationId: quotation._id,
                userId: new Types.ObjectId(userId),
                serviceProviderId: quotation.providerId,
                staffIds: assignedStaffIds,
                totalPersons: lead.totalPersons || 1,
                bookingDate: quotation.serviceDate,
                slotStartTime: quotation.slotStartTime,
                slotEndTime: quotation.slotEndTime,
                totalAmount: quotation.finalAmount,
                platFormCommissionPercentage: 0,
                platFormCommissionAmount: 0,
                providerPayoutAmount: quotation.finalAmount,
                leadStatus: 'CONFIRMED',
                leadBookingStatus: 'CONFIRMED'
            }], { session });

            // Create Staff Allocations
            const allocations = assignedStaffIds.map(staffId => ({
                staffId: new Types.ObjectId(staffId),
                serviceProviderId: new Types.ObjectId(quotation.providerId),
                leadBookingId: new Types.ObjectId(leadBooking._id),
                bookingDate: quotation.serviceDate,
                slotStartTime: quotation.slotStartTime,
                slotEndTime: quotation.slotEndTime,
                status: StaffAllocationStatus.CONFIRMED,
                allocationType: AllocationType.LEAD_BOOKING
            }));
            if (allocations.length > 0) {
                await this.staffAllocationModel.insertMany(allocations, { session });
            }

            quotation.bookingId = leadBooking._id;
            await quotation.save({ session })

            const provider = await this.providerModel.findById(quotation.providerId).session(session);
            if (provider && provider.userId) {
                await this.notificationService.sendNotification({
                    receiverId: provider.userId.toString(),
                    title: 'Quotation Accepted',
                    body: `Your quotation has been accepted and a booking has been created.`,
                    moduleType: NotificationModuleType.SERVICE_BOOKINGS,
                    type: NotificationType.SYSTEM,
                    priority: NotificationPriority.HIGH
                });
            }

            await session.commitTransaction();
            return ApiResponse.success('Quotation accepted and lead booking created successfully with assigned staff', { quotation, leadBooking, assignedStaffIds });
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async completeQuotation(providerId: string, id: string) {
        const session = await this.connection.startSession();
        try {
            session.startTransaction();

            const quotation = await this.quotationModel.findById(new Types.ObjectId(id)).session(session);
            if (!quotation) {
                throw new NotFoundException('Quotation not found');
            }

            if (quotation.providerId.toString() !== String(providerId)) {
                throw new ForbiddenException('You do not have permission to complete this quotation');
            }

            if (quotation.status !== ServiceQuotationStatus.CONVERTED_TO_BOOKING && quotation.status !== ServiceQuotationStatus.ACCEPTED) {
                throw new BadRequestException('Quotation must be accepted/booked before it can be completed');
            }

            quotation.status = ServiceQuotationStatus.COMPLETED;
            await quotation.save({ session });

            // Update corresponding LeadBooking
            const leadBooking = await this.leadBookingModel.findOne({ quotationId: quotation._id }).session(session);
            if (leadBooking) {
                leadBooking.leadBookingStatus = 'COMPLETED';
                leadBooking.leadStatus = 'COMPLETED';
                await leadBooking.save({ session });
            }

            // Add funds to the provider's wallet automatically
            const provider = await this.providerModel.findById(quotation.providerId).session(session);
            // if (provider && provider.userId) {
            //     await this.marketplaceEarningModel.create([{
            //         userId: provider.userId,
            //         role: EarningRole.SERVICE_PROVIDER,
            //         referenceType: EarningReferenceType.QUOTATION,
            //         referenceId: quotation._id,
            //         grossAmount: quotation.finalAmount,
            //         netAmount: quotation.finalAmount, // Apply commission logic if required here later
            //         platformCommission: 0,
            //         tax: 0,
            //         deduction: 0,
            //         status: EarningStatus.PENDING
            //     }], { session });
            // }

            await session.commitTransaction();
            return ApiResponse.success('Quotation completed and amount added to pending balance', quotation);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}
