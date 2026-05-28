import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const WORKFORCE_CONTROLS = [
  // ISO 45001 — Occupational Health & Safety
  { controlCode: 'ISO45001-4.1', framework: 'ISO_45001', clauseTitle: 'Context of the organization', description: 'Determine external and internal issues relevant to OHS' },
  { controlCode: 'ISO45001-4.2', framework: 'ISO_45001', clauseTitle: 'Needs and expectations of workers', description: 'Determine interested parties\' needs and expectations' },
  { controlCode: 'ISO45001-5.1', framework: 'ISO_45001', clauseTitle: 'Leadership and worker participation', description: 'Management demonstrates OHS leadership and promotes worker participation' },
  { controlCode: 'ISO45001-5.2', framework: 'ISO_45001', clauseTitle: 'OHS Policy', description: 'Establish, implement and maintain an OHS policy' },
  { controlCode: 'ISO45001-6.1.1', framework: 'ISO_45001', clauseTitle: 'Hazard identification', description: 'Establish, implement and maintain processes for hazard identification' },
  { controlCode: 'ISO45001-6.1.2', framework: 'ISO_45001', clauseTitle: 'OHS risks assessment', description: 'Assess OHS risks and other risks related to the OHSMS' },
  { controlCode: 'ISO45001-6.2', framework: 'ISO_45001', clauseTitle: 'OHS objectives', description: 'Establish OHS objectives at relevant functions and levels' },
  { controlCode: 'ISO45001-7.2', framework: 'ISO_45001', clauseTitle: 'Competence', description: 'Determine and ensure competence of workers affecting OHS performance' },
  { controlCode: 'ISO45001-7.3', framework: 'ISO_45001', clauseTitle: 'OHS Awareness', description: 'Workers are aware of OHS policy, hazards and emergency procedures' },
  { controlCode: 'ISO45001-7.4', framework: 'ISO_45001', clauseTitle: 'Communication', description: 'Establish internal and external OHS communication processes' },
  { controlCode: 'ISO45001-8.1', framework: 'ISO_45001', clauseTitle: 'Operational planning and control', description: 'Plan, implement, control and maintain processes for OHS requirements' },
  { controlCode: 'ISO45001-8.2', framework: 'ISO_45001', clauseTitle: 'Emergency preparedness', description: 'Establish, implement and maintain processes for emergency preparedness' },
  { controlCode: 'ISO45001-9.1', framework: 'ISO_45001', clauseTitle: 'Monitoring and measurement', description: 'Monitor, measure, analyse and evaluate OHS performance' },
  { controlCode: 'ISO45001-9.2', framework: 'ISO_45001', clauseTitle: 'Internal audit', description: 'Conduct internal OHSMS audits at planned intervals' },
  { controlCode: 'ISO45001-10.2', framework: 'ISO_45001', clauseTitle: 'Incident investigation', description: 'Report, investigate and take action on workplace incidents' },
  // HR-GDPR
  { controlCode: 'HR-GDPR-1', framework: 'HR_GDPR', clauseTitle: 'Employee data processing lawfulness', description: 'Legal basis established for all HR data processing activities' },
  { controlCode: 'HR-GDPR-2', framework: 'HR_GDPR', clauseTitle: 'HR privacy notices', description: 'Employees informed about data processing via privacy notices' },
  { controlCode: 'HR-GDPR-3', framework: 'HR_GDPR', clauseTitle: 'Data minimisation in HR', description: 'Only necessary employee data is collected and processed' },
  { controlCode: 'HR-GDPR-4', framework: 'HR_GDPR', clauseTitle: 'Employee data retention', description: 'Retention periods defined for all employee data categories' },
  // Working Time & Discrimination
  { controlCode: 'WORKING-TIME-1', framework: 'WORKING_TIME', clauseTitle: 'Maximum working hours', description: 'Compliance with maximum weekly working hours requirements' },
  { controlCode: 'WORKING-TIME-2', framework: 'WORKING_TIME', clauseTitle: 'Rest periods', description: 'Mandatory rest periods and break times are observed' },
  { controlCode: 'WORKING-TIME-3', framework: 'WORKING_TIME', clauseTitle: 'Holiday entitlements', description: 'Annual leave entitlements meet or exceed legal minimums' },
  { controlCode: 'DISCRIMINATION-1', framework: 'DISCRIMINATION', clauseTitle: 'Equal opportunity policy', description: 'Equal opportunities policy established and communicated' },
  { controlCode: 'DISCRIMINATION-2', framework: 'DISCRIMINATION', clauseTitle: 'Non-discrimination in recruitment', description: 'Recruitment processes are free from discriminatory practices' },
  { controlCode: 'DISCRIMINATION-3', framework: 'DISCRIMINATION', clauseTitle: 'Pay equity', description: 'Pay equity analysis conducted and gender pay gap addressed' },
];

@Injectable()
export class WorkforceService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(organizationId: string) {
    const controls = await (this.prisma as any).workforceCompliance.findMany({
      where: { organizationId },
      orderBy: [{ framework: 'asc' }, { controlCode: 'asc' }],
    });

    if (controls.length === 0) {
      await this.seedControls(organizationId);
      return this.getDashboard(organizationId);
    }

    const total = controls.length;
    const compliant = controls.filter((c: any) => c.status === 'COMPLIANT').length;
    const partial = controls.filter((c: any) => c.status === 'PARTIAL').length;
    const notApplicable = controls.filter((c: any) => c.status === 'NOT_APPLICABLE').length;
    const nonCompliant = total - compliant - partial - notApplicable;

    const applicable = controls.filter((c: any) => c.status !== 'NOT_APPLICABLE');
    const overallScore = applicable.length > 0
      ? Math.round(((compliant + partial * 0.5) / applicable.length) * 100)
      : 0;

    const byFramework = controls.reduce((acc: any, c: any) => {
      if (!acc[c.framework]) acc[c.framework] = [];
      acc[c.framework].push(c);
      return acc;
    }, {});

    return {
      summary: { total, compliant, partial, nonCompliant, notApplicable },
      overallScore,
      byFramework,
    };
  }

  async updateControl(organizationId: string, id: string, dto: any) {
    const control = await (this.prisma as any).workforceCompliance.findFirst({ where: { id, organizationId } });
    if (!control) throw new NotFoundException('Control not found');
    return (this.prisma as any).workforceCompliance.update({ where: { id }, data: dto });
  }

  async bulkUpdate(organizationId: string, updates: { id: string; status: string; evidence?: string; notes?: string }[]) {
    const results = await Promise.all(
      updates.map(({ id, ...data }) =>
        (this.prisma as any).workforceCompliance.updateMany({ where: { id, organizationId }, data }),
      ),
    );
    return { updated: results.reduce((sum, r) => sum + r.count, 0) };
  }

  private async seedControls(organizationId: string) {
    for (const c of WORKFORCE_CONTROLS) {
      await (this.prisma as any).workforceCompliance.upsert({
        where: { organizationId_controlCode: { organizationId, controlCode: c.controlCode } },
        create: { organizationId, ...c, status: 'NOT_ASSESSED' },
        update: {},
      });
    }
  }
}
