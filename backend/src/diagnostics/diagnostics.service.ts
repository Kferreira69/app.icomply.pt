import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SubmitAnswersDto } from './dto/submit-answers.dto';

@Injectable()
export class DiagnosticsService {
  constructor(private prisma: PrismaService) {}

  // ── Get all active diagnostic questions ─────────────────────
  async getQuestions(category?: string, frameworkCodes?: string[]) {
    // Build the framework filter: if codes are provided, only return questions
    // that are either unlinked to a framework OR linked to one of the selected codes.
    const frameworkFilter =
      frameworkCodes && frameworkCodes.length > 0
        ? {
            OR: [
              { frameworkId: null },
              { framework: { code: { in: frameworkCodes } } },
            ],
          }
        : {};

    return this.prisma.diagnosticQuestion.findMany({
      where: {
        isActive: true,
        ...(category && { category }),
        ...frameworkFilter,
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      include: { framework: { select: { name: true, code: true } } },
    });
  }

  // ── Start a new diagnostic run ───────────────────────────────
  async startRun(organizationId: string, sector?: string, country?: string) {
    // If there's already an IN_PROGRESS run, resume it instead of creating a duplicate
    const existingRun = await this.prisma.diagnosticRun.findFirst({
      where: { organizationId, status: 'IN_PROGRESS' },
      orderBy: { createdAt: 'desc' },
    });
    if (existingRun) return existingRun;

    return this.prisma.diagnosticRun.create({
      data: {
        organizationId,
        sector,
        country,
        status: 'IN_PROGRESS',
      },
    });
  }

  // ── Submit answers and (if complete) compute recommendations ─
  async submitAnswers(runId: string, organizationId: string, dto: SubmitAnswersDto) {
    const run = await this.prisma.diagnosticRun.findFirst({
      where: { id: runId, organizationId },
    });
    if (!run) throw new NotFoundException('Diagnostic run not found');

    // Upsert each answer
    for (const answer of dto.answers) {
      await this.prisma.diagnosticAnswer.upsert({
        where: { runId_questionId: { runId, questionId: answer.questionId } },
        create: { runId, questionId: answer.questionId, value: answer.value },
        update: { value: answer.value },
      });
    }

    // If finalising, compute recommendations
    if (dto.complete) {
      const recommendations = await this.computeRecommendations(runId, run.sector);

      return this.prisma.diagnosticRun.update({
        where: { id: runId },
        data: {
          status: 'COMPLETED',
          recommendations,
          completedAt: new Date(),
        },
        include: { answers: true },
      });
    }

    return this.prisma.diagnosticRun.findUnique({
      where: { id: runId },
      include: { answers: { include: { question: true } } },
    });
  }

  // ── Retrieve a run with answers ──────────────────────────────
  async getRunById(runId: string, organizationId: string) {
    const run = await this.prisma.diagnosticRun.findFirst({
      where: { id: runId, organizationId },
      include: {
        answers: { include: { question: true } },
      },
    });
    if (!run) throw new NotFoundException('Diagnostic run not found');

    if (Array.isArray(run.recommendations) && run.recommendations.length > 0) {
      const enriched = await this.attachSuggestedProjects(
        run.recommendations as any[],
        organizationId,
      );
      return { ...run, recommendations: enriched };
    }

    return run;
  }

  // ── Suggest the most relevant existing project per recommendation ─
  // Matches by exact frameworkId; if several projects share the framework,
  // the most recently created one wins. No match → suggestedProjectId: null,
  // leaving the choice to the user in the UI.
  private async attachSuggestedProjects(
    recommendations: any[],
    organizationId: string,
  ) {
    const frameworkIds = [
      ...new Set(recommendations.map((r) => r.frameworkId).filter(Boolean)),
    ];
    if (frameworkIds.length === 0) {
      return recommendations.map((r) => ({ ...r, suggestedProjectId: null }));
    }

    const projects = await this.prisma.project.findMany({
      where: { organizationId, frameworkId: { in: frameworkIds } },
      select: { id: true, frameworkId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const bestByFramework = new Map<string, string>();
    for (const p of projects) {
      if (!bestByFramework.has(p.frameworkId)) {
        bestByFramework.set(p.frameworkId, p.id); // first hit = most recent, due to orderBy
      }
    }

    return recommendations.map((r) => ({
      ...r,
      suggestedProjectId: r.frameworkId
        ? bestByFramework.get(r.frameworkId) ?? null
        : null,
    }));
  }

  async findAllRuns(organizationId: string) {
    return this.prisma.diagnosticRun.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { answers: true, projects: true } },
      },
    });
  }

