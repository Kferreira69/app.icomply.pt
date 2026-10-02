import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../generated/prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

// Role hierarchy: higher index = more permissions
const ROLE_HIERARCHY: Record<UserRole, number> = {
  VIEWER: 0,
  SUPPORT: 0, // no hierarchy privileges: support agents are limited to the support desk
  EXTERNAL_AUDITOR: 1,
  INTERNAL_AUDITOR: 2,
  CONSULTANT: 3,
  TECNICO_IT: 3,
  HEAD_RH: 3,
  LEGAL: 4,
  COMPLIANCE_MANAGER: 4,
  CISO: 5,
  ADMIN: 6,
  SUPER_ADMIN: 7,
};

/** Routes a SUPPORT agent may call: the support desk plus what the app shell needs to log in and render. */
const SUPPORT_ALLOWED = /^\/api\/v\d+\/(support-tickets|auth|permissions|notifications|health|users\/me|licensing\/my|feature-flags\/my|organizations\/me|translations)(\/|\?|$)/;
export const supportMayCall = (url: string) => SUPPORT_ALLOWED.test(url);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // A support agent has no module access; everything outside the support desk and the app shell is refused,
    // including routes that carry no @RequireModule (those are otherwise open to any authenticated user).
    const req = context.switchToHttp().getRequest();
    if (req?.user?.role === 'SUPPORT' && !supportMayCall(String(req.originalUrl ?? req.url ?? ''))) {
      throw new ForbiddenException('Acesso restrito ao suporte');
    }

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
