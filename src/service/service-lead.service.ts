import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { ServiceLead, ServiceLeadDocument, ServiceLeadStatus } from './schema/service-lead.schema';
import { ServiceProvider, ServiceProviderDocument } from './schema/service-provider.schema';
import { ApiResponse } from 'src/common/responses/api-response';
import { ServiceBooking, ServiceBookingDocument, BookingStatus } from './schema/service-booking.schema';
import { Service, ServiceDocument } from './schema/service.schema';
import { LeadBooking, LeadBookingDocument, LeadBookingStatus } from './schema/service-lead-booking.schema';
import { StaffAllocation, StaffAllocationDocument, AllocationType, StaffAllocationStatus } from './schema/staff-allocation.schema';
import { calculateEndTime, formatDateTimeIST } from 'src/utils/helper';
import { BookLeadDTO } from './dto/service.dto';

@Injectable()
export class ServiceLeadService {
  constructor(
    @InjectModel(ServiceLead.name) private leadModel: Model<ServiceLeadDocument>,
    @InjectModel(ServiceProvider.name) private providerModel: Model<ServiceProviderDocument>,
    @InjectModel(ServiceBooking.name) private bookingModel: Model<ServiceBookingDocument>,
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
    @InjectModel(LeadBooking.name) private leadBookingModel: Model<LeadBookingDocument>,
    @InjectModel(StaffAllocation.name) private staffAllocationModel: Model<StaffAllocationDocument>,
    @InjectConnection() private connection: Connection
  ) { }

  async getAllLeadsForAdmin(): Promise<any> {
    const leads = await this.leadModel.find()
      .populate('userId', 'name email phone avatar')
      .populate('categoryIds', 'name label')
      .populate('assignedProviderId', 'businessName phone email')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return leads.map(lead => {
      return {
        ...lead,
        preferredDateAndTime: lead.preferredDateAndTime ? formatDateTimeIST(lead.preferredDateAndTime) : lead.preferredDateAndTime
      };
    });
  }

  async getLeadsForProvider(userId: string): Promise<any> {
    const provider = await this.providerModel.findOne({ userId });
    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    const orConditions: any[] = [];

    if (provider.city) {
      orConditions.push({ city: provider.city });
    }

    if (provider.coordinates && provider.coordinates.length === 2 && (provider.coordinates[0] !== 0 || provider.coordinates[1] !== 0)) {
      orConditions.push({
        location: {
          $geoWithin: {
            $centerSphere: [provider.coordinates, 50 / 6378.1] // 50km radius
          }
        }
      });
    }

    let query: any = {};
    if (orConditions.length > 0) {
      query = { $or: orConditions };
    } else {
      // If no city and no coordinates, maybe return empty or all?
      // Based on prompt: "only those which matches with his city or with 50km"
      // If neither is present, they shouldn't see leads that require location match.
      return [];
    }

    if ((provider as any).providedGenderService !== 'BOTH') {
      query.gender = (provider as any).providedGenderService === 'ONLY_MEN' ? 'MALE' : 'FEMALE';
    }

    const leads = await this.leadModel.find(query)
      .populate('categoryIds', 'name label')
      .sort({ createdAt: -1 })
      .exec();

    return leads.map(lead => {
      const leadObj: any = lead.toObject();
      if (leadObj.assignedProviderId?.toString() !== provider._id.toString()) {
        delete leadObj.email;
        delete leadObj.phoneNumber;
      }
      leadObj.preferredDateAndTime = leadObj.preferredDateAndTime ? formatDateTimeIST(leadObj.preferredDateAndTime) : leadObj.preferredDateAndTime;
      return leadObj;
    });
  }

  async deleteLeadByAdmin(userId: string, leadId: string) {
    const lead = await this.leadModel.findOne({ _id: leadId });
    if (!lead) {
      throw new NotFoundException('Lead not found or you are not authorized to delete it');
    }

    await this.leadModel.deleteOne({ _id: leadId });
    return { success: true, message: 'Lead deleted successfully' };
  }

