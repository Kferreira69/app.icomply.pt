import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from './permissions.service';
import { REQUIRE_MODULE_KEY, RequireModuleMeta } from './require-module.decorator';

/**
 * Authorization guard for per-module permission levels (0 = none, 1 = read,
 * 2 = write). Must run after JwtAuthGuard (which populates request.user).
 *
 * Fail-open for unannotated routes: if no `@RequireModule(...)` metadata is
 * present on the handler or class, this guard allows the request through —
 * mirroring the existing RolesGuard convention. Only routes explicitly
 * decorated with `@RequireModule` are enforced.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequireModuleMeta>(REQUIRE_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user?.id && !user?.userId) {
      throw new ForbiddenException('Access denied');
    }

    const userId = user.id ?? user.userId;

    // checkPermission() re-fetches the user record fresh from the DB
    // (including orgRoleId/orgRole), so we never trust a possibly-stale
    // JWT payload for authorization decisions.
    await this.permissionsService.checkPermission(userId, required.module, required.minLevel);

    return true;
  }
}
