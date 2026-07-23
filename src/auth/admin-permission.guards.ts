import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { ADMIN_PERMISSION_KEY } from "./admin-module.decorator";
import { InjectModel } from "@nestjs/mongoose";
import { Admin, AdminDocument } from "src/admin/schema/admin.schema";
import { Model, Types } from "mongoose";
import { UserRole } from "src/user/schema/user.schema";


@Injectable()
export class AdminPermissionGuard
    implements CanActivate {
    constructor(
        private reflector: Reflector,

        @InjectModel(Admin.name) private adminModel: Model<AdminDocument>
    ) { }

    async canActivate(
        context: ExecutionContext,
    ) {
        const permission =
            this.reflector.getAllAndOverride(
                ADMIN_PERMISSION_KEY,
                [
                    context.getHandler(),
                    context.getClass(),
                ],
            );

        if (!permission) {
            return true;
        }

        const request =
            context.switchToHttp().getRequest();

        const user = request.user;

        if (!user) {
            throw new ForbiddenException();
        }

        if (
            user.roles.includes(
                UserRole.SUPER_ADMIN,
            )
        ) {
            return true;
        }

        if (
            !user.roles.includes(
                UserRole.ADMIN,
            )
        ) {
            throw new ForbiddenException(
                'Only admins can access this resource',
            );
        }

        console.log("UserId in admin guard", user._id)
        const admin =
            await this.adminModel.findOne({
                userId: user._id,
                isActive: true,
                isDeleted: false,
            });

        if (!admin) {
            throw new ForbiddenException(
                'Admin not found ',
            );
        }

        // if (admin.isSuperAdmin) {
        //     return true;
        // }

        const moduleAccess =
            admin.moduleAccess.find(
                x =>
                    x.module ===
                    permission.module,
            );

        if (!moduleAccess) {
            throw new ForbiddenException(
                'Module access denied',
            );
        }

        if (
            !moduleAccess.access.includes(
                permission.access,
            )
        ) {
            throw new ForbiddenException(
                'Permission denied',
            );
        }

        return true;
    }
}