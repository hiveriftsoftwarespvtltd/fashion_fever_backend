import { SetMetadata } from "@nestjs/common";

import { AccessType, AdminModule } from "src/admin/schema/admin.schema";


export const ADMIN_PERMISSION_KEY =
    'admin_permission';


export const AdminPermission = (
    module: AdminModule,
    access: AccessType,
) =>
    SetMetadata(
        ADMIN_PERMISSION_KEY,
        {
            module,
            access,
        },
    );