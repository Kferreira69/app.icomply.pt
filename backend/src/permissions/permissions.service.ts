import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

// ── Module list ───────────────────────────────────────────────
export const ALL_MODULES = [
  'dashboard',
  'diagnostic',
  'projects',
  'tasks',
  'risks',
  'evidence',
  'audits',
  'capa',
  'reports',
  'policies',
  'gdpr',
  'nis2',
  'dora',
  'denuncias',
  'vendors',
  'soa',
  'excelImport',
  'aiAssistant',
  'trustCenter',
  'users',
  'settings',
  'translations',
] as const;

export type AppModule = (typeof ALL_MODULES)[number];

// Default access by role
const ROLE_DEFAULTS: Record<string, number> = {
  SUPER_ADMIN:        2,
  ADMIN:              2,
  COMPLIANCE_MANAGER: 2,
  CONSULTANT:         1,
  VIEWER:             1,
};

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  // ── Get all permissions for a user ───────────────────────────
  async getUserPermissions(userId: string): Promise<Record<string, number>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, permissions: true },
    });
    if (!user) return {};

    const defaultLevel = ROLE_DEFAULTS[user.role] ?? 1;

    // Start with default for all modules
    const result: Record<string, number> = {};
    for (const mod of ALL_MODULES) {
      result[mod] = defaultLevel;
    }

    // Apply per-user overrides (only for non-admin roles)
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      for (const perm of user.permissions) {
        result[perm.module] = perm.level;
      }
    }

    return result;
  }

  // ── Upsert permissions for a user ────────────────────────────
  async setUserPermissions(
    requesterId: string,
    targetUserId: string,
    permissions: Array<{ module: string; level: number }>,
  ): Promise<Record<string, number>> {
    // Verify requester is ADMIN/SUPER_ADMIN in the same org
    const [requester, target] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: requesterId }, select: { role: true, organizationId: true } }),
      this.prisma.user.findUnique({ where: { id: targetUserId }, select: { organizationId: true, role: true } }),
    ]);

    if (!requester || !target) throw new ForbiddenException('User not found');
    if (requester.organizationId !== target.organizationId) throw new ForbiddenException('Cross-org');
    if (!['SUPER_ADMIN', 'ADMIN'].includes(requester.role)) throw new ForbiddenException('Only admins can manage permissions');

    // Upsert each permission
    await Promise.all(
      permissions.map(({ module, level }) =>
        this.prisma.userPermission.upsert({
          where: { userId_module: { userId: targetUserId, module } },
          create: { userId: targetUserId, module, level },
          update: { level },
        }),
      ),
    );

    return this.getUserPermissions(targetUserId);
  }

  // ── Check single permission ───────────────────────────────────
  async checkPermission(userId: string, module: string, minLevel: number): Promise<void> {
    const perms = await this.getUserPermissions(userId);
    if ((perms[module] ?? 0) < minLevel) {
      throw new ForbiddenException(`Sem permissão para aceder ao módulo: ${module}`);
    }
  }
}
