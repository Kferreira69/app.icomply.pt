import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { date, intBetween, num, oneOf, required, text } from '../common/utils/input';
import { ISO14001_REQUIREMENTS } from './environment.requirements';

export const REQUIREMENT_STATUSES = ['NOT_IMPLEMENTED', 'PARTIAL', 'IMPLEMENTED', 'NOT_APPLICABLE'] as const;
export const ASPECT_CONDITIONS = ['NORMAL', 'ABNORMAL', 'EMERGENCY'] as const;
export const ASPECT_STATUSES = ['ACTIVE', 'CLOSED'] as const;
export const OBJECTIVE_STATUSES = ['PLANNED', 'IN_PROGRESS', 'ACHIEVED', 'NOT_ACHIEVED', 'CANCELLED'] as const;
export const OBLIGATION_CATEGORIES = ['WASTE', 'EMISSIONS', 'WATER', 'NOISE', 'ENERGY', 'CHEMICALS', 'LICENCE', 'OTHER'] as const;
export const OBLIGATION_STATUSES = ['NOT_ASSESSED', 'COMPLIANT', 'PARTIAL', 'NON_COMPLIANT'] as const;

/** An aspect is "significant" when severity x probability reaches this value (scale 1-25). */
export const SIGNIFICANCE_THRESHOLD = 12;

const RESPONSIBLE = { select: { id: true, firstName: true, lastName: true } };
const ESG_METRIC_SELECT = {
  id: true, framework: true, standardCode: true, indicator: true, unit: true,
  year: true, actualValue: true, targetValue: true,
} as const;

const scale15 = (v: unknown, label: string): number => intBetween(v, 1, 5, label);

/** Significance rules of ISO 14001 §6.1.2 as implemented here (documented in the UI). */
export function computeSignificance(severity: number, probability: number, condition: string) {
  const significance = severity * probability;
  const isSignificant =
    significance >= SIGNIFICANCE_THRESHOLD || (condition === 'EMERGENCY' && severity >= 4);
  return { significance, isSignificant };
}

@Injectable()
export class EnvironmentService {
  constructor(private readonly prisma: PrismaService, private readonly permissions: PermissionsService) {}

  private async assertResponsible(orgId: string, userId: unknown): Promise<string | null> {
    const id = text(userId, 100);
    if (!id) return null;
    const user = await this.prisma.user.findFirst({ where: { id, organizationId: orgId }, select: { id: true } });
    if (!user) throw new BadRequestException('Responsável inválido (não pertence à organização)');
    return user.id;
  }

  // ── dashboard + ISO 14001 checklist ──────────────────────────────────────

  async dashboard(orgId: string) {
    let requirements = await this.listRequirements(orgId);
    if (requirements.length === 0) {
      await this.seedRequirements(orgId);
      requirements = await this.listRequirements(orgId);
    }

    const total = requirements.length;
    const count = (s: string) => requirements.filter(r => r.status === s).length;
    const implemented = count('IMPLEMENTED');
    const partial = count('PARTIAL');
    const notApplicable = count('NOT_APPLICABLE');
    const applicable = total - notApplicable;
    const score = applicable > 0 ? Math.round(((implemented + partial * 0.5) / applicable) * 100) : 0;

    const now = new Date();
    const [aspects, objectives, obligations] = await Promise.all([
      this.prisma.environmentalAspect.findMany({
        where: { organizationId: orgId },
        select: { isSignificant: true, condition: true, status: true },
      }),
      this.prisma.environmentalObjective.findMany({
        where: { organizationId: orgId },
        select: { status: true, deadline: true },
      }),
      this.prisma.environmentalObligation.findMany({
        where: { organizationId: orgId },
        select: { complianceStatus: true, nextEvaluationAt: true },
      }),
    ]);
    const open = (o: { status: string; deadline: Date | null }) =>
      o.deadline && o.deadline < now && ['PLANNED', 'IN_PROGRESS'].includes(o.status);

    return {
      score,
      summary: {
        total, implemented, partial, notApplicable,
        notImplemented: total - implemented - partial - notApplicable,
      },
      requirements,
      aspects: {
        total: aspects.length,
        significant: aspects.filter(a => a.isSignificant && a.status === 'ACTIVE').length,
        emergency: aspects.filter(a => a.condition === 'EMERGENCY').length,
      },
      objectives: {
        total: objectives.length,
        achieved: objectives.filter(o => o.status === 'ACHIEVED').length,
        inProgress: objectives.filter(o => o.status === 'IN_PROGRESS').length,
        overdue: objectives.filter(open).length,
      },
      obligations: {
        total: obligations.length,
        compliant: obligations.filter(o => o.complianceStatus === 'COMPLIANT').length,
        nonCompliant: obligations.filter(o => o.complianceStatus === 'NON_COMPLIANT').length,
        notAssessed: obligations.filter(o => o.complianceStatus === 'NOT_ASSESSED').length,
        evaluationOverdue: obligations.filter(o => o.nextEvaluationAt && o.nextEvaluationAt < now).length,
      },
    };
  }

