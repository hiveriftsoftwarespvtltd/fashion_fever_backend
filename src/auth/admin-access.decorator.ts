import { applyDecorators, UseGuards } from '@nestjs/common';
import { AdminModule, AccessType } from 'src/admin/schema/admin.schema';
import { JwtAuthGuard } from './jwt-auth.guad';
import { AdminPermissionGuard } from './admin-permission.guards';
import { AdminPermission } from './admin-module.decorator';

export function AdminAccess(
  module: AdminModule,
  access: AccessType,
) {
  return applyDecorators(
    UseGuards(
      JwtAuthGuard,
      AdminPermissionGuard,
    ),
    AdminPermission(module, access),
  );
}