  async applyToLead(userId: string, leadId: string) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const provider = await this.providerModel
        .findOne({
          userId: new Types.ObjectId(userId),
          isDeleted: false,
        })
        .session(session);

      if (!provider) {
        throw new NotFoundException('Service provider profile not found');
      }

      const lead = await this.leadModel
        .findById(new Types.ObjectId(leadId))
        .session(session);

      if (!lead) {
        throw new NotFoundException('Lead not found');
      }

      if (lead.status !== ServiceLeadStatus.OPEN) {
        throw new BadRequestException('This lead is no longer open');
      }

      const providerAny = provider as any;
      if (providerAny.providedGenderService !== 'BOTH') {
        const expectedGender = providerAny.providedGenderService === 'ONLY_MEN' ? 'MALE' : 'FEMALE';
        if (lead.gender !== expectedGender) {
            throw new BadRequestException('Lead gender does not match your service gender');
        }
      }

      lead.status = ServiceLeadStatus.ASSIGNED;
      lead.assignedProviderId = provider._id as Types.ObjectId;
      await lead.save({ session });

      await session.commitTransaction();
      return ApiResponse.success('Lead applied successfully');
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async bookLead(providerUserId: string, leadId: string, dto: BookLeadDTO) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const provider = await this.providerModel
        .findOne({ userId: new Types.ObjectId(providerUserId), isDeleted: false })
        .session(session);

      if (!provider) {
        throw new NotFoundException('Service provider profile not found');
      }

      const lead = await this.leadModel
        .findById(new Types.ObjectId(leadId))
        .session(session);

      if (!lead) {
        throw new NotFoundException('Lead not found');
      }

      if (lead.assignedProviderId?.toString() !== provider._id.toString()) {
        throw new BadRequestException('Lead is not assigned to you');
      }

      if (lead.status === ServiceLeadStatus.BOOKED) {
        throw new BadRequestException('Lead is already booked');
      }

      const service = await this.serviceModel.findById(new Types.ObjectId(dto.serviceId)).session(session);
      if (!service || !service.isActive) {
        throw new NotFoundException('Service not found or inactive');
      }

      const bookingDate = new Date(dto.bookingDate);
      const slotEndTime = calculateEndTime(dto.slotStartTime, service.durationMinutes);
      const subtotal = service.offeredPrice || service.sellingPrice;

      // Update Lead Status
      lead.status = ServiceLeadStatus.BOOKED;
      await lead.save({ session });

      // Create Booking
      const [booking] = await this.bookingModel.create(
        [
          {
            userId: lead.userId,
            providerId: provider._id,
            items: [{
              serviceId: service._id,
              serviceName: service.title,
              costPrice: service.costPrice,
              sellingPrice: service.sellingPrice,
              offeredPrice: service.offeredPrice,
              total: subtotal
            }],
            staffId: dto.staffId ? new Types.ObjectId(dto.staffId) : undefined,
            bookingDate,
            slotStartTime: dto.slotStartTime,
            slotEndTime,
            serviceAddress: lead.address,
            subtotal,
            couponDiscount: 0,
            influencerDiscount: 0,
            platformCommission: 0,
            totalAmount: subtotal,
            bookingStatus: BookingStatus.CONFIRMED,
          },
        ],
        { session }
      );

      await session.commitTransaction();
      return ApiResponse.success('Lead marked as booked and booking created successfully', booking);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async assignStaffToLeadBooking(providerId: string, leadBookingId: string, dto: import('./dto/service.dto').AssignStaffToLeadBookingDTO) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const leadBooking = await this.leadBookingModel.findById(new Types.ObjectId(leadBookingId)).session(session);
      if (!leadBooking) {
        throw new NotFoundException('Lead booking not found');
      }

      if (leadBooking.serviceProviderId.toString() !== providerId) {
        throw new BadRequestException('Lead booking does not belong to your provider account');
      }

      leadBooking.staffIds = dto.staffIds.map(id => new Types.ObjectId(id));
      leadBooking.slotStartTime = new Date(dto.slotStartTime);
      leadBooking.slotEndTime = new Date(dto.slotEndTime);
      await leadBooking.save({ session });

