import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

// Default ISO 42001 controls to seed when org first opens module
const ISO_42001_CONTROLS = [
  // Clause 4 — Context
  { controlCode: '4.1', clause: '4 Context', title: 'Understanding the organization and its context' },
  { controlCode: '4.2', clause: '4 Context', title: 'Understanding the needs and expectations of interested parties' },
  { controlCode: '4.3', clause: '4 Context', title: 'Determining the scope of the AI management system' },
  { controlCode: '4.4', clause: '4 Context', title: 'AI management system' },
  // Clause 5 — Leadership
  { controlCode: '5.1', clause: '5 Leadership', title: 'Leadership and commitment' },
  { controlCode: '5.2', clause: '5 Leadership', title: 'AI policy' },
  { controlCode: '5.3', clause: '5 Leadership', title: 'Organizational roles, responsibilities and authorities' },
  // Clause 6 — Planning
  { controlCode: '6.1', clause: '6 Planning', title: 'Actions to address risks and opportunities' },
  { controlCode: '6.1.1', clause: '6 Planning', title: 'General risk and opportunity considerations' },
  { controlCode: '6.1.2', clause: '6 Planning', title: 'AI risk assessment' },
  { controlCode: '6.1.3', clause: '6 Planning', title: 'AI risk treatment' },
  { controlCode: '6.2', clause: '6 Planning', title: 'AI objectives and planning to achieve them' },
  // Clause 7 — Support
  { controlCode: '7.1', clause: '7 Support', title: 'Resources' },
  { controlCode: '7.2', clause: '7 Support', title: 'Competence' },
  { controlCode: '7.3', clause: '7 Support', title: 'Awareness' },
  { controlCode: '7.4', clause: '7 Support', title: 'Communication' },
  { controlCode: '7.5', clause: '7 Support', title: 'Documented information' },
  // Clause 8 — Operation
  { controlCode: '8.1', clause: '8 Operation', title: 'Operational planning and control' },
  { controlCode: '8.2', clause: '8 Operation', title: 'AI risk assessment (operational)' },
  { controlCode: '8.3', clause: '8 Operation', title: 'AI risk treatment (operational)' },
  { controlCode: '8.4', clause: '8 Operation', title: 'AI system impact assessment' },
  { controlCode: '8.5', clause: '8 Operation', title: 'AI system lifecycle' },
  { controlCode: '8.6', clause: '8 Operation', title: 'AI system documentation' },
  { controlCode: '8.7', clause: '8 Operation', title: 'Data for AI systems' },
  // Clause 9 — Evaluation
  { controlCode: '9.1', clause: '9 Evaluation', title: 'Monitoring, measurement, analysis and evaluation' },
  { controlCode: '9.2', clause: '9 Evaluation', title: 'Internal audit' },
  { controlCode: '9.3', clause: '9 Evaluation', title: 'Management review' },
  // Clause 10 — Improvement
  { controlCode: '10.1', clause: '10 Improvement', title: 'Continual improvement' },
  { controlCode: '10.2', clause: '10 Improvement', title: 'Nonconformity and corrective action' },
  // Annex A
  { controlCode: 'A.2.2', clause: 'Annex A', title: 'AI policy' },
  { controlCode: 'A.2.3', clause: 'Annex A', title: 'Internal organization' },
  { controlCode: 'A.2.4', clause: 'Annex A', title: 'Responsibilities for AI systems' },
  { controlCode: 'A.3.1', clause: 'Annex A', title: 'AI system impact assessment process' },
  { controlCode: 'A.3.2', clause: 'Annex A', title: 'AI risk management approach' },
  { controlCode: 'A.4.1', clause: 'Annex A', title: 'Intended use' },
  { controlCode: 'A.4.2', clause: 'Annex A', title: 'AI system requirements' },
  { controlCode: 'A.5.1', clause: 'Annex A', title: 'Data management' },
  { controlCode: 'A.5.2', clause: 'Annex A', title: 'Data acquisition' },
  { controlCode: 'A.5.3', clause: 'Annex A', title: 'Data preparation' },
  { controlCode: 'A.6.1', clause: 'Annex A', title: 'AI system design and development' },
  { controlCode: 'A.6.2', clause: 'Annex A', title: 'AI system testing' },
  { controlCode: 'A.6.2.3', clause: 'Annex A', title: 'Human oversight review' },
  { controlCode: 'A.7.1', clause: 'Annex A', title: 'Third party AI and data supply chain' },
  { controlCode: 'A.8.1', clause: 'Annex A', title: 'Human oversight of AI systems' },
  { controlCode: 'A.8.2', clause: 'Annex A', title: 'Responsible use of AI' },
  { controlCode: 'A.9.1', clause: 'Annex A', title: 'Performance monitoring' },
  { controlCode: 'A.9.2', clause: 'Annex A', title: 'Incident management' },
  { controlCode: 'A.9.3', clause: 'Annex A', title: 'AI system change management' },
  { controlCode: 'A.10.1', clause: 'Annex A', title: 'AI system decommissioning' },
];

@Injectable()
export class AiGovernanceService {
  constructor(private prisma: PrismaService) {}

  // ── Dashboard ────────────────────────────────────────────────

