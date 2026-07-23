import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

export enum WalletTopupStatus {
    PENDING = 'PENDING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
}

export type UserWalletTopupDocument = UserWalletTopup & Document;
@Schema({ timestamps: true })
export class UserWalletTopup {
    @Prop({
        type: Types.ObjectId,
        ref: 'User',
        required: true,
    })
    userId!: Types.ObjectId;

    @Prop({
        required: true,
    })
    amount!: number;

    @Prop({
        required: true,
    })
    orderId!: string;

    @Prop()
    paymentId?: string;

    @Prop({
        enum: WalletTopupStatus,
        default: WalletTopupStatus.PENDING,
    })
    status!: WalletTopupStatus;
}

export const UserWalletTopupSchema = SchemaFactory.createForClass(UserWalletTopup);