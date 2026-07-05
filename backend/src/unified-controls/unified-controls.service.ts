import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

// ── Framework mapping catalogue ───────────────────────────────────────────────
// Each entry maps a unified control to specific clauses in regulatory frameworks.
// This is the intelligence layer of the cross-framework engine.

export const FRAMEWORK_CATALOGUE: Record<string, {
  domain: string;
  title: string;
  description: string;
  objective: string;
  mappings: string[];
}[]> = {
  // ── Security Governance domain
  SECURITY: [
    {
      domain: 'SECURITY',
      title: 'Privileged Access Management',
      description: 'Controls for managing privileged accounts and elevated access rights',
      objective: 'Prevent unauthorized access to critical systems through privileged accounts',
      mappings: ['ISO27001:A.8.2', 'NIS2:Art21.2.e', 'DORA:Art9.4', 'SOC2:CC6.1', 'CIS:CIS5'],
    },
    {
      domain: 'SECURITY',
      title: 'Vulnerability Management',
      description: 'Systematic identification, evaluation and remediation of security vulnerabilities',
      objective: 'Reduce attack surface by timely patching and vulnerability remediation',
      mappings: ['ISO27001:A.8.8', 'NIS2:Art21.2.e', 'DORA:Art10.1', 'SOC2:CC7.1', 'CIS:CIS7'],
    },
    {
      domain: 'SECURITY',
      title: 'Incident Detection & Response',
      description: 'Capabilities to detect, analyse, contain and recover from security incidents',
      objective: 'Minimize impact of security incidents through rapid detection and response',
      mappings: ['ISO27001:A.5.26', 'NIS2:Art23', 'DORA:Art17', 'SOC2:CC7.3', 'GDPR:Art33'],
    },
    {
      domain: 'SECURITY',
      title: 'Network Security Controls',
      description: 'Controls to protect network infrastructure and communications',
      objective: 'Protect network perimeter and internal segments from threats',
      mappings: ['ISO27001:A.8.20', 'NIS2:Art21.2.d', 'DORA:Art9.2', 'SOC2:CC6.6', 'CIS:CIS12'],
    },
    {
      domain: 'SECURITY',
      title: 'Encryption & Cryptography',
      description: 'Use of cryptographic controls to protect data in transit and at rest',
      objective: 'Protect data confidentiality and integrity through cryptographic mechanisms',
      mappings: ['ISO27001:A.8.24', 'NIS2:Art21.2.h', 'DORA:Art9.2', 'GDPR:Art32', 'SOC2:CC6.7'],
    },
    {
      domain: 'SECURITY',
      title: 'Business Continuity & Backup',
      description: 'Plans and procedures for business continuity, disaster recovery and data backup',
      objective: 'Ensure organizational resilience and data recovery capability',
      mappings: ['ISO27001:A.8.13', 'NIS2:Art21.2.c', 'DORA:Art11', 'ISO22301:6.1', 'SOC2:A1.2'],
    },
    {
      domain: 'SECURITY',
      title: 'Supply Chain Security',
      description: 'Security requirements and monitoring for suppliers and third parties',
      objective: 'Manage security risks introduced through the supply chain',
      mappings: ['ISO27001:A.5.21', 'NIS2:Art21.2.d', 'DORA:Art28', 'SOC2:CC9.2', 'CIS:CIS15'],
    },
    {
      domain: 'SECURITY',
      title: 'Security Awareness & Training',
      description: 'Programmes to build security culture and awareness across the organization',
      objective: 'Reduce human-factor risks through education and awareness',
      mappings: ['ISO27001:A.6.3', 'NIS2:Art21.2.g', 'DORA:Art13', 'SOC2:CC2.2', 'CIS:CIS14'],
    },
    {
      domain: 'SECURITY',
      title: 'Identity & Access Management',
      description: 'Policies and controls for managing user identities and access rights',
      objective: 'Ensure only authorized users access systems based on least privilege',
      mappings: ['ISO27001:A.8.2', 'NIS2:Art21.2.i', 'DORA:Art9.4', 'SOC2:CC6.2', 'GDPR:Art32'],
    },
    {
      domain: 'SECURITY',
      title: 'Asset Management',
      description: 'Inventory and classification of information assets',
      objective: 'Maintain visibility of all assets to enable appropriate protection',
      mappings: ['ISO27001:A.5.9', 'NIS2:Art21.2.a', 'CIS:CIS1', 'SOC2:CC6.1', 'DORA:Art8.1'],
    },
  ],

  // ── Privacy Governance domain
  PRIVACY: [
    {
      domain: 'PRIVACY',
      title: 'Lawful Basis for Processing',
      description: 'Identification and documentation of legal basis for each processing activity',
      objective: 'Ensure all personal data processing has a valid legal basis under GDPR',
      mappings: ['GDPR:Art6', 'GDPR:Art9', 'ISO27701:7.2.1', 'ePrivacy:Art5'],
    },
    {
      domain: 'PRIVACY',
      title: 'Data Subject Rights Management',
      description: 'Processes to receive, validate and respond to data subject requests',
      objective: 'Fulfil data subject rights (access, rectification, erasure, portability)',
      mappings: ['GDPR:Art15-22', 'ISO27701:7.3', 'UK_GDPR:Art15-22'],
    },
    {
      domain: 'PRIVACY',
      title: 'Privacy by Design & Default',
      description: 'Embedding privacy considerations into system and process design',
      objective: 'Minimize privacy risks at the design stage rather than after',
      mappings: ['GDPR:Art25', 'ISO27701:7.4', 'NIST_PF:CT.DP'],
    },
    {
      domain: 'PRIVACY',
      title: 'Data Breach Response',
      description: 'Procedures for detecting, assessing and notifying data breaches',
      objective: 'Meet 72-hour notification obligation and minimize breach impact',
      mappings: ['GDPR:Art33', 'GDPR:Art34', 'ISO27001:A.5.26', 'NIS2:Art23'],
    },
    {
      domain: 'PRIVACY',
      title: 'Records of Processing Activities (ROPA)',
      description: 'Maintaining comprehensive records of all personal data processing activities',
      objective: 'Demonstrate compliance accountability and enable oversight',
      mappings: ['GDPR:Art30', 'ISO27701:7.2.8', 'UK_GDPR:Art30'],
    },
    {
      domain: 'PRIVACY',
      title: 'Data Protection Impact Assessment',
      description: 'Risk assessment for high-risk processing activities',
      objective: 'Identify and mitigate privacy risks before high-risk processing begins',
      mappings: ['GDPR:Art35', 'ISO27701:7.4.5', 'EUAI_Act:Art9'],
    },
  ],

  // ── AI Governance domain
  AI_GOVERNANCE: [
    {
      domain: 'AI_GOVERNANCE',
      title: 'AI System Inventory & Classification',
      description: 'Cataloguing all AI systems and classifying by risk level per EU AI Act',
      objective: 'Maintain visibility of AI use and enable risk-proportionate governance',
      mappings: ['AI_Act:Art6-9', 'ISO42001:8.4', 'ISO42001:A.4.1', 'NIST_AI:GOVERN-1.1'],
    },
    {
      domain: 'AI_GOVERNANCE',
      title: 'Human Oversight of AI Systems',
      description: 'Mechanisms ensuring humans can monitor, intervene and override AI decisions',
      objective: 'Prevent AI systems from operating without appropriate human control',
      mappings: ['AI_Act:Art14', 'ISO42001:A.8.1', 'ISO42001:A.6.2.3', 'NIST_AI:MANAGE-4.1'],
    },
    {
      domain: 'AI_GOVERNANCE',
      title: 'AI Risk Assessment',
      description: 'Systematic identification and assessment of risks from AI systems',
      objective: 'Identify, evaluate and treat risks from AI deployment and use',
      mappings: ['AI_Act:Art9', 'ISO42001:6.1.2', 'ISO23894:6.1', 'NIST_AI:MAP-1.1'],
    },
    {
      domain: 'AI_GOVERNANCE',
      title: 'AI Transparency & Explainability',
      description: 'Measures to make AI system functioning understandable to users and subjects',
      objective: 'Enable informed oversight and challenge of AI-driven decisions',
      mappings: ['AI_Act:Art13', 'ISO42001:A.8.2', 'GDPR:Art22', 'NIST_AI:GOVERN-6.1'],
    },
    {
      domain: 'AI_GOVERNANCE',
      title: 'Bias & Fairness Monitoring',
      description: 'Ongoing monitoring of AI systems for discriminatory or biased outputs',
      objective: 'Prevent AI from producing discriminatory outcomes against protected groups',
      mappings: ['AI_Act:Art10.2.f', 'ISO42001:A.9.1', 'ISO23894:8.4', 'NIST_AI:MEASURE-2.5'],
    },
    {
      domain: 'AI_GOVERNANCE',
      title: 'AI Vendor Governance',
      description: 'Due diligence and oversight for third-party AI tools and providers',
      objective: 'Manage risks from AI systems procured from external vendors',
      mappings: ['AI_Act:Art25-28', 'ISO42001:A.7.1', 'ISO27001:A.5.21', 'NIST_AI:GOVERN-4.2'],
    },
  ],
};

