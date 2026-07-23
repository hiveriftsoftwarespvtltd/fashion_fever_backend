import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HomeContentDocument = HomeContent & Document;

export enum ContentType {
    BANNER = 'BANNER',
    OFFER = 'OFFER',
    ANNOUNCEMENT = 'ANNOUNCEMENT',
    CATEGORY = 'CATEGORY',
    PROMOTION = 'PROMOTION',
}

export enum RedirectType {
    NONE = 'NONE',
    PRODUCT = 'PRODUCT',
    CATEGORY = 'CATEGORY',
    SERVICE = 'SERVICE',
    VENDOR = 'VENDOR',
    EXTERNAL_LINK = 'EXTERNAL_LINK',
}

export enum ContentDocument {
    IMAGE = "IMAGE",
    VIDEO = "VIDEO"
}
@Schema({ timestamps: true })
export class HomeContent {
    @Prop({
        required: true,
        trim: true,
    })
    title!: string;

    @Prop()
    subTitle?: string;

    @Prop({ type: String, enum: ContentDocument, default: ContentDocument.IMAGE })
    contentDocument!: ContentDocument;

    @Prop({ type: String })
    videUrl?: string;

    @Prop()
    description?: string;

    @Prop({
        type: [String],
        default: [],
    })
    labels!: string[];

    @Prop({ type: Types.ObjectId, ref: "Media" })
    computerImage?: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "Media" })
    mobileImage?: Types.ObjectId;

    @Prop({
        enum: ContentType,
        default: ContentType.BANNER,
    })
    contentType!: ContentType;

    @Prop({
        enum: RedirectType,
        default: RedirectType.NONE,
    })
    redirectType!: RedirectType;

    @Prop({
        type: Types.ObjectId,
    })
    redirectId?: Types.ObjectId;

    @Prop()
    redirectUrl?: string;

    @Prop({
        default: '#FFFFFF',
    })
    backgroundColor!: string;

    @Prop({
        default: '#000000',
    })
    textColor!: string;

    @Prop({
        default: 0,
    })
    displayOrder!: number;

    @Prop({
        default: true,
    })
    isActive!: boolean;

    @Prop()
    startDate?: Date;

    @Prop()
    endDate?: Date;

    @Prop({
        default: 0,
    })
    clickCount!: number;

    @Prop({
        default: 0,
    })
    viewCount!: number;

    @Prop({
        type: Object,
        default: {},
    })
    metaData!: Record<string, any>;

    @Prop({
        default: false,
    })
    isFeatured!: boolean;

    @Prop({
        default: 'HOME',
    })
    page!: string;

    @Prop()
    buttonText?: string;
}

export const HomeContentSchema =
    SchemaFactory.createForClass(HomeContent);