  // ── Platform health snapshot ─────────────────────────────────
  async getPlatformHealth(organizationId: string) {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const [
      riskTotal, riskWithOwner, riskWithMitigation, riskReviewedRecently,
      policyTotal, policyApproved, policyReviewedRecently,
      evidenceTotal, evidenceWithExpiry, evidenceExpired,
      taskTotal, taskCompleted,
      auditInternal, auditExternal, auditOpen,
      trainingTotal,
    ] = await Promise.all([
      this.prisma.risk.count({ where: { organizationId } }),
      this.prisma.risk.count({ where: { organizationId, ownerId: { not: null } } }),
      this.prisma.risk.count({ where: { organizationId, mitigationPlan: { not: null } } }),
      this.prisma.risk.count({ where: { organizationId, updatedAt: { gte: ninetyDaysAgo } } }),
      this.prisma.policy.count({ where: { organizationId } }),
      this.prisma.policy.count({ where: { organizationId, status: 'APPROVED' } }),
      this.prisma.policy.count({ where: { organizationId, status: 'APPROVED', approvedAt: { gte: twelveMonthsAgo } } }),
      this.prisma.evidence.count({ where: { uploadedBy: { organizationId } } }),
      this.prisma.evidence.count({ where: { uploadedBy: { organizationId }, expiresAt: { not: null } } }),
      this.prisma.evidence.count({ where: { uploadedBy: { organizationId }, expiresAt: { lt: now } } }),
      this.prisma.task.count({ where: { project: { organizationId } } }),
      this.prisma.task.count({ where: { project: { organizationId }, status: 'DONE' } }),
      this.prisma.audit.count({ where: { organizationId, type: 'INTERNAL' } }),
      this.prisma.audit.count({ where: { organizationId, type: 'EXTERNAL' } }),
      this.prisma.audit.count({ where: { organizationId, status: { in: ['IN_PROGRESS', 'PLANNED'] } } }),
      this.prisma.hrTraining.count({ where: { organizationId } }),
    ]);

    const taskCompletionRate = taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : 0;
    const evidenceValidPercent = evidenceTotal > 0
      ? Math.round(((evidenceTotal - evidenceExpired) / evidenceTotal) * 100)
      : 0;

    return {
      risks: {
        total: riskTotal,
        withOwner: riskWithOwner,
        withMitigation: riskWithMitigation,
        reviewedRecently: riskReviewedRecently,
      },
      policies: {
        total: policyTotal,
        approved: policyApproved,
        reviewedRecently: policyReviewedRecently,
      },
      evidence: {
        total: evidenceTotal,
        withExpiry: evidenceWithExpiry,
        expired: evidenceExpired,
        validPercent: evidenceValidPercent,
      },
      tasks: {
        total: taskTotal,
        completed: taskCompleted,
        completionRate: taskCompletionRate,
      },
      audits: {
        internal: auditInternal,
        external: auditExternal,
        open: auditOpen,
      },
      training: {
        total: trainingTotal,
      },
    };
  }

