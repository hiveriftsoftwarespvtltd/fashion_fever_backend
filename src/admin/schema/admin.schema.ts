import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

// export enum RoleTitle {
//     SUPER_ADMIN = "super_admin",
//     ADMIN = "admin"
// }

export enum AccessType {
    READ = "READ",
    WRITE = "WRITE"
}

export enum AdminModule {
    USERS = 'USERS',
    VENDORS = 'VENDORS',
    COURSES = 'COURSES',
    SERVICE_PROVIDERS = 'SERVICE_PROVIDERS',
    INFLUENCERS = 'INFLUENCERS',
    // HOME_CONTENT = 'HOME_CONTENT',
    FINANCE = 'FINANCE',
    // TICKETS = 'TICKETS',
    // DASHBOARD = 'DASHBOARD',
    // NOTIFICATION = 'NOTIFICATION',
    // QUICK_DELIVERY_CONFIG = 'QUICK_DELIVERY_CONFIG',
    PLATFORM = 'PLATFORM'
}


@Schema({ _id: false })
export class ModuleAccess {
    @Prop({
        enum: AdminModule,
        required: true,
    })
    module!: AdminModule;

    @Prop({
        type: [String],
        enum: AccessType,
        default: [],
    })
    access!: AccessType[];
}

export const ModuleAccessSchema =
    SchemaFactory.createForClass(ModuleAccess);
export type AdminDocument = Admin & Document
@Schema({ timestamps: true })
export class Admin {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
    userId!: Types.ObjectId

    @Prop()
    roleTitle!: string

    @Prop({ type: Boolean, default: true })
    isActive!: boolean;

    @Prop({
        type: [ModuleAccessSchema],
        default: [],
    })
    moduleAccess!: ModuleAccess[];

    @Prop({ type: Boolean, default: false })
    isDeleted!: boolean
}

export const AdminSchema = SchemaFactory.createForClass(Admin)