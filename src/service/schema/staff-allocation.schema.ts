import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

export enum AllocationType {
    LEAD_BOOKING = 'LEAD_BOOKING',
    SERVICE_BOOKING = 'SERVICE_BOOKING'
}

export enum StaffAllocationStatus {
    ON_LEAVE = "ON_LEAVE",
    OFF = "OFF",
    ASSIGNED = 'ASSIGNED',
    CONFIRMED = 'CONFIRMED',
    CANCELLED = 'CANCELLED',
    COMPLETED = 'COMPLETED'
}

export type StaffAllocationDocument = StaffAllocation & Document;

@Schema()
export class StaffAllocation {

    @Prop({
        type: Types.ObjectId,
        ref: 'ServiceStaff'
    })
    staffId!: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: 'ServiceProvider'
    })
    serviceProviderId!: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: 'LeadBooking'
    })
    leadBookingId?: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: 'ServiceLeadBooking'
    })
    serviceBookingId?: Types.ObjectId;

    @Prop()
    bookingDate!: Date;

    @Prop()
    slotStartTime!: Date;

    @Prop()
    slotEndTime!: Date;

    @Prop({
        enum: StaffAllocationStatus,
        default: StaffAllocationStatus.CONFIRMED
    })
    status!: StaffAllocationStatus;

    @Prop({ enum: AllocationType, default: AllocationType.SERVICE_BOOKING })
    allocationType!: AllocationType;
}


export const StaffAllocationSchema = SchemaFactory.createForClass(StaffAllocation);