  private listRequirements(orgId: string) {
    return this.prisma.environmentalRequirement.findMany({
      where: { organizationId: orgId },
      orderBy: { code: 'asc' },
      include: { responsible: RESPONSIBLE },
    }).then(rows => rows.sort((a, b) => compareClause(a.clauseNumber, b.clauseNumber)));
  }

  private async seedRequirements(orgId: string) {
    await this.prisma.environmentalRequirement.createMany({
      data: ISO14001_REQUIREMENTS.map(r => ({
        organizationId: orgId,
        code: `ISO14001-${r.clauseNumber}`,
        clauseNumber: r.clauseNumber,
        title: r.title,
        description: r.description,
      })),
      skipDuplicates: true, // two simultaneous first visits must not fail
    });
  }

  async updateRequirement(orgId: string, id: string, dto: any) {
    const current = await this.prisma.environmentalRequirement.findFirst({ where: { id, organizationId: orgId } });
    if (!current) throw new NotFoundException('Requisito não encontrado');
    const data: any = {};
    if (dto.status !== undefined) {
      data.status = oneOf(dto.status, REQUIREMENT_STATUSES, 'Estado');
      data.completedAt = data.status === 'IMPLEMENTED' ? current.completedAt ?? new Date() : null;
    }
    if (dto.evidence !== undefined) data.evidence = text(dto.evidence);
    if (dto.notes !== undefined) data.notes = text(dto.notes);
    if (dto.targetDate !== undefined) data.targetDate = date(dto.targetDate, 'Data-alvo');
    if (dto.responsibleId !== undefined) data.responsibleId = await this.assertResponsible(orgId, dto.responsibleId);
    return this.prisma.environmentalRequirement.update({ where: { id }, data, include: { responsible: RESPONSIBLE } });
  }

  // ── aspects & impacts (6.1.2) ────────────────────────────────────────────

  listAspects(orgId: string) {
    return this.prisma.environmentalAspect.findMany({
      where: { organizationId: orgId },
      orderBy: [{ isSignificant: 'desc' }, { significance: 'desc' }, { createdAt: 'desc' }],
      include: { responsible: RESPONSIBLE },
    });
  }

  async createAspect(orgId: string, dto: any) {
    const condition = dto.condition === undefined ? 'NORMAL' : oneOf(dto.condition, ASPECT_CONDITIONS, 'Condição');
    const severity = scale15(dto.severity ?? 1, 'Severidade');
    const probability = scale15(dto.probability ?? 1, 'Probabilidade');
    return this.prisma.environmentalAspect.create({
      data: {
        organizationId: orgId,
        activity: required(dto.activity, 'Atividade'),
        aspect: required(dto.aspect, 'Aspeto ambiental'),
        impact: required(dto.impact, 'Impacto ambiental'),
        condition,
        lifecycleStage: text(dto.lifecycleStage, 200),
        severity,
        probability,
        ...computeSignificance(severity, probability, condition),
        controls: text(dto.controls),
        status: dto.status === undefined ? 'ACTIVE' : oneOf(dto.status, ASPECT_STATUSES, 'Estado'),
        responsibleId: await this.assertResponsible(orgId, dto.responsibleId),
        reviewDate: date(dto.reviewDate, 'Data de revisão'),
      },
      include: { responsible: RESPONSIBLE },
    });
  }

