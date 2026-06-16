import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRiskDto } from './dto/create-risk.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';
import { RiskStatus, NotificationType } from '@prisma/client';

// Likelihood and impact map 1-5
// Includes aliases for extended enum values that may appear in DTOs or imports
const LIKELIHOOD_VALUES: Record<string, number> = {
  RARE: 1, UNLIKELY: 2, POSSIBLE: 3, LIKELY: 4, ALMOST_CERTAIN: 5,
  VERY_LIKELY: 5, // alias
};
const IMPACT_VALUES: Record<string, number> = {
  NEGLIGIBLE: 1, MINOR: 2, MODERATE: 3, MAJOR: 4, CATASTROPHIC: 5,
  SIGNIFICANT: 4, // alias for MAJOR
  CRITICAL: 5,    // alias for CATASTROPHIC
};

function calcRiskLevel(likelihood: string, impact: string): string {
  const score = (LIKELIHOOD_VALUES[likelihood] ?? 1) * (IMPACT_VALUES[impact] ?? 1);
  if (score >= 20) return 'CRITICAL';
  if (score >= 12) return 'HIGH';
  if (score >= 6) return 'MEDIUM';
  if (score >= 3) return 'LOW';
  return 'NEGLIGIBLE';
}

function getRiskLevel(score: number): string {
  if (score >= 20) return 'CRITICAL';
  if (score >= 12) return 'HIGH';
  if (score >= 6) return 'MEDIUM';
  if (score >= 3) return 'LOW';
  return 'NEGLIGIBLE';
}

@Injectable()
export class RisksService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(dto: CreateRiskDto, organizationId: string, ownerId: string) {
    const inherentScore =
      (LIKELIHOOD_VALUES[dto.likelihood] ?? 1) * (IMPACT_VALUES[dto.impact] ?? 1);
    const riskLevel = calcRiskLevel(dto.likelihood, dto.impact);