@Injectable()
export class UnifiedControlsService {
  constructor(private prisma: PrismaService) {}

  // ── Dashboard / Cross-framework overview ──────────────────────

  async getDashboard(orgId: string) {
    const [controls, obligations] = await Promise.all([
      this.prisma.unifiedControl.groupBy({
        by: ['domain', 'status'],
        where: { organizationId: orgId },
        _count: { id: true },
      }),
      this.prisma.regulatoryObligation.groupBy({
        by: ['domain', 'status'],
        where: { organizationId: orgId },
        _count: { id: true },
      }),
    ]);

    const totalControls     = controls.reduce((s, c) => s + c._count.id, 0);
    const implementedControls = controls.filter(c => c.status === 'IMPLEMENTED').reduce((s, c) => s + c._count.id, 0);
    const overallCompliance = totalControls > 0 ? Math.round((implementedControls / totalControls) * 100) : 0;

    // By domain
    const domainMap: Record<string, any> = {};
    for (const row of controls) {
      if (!domainMap[row.domain]) domainMap[row.domain] = { domain: row.domain, total: 0, implemented: 0 };
      domainMap[row.domain].total += row._count.id;
      if (row.status === 'IMPLEMENTED') domainMap[row.domain].implemented += row._count.id;
    }
    const byDomain = Object.values(domainMap).map((d: any) => ({
      ...d,
      compliance: d.total > 0 ? Math.round((d.implemented / d.total) * 100) : 0,
    }));

    const overdueObligations = await this.prisma.regulatoryObligation.count({
      where: {
        organizationId: orgId,
        complianceDate: { lt: new Date() },
        status: { notIn: ['COMPLIANT', 'NOT_APPLICABLE'] },
      },
    });

    return { overallCompliance, totalControls, implementedControls, byDomain, overdueObligations };
  }

