import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ComplianceMetricsService } from '../common/services/compliance-metrics.service';

@Injectable()
export class BoardReportsService {
  constructor(
    private prisma: PrismaService,
    private complianceMetrics: ComplianceMetricsService,
  ) {}

  async list(organizationId: string) {
    return (this.prisma as any).boardReport.findMany({
      where: { organizationId },
      include: { signoffs: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(organizationId: string, userId: string, dto: any) {
    return (this.prisma as any).boardReport.create({
      data: { ...dto, organizationId, createdById: userId, status: 'DRAFT' },
    });
  }

  async get(id: string, organizationId: string) {
    const r = await (this.prisma as any).boardReport.findFirst({
      where: { id, organizationId },
      include: { signoffs: true },
    });
    if (!r) throw new NotFoundException();
    return r;
  }

  async update(id: string, organizationId: string, dto: any) {
    const r = await (this.prisma as any).boardReport.findFirst({ where: { id, organizationId } });
    if (!r) throw new NotFoundException();
    return (this.prisma as any).boardReport.update({ where: { id }, data: dto });
  }

  async requestSignoff(id: string, organizationId: string, signers: Array<{ name: string; email: string; role?: string }>) {
    const r = await (this.prisma as any).boardReport.findFirst({ where: { id, organizationId } });
    if (!r) throw new NotFoundException();
    // Create signoff records
    const signoffs = await Promise.all(signers.map(s =>
      (this.prisma as any).boardReportSignoff.create({ data: { reportId: id, ...s } })
    ));
    await (this.prisma as any).boardReport.update({ where: { id }, data: { status: 'PENDING_APPROVAL' } });
    return { signoffs };
  }

  async sign(id: string, name: string, email: string) {
    const signoff = await (this.prisma as any).boardReportSignoff.findFirst({ where: { reportId: id, email } });
    if (!signoff) throw new NotFoundException('Signoff not found');
    const updated = await (this.prisma as any).boardReportSignoff.update({
      where: { id: signoff.id },
      data: { signedAt: new Date() },
    });
    // Check if all signed
    const all = await (this.prisma as any).boardReportSignoff.findMany({ where: { reportId: id } });
    const allSigned = all.every((s: any) => s.signedAt);
    if (allSigned) await (this.prisma as any).boardReport.update({ where: { id }, data: { status: 'APPROVED', approvedAt: new Date() } });
    return updated;
  }

  async generatePackData(id: string, organizationId: string) {
    const report = await this.get(id, organizationId);
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, industry: true },
    });

    // Use ComplianceMetricsService to get consistent, accurate risk counts and score
    const [riskCounts, complianceScore, openCapas, evidenceExpiring, completedAudits] = await Promise.all([
      this.complianceMetrics.getRiskCounts(organizationId),
      this.complianceMetrics.getComplianceScore(organizationId),
      this.prisma.capa.count({ where: { createdBy: { organizationId }, status: { notIn: ['CLOSED'] } } }),
      this.prisma.evidence.count({
        where: {
          uploadedBy: { organizationId },
          expiresAt: { lte: new Date(Date.now() + 30 * 86400000) },
          status: { notIn: ['EXPIRED'] },
        },
      }),
      this.prisma.audit.count({ where: { project: { organizationId }, status: 'COMPLETED' } }),
    ]);

    // Fetch the actual high/critical risks for board narrative
    const highCriticalRisks = await this.prisma.risk.findMany({
      where: {
        organizationId,
        inherentScore: { gte: 12 },
        status: { notIn: ['CLOSED', 'ACCEPTED'] },
      },
      select: { id: true, title: true, inherentScore: true, status: true, category: true },
      orderBy: { inherentScore: 'desc' },
      take: 20,
    });

    const enrichedRisks = highCriticalRisks.map(r => ({
      ...r,
      level: r.inherentScore >= 20 ? 'CRITICAL' : 'HIGH',
    }));

    const hasHighRisks = riskCounts.high > 0 || riskCounts.critical > 0;
    const riskNarrative = hasHighRisks
      ? `${riskCounts.critical > 0 ? `${riskCounts.critical} risco(s) CRÍTICO(S)` : ''}${riskCounts.critical > 0 && riskCounts.high > 0 ? ' e ' : ''}${riskCounts.high > 0 ? `${riskCounts.high} risco(s) ALTO(S)` : ''} requerem atenção imediata.`
      : 'Nenhum risco crítico ou alto activo.';

    return {
      report,
      org,
      stats: {
        complianceScore,
        riskCounts,
        highCriticalRisks: enrichedRisks,
        riskNarrative,
        openCapas,
        evidenceExpiring,
        completedAudits,
      },
    };
  }
}