    const risk = await this.prisma.risk.create({
      data: {
        ...dto,
        organizationId,
        ownerId,
        inherentScore,
      },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Alert owner when risk is HIGH or CRITICAL
    if (inherentScore >= 12) {
      const level = inherentScore >= 20 ? 'CRÍTICO' : 'ALTO';
      await this.notifications.create({
        organizationId,
        userId: ownerId,
        type: NotificationType.RISK_HIGH,
        title: `Risco ${level} registado`,
        message: `O risco "${risk.title}" foi classificado como ${level} (score ${inherentScore}). Defina um plano de mitigação.`,
        entityType: 'Risk',
        entityId: risk.id,
        sendEmail: inherentScore >= 20,
      });
    }

    return { ...risk, riskLevel };
  }

  async findAll(
    organizationId: string,
    projectId?: string,
    status?: RiskStatus,
    page = 1,
    limit = 50,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {
      organizationId,
      ...(projectId && { projectId }),
      ...(status && { status }),
      ...(search && {
        title: { contains: search, mode: 'insensitive' },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.risk.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ inherentScore: 'desc' }, { createdAt: 'desc' }],
        include: {
          owner: { select: { id: true, firstName: true, lastName: true } },
          project: { select: { id: true, name: true } },
          _count: { select: { evidences: true } },
        },
      }),
      this.prisma.risk.count({ where }),
    ]);

    // Enrich with risk level
    const enriched = data.map(r => ({
      ...r,
      riskLevel: getRiskLevel(r.inherentScore),
      residualLevel: r.residualScore ? getRiskLevel(r.residualScore) : null,
    }));

    return { data: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, organizationId: string) {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
        evidences: { select: { id: true, title: true, status: true } },
      },
    });
    if (!risk) throw new NotFoundException('Risk not found');
    return { ...risk, riskLevel: getRiskLevel(risk.inherentScore) };
  }

  async update(id: string, organizationId: string, dto: UpdateRiskDto, userId?: string) {
    const existing = await this.findOne(id, organizationId);

    // Take snapshot before updating (for history chart)
    await (this.prisma as any).riskSnapshot.create({
      data: {
        riskId:         id,
        inherentScore:  existing.inherentScore,
        residualScore:  existing.residualScore,
        status:         existing.status,
        likelihood:     existing.likelihood,
        impact:         existing.impact,
        capturedById:   userId,
      },
    }).catch(() => {}); // non-blocking

    const updateData: any = { ...dto };
    const effectiveLikelihood = dto.likelihood ?? existing.likelihood;
    const effectiveImpact = dto.impact ?? existing.impact;

    if (dto.likelihood || dto.impact) {
      const l = LIKELIHOOD_VALUES[effectiveLikelihood] ?? 1;
      const i = IMPACT_VALUES[effectiveImpact] ?? 1;
      updateData.inherentScore = l * i;
    }

    const updatedRisk = await this.prisma.risk.update({
      where: { id },
      data: updateData,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return {
      ...updatedRisk,
      riskLevel: calcRiskLevel(effectiveLikelihood, effectiveImpact),
    };
  }

  async getHistory(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return (this.prisma as any).riskSnapshot.findMany({
      where: { riskId: id },
      orderBy: { capturedAt: 'asc' },
      select: { inherentScore: true, residualScore: true, status: true, capturedAt: true },
    });
  }

  async updateTreatmentPlan(id: string, organizationId: string, dto: any) {
    await this.findOne(id, organizationId);
    return this.prisma.risk.update({
      where: { id },
      data: {
        treatmentType:   dto.treatmentType,
        treatmentPlan:   dto.treatmentPlan,
        treatmentStatus: dto.treatmentStatus,
        treatmentOwnerId: dto.treatmentOwnerId,
        treatmentDueDate: dto.treatmentDueDate ? new Date(dto.treatmentDueDate) : undefined,
        treatmentCompletedAt: dto.treatmentStatus === 'COMPLETED' ? new Date() : undefined,
        residualScore:   dto.residualScore ? Number(dto.residualScore) : undefined,
        riskAppetite:    dto.riskAppetite,
      },
      include: { owner: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async acceptRisk(id: string, organizationId: string, userId: string, dto: any) {
    await this.findOne(id, organizationId);
    return this.prisma.risk.update({
      where: { id },
      data: {
        treatmentType:        'ACCEPT',
        acceptedAt:           new Date(),
        acceptedById:         userId,
        acceptanceRationale:  dto.rationale,
        treatmentStatus:      'COMPLETED',
        status:               'ACCEPTED' as any,
      },
    });
  }

  async getHeatmapData(organizationId: string) {
    const risks = await this.prisma.risk.findMany({
      where: { organizationId, status: { not: 'CLOSED' } },
      select: {
        id: true, title: true, likelihood: true, impact: true,
        inherentScore: true, residualScore: true, status: true, category: true,
      },
    });

    // Build 5x5 heatmap matrix
    const matrix: Record<string, Record<string, number>> = {};
    for (let l = 1; l <= 5; l++) {
      matrix[l] = {};
      for (let i = 1; i <= 5; i++) matrix[l][i] = 0;
    }

    risks.forEach(r => {
      const l = LIKELIHOOD_VALUES[r.likelihood];
      const i = IMPACT_VALUES[r.impact];
      matrix[l][i]++;
    });

    return {
      risks: risks.map(r => ({
        ...r,
        riskLevel: getRiskLevel(r.inherentScore),
        x: IMPACT_VALUES[r.impact],
        y: LIKELIHOOD_VALUES[r.likelihood],
      })),
      matrix,
      summary: {
        critical: risks.filter(r => r.inherentScore >= 20).length,
        high: risks.filter(r => r.inherentScore >= 12 && r.inherentScore < 20).length,
        medium: risks.filter(r => r.inherentScore >= 6 && r.inherentScore < 12).length,
        low: risks.filter(r => r.inherentScore < 6).length,
      },
    };
  }
}
