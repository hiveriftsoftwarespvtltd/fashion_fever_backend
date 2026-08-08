import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";


export enum TicketStatus {
    OPEN = 'OPEN',
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    RESOLVED = 'RESOLVED',
    CLOSED = 'CLOSED',
}

export enum TicketType {
    ORDER = 'ORDER',
    PRODUCT = 'PRODUCT',
    DELIVERY = 'DELIVERY',
    PAYMENT = 'PAYMENT',
    OTHER = 'OTHER',
}


export type TicketDocument = Ticket & Document
@Schema({timestamps:true})
export class Ticket{
    @Prop({type:Types.ObjectId,ref:'User',default:null})
    userId!:Types.ObjectId

    @Prop({type:Types.ObjectId,ref:'Vendor',default:null})
    vendorId?:Types.ObjectId

    @Prop({type:Types.ObjectId,ref:'Order',default:null})
    orderId?:Types.ObjectId

    @Prop({type:Types.ObjectId,ref:'Product',default:null})
    productId?:Types.ObjectId

    @Prop({type:String,enum:TicketStatus,default:TicketStatus.PENDING})
    ticketStatus!:TicketStatus

    @Prop({type:String,enum:TicketType,default:TicketType.OTHER})
    ticketType!:TicketType
    
    @Prop({type:String})
    description!:string

    @Prop({type:Types.ObjectId,ref:'Media',default:[]})
    mediaFiles?:Types.ObjectId[]

    @Prop({
        type: [{
            senderId: { type: Types.ObjectId, ref: 'User' },
            senderRole: { type: String, enum: ['USER', 'VENDOR', 'ADMIN'] },
            senderName: { type: String },
            message: { type: String },
            createdAt: { type: Date, default: Date.now }
        }],
        default: []
    })
    replies?: {
        senderId: Types.ObjectId;
        senderRole: 'USER' | 'VENDOR' | 'ADMIN';
        senderName: string;
        message: string;
        createdAt: Date;
    }[];
}

export const TicketSchema = SchemaFactory.createForClass(Ticket)