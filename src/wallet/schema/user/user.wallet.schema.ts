import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserWalletDocument = UserWallet & Document;

@Schema({ timestamps: true })
export class UserWallet {
    @Prop({
        type: Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    })
    userId!: Types.ObjectId;

    @Prop({
        type: Number,
        default: 0,
        min: 0,
    })
    balance!: number;

    @Prop({
        type: Number,
        default: 0,
    })
    totalCredits!: number;

    @Prop({
        type: Number,
        default: 0,
    })
    totalDebits!: number;

    @Prop({
        type: Boolean,
        default: true,
    })
    isActive!: boolean;
}

export const UserWalletSchema = SchemaFactory.createForClass(UserWallet);