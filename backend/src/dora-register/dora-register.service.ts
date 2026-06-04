import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

// DORA Article 28 — Register of Information fields required by ESA
@Injectable()
export class DoraRegisterService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(organizationId: string) {
    const entries = await (this.prisma as any).doraRegisterEntry.findMany({
      where: { organizationId },
    });
    const critical    = entries.filter((e: any) => e.isCritical).length;
    const active      = entries.filter((e: any) => e.status === 'ACTIVE').length;
    const expiring    = entries.filter((e: any) => {
      if (!e.contractEnd) return false;
      const in90 = new Date(Date.now() + 90 * 86400000);
      return new Date(e.contractEnd) <= in90 && new Date(e.contractEnd) >= new Date();
    }).length;
    const byCountry = entries.reduce((acc: any, e: any) => {
      acc[e.providerCountry] = (acc[e.providerCountry] || 0) + 1;
      return acc;
    }, {});
    return { total: entries.length, critical, active, expiring, byCountry, entries };
  }

  async list(organizationId: string, params?: any) {
    const where: any = { organizationId };
    if (params?.isCritical !== undefined) where.isCritical = params.isCritical === 'true';
    if (params?.status) where.status = params.status;
    return (this.prisma as any).doraRegisterEntry.findMany({
      where,
      orderBy: [{ isCritical: 'desc' }, { providerName: 'asc' }],
    });
  }

  async create(organizationId: string, dto: any) {
    return (this.prisma as any).doraRegisterEntry.create({
      data: { ...dto, organizationId },
    });
  }

  async update(id: string, organizationId: string, dto: any) {
    const entry = await (this.prisma as any).doraRegisterEntry.findFirst({ where: { id, organizationId } });
    if (!entry) throw new NotFoundException('Register entry not found');
    return (this.prisma as any).doraRegisterEntry.update({ where: { id }, data: dto });
  }

  async remove(id: string, organizationId: string) {
    const entry = await (this.prisma as any).doraRegisterEntry.findFirst({ where: { id, organizationId } });
    if (!entry) throw new NotFoundException('Register entry not found');
    return (this.prisma as any).doraRegisterEntry.delete({ where: { id } });
  }

  /** Export as ESA-compatible CSV (xBRL-CSV format for DORA Article 28 reporting) */
  async exportCsv(organizationId: string): Promise<string> {
    const entries = await this.list(organizationId);
    const headers = [
      'Provider Name', 'LEI Code', 'Country', 'Service Type', 'Service Description',
      'Contract Ref', 'Contract Start', 'Contract End', 'Critical Function',
      'Substitutability', 'Concentration Risk', 'Data Types', 'Data Locations',
      'Sub-Contractors', 'Exit Strategy', 'Status', 'Last Assessed',
    ];
    const esc = (s: any) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const rows = entries.map((e: any) => [
      e.providerName, e.providerLei || '', e.providerCountry, e.serviceType,
      e.serviceDescription || '', e.contractRef || '',
      e.contractStart ? new Date(e.contractStart).toISOString().split('T')[0] : '',
      e.contractEnd ? new Date(e.contractEnd).toISOString().split('T')[0] : '',
      e.isCritical ? 'YES' : 'NO', e.substitutability || '',
      e.concentrationRisk ? 'YES' : 'NO',
      (e.dataTypes || []).join('; '), (e.dataLocations || []).join('; '),
      JSON.stringify(e.subContractors || []), e.exitStrategy || '', e.status,
      e.lastAssessedAt ? new Date(e.lastAssessedAt).toISOString().split('T')[0] : '',
    ].map(esc).join(','));
    return '﻿' + [headers.map(esc).join(','), ...rows].join('\r\n');
  }
}
