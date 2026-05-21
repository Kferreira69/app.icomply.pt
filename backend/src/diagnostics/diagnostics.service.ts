import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SubmitAnswersDto } from './dto/submit-answers.dto';

@Injectable()
export class DiagnosticsService {
  constructor(private prisma: PrismaService) {}

  // ── Get all active diagnostic questions ─────────────────────
  async getQuestions(category?: string) {
    return this.prisma.diagnosticQuestion.findMany({
      where: {
        isActive: true,
        ...(category && { category }),
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      include: { framework: { select: { name: true, code: true } } },
    });
  }

  // ── Start a new diagnostic run ───────────────────────────────
  async startRun(organizationId: string, sector?: string, country?: string) {
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
    return run;
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
