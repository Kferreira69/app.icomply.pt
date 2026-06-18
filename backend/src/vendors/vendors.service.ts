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

  async findAll(
    organizationId: string,
    params: {
      status?: VendorStatus;
      riskLevel?: VendorRiskLevel;
      category?: string;
      dataProcessor?: string;   // 'true' → Art. 28 only
      unassessed?: string;      // 'true' → no riskScore yet
      page?: string;
      limit?: string;
    },
  ) {
    const take   = Math.min(Number(params.limit) || 50, 200);
    const skip   = (Math.max(Number(params.page) || 1, 1) - 1) * take;

    const where: any = {
      organizationId,
      ...(params.status       && { status: params.status }),
      ...(params.riskLevel    && { riskLevel: params.riskLevel }),
      ...(params.category     && { category: params.category }),
      ...(params.dataProcessor === 'true' && { dataProcessor: true }),
      ...(params.unassessed   === 'true'  && { riskScore: null }),
    };

    const [total, items] = await Promise.all([
      this.prisma.vendor.count({ where }),
      this.prisma.vendor.findMany({
        where,
        orderBy: [{ riskLevel: 'desc' }, { name: 'asc' }],
        include: {
          _count: { select: { assessments: true } },
          assessments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        take,
        skip,
      }),
    ]);

    return { items, total, page: Math.max(Number(params.page) || 1, 1), limit: take };
  }

  // ── CSV Export ────────────────────────────────────────────────

  async exportCsv(organizationId: string): Promise<string> {
    const vendors = await this.prisma.vendor.findMany({
      where: { organizationId },
      orderBy: [{ riskLevel: 'desc' }, { name: 'asc' }],
      include: { assessments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    const headers = [
      'Name', 'Category', 'Status', 'Risk Level', 'Risk Score',
      'Data Processor (Art.28)', 'Data Shared', 'Countries',
      'Contact Name', 'Contact Email', 'Website',
      'Contract Start', 'Contract End', 'Last Assessed', 'Assessments',
    ];

    const rows = vendors.map(v => [
      v.name,
      v.category,
      v.status,
      v.riskLevel ?? '',
      v.riskScore != null ? String(v.riskScore) : '',
      v.dataProcessor ? 'Yes' : 'No',
      v.dataShared ?? '',
      v.countries ?? '',
      v.contactName ?? '',
      v.contactEmail ?? '',
      v.website ?? '',
      v.contractStart ? v.contractStart.toISOString().slice(0, 10) : '',
      v.contractEnd   ? v.contractEnd.toISOString().slice(0, 10)   : '',
      v.lastAssessedAt ? v.lastAssessedAt.toISOString().slice(0, 10) : '',
      String((v as any)._count?.assessments ?? 0),
    ]);

    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const lines  = [headers, ...rows].map(r => r.map(escape).join(','));
    return '﻿' + lines.join('\r\n');
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

  // ── Assessment CRUD (tab) ─────────────────────────────────────

  async listAllAssessments(organizationId: string) {
    return this.prisma.vendorAssessment.findMany({
      where: { vendor: { organizationId } },
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: { select: { id: true, name: true } },
        assessedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async createAssessment(organizationId: string, assessedById: string, data: {
    vendorId: string; score: number; riskLevel?: VendorRiskLevel; findings?: string;
  }) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id: data.vendorId, organizationId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const riskLevel = data.riskLevel ?? (
      data.score >= 80 ? VendorRiskLevel.LOW
      : data.score >= 60 ? VendorRiskLevel.MEDIUM
      : data.score >= 40 ? VendorRiskLevel.HIGH
      : VendorRiskLevel.CRITICAL
    );

    const [assessment] = await Promise.all([
      this.prisma.vendorAssessment.create({
        data: { vendorId: data.vendorId, assessedById, score: data.score, riskLevel, findings: data.findings },
        include: {
          vendor: { select: { id: true, name: true } },
          assessedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.vendor.update({
        where: { id: data.vendorId },
        data: { riskScore: data.score, riskLevel, lastAssessedAt: new Date() },
      }),
    ]);

    return assessment;
  }

  async updateAssessment(id: string, organizationId: string, data: {
    score?: number; riskLevel?: VendorRiskLevel; findings?: string;
  }) {
    const existing = await this.prisma.vendorAssessment.findFirst({
      where: { id, vendor: { organizationId } },
    });
    if (!existing) throw new NotFoundException('Assessment not found');

    const score = data.score ?? existing.score;
    const riskLevel = data.riskLevel ?? (
      score >= 80 ? VendorRiskLevel.LOW
      : score >= 60 ? VendorRiskLevel.MEDIUM
      : score >= 40 ? VendorRiskLevel.HIGH
      : VendorRiskLevel.CRITICAL
    );

    return this.prisma.vendorAssessment.update({
      where: { id },
      data: { score, riskLevel, findings: data.findings },
      include: {
        vendor: { select: { id: true, name: true } },
        assessedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }
}
