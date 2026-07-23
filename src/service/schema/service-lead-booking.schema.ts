import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { BookingStatus } from "./service-booking.schema";

export type LeadBookingDocument = LeadBooking & Document;

export enum LeadBookingStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    CANCELLED = 'CANCELLED',
    RESCHEDULED = 'RESCHEDULED',
    COMPLETED = 'COMPLETED',
    DECLINED = 'DECLINED',
    IN_PROGRESS = 'IN_PROGRESS'
}

@Schema({ timestamps: true })
export class LeadBooking {

    @Prop({
        type: Types.ObjectId,
        ref: 'ServiceLead'
    })
    leadId!: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: 'ServiceQuotation'
    })
    quotationId!: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: 'User'
    })
    userId!: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: 'ServiceProvider'
    })
    serviceProviderId!: Types.ObjectId;

    @Prop({
        type: [{
            type: Types.ObjectId,
            ref: 'ServiceStaff'
        }]
    })
    staffIds!: Types.ObjectId[];

    @Prop()
    totalPersons!: number;

    @Prop()
    bookingDate!: Date;

    @Prop()
    slotStartTime!: Date;

    @Prop()
    slotEndTime!: Date;

    @Prop()
    totalAmount!: number;

    @Prop({ default: 0 })
    platFormCommissionPercentage!: number;

    @Prop({ default: 0 })
    platFormCommissionAmount!: number;

    @Prop({ default: 0 })
    providerPayoutAmount!: number;

    @Prop({
        enum: LeadBookingStatus,
        default: LeadBookingStatus.CONFIRMED
    })
    leadStatus!: string;

    @Prop({
        enum: LeadBookingStatus,
        default: LeadBookingStatus.CONFIRMED
    })
    leadBookingStatus!: string;
}

export const LeadBookingSchema = SchemaFactory.createForClass(LeadBooking);