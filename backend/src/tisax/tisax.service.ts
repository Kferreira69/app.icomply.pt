import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

// VDA ISA 6.0 requirements (key requirements)
const TISAX_REQUIREMENTS = [
  // IS – Information Security
  { requirementId: 'IS-1.1.1', chapter: 'Information Security', requirement: 'Information Security Policy', description: 'An information security policy has been established, approved by management and communicated to all employees', targetLevel: 3 },
  { requirementId: 'IS-1.2.1', chapter: 'Information Security', requirement: 'Roles and Responsibilities', description: 'Roles and responsibilities for information security have been defined and assigned', targetLevel: 3 },
  { requirementId: 'IS-1.3.1', chapter: 'Information Security', requirement: 'Security Awareness', description: 'Employees are informed about information security and receive security awareness training', targetLevel: 3 },
  { requirementId: 'IS-2.1.1', chapter: 'Asset Management', requirement: 'Asset Inventory', description: 'All assets are identified, their value assessed and an inventory is maintained', targetLevel: 3 },
  { requirementId: 'IS-2.1.2', chapter: 'Asset Management', requirement: 'Classification and Labeling', description: 'Information is classified according to its value and labeled accordingly', targetLevel: 3 },
  { requirementId: 'IS-3.1.1', chapter: 'Physical Security', requirement: 'Physical Access Controls', description: 'Physical access to sensitive areas is controlled and monitored', targetLevel: 3 },
  { requirementId: 'IS-3.2.1', chapter: 'Physical Security', requirement: 'Secure Workspaces', description: 'Workspaces handling confidential information are appropriately protected', targetLevel: 2 },
  { requirementId: 'IS-4.1.1', chapter: 'IT Security', requirement: 'Secure Configuration', description: 'IT systems are configured securely based on established standards', targetLevel: 3 },
  { requirementId: 'IS-4.2.1', chapter: 'IT Security', requirement: 'Vulnerability Management', description: 'Vulnerabilities are identified, assessed and remediated systematically', targetLevel: 3 },
  { requirementId: 'IS-4.3.1', chapter: 'IT Security', requirement: 'Malware Protection', description: 'Protection against malware is implemented and kept up to date', targetLevel: 3 },
  { requirementId: 'IS-4.4.1', chapter: 'IT Security', requirement: 'Cryptography', description: 'Cryptographic measures are applied for protecting confidential data', targetLevel: 3 },
  { requirementId: 'IS-5.1.1', chapter: 'Identity & Access', requirement: 'Access Management', description: 'Access rights are granted based on need-to-know and least privilege', targetLevel: 3 },
  { requirementId: 'IS-5.2.1', chapter: 'Identity & Access', requirement: 'Authentication', description: 'Strong authentication mechanisms are in place for critical systems', targetLevel: 3 },
  { requirementId: 'IS-6.1.1', chapter: 'Incident Management', requirement: 'Incident Response', description: 'A process for detecting, reporting and responding to security incidents exists', targetLevel: 3 },
  { requirementId: 'IS-6.1.2', chapter: 'Incident Management', requirement: 'Incident Documentation', description: 'Security incidents are documented and lessons learned are applied', targetLevel: 2 },
  { requirementId: 'IS-7.1.1', chapter: 'Supplier Management', requirement: 'Third-Party Assessment', description: 'Information security requirements for suppliers are defined and monitored', targetLevel: 3 },
  // PROTO – Prototype Protection (additional)
  { requirementId: 'PROTO-1.1.1', chapter: 'Prototype Protection', requirement: 'Prototype Identification', description: 'Prototypes and test vehicles are identified and their locations tracked', targetLevel: 3 },
  { requirementId: 'PROTO-1.2.1', chapter: 'Prototype Protection', requirement: 'Prototype Storage', description: 'Prototypes are stored in secure locations with access controls', targetLevel: 3 },
  { requirementId: 'PROTO-1.3.1', chapter: 'Prototype Protection', requirement: 'Prototype Transport', description: 'Transport of prototypes is secured and documented', targetLevel: 3 },
  { requirementId: 'PROTO-2.1.1', chapter: 'Prototype Protection', requirement: 'Camouflage Measures', description: 'Visual camouflage measures are applied during public testing', targetLevel: 2 },
];

@Injectable()
export class TisaxService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(organizationId: string) {
    const [assessments, controls] = await Promise.all([
      (this.prisma as any).tisaxAssessment.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } }),
      (this.prisma as any).tisaxControl.findMany({ where: { organizationId }, orderBy: { requirementId: 'asc' } }),
    ]);

    if (controls.length === 0) {
      await this.seedControls(organizationId);
      return this.getDashboard(organizationId);
    }

    const total = controls.length;
    const implemented = controls.filter((c: any) => c.maturityLevel >= c.targetLevel).length;
    const partial = controls.filter((c: any) => c.maturityLevel > 0 && c.maturityLevel < c.targetLevel).length;
    const notAssessed = controls.filter((c: any) => c.maturityLevel === 0).length;

    const avgMaturity = total > 0 ? Math.round(controls.reduce((sum: number, c: any) => sum + c.maturityLevel, 0) / total * 10) / 10 : 0;

    const byChapter = controls.reduce((acc: any, c: any) => {
      if (!acc[c.chapter]) acc[c.chapter] = [];
      acc[c.chapter].push(c);
      return acc;
    }, {});

    return {
      summary: { total, implemented, partial, notAssessed },
      avgMaturity,
      assessments,
      byChapter,
    };
  }

  async createAssessment(organizationId: string, dto: any) {
    return (this.prisma as any).tisaxAssessment.create({
      data: { organizationId, ...dto },
    });
  }

  async updateAssessment(organizationId: string, id: string, dto: any) {
    const assessment = await (this.prisma as any).tisaxAssessment.findFirst({ where: { id, organizationId } });
    if (!assessment) throw new NotFoundException('Assessment not found');
    return (this.prisma as any).tisaxAssessment.update({ where: { id }, data: dto });
  }

  async updateControl(organizationId: string, id: string, dto: any) {
    const control = await (this.prisma as any).tisaxControl.findFirst({ where: { id, organizationId } });
    if (!control) throw new NotFoundException('Control not found');
    return (this.prisma as any).tisaxControl.update({ where: { id }, data: dto });
  }

  async bulkUpdate(organizationId: string, updates: { id: string; maturityLevel: number; evidence?: string; notes?: string }[]) {
    const results = await Promise.all(
      updates.map(({ id, ...data }) =>
        (this.prisma as any).tisaxControl.updateMany({ where: { id, organizationId }, data }),
      ),
    );
    return { updated: results.reduce((sum, r) => sum + r.count, 0) };
  }

  private async seedControls(organizationId: string) {
    for (const r of TISAX_REQUIREMENTS) {
      await (this.prisma as any).tisaxControl.upsert({
        where: { organizationId_requirementId: { organizationId, requirementId: r.requirementId } },
        create: { organizationId, ...r, maturityLevel: 0 },
        update: {},
      });
    }
  }
}