  // ── Cross-framework coverage analysis ────────────────────────

  async getCoverageMatrix(orgId: string) {
    const controls = await this.prisma.unifiedControl.findMany({
      where: { organizationId: orgId },
      select: { id: true, controlId: true, title: true, status: true, domain: true, frameworkMappings: true },
    });

    // Build framework → coverage map
    const frameworkCoverage: Record<string, { total: number; implemented: number }> = {};
    for (const ctrl of controls) {
      for (const mapping of ctrl.frameworkMappings) {
        const framework = mapping.split(':')[0];
        if (!frameworkCoverage[framework]) frameworkCoverage[framework] = { total: 0, implemented: 0 };
        frameworkCoverage[framework].total++;
        if (ctrl.status === 'IMPLEMENTED') frameworkCoverage[framework].implemented++;
      }
    }

    return Object.entries(frameworkCoverage).map(([framework, data]) => ({
      framework,
      ...data,
      coverage: data.total > 0 ? Math.round((data.implemented / data.total) * 100) : 0,
    })).sort((a, b) => b.total - a.total);
  }

  // ── Controls CRUD ────────────────────────────────────────────

  async list(orgId: string, query: any = {}) {
    const { domain, status, page = 1, limit = 50, search } = query;
    return this.prisma.unifiedControl.findMany({
      where: {
        organizationId: orgId,
        ...(domain ? { domain } : {}),
        ...(status ? { status } : {}),
        ...(search ? { OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { controlId: { contains: search, mode: 'insensitive' } },
        ] } : {}),
      },
      include: {
        _count: { select: { evidenceLinks: true, riskLinks: true } },
      },
      orderBy: [{ domain: 'asc' }, { controlId: 'asc' }],
      skip: (page - 1) * limit,
      take: Number(limit),
    });
  }

  async create(orgId: string, dto: any) {
    return this.prisma.unifiedControl.create({
      data: { organizationId: orgId, ...dto },
    });
  }

  async update(orgId: string, id: string, dto: any) {
    await this.assertOwnership(orgId, id);
    return this.prisma.unifiedControl.update({ where: { id }, data: dto });
  }

  async bulkUpdateStatus(orgId: string, updates: Array<{ id: string; status: string; notes?: string }>) {
    return Promise.all(updates.map(u =>
      this.prisma.unifiedControl.update({
        where: { id: u.id },
        data: { status: u.status, implementationNotes: u.notes },
      }),
    ));
  }

  // ── Auto-seed from catalogue ──────────────────────────────────

  async seedFromCatalogue(orgId: string, domains: string[]) {
    const created: any[] = [];
    for (const domain of domains) {
      const catalogue = FRAMEWORK_CATALOGUE[domain] || [];
      for (const [i, entry] of catalogue.entries()) {
        const controlId = `${domain.substring(0, 3)}-${String(i + 1).padStart(3, '0')}`;
        try {
          const ctrl = await this.prisma.unifiedControl.upsert({
            where: { organizationId_controlId: { organizationId: orgId, controlId } },
            create: {
              organizationId:    orgId,
              domain:            entry.domain as any,
              controlId,
              title:             entry.title,
              description:       entry.description,
              objective:         entry.objective,
              frameworkMappings: entry.mappings,
              status:            'NOT_STARTED',
            },
            update: {},
          });
          created.push(ctrl);
        } catch { /* skip duplicate */ }
      }
    }
    return { seeded: created.length };
  }

  // ── Evidence linking ─────────────────────────────────────────

  async linkEvidence(orgId: string, controlId: string, evidenceId: string, notes?: string) {
    await this.assertOwnership(orgId, controlId);
    return this.prisma.unifiedControlEvidence.upsert({
      where: { controlId_evidenceId: { controlId, evidenceId } },
      create: { controlId, evidenceId, notes },
      update: { notes },
    });
  }

  async unlinkEvidence(controlId: string, evidenceId: string) {
    return this.prisma.unifiedControlEvidence.deleteMany({
      where: { controlId, evidenceId },
    });
  }

  // ── Regulatory obligations ────────────────────────────────────

  async listObligations(orgId: string, query: any = {}) {
    const { domain, status, priority, page = 1, limit = 30 } = query;
    return this.prisma.regulatoryObligation.findMany({
      where: {
        organizationId: orgId,
        ...(domain ? { domain } : {}),
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
      },
      orderBy: [{ priority: 'desc' }, { complianceDate: 'asc' }],
      skip: (page - 1) * limit,
      take: Number(limit),
    });
  }

  async createObligation(orgId: string, dto: any) {
    return this.prisma.regulatoryObligation.create({
      data: {
        organizationId: orgId,
        ...dto,
        effectiveDate:  dto.effectiveDate  ? new Date(dto.effectiveDate)  : undefined,
        complianceDate: dto.complianceDate ? new Date(dto.complianceDate) : undefined,
      },
    });
  }

  async updateObligation(orgId: string, id: string, dto: any) {
    const rec = await this.prisma.regulatoryObligation.findUnique({ where: { id } });
    if (!rec || rec.organizationId !== orgId) throw new NotFoundException();
    return this.prisma.regulatoryObligation.update({ where: { id }, data: dto });
  }

  // ── Impact analysis: what frameworks does a control gap affect? ─

  async getGapImpact(orgId: string) {
    const gaps = await this.prisma.unifiedControl.findMany({
      where: {
        organizationId: orgId,
        status: { in: ['NOT_STARTED', 'PLANNED'] },
        applicable: true,
      },
      select: { controlId: true, title: true, domain: true, frameworkMappings: true, status: true },
    });

    const frameworkImpact: Record<string, number> = {};
    for (const gap of gaps) {
      for (const mapping of gap.frameworkMappings) {
        const fw = mapping.split(':')[0];
        frameworkImpact[fw] = (frameworkImpact[fw] || 0) + 1;
      }
    }

    return {
      totalGaps: gaps.length,
      gaps: gaps.slice(0, 20),
      frameworkImpact: Object.entries(frameworkImpact)
        .sort(([, a], [, b]) => b - a)
        .map(([framework, gapCount]) => ({ framework, gapCount })),
    };
  }

  // ── Helper ────────────────────────────────────────────────────

  private async assertOwnership(orgId: string, id: string) {
    const rec = await this.prisma.unifiedControl.findUnique({ where: { id } });
    if (!rec || rec.organizationId !== orgId) throw new NotFoundException();
  }
}
