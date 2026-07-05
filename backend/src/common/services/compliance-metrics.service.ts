import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RiskCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

/**
 * ComplianceMetricsService — single source of truth for all compliance KPIs.
 *
 * Score calculation:
 *   - Controls-based: IMPLEMENTED=1.0, PARTIALLY_IMPLEMENTED=0.5, others=0.0
 *   - Falls back to task DONE ratio if no controls exist for the org.
 *
 * Risk levels (inherentScore thresholds):
 *   CRITICAL >= 20 | HIGH >= 12 | MEDIUM >= 6 | LOW < 6
 */
@Injectable()
export class ComplianceMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Compliance Score (0-100) ────────────────────────────────────

  async getComplianceScore(organizationId: string): Promise<number> {
    // Primary: UnifiedControl (cross-framework, org-scoped)
    // status string values: NOT_STARTED | PLANNED | IN_PROGRESS | IMPLEMENTED | VERIFIED | NOT_APPLICABLE
    const unifiedControls = await (this.prisma as any).unifiedControl.findMany({
      where: { organizationId, applicable: true },
      select: { status: true },
    });

    if (unifiedControls.length > 0) {
      const weightedSum = (unifiedControls as Array<{ status: string }>).reduce((sum, c) => {
        if (c.status === 'IMPLEMENTED' || c.status === 'VERIFIED') return sum + 1.0;
        if (c.status === 'PARTIALLY_IMPLEMENTED' || c.status === 'IN_PROGRESS') return sum + 0.5;
        return sum; // NOT_STARTED | PLANNED → 0
      }, 0);
      return Math.round((weightedSum / unifiedControls.length) * 100);
    }

    // Secondary: SoaControl (SOA-module org-scoped controls)
    const soaControls = await (this.prisma as any).soaControl.findMany({
      where: { organizationId, applicable: true },
      select: { status: true },
    });

    if (soaControls.length > 0) {
      const weightedSum = (soaControls as Array<{ status: string }>).reduce((sum, c) => {
        if (c.status === 'IMPLEMENTED') return sum + 1.0;
        if (c.status === 'PARTIALLY_IMPLEMENTED') return sum + 0.5;
        return sum;
      }, 0);
      return Math.round((weightedSum / soaControls.length) * 100);
    }

    // Fallback: task DONE ratio across all org projects
    const [total, done] = await Promise.all([
      this.prisma.task.count({ where: { project: { organizationId } } }),
      this.prisma.task.count({ where: { project: { organizationId }, status: 'DONE' } }),
    ]);
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }

  // ── Risk Counts by Level ────────────────────────────────────────

  async getRiskCounts(organizationId: string): Promise<RiskCounts> {
    const risks = await this.prisma.risk.findMany({
      where: {
        organizationId,
        status: { notIn: ['CLOSED', 'ACCEPTED'] },
      },
      select: { inherentScore: true },
    });

    const counts = risks.reduce(
      (acc, r) => {
        if (r.inherentScore >= 20)      { acc.critical++; acc.total++; }
        else if (r.inherentScore >= 12) { acc.high++;     acc.total++; }
        else if (r.inherentScore >= 6)  { acc.medium++;   acc.total++; }
        else                            { acc.low++;      acc.total++; }
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
    );

    return counts;
  }

  // ── Open Tasks ──────────────────────────────────────────────────

  async getOpenTasksCount(organizationId: string): Promise<number> {
    return this.prisma.task.count({
      where: {
        project: { organizationId },
        status: { notIn: ['DONE', 'CANCELLED'] },
      },
    });
  }

  // ── Evidence Coverage (% approved out of all) ──────────────────

  async getEvidenceCoverage(organizationId: string): Promise<number> {
    const [total, approved] = await Promise.all([
      this.prisma.evidence.count({
        where: { uploadedBy: { organizationId } },
      }),
      this.prisma.evidence.count({
        where: { uploadedBy: { organizationId }, status: 'APPROVED' },
      }),
    ]);
    return total > 0 ? Math.round((approved / total) * 100) : 0;
  }

  // ── Combined KPI snapshot ───────────────────────────────────────

  async getKpiSnapshot(organizationId: string): Promise<{
    complianceScore: number;
    riskCounts: RiskCounts;
    openTasks: number;
    evidenceCoverage: number;
  }> {
    const [complianceScore, riskCounts, openTasks, evidenceCoverage] = await Promise.all([
      this.getComplianceScore(organizationId),
      this.getRiskCounts(organizationId),
      this.getOpenTasksCount(organizationId),
      this.getEvidenceCoverage(organizationId),
    ]);
    return { complianceScore, riskCounts, openTasks, evidenceCoverage };
  }
}
