import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { date, intBetween, oneOf, required, text } from '../common/utils/input';

const TISAX_LABELS = ['INFO', 'PROTO', 'DATA_PROVIDER'] as const;
const TISAX_ASSESSMENT_STATUSES = ['PLANNED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'EXPIRED'] as const;

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
      // The page reads these three (flat list, headline stats, averageMaturity); without them it rendered empty.
      controls,
      stats: { total, metTarget: implemented, inProgress: partial, notAssessed },
      averageMaturity: avgMaturity,
    };
  }

  // Only the fields below can be set from a request; organizationId and the rest of the body are ignored.
  private assessmentChanges(dto: any, creating: boolean) {
    const data: any = {};
    if (creating || dto?.assessmentScope !== undefined) data.assessmentScope = required(dto?.assessmentScope, 'Âmbito', 500);
    if (dto?.label !== undefined) data.label = oneOf(dto.label, TISAX_LABELS, 'Label');
    if (dto?.targetLevel !== undefined) data.targetLevel = intBetween(dto.targetLevel, 1, 3, 'Nível-alvo');
    if (dto?.status !== undefined) data.status = oneOf(dto.status, TISAX_ASSESSMENT_STATUSES, 'Estado');
    if (dto?.auditBody !== undefined) data.auditBody = text(dto.auditBody, 300);
    if (dto?.assessmentDate !== undefined) data.assessmentDate = date(dto.assessmentDate, 'Data da avaliação');
    if (dto?.validUntil !== undefined) data.validUntil = date(dto.validUntil, 'Validade');
    if (dto?.score !== undefined) data.score = dto.score === null || dto.score === '' ? null : intBetween(dto.score, 0, 100, 'Pontuação');
    if (dto?.notes !== undefined) data.notes = text(dto.notes);
    return data;
  }

  async createAssessment(organizationId: string, dto: any) {
    return (this.prisma as any).tisaxAssessment.create({
      data: { ...this.assessmentChanges(dto, true), organizationId },
    });
  }

  async updateAssessment(organizationId: string, id: string, dto: any) {
    const assessment = await (this.prisma as any).tisaxAssessment.findFirst({ where: { id, organizationId } });
    if (!assessment) throw new NotFoundException('Assessment not found');
    return (this.prisma as any).tisaxAssessment.update({ where: { id }, data: this.assessmentChanges(dto, false) });
  }

  private controlChanges(dto: any) {
    const data: any = {};
    if (dto?.maturityLevel !== undefined) data.maturityLevel = intBetween(dto.maturityLevel, 0, 3, 'Nível de maturidade');
    if (dto?.targetLevel !== undefined) data.targetLevel = intBetween(dto.targetLevel, 1, 3, 'Nível-alvo');
    if (dto?.evidence !== undefined) data.evidence = text(dto.evidence);
    if (dto?.notes !== undefined) data.notes = text(dto.notes);
    if (dto?.targetDate !== undefined) data.targetDate = date(dto.targetDate, 'Data-alvo');
    return data;
  }

  async updateControl(organizationId: string, id: string, dto: any) {
    const control = await (this.prisma as any).tisaxControl.findFirst({ where: { id, organizationId } });
    if (!control) throw new NotFoundException('Control not found');
    return (this.prisma as any).tisaxControl.update({ where: { id }, data: this.controlChanges(dto) });
  }

  async bulkUpdate(organizationId: string, updates: { id: string; maturityLevel: number; evidence?: string; notes?: string }[]) {
    if (!Array.isArray(updates) || updates.length === 0) throw new BadRequestException('Sem alterações para aplicar');
    if (updates.length > 200) throw new BadRequestException('No máximo 200 alterações por pedido');
    const prepared = updates.map(u => {
      const id = text(u?.id, 100);
      if (!id) throw new BadRequestException('Cada alteração precisa de id');
      return { id, data: this.controlChanges(u) };
    });
    const results = await Promise.all(
      prepared.map(({ id, data }) =>
        (this.prisma as any).tisaxControl.updateMany({ where: { id, organizationId }, data }),
      ),
    );
    return { updated: results.reduce((sum: number, r: any) => sum + r.count, 0) };
  }

  private async seedControls(organizationId: string) {
    await (this.prisma as any).tisaxControl.createMany({
      data: TISAX_REQUIREMENTS.map(r => ({ organizationId, ...r, maturityLevel: 0 })),
      skipDuplicates: true,
    });
  }
}