  async updateAspect(orgId: string, id: string, dto: any) {
    const current = await this.prisma.environmentalAspect.findFirst({ where: { id, organizationId: orgId } });
    if (!current) throw new NotFoundException('Aspeto ambiental não encontrado');
    const data: any = {};
    if (dto.activity !== undefined) data.activity = required(dto.activity, 'Atividade');
    if (dto.aspect !== undefined) data.aspect = required(dto.aspect, 'Aspeto ambiental');
    if (dto.impact !== undefined) data.impact = required(dto.impact, 'Impacto ambiental');
    if (dto.lifecycleStage !== undefined) data.lifecycleStage = text(dto.lifecycleStage, 200);
    if (dto.controls !== undefined) data.controls = text(dto.controls);
    if (dto.status !== undefined) data.status = oneOf(dto.status, ASPECT_STATUSES, 'Estado');
    if (dto.reviewDate !== undefined) data.reviewDate = date(dto.reviewDate, 'Data de revisão');
    if (dto.responsibleId !== undefined) data.responsibleId = await this.assertResponsible(orgId, dto.responsibleId);

    const condition = dto.condition !== undefined ? oneOf(dto.condition, ASPECT_CONDITIONS, 'Condição') : current.condition;
    const severity = dto.severity !== undefined ? scale15(dto.severity, 'Severidade') : current.severity;
    const probability = dto.probability !== undefined ? scale15(dto.probability, 'Probabilidade') : current.probability;
    Object.assign(data, { condition, severity, probability }, computeSignificance(severity, probability, condition));

    return this.prisma.environmentalAspect.update({ where: { id }, data, include: { responsible: RESPONSIBLE } });
  }

  async removeAspect(orgId: string, id: string) {
    const r = await this.prisma.environmentalAspect.deleteMany({ where: { id, organizationId: orgId } });
    if (!r.count) throw new NotFoundException('Aspeto ambiental não encontrado');
    return { deleted: true };
  }

  // ── objectives & targets (6.2) ───────────────────────────────────────────

  // An objective can follow an ESG metric (CSRD / GRI): its current value then IS the metric's
  // reported value, so the management system and the sustainability report share one number.
  // ESG data is only shown to people who can read the ESG module.

  private async canSeeEsg(userId: string): Promise<boolean> {
    const perms = await this.permissions.getUserPermissions(userId);
    return (perms['esg'] ?? 0) >= 1;
  }

  private present(o: any, canSeeEsg: boolean) {
    const metric = canSeeEsg ? o.esgMetric ?? null : null;
    return {
      ...o,
      esgMetric: metric,
      esgLinked: !!o.esgMetricId,
      effectiveCurrent: metric?.actualValue ?? o.current ?? null,
    };
  }

  private async resolveMetric(orgId: string, userId: string, raw: unknown): Promise<string | null> {
    const id = text(raw, 100);
    if (!id) return null;
    if (!(await this.canSeeEsg(userId))) throw new ForbiddenException('Sem acesso às métricas ESG');
    const metric = await this.prisma.esgMetric.findFirst({
      where: { id, organizationId: orgId, pillar: 'ENVIRONMENTAL' },
      select: { id: true },
    });
    if (!metric) throw new BadRequestException('Métrica ESG inválida (tem de ser uma métrica ambiental da organização)');
    return metric.id;
  }

