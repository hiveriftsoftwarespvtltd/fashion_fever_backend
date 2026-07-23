import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export enum RentalStatus {
    AVAILABLE = 'AVAILABLE',
    UNAVAILABLE = 'UNAVAILABLE'
}

export enum RentalServiceGender {
    MAN = 'MAN',
    WOMAN = 'WOMAN',
    UNISEX = 'UNISEX'
}

export type RentalServiceDocument = Rental & Document;

@Schema({ timestamps: true })
export class Rental {
    @Prop({ type: Types.ObjectId, ref: 'ServiceCategory', required: true })
    serviceCategoryId: Types.ObjectId

    @Prop({ type: Types.ObjectId, ref: 'ServiceProvider', required: true })
    serviceProviderId!: Types.ObjectId

    @Prop({ required: true })
    title: string;

    @Prop()
    description: string;

    @Prop({
        type: [Types.ObjectId],
        ref: 'Media',
    })
    images: Types.ObjectId[];

    @Prop({ required: true })
    rentalPrice: number;

    @Prop({ default: 0 })
    securityDeposit: number;

    @Prop({ required: true })
    totalQuantity: number;

    @Prop({ type: String, enum: RentalStatus, default: RentalStatus.AVAILABLE })
    status: RentalStatus;

    @Prop({ type: String, enum: RentalServiceGender, default: RentalServiceGender.WOMAN })
    rentalServiceGender!: RentalServiceGender

    @Prop({ type: Boolean, default: true })
    isActive!: boolean

    @Prop({ type: Boolean, default: false })
    isDeleted!: boolean
}

export const RentalServiceSchema = SchemaFactory.createForClass(Rental) 