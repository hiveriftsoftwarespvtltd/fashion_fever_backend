import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { ShippingAddress, ShippingAddressSchema } from "./order.schema";


export enum ShipmentStatus {
  PENDING = 'pending',
  BOOKED = 'booked',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RTO = 'rto',
}

export type VendorShipmentDocument = VendorShipment & Document
@Schema({ timestamps: true })
export class VendorShipment {

  @Prop({
    type: Types.ObjectId,
    ref: 'VendorOrder',
    required: true,
  })
  vendorOrderId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Vendor',
    required: true,
  })
  vendorId!: Types.ObjectId;

  @Prop({
    type: ShippingAddressSchema,
    required: true,
  })
  shippingAddress!: ShippingAddress;

  @Prop({ required: true })
  vendorPincode!: string;

  @Prop({ required: true })
  customerPincode!: string;

  @Prop({ required: true })
  totalWeight!: number;

  @Prop({ required: true })
  shippingCharge!: number;

  @Prop()
  courierCompanyId?: number;

  @Prop()
  courierName?: string;

  @Prop()
  awbCode?: string;

  @Prop()
  trackingUrl?: string;

  @Prop()
  shiprocketOrderId?: string;

  @Prop()
  shiprocketShipmentId?: string;

  @Prop()
  estimatedDeliveryDate?: Date;

  @Prop({
    enum: ShipmentStatus,
    default: ShipmentStatus.PENDING,
  })
  status!: ShipmentStatus;

  @Prop()
  pickedUpAt?: Date;

  @Prop()
  deliveredAt?: Date;
}

export const VendorShipmentSchema = SchemaFactory.createForClass(VendorShipment)