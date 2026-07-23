import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export enum VehicleType {
    MOTORCYCLE = 'motorcycle',
    BICYCLE = 'bicycle',
    WALKING = 'walking'
}

export enum DeliveryPersonStatus {
    AVAILABLE = 'AVAILABLE',
    ON_DELIVERY = 'ON_DELIVERY',
    OFFLINE = 'OFFLINE',
    BREAK = 'BREAK',
}

export enum DeliveryPersonReference {
    PLATFORM = 'PLATFORM',
    VENDOR = 'VENDOR',
}

export type DeliveryPersonDocument = DeliveryPerson & Document
@Schema({ timestamps: true })
export class DeliveryPerson {

    @Prop({
        type: [{ type: Types.ObjectId, ref: 'Vendor' }],
        default: [],
    })
    assignedVendorIds!: Types.ObjectId[];

    @Prop({ required: true })
    name!: string

    @Prop({ required: true })
    phone!: string

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId!: Types.ObjectId

    @Prop({ type: Types.ObjectId, ref: 'Media' })
    profilePhoto!: Types.ObjectId

    @Prop({ type: String, required: true })
    aadharNumber!: string

    @Prop({ type: String, enum: VehicleType, default: VehicleType.MOTORCYCLE })
    vehicleType!: VehicleType

    @Prop({ type: String, default: null })
    vehicleNumber?: string

    @Prop({ type: String, enum: DeliveryPersonStatus, default: DeliveryPersonStatus.AVAILABLE })
    status!: DeliveryPersonStatus

    @Prop({ default: true })
    isActive!: boolean

    @Prop({ default: true })
    isOnline!: boolean

    @Prop({ default: false })
    isDeleted!: boolean

    @Prop({ type: Types.ObjectId, ref: 'User' })
    addedBy!: Types.ObjectId

    @Prop({ type: String, enum: DeliveryPersonReference, default: DeliveryPersonReference.PLATFORM })
    reference!: DeliveryPersonReference

    @Prop({
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number],
            default: [0, 0], // [longitude, latitude]
        },
    })
    location!: {
        type: 'Point';
        coordinates: number[];
    };
}

export const DeliveryPersonSchema = SchemaFactory.createForClass(DeliveryPerson)

DeliveryPersonSchema.index({ location: '2dsphere' });