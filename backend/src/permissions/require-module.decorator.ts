import { SetMetadata } from '@nestjs/common';
import { AppModule } from './permissions.service';

export const REQUIRE_MODULE_KEY = 'requireModule';

export interface RequireModuleMeta {
  module: AppModule;
  minLevel: 1 | 2;
}

/**
 * Marks a route handler (or entire controller) as requiring at least
 * `minLevel` access (1 = read, 2 = write) to the given module, per the
 * user's effective permissions (org-role override or base role matrix).
 * Must be paired with `PermissionsGuard`.
 */
export const RequireModule = (module: AppModule, minLevel: 1 | 2) =>
  SetMetadata(REQUIRE_MODULE_KEY, { module, minLevel } as RequireModuleMeta);
