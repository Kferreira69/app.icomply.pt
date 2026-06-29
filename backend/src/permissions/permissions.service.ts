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
  // Wave 2+3 governance domains
  'hrCompliance',
  'aiGovernance',
  'esg',
  'bcp',
  'itsm',
  'aml',
  'iso27701',
  'soc2',
  'cis',
  'tisax',
  'antiBribery',
  'workforce',
  'quality',
  'regulatoryChange',
] as const;

export type AppModule = (typeof ALL_MODULES)[number];

// 0 = No access | 1 = Read only | 2 = Full access
// Rows = modules, Cols = roles (in order: ADMIN, CM, CONSULTANT, INT_AUD, EXT_AUD, VIEWER)
type RoleKey = 'SUPER_ADMIN' | 'ADMIN' | 'COMPLIANCE_MANAGER' | 'CONSULTANT' | 'INTERNAL_AUDITOR' | 'EXTERNAL_AUDITOR' | 'VIEWER';
type ModuleMatrix = Record<string, Record<RoleKey, number>>;

const MODULE_MATRIX: ModuleMatrix = {
  //                              SA  ADM  CM   CON  IAUD EAUD VIEW
  dashboard:         { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:2, EXTERNAL_AUDITOR:1, VIEWER:1 },
  diagnostic:        { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:0, EXTERNAL_AUDITOR:0, VIEWER:0 },
  projects:          { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:1, VIEWER:1 },
  tasks:             { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:0, VIEWER:1 },
  risks:             { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:1, VIEWER:0 },
  evidence:          { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:2, EXTERNAL_AUDITOR:1, VIEWER:0 },
  audits:            { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:1, INTERNAL_AUDITOR:2, EXTERNAL_AUDITOR:1, VIEWER:0 },
  capa:              { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:2, EXTERNAL_AUDITOR:1, VIEWER:1 },
  policies:          { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:1, VIEWER:1 },
  reports:           { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:2, EXTERNAL_AUDITOR:1, VIEWER:1 },
  soa:               { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:2, EXTERNAL_AUDITOR:1, VIEWER:0 },
  nis2:              { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:1, VIEWER:0 },
  dora:              { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:1, VIEWER:0 },
  gdpr:              { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:1, VIEWER:0 },
  vendors:           { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:0, VIEWER:0 },
  iGuard:            { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:1, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:0, VIEWER:0 },
  aiAssistant:       { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:0, VIEWER:1 },
  trustCenter:       { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:1, VIEWER:1 },
  excelImport:       { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:0, EXTERNAL_AUDITOR:0, VIEWER:0 },
  translations:      { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:1, CONSULTANT:0, INTERNAL_AUDITOR:0, EXTERNAL_AUDITOR:0, VIEWER:0 },
  users:             { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:1, CONSULTANT:0, INTERNAL_AUDITOR:0, EXTERNAL_AUDITOR:0, VIEWER:0 },
  settings:          { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:1, CONSULTANT:0, INTERNAL_AUDITOR:0, EXTERNAL_AUDITOR:0, VIEWER:0 },
  denuncias:         { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:1, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:0, VIEWER:0 },
  hrCompliance:      { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:1, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:0, VIEWER:0 },
  aiGovernance:      { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:0, VIEWER:0 },
  esg:               { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:1, VIEWER:0 },
  bcp:               { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:1, VIEWER:0 },
  itsm:              { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:0, VIEWER:0 },
  aml:               { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:1, VIEWER:0 },
  iso27701:          { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:1, VIEWER:0 },
  soc2:              { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:1, VIEWER:0 },
  cis:               { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:0, VIEWER:0 },
  tisax:             { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:1, VIEWER:0 },
  antiBribery:       { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:1, VIEWER:0 },
  workforce:         { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:1, INTERNAL_AUDITOR:0, EXTERNAL_AUDITOR:0, VIEWER:1 },
  quality:           { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:1, VIEWER:0 },
  regulatoryChange:  { SUPER_ADMIN:2, ADMIN:2, COMPLIANCE_MANAGER:2, CONSULTANT:2, INTERNAL_AUDITOR:1, EXTERNAL_AUDITOR:1, VIEWER:0 },
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

    const role = user.role as RoleKey;

    // Build from matrix — fallback to 1 if module not in matrix
    const result: Record<string, number> = {};
    for (const mod of ALL_MODULES) {
      const row = MODULE_MATRIX[mod];
      result[mod] = row ? (row[role] ?? 1) : 1;
    }

    // Apply per-user overrides stored in DB (only for non-super-admin roles)
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
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
