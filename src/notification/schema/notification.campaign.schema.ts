import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { NotificationModuleType } from "./notification.schema";

export type NotificationCampaignDocument = NotificationCampaign & Document;

export enum UserRoleOptions {
    USERS = "user",
    VENDOR = "vendor",
    EDUCATOR = "educator",
    INFLUENCER = "influencer",
    ADMIN = "admin",
    SUPER_ADMIN = "super_admin",
    SERVICE_PROVIDERS = "service_provider"
}


export enum NotificationSendOption {
    EMAIL = "EMAIL",
    IN_APP = "IN_APP",
    // PUSH_NOTIFICATION = "PUSH_NOTIFICATION",
    // WHATSAPP = "WHATSAPP",
    // SMS = "SMS"
}
@Schema({ timestamps: true })
export class NotificationCampaign {
    @Prop({ type: Types.ObjectId, ref: 'User' })
    senderId?: Types.ObjectId;

    @Prop()
    title: string;

    @Prop()
    body: string;

    @Prop({ enum: NotificationModuleType, type: String, default: NotificationModuleType.OTHER })
    moduleType: NotificationModuleType

    @Prop({ type: [String], enum: NotificationSendOption, default: [NotificationSendOption.IN_APP] })
    sendOption: NotificationSendOption[];

    @Prop()
    action: string;

    @Prop({ default: null })
    actionUrl?: string;

    @Prop({ type: Object, default: {} })
    data: Record<string, any>;

    @Prop({ type: [String], enum: UserRoleOptions, default: [] })
    targetRoles: UserRoleOptions[];

    @Prop({ type: Number, default: 0 })
    totalRecipients: number;

    @Prop({ type: Date })
    scheduledAt?: Date;

    @Prop({ type: Boolean, default: false })
    isRecurring: boolean;

    @Prop({ type: String })
    cronExpression?: string;

    @Prop({ type: Date })
    sentAt?: Date;

    @Prop({ type: Number, default: 0 })
    sentCount: number
}

export const NotificationCampaignSchema = SchemaFactory.createForClass(NotificationCampaign);