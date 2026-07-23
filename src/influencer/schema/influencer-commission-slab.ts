import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type InfluencerCommissionSlabDocument = influencerCommissonSlab & Document

@Schema({timestamps:true})
export class influencerCommissonSlab{

    @Prop({required:true})
    minSales!:number

    @Prop({required:true})
    maxSales!:number

    @Prop({required:true})
    commissionRate!:number

    @Prop({default:true})
    isActive!:boolean
}

export const influencerCommissionSlabSchema = SchemaFactory.createForClass(influencerCommissonSlab)