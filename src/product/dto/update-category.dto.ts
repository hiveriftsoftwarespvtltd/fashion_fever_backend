// import { Type } from "class-transformer";
// import { IsArray, IsBoolean, IsEnum, IsMongoId, IsOptional, IsString, ValidateNested } from "class-validator";
// import { CategoryOptions } from "../schema/category.schema";


// class categoryAttributeDTO{
//     @IsString()
//     name!:string

//     @IsBoolean()
//     isVariant!:boolean

//     @IsArray()
//     @IsString({each:true})
//     values!:string[]
// }
// export class UpdateCategoryDTO{
    
//     @IsEnum(CategoryOptions)
//     name!:CategoryOptions;

//     @IsOptional()
//     @IsString()
//     slug?:string;

//     @IsOptional()
//     @IsString()
//     description?:string;

//     @IsOptional()
//     @IsArray()
//     @ValidateNested({each:true})
//     @Type(()=>categoryAttributeDTO)
//     attributes?:categoryAttributeDTO[]

//     @IsOptional()
//     @IsMongoId()
//     image?:string
// }