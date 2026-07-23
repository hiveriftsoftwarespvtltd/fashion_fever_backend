import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum BankAccountOwnerType {
    USER = 'USER',
    EDUCATOR = 'EDUCATOR',
    VENDOR = 'VENDOR',
    INFLUENCER = 'INFLUENCER',
    SERVICE_PROVIDER = 'SERVICE_PROVIDER',
}

export enum BankAccountType {
    SAVINGS = 'SAVINGS',
    CURRENT = 'CURRENT',
}

export enum BankAccountStatus {
    PENDING = 'PENDING',
    VERIFIED = 'VERIFIED',
    REJECTED = 'REJECTED',
}

export type BankAccountDocument = BankAccount & Document;

@Schema({
    timestamps: true,
})
export class BankAccount {

    @Prop({
        type: Types.ObjectId,
        required: true,
        index: true,
    })
    ownerId: Types.ObjectId;

    // @Prop({
    //     required: true,
    //     enum: BankAccountOwnerType,
    //     index: true,
    // })
    // ownerType: BankAccountOwnerType;

    @Prop({ type: [String], enum: BankAccountOwnerType, default: [] })
    ownerTypes: BankAccountOwnerType[]

    @Prop({
        required: true,
        trim: true,
    })
    accountHolderName: string;

    @Prop({
        required: true,
        trim: true,
    })
    bankName: string;

    @Prop({
        required: true,
        trim: true,
        uppercase: true,
    })
    ifscCode: string;

    @Prop({
        required: true,
        trim: true,
    })
    accountNumber: string;

    @Prop({
        enum: BankAccountType,
        default: BankAccountType.SAVINGS,
    })
    accountType: BankAccountType;

    @Prop({
        default: false,
    })
    isPrimary: boolean;

    @Prop({
        enum: BankAccountStatus,
        default: BankAccountStatus.PENDING,
    })
    status: BankAccountStatus;

    @Prop()
    verifiedAt?: Date;

    @Prop()
    rejectionReason?: string;

    @Prop()
    rejectedAt?: Date;

    @Prop()
    verificationReference?: string;

    @Prop({
        default: true,
    })
    isActive: boolean;

    @Prop({
        default: false,
    })
    isDeleted: boolean;
}

export const BankAccountSchema =
    SchemaFactory.createForClass(BankAccount);