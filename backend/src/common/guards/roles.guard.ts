import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

// Role hierarchy: higher index = more permissions
const ROLE_HIERARCHY: Record<UserRole, number> = {
  VIEWER: 0,
  EXTERNAL_AUDITOR: 1,
  INTERNAL_AUDITOR: 2,
  CONSULTANT: 3,
  COMPLIANCE_MANAGER: 4,
  ADMIN: 5,
  SUPER_ADMIN: 6,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Access denied');

    const userLevel = ROLE_HIERARCHY[user.role] ?? -1;
    const minRequired = Math.min(...requiredRoles.map(r => ROLE_HIERARCHY[r]));

    if (userLevel < minRequired) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredRoles.join(' or ')}`,
      );
    }

    return true;
  }
}
