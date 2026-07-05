import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

// ISO 37001:2016 + ISO 37301:2021 key controls
const ANTI_BRIBERY_CONTROLS = [
  // ISO 37001 – Anti-Bribery Management System
  { controlCode: 'ISO37001-4.1', standard: 'ISO_37001', clauseNumber: '4.1', title: 'Understanding the organization and its context', description: 'Determine external and internal issues relevant to bribery risk' },
  { controlCode: 'ISO37001-4.5', standard: 'ISO_37001', clauseNumber: '4.5', title: 'Bribery risk assessment', description: 'Assess bribery risks associated with the organization\'s activities' },
  { controlCode: 'ISO37001-5.1', standard: 'ISO_37001', clauseNumber: '5.1', title: 'Leadership and commitment', description: 'Top management demonstrates leadership and commitment to the ABMS' },
  { controlCode: 'ISO37001-5.2', standard: 'ISO_37001', clauseNumber: '5.2', title: 'Anti-bribery policy', description: 'Establish, maintain and communicate an anti-bribery policy' },
  { controlCode: 'ISO37001-5.3', standard: 'ISO_37001', clauseNumber: '5.3', title: 'Compliance function', description: 'Appoint a compliance function with appropriate authority and independence' },
  { controlCode: 'ISO37001-6.1', standard: 'ISO_37001', clauseNumber: '6.1', title: 'Actions to address risks and opportunities', description: 'Plan actions to address bribery risks and opportunities' },
  { controlCode: 'ISO37001-7.2', standard: 'ISO_37001', clauseNumber: '7.2', title: 'Competence and training', description: 'Ensure personnel are competent and trained on anti-bribery' },
  { controlCode: 'ISO37001-7.3', standard: 'ISO_37001', clauseNumber: '7.3', title: 'Awareness', description: 'Personnel are aware of the ABMS, policy and their obligations' },
  { controlCode: 'ISO37001-8.2', standard: 'ISO_37001', clauseNumber: '8.2', title: 'Due diligence', description: 'Conduct due diligence on business associates and transactions' },
  { controlCode: 'ISO37001-8.4', standard: 'ISO_37001', clauseNumber: '8.4', title: 'Financial controls', description: 'Implement financial controls to counter bribery risk' },
  { controlCode: 'ISO37001-8.5', standard: 'ISO_37001', clauseNumber: '8.5', title: 'Non-financial controls', description: 'Implement non-financial controls such as gifts, hospitality policies' },
  { controlCode: 'ISO37001-8.6', standard: 'ISO_37001', clauseNumber: '8.6', title: 'Implementing anti-bribery controls by controlled organizations', description: 'Ensure controlled orgs and business associates implement ABMS controls' },
  { controlCode: 'ISO37001-8.7', standard: 'ISO_37001', clauseNumber: '8.7', title: 'Raising concerns', description: 'Establish a confidential reporting mechanism for concerns' },
  { controlCode: 'ISO37001-8.8', standard: 'ISO_37001', clauseNumber: '8.8', title: 'Investigating and dealing with bribery', description: 'Establish processes for investigating suspected bribery' },
  { controlCode: 'ISO37001-9.1', standard: 'ISO_37001', clauseNumber: '9.1', title: 'Monitoring, measurement, analysis and evaluation', description: 'Monitor and evaluate the effectiveness of the ABMS' },
  { controlCode: 'ISO37001-9.2', standard: 'ISO_37001', clauseNumber: '9.2', title: 'Internal audit', description: 'Conduct internal audits at planned intervals' },
  { controlCode: 'ISO37001-10.1', standard: 'ISO_37001', clauseNumber: '10.1', title: 'Continual improvement', description: 'Continually improve the suitability, adequacy and effectiveness of the ABMS' },
  // ISO 37301 – Compliance Management System
  { controlCode: 'ISO37301-4.1', standard: 'ISO_37301', clauseNumber: '4.1', title: 'Understanding the organization and its context (CMS)', description: 'Determine issues affecting compliance obligations' },
  { controlCode: 'ISO37301-4.6', standard: 'ISO_37301', clauseNumber: '4.6', title: 'Compliance obligations', description: 'Identify, assess and maintain compliance obligations register' },
  { controlCode: 'ISO37301-5.1', standard: 'ISO_37301', clauseNumber: '5.1', title: 'Governance and leadership (CMS)', description: 'Governing body and management demonstrate commitment to compliance' },
  { controlCode: 'ISO37301-6.1', standard: 'ISO_37301', clauseNumber: '6.1', title: 'Compliance risk assessment', description: 'Assess risks of failing to meet compliance obligations' },
  { controlCode: 'ISO37301-8.1', standard: 'ISO_37301', clauseNumber: '8.1', title: 'Operational planning and control', description: 'Plan, implement and control compliance processes' },
  { controlCode: 'ISO37301-8.3', standard: 'ISO_37301', clauseNumber: '8.3', title: 'Compliance review', description: 'Regular review of compliance with obligations' },
  { controlCode: 'ISO37301-9.1', standard: 'ISO_37301', clauseNumber: '9.1', title: 'Monitoring, measurement, analysis (CMS)', description: 'Evaluate compliance performance and effectiveness of CMS' },
];

@Injectable()
export class AntiBriberyService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(organizationId: string) {
    const controls = await (this.prisma as any).antiBriberyControl.findMany({
      where: { organizationId },
      orderBy: [{ standard: 'asc' }, { clauseNumber: 'asc' }],
    });

    if (controls.length === 0) {
      await this.seedControls(organizationId);
      return this.getDashboard(organizationId);
    }

    const total = controls.length;
    const implemented = controls.filter((c: any) => c.status === 'IMPLEMENTED').length;
    const partial = controls.filter((c: any) => c.status === 'PARTIAL').length;
    const notApplicable = controls.filter((c: any) => c.status === 'NOT_APPLICABLE').length;
    const notImplemented = total - implemented - partial - notApplicable;

    const applicable = controls.filter((c: any) => c.status !== 'NOT_APPLICABLE');
    const overallScore = applicable.length > 0
      ? Math.round(((implemented + partial * 0.5) / applicable.length) * 100)
      : 0;

    const byStandard = controls.reduce((acc: any, c: any) => {
      if (!acc[c.standard]) acc[c.standard] = [];
      acc[c.standard].push(c);
      return acc;
    }, {});

    return {
      summary: { total, implemented, partial, notImplemented, notApplicable },
      overallScore,
      byStandard,
    };
  }

  async updateControl(organizationId: string, id: string, dto: any) {
    const control = await (this.prisma as any).antiBriberyControl.findFirst({ where: { id, organizationId } });
    if (!control) throw new NotFoundException('Control not found');
    return (this.prisma as any).antiBriberyControl.update({ where: { id }, data: dto });
  }

  async bulkUpdate(organizationId: string, updates: { id: string; status: string; evidence?: string; notes?: string }[]) {
    const results = await Promise.all(
      updates.map(({ id, ...data }) =>
        (this.prisma as any).antiBriberyControl.updateMany({ where: { id, organizationId }, data }),
      ),
    );
    return { updated: results.reduce((sum, r) => sum + r.count, 0) };
  }

  private async seedControls(organizationId: string) {
    for (const c of ANTI_BRIBERY_CONTROLS) {
      await (this.prisma as any).antiBriberyControl.upsert({
        where: { organizationId_controlCode: { organizationId, controlCode: c.controlCode } },
        create: { organizationId, ...c, status: 'NOT_IMPLEMENTED' },
        update: {},
      });
    }
  }
}
