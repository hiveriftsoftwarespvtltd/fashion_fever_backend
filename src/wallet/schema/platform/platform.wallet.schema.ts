import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlatformWalletDocument = PlatformWallet & Document;

@Schema({ timestamps: true })
export class PlatformWallet {
    @Prop({
        type: Number,
        default: 0,
        min: 0,
    })
    balance!: number;

    @Prop({
        type: Number,
        default: 0,
        min: 0,
    })
    totalCommissionEarned!: number;

    @Prop({
        type: Number,
        default: 0,
        min: 0,
    })
    totalPlatformFeesEarned!: number;

    @Prop({
        type: Number,
        default: 0,
        min: 0,
    })
    totalPayouts!: number;

    @Prop({
        type: Boolean,
        default: true,
    })
    isActive!: boolean;
}

export const PlatformWalletSchema = SchemaFactory.createForClass(PlatformWallet);
