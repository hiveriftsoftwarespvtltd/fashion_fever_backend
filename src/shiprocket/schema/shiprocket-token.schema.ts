import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";


export type ShiprocketTokenDocument = ShiprocketToken & Document
@Schema({timestamps:true})
export class ShiprocketToken{

    @Prop({required:true})
    token!:string

    @Prop({required:true})
    expiresAt!:Date
}

export const ShipRocketTokenSchema = SchemaFactory.createForClass(ShiprocketToken)
