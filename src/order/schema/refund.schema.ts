import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export enum RefundStatus {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROCESSED = 'processed',
}

export enum RefundType {
  CANCELLATION = 'cancellation',
  RETURN = 'return',
}


export type RefundDocument = Refund & Document
@Schema({ timestamps: true })
export class Refund {

  @Prop({
    type: Types.ObjectId,
    ref: 'Order',
    required: true,
  })
  orderId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'VendorOrder',
    required: true,
  })
  vendorOrderId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
  })
  orderItemId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    enum: RefundType,
    required: true,
  })
  refundType!: RefundType;

  @Prop({
    required: true,
  })
  refundAmount!: number;

  @Prop()
  reason?: string;

  @Prop({
    enum: RefundStatus,
    default: RefundStatus.REQUESTED,
  })
  status!: RefundStatus;

  @Prop()
  approvedAt?: Date;

  @Prop()
  processedAt?: Date;

  @Prop()
  rejectionReason?: string;

  @Prop()
  transactionId?: string;
}

export const RefundSchema = SchemaFactory.createForClass(Refund)