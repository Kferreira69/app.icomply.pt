import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateRiskDto } from './dto/create-risk.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';
import { RiskStatus } from '@prisma/client';

// Likelihood and impact map 1-5
const LIKELIHOOD_VALUES: Record<string, number> = {
  RARE: 1, UNLIKELY: 2, POSSIBLE: 3, LIKELY: 4, ALMOST_CERTAIN: 5,
};
const IMPACT_VALUES: Record<string, number> = {
  NEGLIGIBLE: 1, MINOR: 2, MODERATE: 3, MAJOR: 4, CATASTROPHIC: 5,
};

function getRiskLevel(score: number): string {
  if (score >= 20) return 'CRITICAL';
  if (score >= 12) return 'HIGH';
  if (score >= 6) return 'MEDIUM';
  return 'LOW';
}

@Injectable()
export class RisksService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRiskDto, organizationId: string, ownerId: string) {
    const inherentScore = LIKELIHOOD_VALUES[dto.likelihood] * IMPACT_VALUES[dto.impact];

    return this.prisma.risk.create({
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
  }

  async findAll(
    organizationId: string,
    projectId?: string,
    status?: RiskStatus,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {
      organizationId,
      ...(projectId && { projectId }),
      ...(status && { status }),
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

  async update(id: string, organizationId: string, dto: UpdateRiskDto) {
    await this.findOne(id, organizationId);

    const updateData: any = { ...dto };
    if (dto.likelihood || dto.impact) {
      const current = await this.prisma.risk.findUnique({ where: { id } });
      const l = dto.likelihood ? LIKELIHOOD_VALUES[dto.likelihood] : LIKELIHOOD_VALUES[current.likelihood];
      const i = dto.impact ? IMPACT_VALUES[dto.impact] : IMPACT_VALUES[current.impact];
      updateData.inherentScore = l * i;
    }

    return this.prisma.risk.update({
      where: { id },
      data: updateData,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
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