  /** Environmental ESG metrics an objective can be linked to (empty without ESG access). */
  async listEsgMetrics(orgId: string, userId: string) {
    if (!(await this.canSeeEsg(userId))) return [];
    return this.prisma.esgMetric.findMany({
      where: { organizationId: orgId, pillar: 'ENVIRONMENTAL' },
      orderBy: [{ year: 'desc' }, { standardCode: 'asc' }],
      select: { ...ESG_METRIC_SELECT, status: true },
    });
  }

  async listObjectives(orgId: string, userId: string) {
    const [rows, canSeeEsg] = await Promise.all([
      this.prisma.environmentalObjective.findMany({
        where: { organizationId: orgId },
        orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
        include: { responsible: RESPONSIBLE, esgMetric: { select: ESG_METRIC_SELECT } },
      }),
      this.canSeeEsg(userId),
    ]);
    return rows.map(o => this.present(o, canSeeEsg));
  }

  async createObjective(orgId: string, userId: string, dto: any) {
    const esgMetricId = await this.resolveMetric(orgId, userId, dto.esgMetricId);
    const created = await this.prisma.environmentalObjective.create({
      data: {
        esgMetricId,
        organizationId: orgId,
        title: required(dto.title, 'Título'),
        description: text(dto.description),
        indicator: text(dto.indicator, 300),
        unit: text(dto.unit, 40),
        baseline: num(dto.baseline, 'Valor de partida'),
        target: num(dto.target, 'Meta'),
        current: num(dto.current, 'Valor atual'),
        deadline: date(dto.deadline, 'Prazo'),
        status: dto.status === undefined ? 'PLANNED' : oneOf(dto.status, OBJECTIVE_STATUSES, 'Estado'),
        actions: text(dto.actions),
        responsibleId: await this.assertResponsible(orgId, dto.responsibleId),
      },
      include: { responsible: RESPONSIBLE, esgMetric: { select: ESG_METRIC_SELECT } },
    });
    return this.present(created, await this.canSeeEsg(userId));
  }

  async updateObjective(orgId: string, userId: string, id: string, dto: any) {
    const current = await this.prisma.environmentalObjective.findFirst({ where: { id, organizationId: orgId } });
    if (!current) throw new NotFoundException('Objetivo não encontrado');
    const data: any = {};
    if (dto.esgMetricId !== undefined) {
      // only a CHANGE of the link needs ESG access (saving other fields of a linked objective must not);
      // unlinking is a change too, so it cannot be used to bypass the ESG permission
      const wanted = text(dto.esgMetricId, 100) || null;
      if (wanted !== (current.esgMetricId ?? null)) {
        if (!(await this.canSeeEsg(userId))) throw new ForbiddenException('Sem acesso às métricas ESG');
        data.esgMetricId = await this.resolveMetric(orgId, userId, wanted);
      }
    }
    if (dto.title !== undefined) data.title = required(dto.title, 'Título');
    if (dto.description !== undefined) data.description = text(dto.description);
    if (dto.indicator !== undefined) data.indicator = text(dto.indicator, 300);
    if (dto.unit !== undefined) data.unit = text(dto.unit, 40);
    if (dto.baseline !== undefined) data.baseline = num(dto.baseline, 'Valor de partida');
    if (dto.target !== undefined) data.target = num(dto.target, 'Meta');
    if (dto.current !== undefined) data.current = num(dto.current, 'Valor atual');
    if (dto.deadline !== undefined) data.deadline = date(dto.deadline, 'Prazo');
    if (dto.status !== undefined) data.status = oneOf(dto.status, OBJECTIVE_STATUSES, 'Estado');
    if (dto.actions !== undefined) data.actions = text(dto.actions);
    if (dto.responsibleId !== undefined) data.responsibleId = await this.assertResponsible(orgId, dto.responsibleId);
    const updated = await this.prisma.environmentalObjective.update({
      where: { id }, data, include: { responsible: RESPONSIBLE, esgMetric: { select: ESG_METRIC_SELECT } },
    });
    return this.present(updated, await this.canSeeEsg(userId));
  }

