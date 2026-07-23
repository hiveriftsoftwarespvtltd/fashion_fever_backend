import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export enum NotificationModuleType {
    ORDER = "ORDER",
    SERVICE_BOOKINGS = "SERVICE_BOOKINGS",
    TICKETS = "TICKETS",
    COURSES = "COURSES",
    COMMISSION = "COMMISSION",
    WALLET = "WALLET",
    OTHER = "OTHER"
}

export enum NotificationType {
    SYSTEM = 'SYSTEM',
    TRANSACTIONAL = 'TRANSACTIONAL',
    PROMOTIONAL = 'PROMOTIONAL',
}

export enum NotificationPriority {
    LOW = 'LOW',
    NORMAL = 'NORMAL',
    HIGH = 'HIGH',
}

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
    @Prop({
        type: Types.ObjectId,
        ref: 'NotificationCampaign',
    })
    campaignId?: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: 'User',
    })
    senderId?: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    })
    receiverId: Types.ObjectId;

    @Prop({
        enum: NotificationType,
        type: String,
        default: NotificationType.TRANSACTIONAL,
    })
    type: NotificationType;

    @Prop({
        enum: NotificationPriority,
        type: String,
        default: NotificationPriority.NORMAL,
    })
    priority: NotificationPriority;

    @Prop()
    title: string;

    @Prop({ enum: NotificationModuleType, type: String, default: NotificationModuleType.OTHER })
    moduleType: NotificationModuleType


    @Prop()
    body: string;

    @Prop()
    action: string;

    @Prop({ type: Object, default: {} })
    data: Record<string, any>;

    @Prop({ default: false })
    isRead: boolean;

    @Prop({ default: false })
    isEmailSent: boolean

    @Prop()
    readAt?: Date;

    @Prop({ default: false })
    isDeleted?: boolean

    @Prop()
    deletedAt?: Date
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);