      // Create staff allocations
      const allocations = dto.staffIds.map(staffId => ({
        staffId: new Types.ObjectId(staffId),
        serviceProviderId: new Types.ObjectId(providerId),
        leadBookingId: leadBooking._id,
        bookingDate: leadBooking.bookingDate,
        slotStartTime: dto.slotStartTime,
        slotEndTime: dto.slotEndTime,
        status: StaffAllocationStatus.CONFIRMED,
        allocationType: AllocationType.LEAD_BOOKING
      }));

      await this.staffAllocationModel.create(allocations, { session });

      await session.commitTransaction();
      return ApiResponse.success('Staff assigned to lead booking successfully', leadBooking);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async cancelLeadBooking(userId: string, leadBookingId: string) {
    const leadBooking = await this.leadBookingModel.findById(new Types.ObjectId(leadBookingId));
    if (!leadBooking) {
      throw new NotFoundException('Lead booking not found');
    }

    if (leadBooking.userId.toString() !== userId) {
      throw new BadRequestException('You are not authorized to cancel this lead booking');
    }

    if (
      leadBooking.leadBookingStatus === LeadBookingStatus.CANCELLED ||
      leadBooking.leadBookingStatus === LeadBookingStatus.COMPLETED
    ) {
      throw new BadRequestException(`Cannot cancel booking in ${leadBooking.leadBookingStatus} status`);
    }

    leadBooking.leadBookingStatus = LeadBookingStatus.CANCELLED;
    await leadBooking.save();

    // Cancel the associated StaffAllocation
    await this.staffAllocationModel.updateMany(
      { leadBookingId: leadBooking._id },
      { $set: { status: StaffAllocationStatus.CANCELLED } }
    );

    return ApiResponse.success('Lead booking cancelled successfully', leadBooking);
  }

  async rescheduleLeadBooking(userId: string, leadBookingId: string, dto: import('./dto/service.dto').RescheduleLeadBookingDTO) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const leadBooking = await this.leadBookingModel.findById(new Types.ObjectId(leadBookingId)).session(session);
      if (!leadBooking) {
        throw new NotFoundException('Lead booking not found');
      }

      if (leadBooking.userId.toString() !== userId) {
        throw new BadRequestException('You are not authorized to reschedule this lead booking');
      }

      if (
        leadBooking.leadBookingStatus === LeadBookingStatus.CANCELLED ||
        leadBooking.leadBookingStatus === LeadBookingStatus.COMPLETED
      ) {
        throw new BadRequestException(`Cannot reschedule booking in ${leadBooking.leadBookingStatus} status`);
      }

      // Update booking properties
      leadBooking.bookingDate = new Date(dto.bookingDate);
      leadBooking.slotStartTime = new Date(dto.slotStartTime);
      leadBooking.slotEndTime = new Date(dto.slotEndTime);
      leadBooking.leadBookingStatus = LeadBookingStatus.RESCHEDULED;
      await leadBooking.save({ session });

      // Cancel old StaffAllocations
      await this.staffAllocationModel.updateMany(
        { leadBookingId: leadBooking._id },
        { $set: { status: StaffAllocationStatus.CANCELLED } },
        { session }
      );

      // Create new StaffAllocations if staff are assigned
      if (leadBooking.staffIds && leadBooking.staffIds.length > 0) {
        const newAllocations = leadBooking.staffIds.map(staffId => ({
          staffId: staffId,
          serviceProviderId: leadBooking.serviceProviderId,
          leadBookingId: leadBooking._id,
          bookingDate: leadBooking.bookingDate,
          slotStartTime: dto.slotStartTime,
          slotEndTime: dto.slotEndTime,
          status: StaffAllocationStatus.CONFIRMED,
          allocationType: AllocationType.LEAD_BOOKING
        }));
        await this.staffAllocationModel.create(newAllocations, { session });
      }

      await session.commitTransaction();
      return ApiResponse.success('Lead booking rescheduled successfully', leadBooking);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