  async getDashboard(orgId: string) {
    const [systems, risks, assessments, controls] = await Promise.all([
      this.prisma.aiSystem.groupBy({
        by: ['aiActRiskLevel'],
        where: { organizationId: orgId },
        _count: { id: true },
      }),
      this.prisma.aiRisk.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: { id: true },
      }),
      this.prisma.aiImpactAssessment.count({ where: { organizationId: orgId } }),
      this.prisma.ai42001Control.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: { id: true },
      }),
    ]);

    const totalSystems   = systems.reduce((s, c) => s + c._count.id, 0);
    const highRiskSystems = systems.find(s => s.aiActRiskLevel === 'HIGH')?._count.id ?? 0;
    const totalControls  = controls.reduce((s, c) => s + c._count.id, 0);
    const doneControls   = controls.find(c => c.status === 'IMPLEMENTED')?._count.id ?? 0;
    const compliance     = totalControls > 0 ? Math.round((doneControls / totalControls) * 100) : 0;
    const openRisks      = risks.filter(r => ['IDENTIFIED', 'MITIGATING'].includes(r.status))
                               .reduce((s, c) => s + c._count.id, 0);

    return { totalSystems, highRiskSystems, openRisks, assessments, compliance, totalControls, doneControls };
  }

  // ── AI System Inventory ──────────────────────────────────────

  async listSystems(orgId: string, query: any = {}) {
    const { status, aiActRiskLevel, page = 1, limit = 20 } = query;
    return this.prisma.aiSystem.findMany({
      where: {
        organizationId: orgId,
        ...(status ? { status } : {}),
        ...(aiActRiskLevel ? { aiActRiskLevel } : {}),
      },
      include: {
        _count: { select: { risks: true, impactAssessments: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: Number(limit),
    });
  }

  async createSystem(orgId: string, dto: any) {
    return this.prisma.aiSystem.create({ data: { organizationId: orgId, ...dto } });
  }

  async updateSystem(orgId: string, id: string, dto: any) {
    await this.assertOwnership(orgId, 'aiSystem', id);
    return this.prisma.aiSystem.update({ where: { id }, data: dto });
  }

  async deleteSystem(orgId: string, id: string) {
    await this.assertOwnership(orgId, 'aiSystem', id);
    return this.prisma.aiSystem.delete({ where: { id } });
  }

  // ── AI Risks ────────────────────────────────────────────────

  async listRisks(orgId: string, query: any = {}) {
    const { status, category, page = 1, limit = 20 } = query;
    return this.prisma.aiRisk.findMany({
      where: {
        organizationId: orgId,
        ...(status ? { status } : {}),
        ...(category ? { category } : {}),
      },
      include: { aiSystem: { select: { name: true } } },
      orderBy: [{ riskScore: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: Number(limit),
    });
  }

  async createRisk(orgId: string, dto: any) {
    const riskScore = (dto.likelihood || 3) * (dto.impact || 3);
    return this.prisma.aiRisk.create({
      data: { organizationId: orgId, ...dto, riskScore },
    });
  }

  async updateRisk(orgId: string, id: string, dto: any) {
    await this.assertOwnership(orgId, 'aiRisk', id);
    const riskScore = dto.likelihood && dto.impact ? dto.likelihood * dto.impact : undefined;
    return this.prisma.aiRisk.update({
      where: { id },
      data: { ...dto, ...(riskScore ? { riskScore } : {}) },
    });
  }

  // ── AI Impact Assessments ────────────────────────────────────

  async listAssessments(orgId: string) {
    return this.prisma.aiImpactAssessment.findMany({
      where: { organizationId: orgId },
      include: {
        aiSystem: { select: { name: true } },
        owner: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAssessment(orgId: string, dto: any, userId: string) {
    return this.prisma.aiImpactAssessment.create({
      data: { organizationId: orgId, ...dto, ownerId: dto.ownerId || userId },
    });
  }

  async updateAssessment(orgId: string, id: string, dto: any) {
    await this.assertOwnership(orgId, 'aiImpactAssessment', id);
    return this.prisma.aiImpactAssessment.update({ where: { id }, data: dto });
  }

  // ── ISO 42001 Controls ───────────────────────────────────────

  async getControls(orgId: string) {
    const existing = await this.prisma.ai42001Control.findMany({
      where: { organizationId: orgId },
      orderBy: { controlCode: 'asc' },
    });

    // Auto-seed if none exist
    if (existing.length === 0) {
      await this.prisma.ai42001Control.createMany({
        data: ISO_42001_CONTROLS.map(c => ({
          organizationId: orgId,
          ...c,
          status: 'NOT_STARTED',
          applicable: true,
        })),
        skipDuplicates: true,
      });
      return this.prisma.ai42001Control.findMany({
        where: { organizationId: orgId },
        orderBy: { controlCode: 'asc' },
      });
    }

    return existing;
  }

  async updateControl(orgId: string, id: string, dto: any) {
    await this.assertOwnership(orgId, 'ai42001Control', id);
    return this.prisma.ai42001Control.update({ where: { id }, data: dto });
  }

  async bulkUpdateControls(orgId: string, updates: Array<{ id: string; [k: string]: any }>) {
    return Promise.all(
      updates.map(u => this.prisma.ai42001Control.update({
        where: { id: u.id },
        data: { status: u.status, implementationNotes: u.implementationNotes, owner: u.owner, targetDate: u.targetDate },
      })),
    );
  }

  // ── Helper ───────────────────────────────────────────────────

  private async assertOwnership(orgId: string, model: string, id: string) {
    const rec = await (this.prisma as any)[model].findUnique({ where: { id } });
    if (!rec || rec.organizationId !== orgId) throw new NotFoundException();
  }
}
