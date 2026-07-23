import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";


export enum DeliveryStatus {
    ASSIGNED = "ASSIGNED",
    ACCEPTED = "ACCEPTED",
    PICKING_UP = "PICKING_UP",
    DELIVERING = "DELIVERING",
    DELIVERED = "DELIVERED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED"
}
export type DeliveryDocument = Delivery & Document

@Schema({ timestamps: true })
export class Delivery {

    @Prop({ ref: "VendorOrder" })
    vendorOrderId: Types.ObjectId;

    @Prop({ ref: "Vendor" })
    vendorId: Types.ObjectId;

    @Prop({ ref: "DeliveryBoy" })
    deliveryBoyId: Types.ObjectId;

    @Prop()
    assignedAt: Date;

    @Prop()
    acceptedAt: Date;

    @Prop()
    pickedUpAt: Date;

    @Prop()
    reachedCustomerAt: Date;

    @Prop()
    deliveredAt: Date;

    @Prop()
    cancelledAt: Date;

    @Prop({
        enum: DeliveryStatus,
        default: DeliveryStatus.ASSIGNED
    })
    status: DeliveryStatus;

    @Prop()
    estimatedArrivalTime: Date;

    @Prop()
    estimatedDurationMinutes: number;

    @Prop()
    actualDurationMinutes: number;

    @Prop()
    travelledDistance: number;

    @Prop()
    otp?: string;

}

export const DeliverySchema = SchemaFactory.createForClass(Delivery)