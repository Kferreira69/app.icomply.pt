import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { date, oneOf, text } from '../common/utils/input';
import { findStandard, requirementCode, STANDARDS } from './standards.registry';
import { StandardDefinition } from './standards.types';

export const STANDARD_STATUSES = ['NOT_IMPLEMENTED', 'PARTIAL', 'IMPLEMENTED', 'NOT_APPLICABLE'] as const;

@Injectable()
export class StandardsService {
  constructor(private readonly prisma: PrismaService, private readonly permissions: PermissionsService) {}

  private levelOf(perms: Record<string, number>, def: StandardDefinition) {
    return perms[def.module] ?? 0;
  }

  private async open(userId: string, key: string, need: 1 | 2): Promise<StandardDefinition> {
    const def = findStandard(key);
    if (!def) throw new NotFoundException('Norma não encontrada');
    const perms = await this.permissions.getUserPermissions(userId);
    if (this.levelOf(perms, def) < need) {
      throw new ForbiddenException(need === 2 ? 'Sem permissão de escrita nesta norma' : 'Sem acesso a esta norma');
    }
    return def;
  }

  private static score(rows: Array<{ status: string }>) {
    const total = rows.length;
    const count = (s: string) => rows.filter(r => r.status === s).length;
    const implemented = count('IMPLEMENTED');
    const partial = count('PARTIAL');
    const notApplicable = count('NOT_APPLICABLE');
    const applicable = total - notApplicable;
    return {
      total, implemented, partial, notApplicable,
      notImplemented: total - implemented - partial - notApplicable,
      score: applicable > 0 ? Math.round(((implemented + partial * 0.5) / applicable) * 100) : 0,
    };
  }

  /** The standards this user can open, with the organisation's progress on each. */
  async list(orgId: string, userId: string) {
    const perms = await this.permissions.getUserPermissions(userId);
    const allowed = STANDARDS.filter(d => this.levelOf(perms, d) >= 1);
    const rows = await this.prisma.standardRequirement.findMany({
      where: { organizationId: orgId, standardKey: { in: allowed.map(d => d.key) } },
      select: { standardKey: true, status: true },
    });
    return allowed.map(d => {
      const mine = rows.filter(r => r.standardKey === d.key);
      return {
        key: d.key, name: d.name, fullName: d.fullName, domain: d.domain, description: d.description,
        canWrite: this.levelOf(perms, d) >= 2,
        started: mine.length > 0,
        // before the first visit the checklist is not created yet: show its size, not a 0% score
        ...StandardsService.score(mine.length ? mine : d.requirements.map(() => ({ status: 'NOT_IMPLEMENTED' }))),
      };
    });
  }

  private async load(orgId: string, def: StandardDefinition) {
    return this.prisma.standardRequirement.findMany({
      where: { organizationId: orgId, standardKey: def.key },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** Checklist + score. The list is copied to the organisation on the first visit. */
  async dashboard(orgId: string, userId: string, key: string) {
    const def = await this.open(userId, key, 1);
    let rows = await this.load(orgId, def);
    if (rows.length === 0) {
      await this.prisma.standardRequirement.createMany({
        data: def.requirements.map((r, i) => ({
          organizationId: orgId,
          standardKey: def.key,
          code: requirementCode(def.key, r.clause),
          chapter: r.chapter,
          clause: r.clause,
          title: r.title,
          description: r.description ?? null,
          sortOrder: i,
        })),
        skipDuplicates: true, // two simultaneous first visits must not fail
      });
      rows = await this.load(orgId, def);
    }
    const perms = await this.permissions.getUserPermissions(userId);
    return {
      standard: {
        key: def.key, name: def.name, fullName: def.fullName, domain: def.domain,
        description: def.description, scope: def.scope, canWrite: this.levelOf(perms, def) >= 2,
      },
      ...StandardsService.score(rows),
      requirements: rows,
    };
  }

  private async assertResponsible(orgId: string, userId: unknown): Promise<string | null> {
    const id = text(userId, 100);
    if (!id) return null;
    const user = await this.prisma.user.findFirst({ where: { id, organizationId: orgId }, select: { id: true } });
    if (!user) throw new BadRequestException('Responsável inválido (não pertence à organização)');
    return user.id;
  }

  async updateRequirement(orgId: string, userId: string, key: string, id: string, dto: any) {
    const def = await this.open(userId, key, 2);
    const current = await this.prisma.standardRequirement.findFirst({
      where: { id, organizationId: orgId, standardKey: def.key },
    });
    if (!current) throw new NotFoundException('Requisito não encontrado');
    const data: any = {};
    if (dto?.status !== undefined) {
      data.status = oneOf(dto.status, STANDARD_STATUSES, 'Estado');
      data.completedAt = data.status === 'IMPLEMENTED' ? current.completedAt ?? new Date() : null;
    }
    if (dto?.evidence !== undefined) data.evidence = text(dto.evidence);
    if (dto?.notes !== undefined) data.notes = text(dto.notes);
    if (dto?.targetDate !== undefined) data.targetDate = date(dto.targetDate, 'Data-alvo');
    if (dto?.responsibleId !== undefined) data.responsibleId = await this.assertResponsible(orgId, dto.responsibleId);
    return this.prisma.standardRequirement.update({ where: { id }, data });
  }
}
