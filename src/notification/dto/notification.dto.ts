import { IsString, IsOptional, IsEnum, IsArray, IsObject, IsDateString, IsBoolean, IsNotEmpty, IsMongoId } from 'class-validator';
import { NotificationModuleType, NotificationType, NotificationPriority } from '../schema/notification.schema';
import { UserRoleOptions, NotificationSendOption } from '../schema/notification.campaign.schema';
import { PartialType } from '@nestjs/mapped-types';

export class CreateCampaignDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    body: string;

    @IsEnum(NotificationModuleType)
    @IsOptional()
    moduleType?: NotificationModuleType;

    @IsString()
    @IsOptional()
    action?: string;

    @IsObject()
    @IsOptional()
    data?: Record<string, any>;

    @IsArray()
    @IsEnum(NotificationSendOption, { each: true })
    @IsOptional()
    sendOption?: NotificationSendOption[];

    @IsString()
    @IsOptional()
    actionUrl?: string;

    @IsArray()
    @IsEnum(UserRoleOptions, { each: true })
    @IsOptional()
    targetRoles?: UserRoleOptions[];

    @IsDateString()
    @IsOptional()
    scheduledAt?: string;

    @IsBoolean()
    @IsOptional()
    isRecurring?: boolean;

    @IsString()
    @IsOptional()
    cronExpression?: string;
}

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {}

export class SendNotificationDto {
    @IsString()
    @IsNotEmpty()
    receiverId: string;

    @IsEnum(NotificationType)
    @IsOptional()
    type?: NotificationType;

    @IsEnum(NotificationPriority)
    @IsOptional()
    priority?: NotificationPriority;

    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    body: string;

    @IsEnum(NotificationModuleType)
    @IsOptional()
    moduleType?: NotificationModuleType;

    @IsString()
    @IsOptional()
    action?: string;

    @IsObject()
    @IsOptional()
    data?: Record<string, any>;
}

export class ProductNotifyDTO{

    @IsMongoId()
    @IsNotEmpty()
    productId:string

    @IsMongoId()
    @IsNotEmpty()
    productVariantId!:string;


}
