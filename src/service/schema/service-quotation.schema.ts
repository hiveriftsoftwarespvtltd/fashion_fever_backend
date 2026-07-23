import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export enum QuotationItemType {
    SERVICE = 'SERVICE',
    CUSTOM = 'CUSTOM',
}

export enum ServiceQuotationStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED',
    EXPIRED = 'EXPIRED',
    COMPLETED = 'COMPLETED',
    SLOT_UNAVAILABLE = 'SLOT_UNAVAILABLE',
    CONVERTED_TO_BOOKING = 'CONVERTED_TO_BOOKING',
}

@Schema({ _id: false })
export class QuotationItem {

    @Prop()
    title!: string;

    @Prop()
    description?: string;

    @Prop({ default: 1 })
    quantity!: number;

    @Prop()
    unitPrice!: number;

    @Prop()
    totalPrice!: number;

    @Prop({ default: 0 })
    durationMinutes?: number;

    @Prop({ default: 0, min: 0 })
    displayOrder!: number
}
// export class QuotationItem {
//     @Prop({
//         enum: QuotationItemType,
//         default: QuotationItemType.SERVICE,

//     })
//     type!: string;

//     // Used when type = SERVICE
//     @Prop({
//         type: Types.ObjectId,
//         ref: 'Service',
//     })
//     serviceId?: Types.ObjectId;

//     @Prop({
//         required: true,
//     })
//     title!: string;

//     @Prop({
//         default: 1,
//     })
//     quantity!: number;

//     @Prop({
//         required: true,
//     })
//     unitCostPrice!: number;

//     @Prop({
//         required: true,
//     })
//     unitSellingPrice!: number;

//     @Prop({
//         required: true,
//     })
//     unitOfferedPrice!: number;

//     @Prop({
//         required: true,
//     })
//     totalPrice!: number;
// }

export const QuotationItemSchema =
    SchemaFactory.createForClass(QuotationItem);



export type ServiceQuotationDocument =
    ServiceQuotation & Document;

@Schema({ timestamps: true })
export class ServiceQuotation {

    @Prop({
        type: Types.ObjectId,
        ref: 'ServiceLead',
        required: true,
    })
    leadId!: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: 'ServiceProvider',
        required: true,
    })
    providerId!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'LeadBooking', default: null })
    bookingId?: Types.ObjectId;

    // @Prop()
    // note?: string;

    @Prop({
        type: [QuotationItemSchema],
        default: [],
    })
    items!: QuotationItem[];

    @Prop({
        default: 0,
    })
    subtotal!: number;

    // @Prop({
    //     default: 0,
    // })
    // discount!: number;

    @Prop({
        default: 0,
    })
    finalAmount!: number;

    @Prop()
    notes?: string;

    // @Prop({
    //     type: [String],
    //     default: [],
    // })
    // includedItems!: string[];

    // @Prop({
    //     type: [String],
    //     default: [],
    // })
    // excludedItems!: string[];

    @Prop()
    validTill!: Date;

    @Prop({
        default: false,
    })
    isExpired!: boolean;

    @Prop()
    customerName?: string;

    @Prop()
    customerPhone?: string;

    @Prop()
    customerEmail?: string;

    @Prop()
    serviceAddress?: string;

    @Prop({
        default: 1,
    })
    version!: number;

    @Prop({
        enum: ServiceQuotationStatus,
        default: ServiceQuotationStatus.PENDING,
    })
    status!: string;

    @Prop({
        default: false,
    })
    isAccepted!: boolean;

    @Prop()
    acceptedAt?: Date;

    @Prop()
    serviceDate!: Date;

    @Prop()
    slotStartTime?: Date;

    @Prop()
    slotEndTime?: Date;

    @Prop()
    requiredStaffCount!: number;

    @Prop({ default: 0 })
    totalDurationMinutes!: number;

    @Prop({
        type: Types.ObjectId,
        ref: 'User',
    })
    acceptedBy?: Types.ObjectId;
}

export const ServiceQuotationSchema =
    SchemaFactory.createForClass(ServiceQuotation);