import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MailService } from '../common/mail/mail.service';

// NIS2 Article 23 timeline:
// T+24h: Early warning to NCA
// T+72h: Initial notification to NCA
// T+1month: Final report to NCA

const NCA_CONTACTS: Record<string, { name: string; url: string; email?: string }> = {
  PT: { name: 'CNCS — Centro Nacional de Cibersegurança',       url: 'https://www.cncs.gov.pt',      email: 'incidentes@cncs.gov.pt' },
  DE: { name: 'BSI — Bundesamt für Sicherheit in der IT',       url: 'https://www.bsi.bund.de',      email: 'nis@bsi.bund.de' },
  FR: { name: 'ANSSI — Agence nationale de la sécurité',        url: 'https://www.anssi.gouv.fr',    email: 'nis@ssi.gouv.fr' },
  ES: { name: 'CCN-CERT — Centro Criptológico Nacional',        url: 'https://www.ccn-cert.cni.es',  email: 'incidentes@ccn.cni.es' },
  NL: { name: 'NCSC-NL — Nationaal Cyber Security Centrum',     url: 'https://www.ncsc.nl',          email: 'nis@ncsc.nl' },
  IT: { name: 'ACN — Agenzia per la Cybersicurezza Nazionale',  url: 'https://www.acn.gov.it' },
  BE: { name: 'CCB — Centre for Cybersecurity Belgium',         url: 'https://ccb.belgium.be' },
  PL: { name: 'CERT Polska / CSIRT GOV',                         url: 'https://cert.pl' },
  SE: { name: 'NCSC-SE — Swedish NCSC',                          url: 'https://www.ncsc.se' },
  EU: { name: 'ENISA — European Union Agency for Cybersecurity', url: 'https://www.enisa.europa.eu' },
};

@Injectable()
export class Nis2IncidentsService {
  constructor(private prisma: PrismaService, private mail: MailService) {}

  async list(organizationId: string) {
    return (this.prisma as any).nis2IncidentNotification.findMany({
      where: { organizationId },
      orderBy: { incidentDate: 'desc' },
      include: { responsible: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async create(organizationId: string, userId: string, dto: any) {
    const ref = `NIS2-INC-${Date.now().toString().slice(-6)}`;
    const incidentDate = new Date(dto.incidentDate || Date.now());
    return (this.prisma as any).nis2IncidentNotification.create({
      data: {
        ...dto,
        organizationId,
        responsibleId: userId,
        incidentRef: ref,
        incidentDate,
        detectionDate: dto.detectionDate ? new Date(dto.detectionDate) : new Date(),
        status: 'DRAFT',
      },
    });
  }

  async get(id: string, organizationId: string) {
    const n = await (this.prisma as any).nis2IncidentNotification.findFirst({
      where: { id, organizationId },
      include: { responsible: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!n) throw new NotFoundException('Incident notification not found');
    // Calculate deadlines
    const detected = new Date(n.detectionDate);
    const deadlines = {
      earlyWarning: new Date(detected.getTime() + 24 * 3600000),
      initialReport: new Date(detected.getTime() + 72 * 3600000),
      finalReport: new Date(detected.getTime() + 30 * 24 * 3600000),
    };
    const nca = NCA_CONTACTS[n.authorityCountry || 'EU'] || NCA_CONTACTS['EU'];
    return { ...n, deadlines, nca };
  }

  async update(id: string, organizationId: string, dto: any) {
    const n = await (this.prisma as any).nis2IncidentNotification.findFirst({ where: { id, organizationId } });
    if (!n) throw new NotFoundException('Not found');
    return (this.prisma as any).nis2IncidentNotification.update({ where: { id }, data: dto });
  }

  async submitNotification(id: string, organizationId: string, type: 'EARLY_WARNING' | 'INITIAL_REPORT' | 'FINAL_REPORT') {
    const n = await this.get(id, organizationId);
    const now = new Date();
    const statusMap = {
      EARLY_WARNING:  { field: 'earlyWarningAt',   status: 'EARLY_WARNING_SENT' },
      INITIAL_REPORT: { field: 'initialReportAt',  status: 'INITIAL_REPORT_SENT' },
      FINAL_REPORT:   { field: 'finalReportAt',    status: 'FINAL_REPORT_SENT' },
    };
    const { field, status } = statusMap[type];
    return (this.prisma as any).nis2IncidentNotification.update({
      where: { id },
      data: { [field]: now, status, submittedAt: type === 'FINAL_REPORT' ? now : undefined },
    });
  }

  async generateReport(id: string, organizationId: string, type: string): Promise<string> {
    const n = await this.get(id, organizationId);
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, vatNumber: true, country: true },
    });
    const templates: Record<string, string> = {
      EARLY_WARNING: `
NIS2 EARLY WARNING — Article 23(1) — CONFIDENTIAL

Reference: ${n.incidentRef}
Organisation: ${org?.name}
VAT: ${org?.vatNumber || 'N/A'}
Country: ${org?.country || 'PT'}
Date of Incident: ${new Date(n.incidentDate).toISOString().split('T')[0]}
Date of Detection: ${new Date(n.detectionDate).toISOString().split('T')[0]}
Submitted to: ${n.nca?.name}

INCIDENT DETAILS:
Title: ${n.title}
Severity: ${n.severity}

DESCRIPTION:
${n.description || 'To be completed'}

AFFECTED SYSTEMS: ${(n.affectedSystems || []).join(', ') || 'Under investigation'}
AFFECTED SERVICES: ${(n.affectedServices || []).join(', ') || 'Under investigation'}

STATUS: Early warning submitted within 24 hours of detection.
This is a preliminary notification. A full initial report will follow within 72 hours.

Responsible Contact: ${n.responsible?.firstName} ${n.responsible?.lastName}
`,
      INITIAL_REPORT: `
NIS2 INITIAL NOTIFICATION — Article 23(3) — CONFIDENTIAL

Reference: ${n.incidentRef}
Organisation: ${org?.name}
Submitted to: ${n.nca?.name}

INCIDENT DESCRIPTION:
${n.description || 'See attached technical details'}

INITIAL IMPACT ASSESSMENT:
${n.impactDescription || 'Assessment ongoing'}

ROOT CAUSE (preliminary):
${n.rootCause || 'Under investigation'}

AFFECTED SYSTEMS: ${(n.affectedSystems || []).join(', ')}
AFFECTED SERVICES: ${(n.affectedServices || []).join(', ')}

CONTAINMENT MEASURES:
[To be completed by responsible team]

NOTE: This is the initial notification. A final report will follow within one month.
`,
      FINAL_REPORT: `
NIS2 FINAL REPORT — Article 23(4) — CONFIDENTIAL

Reference: ${n.incidentRef}
Organisation: ${org?.name}
Submitted to: ${n.nca?.name}

INCIDENT SUMMARY:
${n.description}

CONFIRMED ROOT CAUSE:
${n.rootCause || 'N/A'}

FULL IMPACT ASSESSMENT:
${n.impactDescription || 'N/A'}

REMEDIATION ACTIONS TAKEN:
[Complete with all corrective actions]

PREVENTIVE MEASURES IMPLEMENTED:
[Complete with all preventive measures]

LESSONS LEARNED:
[Complete with lessons learned for future incidents]

This report constitutes the final notification as required by NIS2 Article 23(4).
`,
    };
    return templates[type] || 'Template not available';
  }

  getNcaList() {
    return Object.entries(NCA_CONTACTS).map(([code, info]) => ({ code, ...info }));
  }
}
