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
            throw new ForbiddenException('Authentication required');
        }

        const userRoles: string[] = Array.isArray(user.roles)
            ? user.roles.map((r: any) => String(r).toLowerCase())
            : [];

        // Super admin bypasses all checks
        if (userRoles.includes(UserRole.SUPER_ADMIN)) {
            return true;
        }

        // Try to find admin record — primary check is DB record, not just role string
        let admin: AdminDocument | null = null;
        try {
            admin = await this.adminModel.findOne({
                userId: new Types.ObjectId(user._id.toString()),
                isActive: true,
                isDeleted: false,
            });
        } catch (_e) {
            try {
                admin = await this.adminModel.findOne({
                    userId: user._id,
                    isActive: true,
                    isDeleted: false,
                });
            } catch (_e2) {
                // ignore
            }
        }

        // If user has ADMIN role but no admin record, deny
        // If user has neither ADMIN role nor admin record, deny with clear message
        if (!userRoles.includes(UserRole.ADMIN) && !admin) {
            throw new ForbiddenException('Only admins can access this resource');
        }

        if (!admin) {
            throw new ForbiddenException('Admin record not found or inactive. Please contact super admin.');
        }

        // Check module access
        const moduleAccess = admin.moduleAccess.find(
            x => x.module === permission.module
        );

        if (!moduleAccess) {
            throw new ForbiddenException(`Access to module '${permission.module}' is not granted`);
        }

        if (!moduleAccess.access.includes(permission.access)) {
            throw new ForbiddenException(`'${permission.access}' permission denied for module '${permission.module}'`);
        }

        return true;
    }
}