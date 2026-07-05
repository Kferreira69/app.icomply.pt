import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrganizationDto) {
    const slug = this.generateSlug(dto.name);
    const exists = await this.prisma.organization.findUnique({ where: { slug } });
    if (exists) throw new ConflictException('Organization with this name already exists');

    return this.prisma.organization.create({
      data: { ...dto, slug },
    });
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.organization.findMany({
        where: { isActive: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { users: true, projects: true } } },
      }),
      this.prisma.organization.count({ where: { isActive: true } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, projects: true, risks: true } },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    await this.findOne(id);
    return this.prisma.organization.update({ where: { id }, data: dto });
  }

  async getDashboardStats(organizationId: string) {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86400000);
    const in7  = new Date(now.getTime() + 7  * 86400000);

    const [
      projects, overdueTasks, riskGroups, pendingEvidence,
      highRisks, noTreatmentRisks, openCapas, overdueCapas,
      expiringEvidence, overdueCapaRecords,
      totalPolicies, reviewPolicies,
      openDsar, overdueDsar,
      activeAudits, openFindings,
      upcomingBcpTests, pendingVendorAssessments,
    ] = await Promise.all([
      this.prisma.project.groupBy({ by: ['status'], where: { organizationId }, _count: true }),
      this.prisma.task.count({ where: { project: { organizationId }, status: { notIn: ['DONE','CANCELLED'] }, dueDate: { lt: now } } }),
      this.prisma.risk.groupBy({ by: ['status'], where: { organizationId }, _count: true }),
      this.prisma.evidence.count({ where: { project: { organizationId }, status: 'PENDING' } }),
      this.prisma.risk.count({ where: { organizationId, inherentScore: { gte: 15 }, status: { notIn: ['CLOSED','ACCEPTED'] } } }),
      this.prisma.risk.count({ where: { organizationId, treatmentPlan: null, inherentScore: { gte: 12 }, status: { notIn: ['CLOSED','ACCEPTED'] } } }),
      this.prisma.capa.count({ where: { createdBy: { organizationId }, status: { notIn: ['CLOSED','CANCELLED'] } } }),
      this.prisma.capa.count({ where: { createdBy: { organizationId }, status: { notIn: ['CLOSED','CANCELLED'] }, dueDate: { lt: now } } }),
      this.prisma.evidence.count({ where: { project: { organizationId }, expiresAt: { lte: in30, gte: now } } }),
      (this.prisma as any).capaRecord?.count?.({ where: { organizationId, status: { notIn: ['CLOSED','CANCELLED'] }, dueDate: { lt: now } } }).catch(() => 0) ?? Promise.resolve(0),
      this.prisma.policy.count({ where: { organizationId, status: { notIn: ['ARCHIVED'] } } }),
      this.prisma.policy.count({ where: { organizationId, status: 'APPROVED', reviewDate: { lte: in30 } } }),
      (this.prisma as any).dataSubjectRequest?.count?.({ where: { organizationId, status: { notIn: ['COMPLETED','REJECTED'] } } }).catch(() => 0) ?? Promise.resolve(0),
      (this.prisma as any).dataSubjectRequest?.count?.({ where: { organizationId, status: { notIn: ['COMPLETED','REJECTED'] }, dueAt: { lt: now } } }).catch(() => 0) ?? Promise.resolve(0),
      this.prisma.audit.count({ where: { project: { organizationId }, status: { notIn: ['COMPLETED','CANCELLED'] } } }),
      (this.prisma as any).finding?.count?.({ where: { audit: { project: { organizationId } }, status: { notIn: ['CLOSED','ACCEPTED'] } } }).catch(() => 0) ?? Promise.resolve(0),
      (this.prisma as any).bcpTest?.count?.({ where: { plan: { organizationId }, testedAt: { gte: now, lte: in30 } } }).catch(() => 0) ?? Promise.resolve(0),
      this.prisma.vendor.count({ where: { organizationId, riskScore: { gte: 70 }, updatedAt: { lt: new Date(now.getTime() - 90 * 86400000) } } }),
    ]);

    const activeProjects = projects.find(p => p.status === 'ACTIVE')?._count || 0;
    const totalProjects   = projects.reduce((s, p) => s + p._count, 0);
    const openRisks       = riskGroups.filter(r => r.status !== 'CLOSED').reduce((s, r) => s + r._count, 0);

    // ── Compliance scores per domain (approximate from control implementation) ──
    const [
      soaScore, nis2Score, cisScore, soc2Score, iso27701Score,
      antiBriberyScore, workforceScore, qualityScore,
    ] = await Promise.all([
      Promise.all([
        this.prisma.soaControl.count({ where: { organizationId } }),
        this.prisma.soaControl.count({ where: { organizationId, status: 'IMPLEMENTED' as any } }),
      ]).then(([total, implemented]) => ({ total, implemented })).catch(() => ({ total: 0, implemented: 0 })),
      Promise.all([
        this.prisma.nis2Assessment.count({ where: { organizationId } }),
        this.prisma.nis2Assessment.count({ where: { organizationId, status: 'COMPLIANT' as any } }),
      ]).then(([total, implemented]) => ({ total, implemented })).catch(() => ({ total: 0, implemented: 0 })),
      (this.prisma as any).cisControl.aggregate({ where: { organizationId }, _count: { _all: true } }).then((r: any) => (this.prisma as any).cisControl.count({ where: { organizationId, status: 'IMPLEMENTED' } }).then((impl: number) => ({ total: r._count._all, implemented: impl }))).catch(() => ({ total: 0, implemented: 0 })),
      (this.prisma as any).soc2Criterion.aggregate({ where: { organizationId }, _count: { _all: true } }).then((r: any) => (this.prisma as any).soc2Criterion.count({ where: { organizationId, status: 'IMPLEMENTED' } }).then((impl: number) => ({ total: r._count._all, implemented: impl }))).catch(() => ({ total: 0, implemented: 0 })),
      (this.prisma as any).iso27701Control.aggregate({ where: { organizationId }, _count: { _all: true } }).then((r: any) => (this.prisma as any).iso27701Control.count({ where: { organizationId, status: 'IMPLEMENTED' } }).then((impl: number) => ({ total: r._count._all, implemented: impl }))).catch(() => ({ total: 0, implemented: 0 })),
      (this.prisma as any).antiBriberyControl.aggregate({ where: { organizationId }, _count: { _all: true } }).then((r: any) => (this.prisma as any).antiBriberyControl.count({ where: { organizationId, status: 'IMPLEMENTED' } }).then((impl: number) => ({ total: r._count._all, implemented: impl }))).catch(() => ({ total: 0, implemented: 0 })),
      (this.prisma as any).workforceCompliance.aggregate({ where: { organizationId }, _count: { _all: true } }).then((r: any) => (this.prisma as any).workforceCompliance.count({ where: { organizationId, status: 'IMPLEMENTED' } }).then((impl: number) => ({ total: r._count._all, implemented: impl }))).catch(() => ({ total: 0, implemented: 0 })),
      (this.prisma as any).qualityControl.aggregate({ where: { organizationId }, _count: { _all: true } }).then((r: any) => (this.prisma as any).qualityControl.count({ where: { organizationId, status: 'IMPLEMENTED' } }).then((impl: number) => ({ total: r._count._all, implemented: impl }))).catch(() => ({ total: 0, implemented: 0 })),
    ]);

    const pct = (v: { total: number; implemented: number }) =>
      v.total > 0 ? Math.round((v.implemented / v.total) * 100) : 0;

    const domainScores = [
      { domain: 'ISO 27001', score: pct(soaScore),        color: '#3B82F6' },
      { domain: 'NIS2',      score: pct(nis2Score),        color: '#8B5CF6' },
      { domain: 'CIS v8',    score: pct(cisScore),         color: '#06B6D4' },
      { domain: 'SOC 2',     score: pct(soc2Score),        color: '#10B981' },
      { domain: 'ISO 27701', score: pct(iso27701Score),    color: '#F59E0B' },
      { domain: 'Anti-Bribery', score: pct(antiBriberyScore), color: '#EF4444' },
      { domain: 'ISO 45001', score: pct(workforceScore),   color: '#EC4899' },
      { domain: 'ISO 9001',  score: pct(qualityScore),     color: '#14B8A6' },
    ].filter(d => d.score > 0 || d.domain === 'ISO 27001');

    // ── Smart alerts ─────────────────────────────────────────────
    const alerts: Array<{ type: string; severity: 'critical' | 'high' | 'medium'; message: string; count: number; href: string }> = [];

    if (overdueCapas > 0)            alerts.push({ type: 'capa',     severity: 'critical', message: `${overdueCapas} CAPA(s) em atraso`,                         count: overdueCapas,            href: '/capa' });
    if (highRisks > 0)               alerts.push({ type: 'risk',     severity: 'critical', message: `${highRisks} risco(s) crítico/alto sem plano de tratamento`, count: highRisks,               href: '/risks' });
    if (overdueTasks > 5)            alerts.push({ type: 'task',     severity: 'high',     message: `${overdueTasks} tarefa(s) em atraso`,                        count: overdueTasks,            href: '/tasks' });
    if (noTreatmentRisks > 0)        alerts.push({ type: 'risk',     severity: 'high',     message: `${noTreatmentRisks} risco(s) alto(s) sem plano de tratamento`, count: noTreatmentRisks,      href: '/risks' });
    if (expiringEvidence > 0)        alerts.push({ type: 'evidence', severity: 'high',     message: `${expiringEvidence} evidência(s) a expirar em 30 dias`,       count: expiringEvidence,        href: '/evidence' });
    if (overdueDsar > 0)             alerts.push({ type: 'gdpr',     severity: 'critical', message: `${overdueDsar} pedido(s) DSAR fora de prazo (30 dias)`,       count: overdueDsar,             href: '/gdpr' });
    if (reviewPolicies > 0)          alerts.push({ type: 'policy',   severity: 'medium',   message: `${reviewPolicies} política(s) a necessitar de revisão`,       count: reviewPolicies,          href: '/policies' });
    if (openFindings > 0)            alerts.push({ type: 'audit',    severity: 'medium',   message: `${openFindings} finding(s) de auditoria por resolver`,        count: openFindings,            href: '/audits' });
    if (pendingVendorAssessments > 0) alerts.push({ type: 'vendor',  severity: 'medium',   message: `${pendingVendorAssessments} fornecedor(es) de alto risco sem avaliação recente`, count: pendingVendorAssessments, href: '/vendors' });

    // ── Compliance maturity scores (0-5 per domain) ──────────────
    // 0=Not Started, 1=Initial, 2=Developing, 3=Defined, 4=Managed, 5=Optimising
    const toMaturity = (pctVal: number): number => {
      if (pctVal === 0)   return 0;
      if (pctVal < 20)    return 1;
      if (pctVal < 40)    return 2;
      if (pctVal < 60)    return 3;
      if (pctVal < 80)    return 4;
      return 5;
    };
    const maturityScores = domainScores.map(d => ({ ...d, maturity: toMaturity(d.score) }));

    return {
      projects: { active: activeProjects, total: totalProjects, byStatus: projects },
      tasks: { overdue: overdueTasks },
      risks: { open: openRisks, high: highRisks, noTreatment: noTreatmentRisks, byStatus: riskGroups },
      evidence: { pending: pendingEvidence, expiringSoon: expiringEvidence },
      capa: { open: openCapas, overdue: overdueCapas },
      policies: { total: totalPolicies, needsReview: reviewPolicies },
      gdpr: { openDsar, overdueDsar },
      audits: { active: activeAudits, openFindings },
      vendors: { highRiskNoAssessment: pendingVendorAssessments },
      domainScores,
      maturityScores,
      overallMaturity: maturityScores.length > 0
        ? Math.round(maturityScores.reduce((s, d) => s + d.maturity, 0) / maturityScores.length * 10) / 10
        : 0,
      alerts: alerts.sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2 };
        return order[a.severity] - order[b.severity];
      }),
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