  async removeObjective(orgId: string, id: string) {
    const r = await this.prisma.environmentalObjective.deleteMany({ where: { id, organizationId: orgId } });
    if (!r.count) throw new NotFoundException('Objetivo não encontrado');
    return { deleted: true };
  }

  // ── legal & other requirements (6.1.3 / 9.1.2) ───────────────────────────

  listObligations(orgId: string) {
    return this.prisma.environmentalObligation.findMany({
      where: { organizationId: orgId },
      orderBy: [{ complianceStatus: 'asc' }, { title: 'asc' }],
      include: { responsible: RESPONSIBLE },
    });
  }

  async createObligation(orgId: string, dto: any) {
    return this.prisma.environmentalObligation.create({
      data: {
        organizationId: orgId,
        title: required(dto.title, 'Título'),
        source: text(dto.source, 300),
        category: dto.category === undefined ? 'OTHER' : oneOf(dto.category, OBLIGATION_CATEGORIES, 'Categoria'),
        requirement: text(dto.requirement),
        applicability: text(dto.applicability),
        complianceStatus: dto.complianceStatus === undefined
          ? 'NOT_ASSESSED' : oneOf(dto.complianceStatus, OBLIGATION_STATUSES, 'Estado de cumprimento'),
        lastEvaluatedAt: date(dto.lastEvaluatedAt, 'Data da última avaliação'),
        nextEvaluationAt: date(dto.nextEvaluationAt, 'Data da próxima avaliação'),
        responsibleId: await this.assertResponsible(orgId, dto.responsibleId),
        notes: text(dto.notes),
      },
      include: { responsible: RESPONSIBLE },
    });
  }

  async updateObligation(orgId: string, id: string, dto: any) {
    const current = await this.prisma.environmentalObligation.findFirst({ where: { id, organizationId: orgId } });
    if (!current) throw new NotFoundException('Requisito legal não encontrado');
    const data: any = {};
    if (dto.title !== undefined) data.title = required(dto.title, 'Título');
    if (dto.source !== undefined) data.source = text(dto.source, 300);
    if (dto.category !== undefined) data.category = oneOf(dto.category, OBLIGATION_CATEGORIES, 'Categoria');
    if (dto.requirement !== undefined) data.requirement = text(dto.requirement);
    if (dto.applicability !== undefined) data.applicability = text(dto.applicability);
    if (dto.complianceStatus !== undefined) {
      data.complianceStatus = oneOf(dto.complianceStatus, OBLIGATION_STATUSES, 'Estado de cumprimento');
      // evaluating a requirement stamps the evaluation date unless one was sent explicitly
      if (dto.lastEvaluatedAt === undefined && data.complianceStatus !== 'NOT_ASSESSED') data.lastEvaluatedAt = new Date();
    }
    if (dto.lastEvaluatedAt !== undefined) data.lastEvaluatedAt = date(dto.lastEvaluatedAt, 'Data da última avaliação');
    if (dto.nextEvaluationAt !== undefined) data.nextEvaluationAt = date(dto.nextEvaluationAt, 'Data da próxima avaliação');
    if (dto.responsibleId !== undefined) data.responsibleId = await this.assertResponsible(orgId, dto.responsibleId);
    if (dto.notes !== undefined) data.notes = text(dto.notes);
    return this.prisma.environmentalObligation.update({ where: { id }, data, include: { responsible: RESPONSIBLE } });
  }

  async removeObligation(orgId: string, id: string) {
    const r = await this.prisma.environmentalObligation.deleteMany({ where: { id, organizationId: orgId } });
    if (!r.count) throw new NotFoundException('Requisito legal não encontrado');
    return { deleted: true };
  }
}

/** "6.1.10" sorts after "6.1.2": compare clause numbers numerically, part by part. */
function compareClause(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? -1) - (pb[i] ?? -1);
    if (d) return d;
  }
  return 0;
}
