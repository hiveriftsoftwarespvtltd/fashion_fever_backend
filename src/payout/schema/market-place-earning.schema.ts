import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MarketplaceEarningDocument = MarketplaceEarning & Document;

export enum EarningRole {
    VENDOR = 'VENDOR',
    DELIVERY_PERSON = 'DELIVERY_PERSON',
    INFLUENCER = 'INFLUENCER',
    EDUCATOR = 'EDUCATOR',
    SERVICE_PROVIDER = 'SERVICE_PROVIDER',
}

export enum EarningReferenceType {
    ORDER = 'ORDER',
    QUICK_ORDER = 'QUICK_ORDER',
    BOOKING = 'BOOKING',
    COURSE = 'COURSE',
    COUPON = 'COUPON',
    QUOTATION = 'QUOTATION',
    OTHER = 'OTHER',
}

export enum EarningStatus {
    PENDING = 'PENDING',
    ELIGIBLE = 'ELIGIBLE',      // Waiting for payout window
    PAID = 'PAID',
    CANCELLED = 'CANCELLED',    // Order/vendor order cancelled
    REFUNDED = 'REFUNDED',      // Customer refunded after payment
    ADJUSTED = 'ADJUSTED',      // Modified due to return or deduction
}

@Schema({
    timestamps: true,
})
export class MarketplaceEarning {
    @Prop({
        type: Types.ObjectId,
        ref: 'User',
        required: true,

    })
    userId!: Types.ObjectId;



    @Prop({
        enum: EarningRole,
        required: true,

    })
    role!: EarningRole;

    @Prop({
        enum: EarningReferenceType,
        required: true,
    })
    referenceType!: EarningReferenceType;

    @Prop({
        type: Types.ObjectId,
        required: true,

    })
    referenceId!: Types.ObjectId;

    @Prop({
        required: true,
        min: 0,
    })
    grossAmount!: number;

    @Prop({
        required: true,
        min: 0,
    })
    platformCommission!: number;

    @Prop({
        required: true,
        min: 0,
    })
    tax!: number;

    @Prop({
        required: true,
        min: 0,
    })
    deduction!: number;

    @Prop({
        required: true,
        min: 0,
    })
    netAmount!: number;

    @Prop({
        default: 'INR',
    })
    currency!: string;

    @Prop({
        enum: EarningStatus,
        default: EarningStatus.PENDING,

    })
    status!: EarningStatus;

    @Prop({
        type: Types.ObjectId,
        ref: 'MarketplacePayout',
        default: null,
    })
    payoutId?: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: 'PaymentTransaction',
    })
    paymentTransactionId?: Types.ObjectId;

    @Prop()
    description?: string;
}

export const MarketplaceEarningSchema = SchemaFactory.createForClass(MarketplaceEarning);

MarketplaceEarningSchema.pre('save', async function () {
    if (this.isNew || this.isModified('userId') || this.isModified('role')) {
        try {
            const User = this.$model('User') || this.db.model('User');
            if (!User) return;

            let user: any = await User.findById(this.userId);
            if (!user) {
                // Check if userId is a Vendor document ID
                const Vendor = this.$model('Vendor') || this.db.model('Vendor');
                if (Vendor) {
                    const vendor: any = await Vendor.findById(this.userId);
                    if (vendor && vendor.userId) {
                        user = await User.findById(vendor.userId);
                        if (user) {
                            this.userId = user._id;
                        }
                    }
                }
            }

            if (!user) {
                console.warn(`[MarketplaceEarning] Notice: User not found with id ${this.userId}`);
                return;
            }

            const expectedRole = this.role ? this.role.toLowerCase() : '';
            if (expectedRole && user.roles && !user.roles.includes(expectedRole as any)) {
                // Automatically add role or allow silently
                console.warn(`[MarketplaceEarning] Notice: User ${this.userId} missing role '${expectedRole}'`);
            }
        } catch (hookErr) {
            console.error('[MarketplaceEarning] Pre-save hook notice:', hookErr);
        }
    }
});
// Prevent duplicate earnings for the same event
MarketplaceEarningSchema.index(
    {
        userId: 1,
        role: 1,
        referenceType: 1,
        referenceId: 1,
    },
    {
        unique: true,
    },
);