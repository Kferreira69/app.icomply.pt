import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { VendorStatus, VendorRiskLevel } from '@prisma/client';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  // ── Dashboard ─────────────────────────────────────────────────

  async getDashboard(organizationId: string) {
    const [byStatus, byRisk, byCategory, total, expiring, dataProcessors] = await Promise.all([
      this.prisma.vendor.groupBy({ by: ['status'], where: { organizationId }, _count: true }),
      this.prisma.vendor.groupBy({ by: ['riskLevel'], where: { organizationId }, _count: true }),
      this.prisma.vendor.groupBy({ by: ['category'], where: { organizationId }, _count: true }),
      this.prisma.vendor.count({ where: { organizationId } }),
      this.prisma.vendor.count({
        where: {
          organizationId,
          status: VendorStatus.ACTIVE,
          contractEnd: { lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) }, // 60 days
        },
      }),
      this.prisma.vendor.count({ where: { organizationId, dataProcessor: true } }),
    ]);

    return {
      total,
      active: byStatus.find(s => s.status === 'ACTIVE')?._count ?? 0,
      highRisk: (byRisk.find(r => r.riskLevel === 'HIGH')?._count ?? 0) +
                (byRisk.find(r => r.riskLevel === 'CRITICAL')?._count ?? 0),
      expiring,
      dataProcessors,
      byStatus: byStatus.reduce((a, s) => ({ ...a, [s.status]: s._count }), {}),
      byRisk: byRisk.reduce((a, r) => ({ ...a, [r.riskLevel]: r._count }), {}),
      byCategory: byCategory.reduce((a, c) => ({ ...a, [c.category]: c._count }), {}),
    };
  }

  // ── CRUD ──────────────────────────────────────────────────────

  async create(organizationId: string, data: any) {
    return this.prisma.vendor.create({
      data: { ...data, organizationId },
      include: { _count: { select: { assessments: true } } },
    });
  }

  async findAll(organizationId: string, params: { status?: VendorStatus; riskLevel?: VendorRiskLevel; category?: string }) {
    return this.prisma.vendor.findMany({
      where: {
        organizationId,
        ...(params.status && { status: params.status }),
        ...(params.riskLevel && { riskLevel: params.riskLevel }),
        ...(params.category && { category: params.category }),
      },
      orderBy: [{ riskLevel: 'desc' }, { name: 'asc' }],
      include: {
        _count: { select: { assessments: true } },
        assessments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, organizationId },
      include: {
        assessments: {
          orderBy: { createdAt: 'desc' },
          include: { assessedBy: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  async update(id: string, organizationId: string, data: any) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id, organizationId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return this.prisma.vendor.update({
      where: { id },
      data,
      include: { _count: { select: { assessments: true } } },
    });
  }

  async remove(id: string, organizationId: string) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id, organizationId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return this.prisma.vendor.delete({ where: { id } });
  }

  // ── Assessments ───────────────────────────────────────────────

  async addAssessment(vendorId: string, organizationId: string, assessedById: string, data: { score: number; findings?: string }) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id: vendorId, organizationId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const riskLevel = data.score >= 80 ? VendorRiskLevel.LOW
      : data.score >= 60 ? VendorRiskLevel.MEDIUM
      : data.score >= 40 ? VendorRiskLevel.HIGH
      : VendorRiskLevel.CRITICAL;

    const [assessment] = await Promise.all([
      this.prisma.vendorAssessment.create({
        data: { vendorId, assessedById, score: data.score, riskLevel, findings: data.findings },
        include: { assessedBy: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.vendor.update({
        where: { id: vendorId },
        data: { riskScore: data.score, riskLevel, lastAssessedAt: new Date() },
      }),
    ]);

    return assessment;
  }
}
