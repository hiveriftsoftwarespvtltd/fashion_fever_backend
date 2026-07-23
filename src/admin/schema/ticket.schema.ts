import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";


export enum TicketStatus {
    OPEN = 'OPEN',
    PENDING = 'PENDING',
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

    @Prop({type:String,enum:TicketStatus,default:TicketStatus.PENDING})
    ticketStatus!:TicketStatus

    @Prop({type:String,enum:TicketType,default:TicketType.OTHER})
    ticketType!:TicketType
    
    @Prop({type:String})
    description!:string

    @Prop({type:Types.ObjectId,ref:'Media',default:[]})
    mediaFiles?:Types.ObjectId[]
}

export const TicketSchema = SchemaFactory.createForClass(Ticket)