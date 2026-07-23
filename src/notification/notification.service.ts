import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Notification, NotificationDocument, NotificationType, NotificationModuleType, NotificationPriority } from './schema/notification.schema';
import { NotificationCampaign, NotificationCampaignDocument, NotificationSendOption } from './schema/notification.campaign.schema';
import { User, UserDocument } from '../user/schema/user.schema';
import { ServiceBooking, ServiceBookingDocument, BookingStatus } from '../service/schema/service-booking.schema';
import { CreateCampaignDto, ProductNotifyDTO, SendNotificationDto, UpdateCampaignDto } from './dto/notification.dto';
import { safeSendMail } from '../utils/helper';
import { campaignEmailTemplate } from '../utils/email.template';
import { ProductNotify, ProductNotifyDocument } from './schema/product.notify.schema';
import { ApiResponse } from 'src/common/responses/api-response';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
        @InjectModel(NotificationCampaign.name) private campaignModel: Model<NotificationCampaignDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(ServiceBooking.name) private bookingModel: Model<ServiceBookingDocument>,
        @InjectModel(ProductNotify.name) private productNotifyModel: Model<ProductNotifyDocument>,
    ) { }

    async createCampaign(dto: CreateCampaignDto, senderId: string) {
        const scheduledAt = dto.scheduledAt
            ? new Date(new Date(dto.scheduledAt).getTime() - 5.5 * 60 * 60 * 1000)
            : undefined;

        if (scheduledAt && scheduledAt.getTime() < Date.now()) {
            throw new BadRequestException('Scheduled time must be in the future');
        }

        const campaign = new this.campaignModel({
            ...dto,
            senderId: new Types.ObjectId(senderId),
            scheduledAt,
        });

        const savedCampaign = await campaign.save();

        if (!dto.scheduledAt && !dto.isRecurring) {
            await this.processCampaign(savedCampaign._id.toString());
        }

        return savedCampaign;
    }

    async processCampaign(campaignId: string) {
        const campaign = await this.campaignModel.findById(campaignId);
        if (!campaign) return;

        let query: any = {};
        if (campaign.targetRoles && campaign.targetRoles.length > 0) {
            query.roles = { $in: campaign.targetRoles };
        }

        const users = await this.userModel.find(query).select('_id name email');

        const notifications: any[] = [];
        const emailPromises: Promise<any>[] = [];

        for (const user of users) {
            const sendOptions = campaign.sendOption && campaign.sendOption.length > 0
                ? campaign.sendOption
                : [NotificationSendOption.IN_APP];

            if (sendOptions.includes(NotificationSendOption.IN_APP)) {
                notifications.push({
                    campaignId: new Types.ObjectId(campaign._id as any),
                    ...(campaign.senderId && { senderId: new Types.ObjectId(campaign.senderId as any) }),
                    receiverId: new Types.ObjectId(user._id as any),
                    title: campaign.title,
                    body: campaign.body,
                    moduleType: campaign.moduleType || NotificationModuleType.OTHER,
                    action: campaign.action,
                    data: campaign.data,
                    type: NotificationType.PROMOTIONAL
                });
            }

            if (sendOptions.includes(NotificationSendOption.EMAIL) && user.email) {
                const html = campaignEmailTemplate(
                    user.name || 'User',
                    campaign.title,
                    campaign.body,
                    campaign.actionUrl
                );
                emailPromises.push(safeSendMail(user.email, campaign.title, html));
            }
        }

        await Promise.allSettled(emailPromises);

        if (notifications.length > 0) {
            await this.notificationModel.insertMany(notifications);
        }

        campaign.sentCount += notifications.length;
        campaign.totalRecipients = notifications.length;
        campaign.sentAt = new Date();
        await campaign.save();
    }

    async sendNotification(dto: SendNotificationDto) {
        const notification = new this.notificationModel({
            ...dto,
            receiverId: new Types.ObjectId(dto.receiverId)
        });
        return await notification.save();
    }

    async updateCampaign(campaignId: string, dto: UpdateCampaignDto) {
        const campaign = await this.campaignModel.findById(campaignId);
        if (!campaign) {
            throw new BadRequestException('Campaign not found');
        }

        if (campaign.sentAt && !campaign.isRecurring) {
            throw new BadRequestException('Cannot modify a campaign that has already been sent');
        }

        let scheduledAt = campaign.scheduledAt;
        if (dto.scheduledAt) {
            scheduledAt = new Date(new Date(dto.scheduledAt).getTime() - 5.5 * 60 * 60 * 1000);
        }

        if (dto.scheduledAt && scheduledAt && scheduledAt.getTime() < Date.now()) {
            throw new BadRequestException('Scheduled time must be in the future');
        }

        Object.assign(campaign, dto, { scheduledAt });
        return await campaign.save();
    }

    async deleteCampaign(campaignId: string) {
        const campaign = await this.campaignModel.findById(campaignId);
        if (!campaign) {
            throw new BadRequestException('Campaign not found');
        }

        if (campaign.sentAt && !campaign.isRecurring) {
            throw new BadRequestException('Cannot delete a campaign that has already been sent');
        }

        return await this.campaignModel.findByIdAndDelete(campaignId);
    }

    async getUserNotifications(userId: string, page: number, limit: number) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.notificationModel.find({ receiverId: new Types.ObjectId(userId) })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.notificationModel.countDocuments({ receiverId: new Types.ObjectId(userId) })
        ]);
        return { data, total, page, limit };
    }

    async getAllNotifications(page: number, limit: number) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.notificationModel.find()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('senderId', 'name email')
                .populate('receiverId', 'name email')
                .exec(),
            this.notificationModel.countDocuments()
        ]);
        return { data, total, page, limit };
    }

    async getAllCampaigns(page: number, limit: number) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.campaignModel.find()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('senderId', 'name email')
                .exec(),
            this.campaignModel.countDocuments()
        ]);
        return { data, total, page, limit };
    }

    async markAsRead(id: string, userId: string) {
        return await this.notificationModel.findOneAndUpdate(
            { _id: new Types.ObjectId(id), receiverId: new Types.ObjectId(userId) },
            { isRead: true, readAt: new Date() },
            { new: true }
        );
    }

    async registerForProductNotifications(userId: string, dto: ProductNotifyDTO) {
        const productNotify = await this.productNotifyModel.findOneAndUpdate({ userId: new Types.ObjectId(userId), productId: new Types.ObjectId(dto.productId), productVariantId: new Types.ObjectId(dto.productVariantId) }, {
            $setOnInsert: {
                userId: new Types.ObjectId(userId),
                productId: new Types.ObjectId(dto.productId),
                productVariantId: new Types.ObjectId(dto.productVariantId)
                
            }
        }, { new: true, upsert: true })

        return ApiResponse.success("Registered for product stock notification successfully", 200)
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async handleScheduledCampaigns() {
        this.logger.debug('handleScheduledCampaigns is running...');
        try {
            const now = new Date();
            const campaigns = await this.campaignModel.find({
                scheduledAt: { $lte: now },
                isRecurring: false,
                sentAt: { $exists: false }
            });

            this.logger.debug(`Found ${campaigns.length} campaigns to process`);

            for (const campaign of campaigns) {
                try {
                    await this.processCampaign(campaign._id.toString());
                    this.logger.log(`Successfully processed campaign ${campaign._id}`);
                } catch (error) {
                    this.logger.error(`Failed to process campaign ${campaign._id}`, error);
                }
            }
        } catch (error) {
            this.logger.error('Error in handleScheduledCampaigns cron', error);
        }
    }


    // Cron job to run every day at 8:00 AM for service booking reminders
    @Cron(CronExpression.EVERY_DAY_AT_8AM)
    async handleServiceBookingReminders() {
        this.logger.debug('handleServiceBookingReminders is running...');
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

            // Find bookings for today and tomorrow
            const query: any = {
                bookingDate: {
                    $gte: today,
                    $lt: dayAfterTomorrow
                },
                bookingStatus: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] }
            };

            const bookings = await this.bookingModel.find(query).populate('userId', '_id name');

            for (const booking of bookings) {
                try {
                    if (!booking.userId || !booking.userId._id) {
                        this.logger.warn(`Booking ${booking._id} has no valid userId populated.`);
                        continue;
                    }

                    const bookingDate = new Date(booking.bookingDate);
                    bookingDate.setHours(0, 0, 0, 0);

                    const isToday = bookingDate.getTime() === today.getTime();
                    const dayText = isToday ? 'today' : 'tomorrow';

                    await this.sendNotification({
                        receiverId: booking.userId._id.toString(),
                        title: `Service Booking Reminder`,
                        body: `You have a service booking scheduled for ${dayText}.`,
                        moduleType: NotificationModuleType.SERVICE_BOOKINGS,
                        type: NotificationType.SYSTEM,
                        priority: NotificationPriority.HIGH
                    });
                } catch (error) {
                    this.logger.error(`Failed to send reminder for booking ${booking._id}`, error);
                }
            }
        } catch (error) {
            this.logger.error('Error in handleServiceBookingReminders cron', error);
        }
    }

    // Daily cron to handle basic recurring notifications if needed (e.g. daily campaigns)
    @Cron(CronExpression.EVERY_DAY_AT_9AM)
    async handleRecurringCampaigns() {
        this.logger.debug('handleRecurringCampaigns is running...');
        try {
            // Simplified handling for daily recurring campaigns
            const recurringCampaigns = await this.campaignModel.find({
                isRecurring: true
            });

            for (const campaign of recurringCampaigns) {
                try {
                    // We duplicate the campaign to send it today and track its sending
                    await this.processCampaign(campaign._id.toString());
                } catch (error) {
                    this.logger.error(`Failed to process recurring campaign ${campaign._id}`, error);
                }
            }
        } catch (error) {
            this.logger.error('Error in handleRecurringCampaigns cron', error);
        }
    }

    async notifyProductRestock(productId: string, productVariantId: string, productName: string) {
        try {
            const notifies = await this.productNotifyModel.find({
                productId: new Types.ObjectId(productId),
                productVariantId: new Types.ObjectId(productVariantId),
                isNotified: false
            }).populate('userId');

            if (!notifies || notifies.length === 0) return;

            const notifications: any[] = [];
            const notifyIds: string[] = [];

            for (const notify of notifies) {
                if (!notify.userId) continue;
                
                notifications.push({
                    receiverId: new Types.ObjectId((notify.userId as any)._id),
                    title: 'Product Back in Stock!',
                    body: `The product ${productName} is now back in stock. Hurry before it runs out again!`,
                    moduleType: NotificationModuleType.OTHER,
                    type: NotificationType.PROMOTIONAL
                });
                
                notifyIds.push(notify._id.toString());
            }

            if (notifications.length > 0) {
                await this.notificationModel.insertMany(notifications);
                
                await this.productNotifyModel.updateMany(
                    { _id: { $in: notifyIds } },
                    { $set: { isNotified: true } }
                );
            }
        } catch (error) {
            this.logger.error('Error in notifyProductRestock', error);
        }
    }
}
