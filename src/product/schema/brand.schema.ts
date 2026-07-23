import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types, Document } from "mongoose";

export type BrandDocument = Brand & Document;

// export enum CategoryOptions {
//   SKINCARE = 'skincare',
//   MAKEUP = 'makeup',
//   HAIR_CARE = 'hair_care',
//   BATH_AND_BODY = 'bath_and_body',
//   FRAGRANCES = 'fragrances',
//   BEAUTY_ACCESSORIES = 'beauty_accessories',
//   ORGANIC_PRODUCTS = 'organic_products',
// }

@Schema({ timestamps: true })
export class Brand {
    @Prop({ required: true, lowercase: true })
    name!: string;

    @Prop({ required: true })
    label!: string

    @Prop({ required: true })
    slug!: string;

    @Prop()
    description?: string;

    @Prop({
        type: [String],
        default: [],
        lowercase: true
    })
    tags!: string[]

    // @Prop({
    //   type:[
    //     {name:String,isVariant:Boolean,values:[String]}
    //   ],default:[]
    // })
    // attributes!:{
    //   name:string,
    //   isVariant:boolean,
    //   values:string[]
    // }[]


    // 🌳 Parent category (for tree structure)
    // @Prop({ type: Types.ObjectId, ref: "Category", default: null })
    // parentId?: Types.ObjectId;

    // 🏢 Multi-tenant support
    // @Prop({ type: Types.ObjectId, ref: "Vendor", required: true })
    // vendorId!: Types.ObjectId;

    // @Prop({type:Types.ObjectId, ref:"User",required:true})
    // ownerId!:Types.ObjectId

    // 🖼️ Category Image
    @Prop({ type: Types.ObjectId, ref: "Media" })
    image?: Types.ObjectId;

    @Prop({ default: true })
    isActive!: boolean;

    @Prop({ default: false })
    isDeleted!: boolean;
}

export const BrandSchema = SchemaFactory.createForClass(Brand);



