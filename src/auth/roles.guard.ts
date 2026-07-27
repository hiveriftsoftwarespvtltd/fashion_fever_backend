import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";

import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";
import { UserRole } from "src/user/schema/user.schema";
import { Observable } from "rxjs";


@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
            ROLES_KEY, [
            context.getHandler(),
            context.getClass()
        ]
        )



        if (!requiredRoles) return true
        const request = context.switchToHttp().getRequest();
        const user = request.user;




        // console.log("User in line 25",user)

        if (!user) {
            throw new ForbiddenException("No user found in request")
        }
        // if (!requiredRoles.includes(user.role)) {
        //     throw new ForbiddenException("Access denied")
        // }

        let userRoles: string[] = [];
        if (Array.isArray(user.roles) && user.roles.length > 0) {
            userRoles = user.roles.map((r: any) => String(r).toLowerCase());
        } else if (user.role) {
            userRoles = [String(user.role).toLowerCase()];
        }
        if (userRoles.length === 0) {
            userRoles = ['user'];
        }

        const normalizedRequired = requiredRoles.map(r => String(r).toLowerCase());

        const hasRole = normalizedRequired.some(reqRole =>
            userRoles.some(uRole => uRole === reqRole || uRole === 'admin' || uRole === 'super_admin' || uRole === 'service_provider')
        );

        if (!hasRole) {
            throw new ForbiddenException("Access Denied");
        }
        return true
    }
}