  // ── Recommendation engine ────────────────────────────────────
  private async computeRecommendations(runId: string, sector?: string) {
    const answers = await this.prisma.diagnosticAnswer.findMany({
      where: { runId },
      include: { question: true },
    });

    const frameworks = await this.prisma.framework.findMany({
      where: { isActive: true },
    });

    // Scoring logic: each answer linked to a framework gets a score
    const scores: Record<string, number> = {};
    const reasons: Record<string, string[]> = {};

    for (const answer of answers) {
      const question = answer.question;
      const value = answer.value as any;

      // Category-based framework matching
      const matches = this.matchFrameworks(question.category, value, sector);
      for (const [frameworkCode, score, reason] of matches) {
        scores[frameworkCode] = (scores[frameworkCode] || 0) + score;
        reasons[frameworkCode] = [...(reasons[frameworkCode] || []), reason];
      }
    }

    // Build recommendations sorted by score
    return Object.entries(scores)
      .map(([code, score]) => {
        const fw = frameworks.find(f => f.code === code);
        return {
          frameworkId: fw?.id,
          frameworkCode: code,
          frameworkName: fw?.name,
          score: Math.min(100, Math.round(score)),
          priority: score > 70 ? 'HIGH' : score > 40 ? 'MEDIUM' : 'LOW',
          reasons: reasons[code]?.slice(0, 3) || [],
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  private matchFrameworks(
    category: string,
    value: any,
    sector?: string,
  ): Array<[string, number, string]> {
    const results: Array<[string, number, string]> = [];

    // GDPR / NIS2 triggers
    if (category === 'DATA_PROCESSING' && value === true) {
      results.push(['GDPR', 40, 'Processes personal data']);
      results.push(['NIS2', 20, 'Digital service provider']);
    }
    if (category === 'SECTOR' && ['HEALTH', 'FINANCE', 'ENERGY', 'TRANSPORT'].includes(value)) {
      results.push(['NIS2', 50, `Critical sector: ${value}`]);
    }

    // ISO 27001 triggers
    if (category === 'INFORMATION_SECURITY' && value === true) {
      results.push(['ISO_27001', 50, 'Information security management needed']);
    }
    if (category === 'CERTIFICATIONS' && Array.isArray(value) && value.includes('ISO_27001')) {
      results.push(['ISO_27001', 60, 'Certification interest expressed']);
    }

    // RGPC / Portuguese compliance
    if (category === 'JURISDICTION' && value === 'PT') {
      results.push(['RGPC', 40, 'Portuguese jurisdiction applies']);
    }

    // ISO 9001
    if (category === 'QUALITY_MANAGEMENT' && value === true) {
      results.push(['ISO_9001', 50, 'Quality management processes']);
    }

    // ISO 37001 (anti-bribery)
    if (category === 'ANTI_CORRUPTION' && value === true) {
      results.push(['ISO_37001', 50, 'Anti-bribery compliance needed']);
    }

    // DORA — seed questions use category 'DORA'
    if (category === 'DORA') {
      if (value === true) {
        results.push(['DORA_2022_2554', 50, 'Financial sector entity subject to DORA']);
      } else if (typeof value === 'string' && value !== 'Nunca realizámos') {
        results.push(['DORA_2022_2554', 30, 'Resilience testing gaps identified']);
      }
    }
    // Also trigger DORA from financial sector selection
    if (category === 'GENERAL' && typeof value === 'string' && value.toLowerCase().includes('financei')) {
      results.push(['DORA_2022_2554', 40, 'Financial sector — DORA applicability']);
    }

    // Pay Transparency — seed questions use category 'PAY_TRANSPARENCY'
    if (category === 'PAY_TRANSPARENCY') {
      if (value === true) {
        results.push(['EU_PAY_TRANSPARENCY_2023_970', 40, 'Organisation meets pay transparency reporting threshold']);
      } else if (value === false) {
        results.push(['EU_PAY_TRANSPARENCY_2023_970', 25, 'Pay transparency compliance gaps identified']);
      }
    }

    // Seed-question category passthrough: questions categorised directly as framework codes
    // e.g. category === 'GDPR' and value === true → recommend GDPR framework
    const categoryToFramework: Record<string, string> = {
      GDPR: 'GDPR_2016_679',
      ISO_27001: 'ISO_27001_2022',
      NIS2: 'NIS2_2022_2555',
      RGPC: 'RGPC_PT_2021',
      ISO_9001: 'ISO_9001_2015',
      DORA: 'DORA_2022_2554',
      PAY_TRANSPARENCY: 'EU_PAY_TRANSPARENCY_2023_970',
    };
    const mappedCode = categoryToFramework[category];
    if (mappedCode && value === true && results.length === 0) {
      results.push([mappedCode, 35, `Direct applicability confirmed for ${category}`]);
    }

    return results;
  }
}
