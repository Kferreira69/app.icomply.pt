import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SoaImplementationStatus } from '../generated/prisma/client';

// ISO 27001:2022 — all 93 controls across 4 themes
const ISO_CONTROLS = [
  // A.5 Organizational Controls (37)
  { code: 'A.5.1',  theme: 'Organizational', title: 'Policies for information security', description: 'Information security policy and topic-specific policies shall be defined, approved by management, published, communicated to and acknowledged by relevant personnel.' },
  { code: 'A.5.2',  theme: 'Organizational', title: 'Information security roles and responsibilities', description: 'Information security roles and responsibilities shall be defined and allocated according to the organization needs.' },
  { code: 'A.5.3',  theme: 'Organizational', title: 'Segregation of duties', description: 'Conflicting duties and areas of responsibility shall be segregated.' },
  { code: 'A.5.4',  theme: 'Organizational', title: 'Management responsibilities', description: 'Management shall require all personnel to apply information security in accordance with the established policy and procedures.' },
  { code: 'A.5.5',  theme: 'Organizational', title: 'Contact with authorities', description: 'The organization shall establish and maintain contact with relevant authorities.' },
  { code: 'A.5.6',  theme: 'Organizational', title: 'Contact with special interest groups', description: 'The organization shall establish and maintain contact with special interest groups or security forums.' },
  { code: 'A.5.7',  theme: 'Organizational', title: 'Threat intelligence', description: 'Information relating to information security threats shall be collected and analysed to produce threat intelligence.' },
  { code: 'A.5.8',  theme: 'Organizational', title: 'Information security in project management', description: 'Information security shall be integrated into project management.' },
  { code: 'A.5.9',  theme: 'Organizational', title: 'Inventory of information and other associated assets', description: 'An inventory of information and other associated assets shall be developed and maintained.' },
  { code: 'A.5.10', theme: 'Organizational', title: 'Acceptable use of information and other associated assets', description: 'Rules for acceptable use and procedures for handling information and other associated assets shall be identified, documented and implemented.' },
  { code: 'A.5.11', theme: 'Organizational', title: 'Return of assets', description: 'Personnel and other interested parties shall return all organizational assets upon change or termination of their employment.' },
  { code: 'A.5.12', theme: 'Organizational', title: 'Classification of information', description: 'Information shall be classified according to the information security needs of the organization.' },
  { code: 'A.5.13', theme: 'Organizational', title: 'Labelling of information', description: 'An appropriate set of procedures for information labelling shall be developed and implemented.' },
  { code: 'A.5.14', theme: 'Organizational', title: 'Information transfer', description: 'Information transfer rules, procedures and agreements shall be in place for all types of transfer facilities.' },
  { code: 'A.5.15', theme: 'Organizational', title: 'Access control', description: 'Rules to control physical and logical access to information and other associated assets shall be established and implemented.' },
  { code: 'A.5.16', theme: 'Organizational', title: 'Identity management', description: 'The full life cycle of identities shall be managed.' },
  { code: 'A.5.17', theme: 'Organizational', title: 'Authentication information', description: 'Allocation and management of authentication information shall be controlled by a management process.' },
  { code: 'A.5.18', theme: 'Organizational', title: 'Access rights', description: 'Access rights to information and other associated assets shall be provisioned, reviewed, modified and removed.' },
  { code: 'A.5.19', theme: 'Organizational', title: 'Information security in supplier relationships', description: 'Processes and procedures shall be defined and implemented to manage information security risks associated with the use of supplier products or services.' },
  { code: 'A.5.20', theme: 'Organizational', title: 'Addressing information security within supplier agreements', description: 'Relevant requirements shall be established and agreed with each supplier based on the type of supplier relationship.' },
  { code: 'A.5.21', theme: 'Organizational', title: 'Managing information security in the ICT supply chain', description: 'Processes and procedures shall be defined and implemented to manage security risks associated with the ICT supply chain.' },
  { code: 'A.5.22', theme: 'Organizational', title: 'Monitoring, review and change management of supplier services', description: 'The organization shall regularly monitor, review, evaluate and manage change in supplier information security practices.' },
  { code: 'A.5.23', theme: 'Organizational', title: 'Information security for use of cloud services', description: 'Processes for acquisition, use, management and exit from cloud services shall be established.' },
  { code: 'A.5.24', theme: 'Organizational', title: 'Information security incident management planning and preparation', description: 'The organization shall plan and prepare for managing information security incidents.' },
  { code: 'A.5.25', theme: 'Organizational', title: 'Assessment and decision on information security events', description: 'The organization shall assess information security events and decide if they are to be categorized as incidents.' },
  { code: 'A.5.26', theme: 'Organizational', title: 'Response to information security incidents', description: 'Information security incidents shall be responded to in accordance with the documented procedures.' },
  { code: 'A.5.27', theme: 'Organizational', title: 'Learning from information security incidents', description: 'Knowledge gained from information security incidents shall be used to strengthen controls.' },
  { code: 'A.5.28', theme: 'Organizational', title: 'Collection of evidence', description: 'The organization shall establish and implement procedures for the identification, collection, acquisition and preservation of evidence.' },
  { code: 'A.5.29', theme: 'Organizational', title: 'Information security during disruption', description: 'The organization shall plan how to maintain information security at an appropriate level during disruption.' },
  { code: 'A.5.30', theme: 'Organizational', title: 'ICT readiness for business continuity', description: 'ICT readiness shall be planned, implemented, maintained and tested based on business continuity objectives.' },
  { code: 'A.5.31', theme: 'Organizational', title: 'Legal, statutory, regulatory and contractual requirements', description: 'Legal, statutory, regulatory and contractual requirements related to information security shall be identified, documented and kept up to date.' },
  { code: 'A.5.32', theme: 'Organizational', title: 'Intellectual property rights', description: 'The organization shall implement appropriate procedures to protect intellectual property rights.' },
  { code: 'A.5.33', theme: 'Organizational', title: 'Protection of records', description: 'Records shall be protected from loss, destruction, falsification, unauthorized access and unauthorized release.' },
  { code: 'A.5.34', theme: 'Organizational', title: 'Privacy and protection of personal identifiable information', description: 'The organization shall identify and meet the requirements regarding the preservation of privacy and protection of PII.' },
  { code: 'A.5.35', theme: 'Organizational', title: 'Independent review of information security', description: 'The approach to managing and implementing information security shall be reviewed independently at planned intervals.' },
  { code: 'A.5.36', theme: 'Organizational', title: 'Compliance with policies, rules and standards for information security', description: 'Compliance with the information security policies shall be regularly reviewed.' },
  { code: 'A.5.37', theme: 'Organizational', title: 'Documented operating procedures', description: 'Operating procedures for information processing facilities shall be documented and made available.' },

  // A.6 People Controls (8)
  { code: 'A.6.1', theme: 'People', title: 'Screening', description: 'Background verification checks on candidates shall be carried out prior to joining the organization.' },
  { code: 'A.6.2', theme: 'People', title: 'Terms and conditions of employment', description: 'Employment contracts shall state the responsibilities of personnel and the organization for information security.' },
  { code: 'A.6.3', theme: 'People', title: 'Information security awareness, education and training', description: 'Personnel shall receive appropriate training and awareness on information security.' },
  { code: 'A.6.4', theme: 'People', title: 'Disciplinary process', description: 'A disciplinary process shall be formalized and communicated to take actions against personnel who violate information security policy.' },
  { code: 'A.6.5', theme: 'People', title: 'Responsibilities after termination or change of employment', description: 'Information security responsibilities shall remain valid after termination or change of employment.' },
  { code: 'A.6.6', theme: 'People', title: 'Confidentiality or non-disclosure agreements', description: 'Confidentiality or NDA agreements reflecting the organization\'s needs for protection of information shall be identified, documented and reviewed.' },
  { code: 'A.6.7', theme: 'People', title: 'Remote working', description: 'Security measures shall be implemented to protect information accessed, processed or stored at remote working sites.' },
  { code: 'A.6.8', theme: 'People', title: 'Information security event reporting', description: 'The organization shall provide a mechanism for personnel to report observed or suspected information security events.' },

  // A.7 Physical Controls (14)
  { code: 'A.7.1',  theme: 'Physical', title: 'Physical security perimeters', description: 'Security perimeters shall be defined and used to protect areas that contain information and other associated assets.' },
  { code: 'A.7.2',  theme: 'Physical', title: 'Physical entry', description: 'Secure areas shall be protected by appropriate entry controls and access points.' },
  { code: 'A.7.3',  theme: 'Physical', title: 'Securing offices, rooms and facilities', description: 'Physical security for offices, rooms and facilities shall be designed and implemented.' },
  { code: 'A.7.4',  theme: 'Physical', title: 'Physical security monitoring', description: 'Premises shall be continuously monitored for unauthorized physical access.' },
  { code: 'A.7.5',  theme: 'Physical', title: 'Protecting against physical and environmental threats', description: 'Protection against physical and environmental threats shall be designed and implemented.' },
  { code: 'A.7.6',  theme: 'Physical', title: 'Working in secure areas', description: 'Security measures for working in secure areas shall be designed and implemented.' },
  { code: 'A.7.7',  theme: 'Physical', title: 'Clear desk and clear screen', description: 'Clear desk rules for papers and removable storage media and clear screen rules for information processing facilities shall be defined and enforced.' },
  { code: 'A.7.8',  theme: 'Physical', title: 'Equipment siting and protection', description: 'Equipment shall be sited securely and protected.' },
  { code: 'A.7.9',  theme: 'Physical', title: 'Security of assets off-premises', description: 'Off-site assets shall be protected.' },
  { code: 'A.7.10', theme: 'Physical', title: 'Storage media', description: 'Storage media shall be managed through their life cycle of acquisition, use, transportation and disposal.' },
  { code: 'A.7.11', theme: 'Physical', title: 'Supporting utilities', description: 'Information processing facilities shall be protected from power failures and other disruptions caused by failures in supporting utilities.' },
  { code: 'A.7.12', theme: 'Physical', title: 'Cabling security', description: 'Cables carrying power, data or supporting information services shall be protected from interception, interference or damage.' },
  { code: 'A.7.13', theme: 'Physical', title: 'Equipment maintenance', description: 'Equipment shall be maintained correctly to ensure availability, integrity and confidentiality of information.' },
  { code: 'A.7.14', theme: 'Physical', title: 'Secure disposal or re-use of equipment', description: 'Items of equipment containing storage media shall be verified to ensure that any sensitive data and licensed software has been removed or securely overwritten.' },

  // A.8 Technological Controls (34)
  { code: 'A.8.1',  theme: 'Technological', title: 'User end point devices', description: 'Information stored on, processed by or accessible via user end point devices shall be protected.' },
  { code: 'A.8.2',  theme: 'Technological', title: 'Privileged access rights', description: 'The allocation and use of privileged access rights shall be restricted and managed.' },
  { code: 'A.8.3',  theme: 'Technological', title: 'Information access restriction', description: 'Access to information and other associated assets shall be restricted in accordance with the access control policy.' },
  { code: 'A.8.4',  theme: 'Technological', title: 'Access to source code', description: 'Read and write access to source code, development tools and software libraries shall be appropriately managed.' },
  { code: 'A.8.5',  theme: 'Technological', title: 'Secure authentication', description: 'Secure authentication technologies and procedures shall be implemented based on information access restrictions.' },
  { code: 'A.8.6',  theme: 'Technological', title: 'Capacity management', description: 'The use of resources shall be monitored and adjusted in line with current and expected capacity requirements.' },
  { code: 'A.8.7',  theme: 'Technological', title: 'Protection against malware', description: 'Protection against malware shall be implemented and supported by appropriate user awareness.' },
  { code: 'A.8.8',  theme: 'Technological', title: 'Management of technical vulnerabilities', description: 'Information about technical vulnerabilities of information systems shall be obtained and the organization\'s exposure to such vulnerabilities evaluated.' },
  { code: 'A.8.9',  theme: 'Technological', title: 'Configuration management', description: 'Configurations shall be established, documented, implemented, monitored and reviewed.' },
  { code: 'A.8.10', theme: 'Technological', title: 'Information deletion', description: 'Information stored in information systems shall be deleted when no longer required.' },
  { code: 'A.8.11', theme: 'Technological', title: 'Data masking', description: 'Data masking shall be used in accordance with the topic-specific policy on access control and other related policies.' },
  { code: 'A.8.12', theme: 'Technological', title: 'Data leakage prevention', description: 'Data leakage prevention measures shall be applied to systems, networks and any other devices that process, store or transmit sensitive information.' },
  { code: 'A.8.13', theme: 'Technological', title: 'Information backup', description: 'Backup copies of information, software and systems shall be maintained and regularly tested.' },
  { code: 'A.8.14', theme: 'Technological', title: 'Redundancy of information processing facilities', description: 'Information processing facilities shall be implemented with sufficient redundancy to meet availability requirements.' },
  { code: 'A.8.15', theme: 'Technological', title: 'Logging', description: 'Logs that record activities, exceptions, faults and other relevant events shall be produced, stored, protected and analysed.' },
  { code: 'A.8.16', theme: 'Technological', title: 'Monitoring activities', description: 'Networks, systems and applications shall be monitored for anomalous behaviour and appropriate actions taken.' },
  { code: 'A.8.17', theme: 'Technological', title: 'Clock synchronisation', description: 'The clocks of information processing systems used by the organization shall be synchronized to approved time sources.' },
  { code: 'A.8.18', theme: 'Technological', title: 'Use of privileged utility programs', description: 'The use of utility programs that might be capable of overriding system and application controls shall be restricted and tightly controlled.' },
  { code: 'A.8.19', theme: 'Technological', title: 'Installation of software on operational systems', description: 'Procedures and measures shall be implemented to securely manage software installation on operational systems.' },
  { code: 'A.8.20', theme: 'Technological', title: 'Networks security', description: 'Networks and network devices shall be secured, managed and controlled to protect information in systems and applications.' },
  { code: 'A.8.21', theme: 'Technological', title: 'Security of network services', description: 'Security mechanisms, service levels and service requirements of network services shall be identified, implemented and monitored.' },
  { code: 'A.8.22', theme: 'Technological', title: 'Segregation of networks', description: 'Groups of information services, users and information systems shall be segregated in the organization\'s networks.' },
  { code: 'A.8.23', theme: 'Technological', title: 'Web filtering', description: 'Access to external websites shall be managed to reduce exposure to malicious content.' },
  { code: 'A.8.24', theme: 'Technological', title: 'Use of cryptography', description: 'Rules for the effective use of cryptography shall be defined and implemented.' },
  { code: 'A.8.25', theme: 'Technological', title: 'Secure development life cycle', description: 'Rules for the secure development of software and systems shall be established and applied.' },
  { code: 'A.8.26', theme: 'Technological', title: 'Application security requirements', description: 'Information security requirements shall be identified, specified and approved when developing or acquiring applications.' },
  { code: 'A.8.27', theme: 'Technological', title: 'Secure system architecture and engineering principles', description: 'Principles for engineering secure systems shall be established, documented, maintained and applied.' },
  { code: 'A.8.28', theme: 'Technological', title: 'Secure coding', description: 'Secure coding principles shall be applied to software development.' },
  { code: 'A.8.29', theme: 'Technological', title: 'Security testing in development and acceptance', description: 'Security testing processes shall be defined and implemented in the development life cycle.' },
  { code: 'A.8.30', theme: 'Technological', title: 'Outsourced development', description: 'The organization shall direct, monitor and review the activities related to outsourced system development.' },
  { code: 'A.8.31', theme: 'Technological', title: 'Separation of development, test and production environments', description: 'Development, testing and production environments shall be separated and secured.' },
  { code: 'A.8.32', theme: 'Technological', title: 'Change management', description: 'Changes to information processing facilities and information systems shall be subject to change management procedures.' },
  { code: 'A.8.33', theme: 'Technological', title: 'Test information', description: 'Test information shall be appropriately selected, protected and managed.' },
  { code: 'A.8.34', theme: 'Technological', title: 'Protection of information systems during audit testing', description: 'Audit tests and other assurance activities involving assessment of operational systems shall be planned and agreed between the tester and appropriate management.' },
];

@Injectable()
export class SoaService {
  constructor(private prisma: PrismaService) {}

  // ── Bootstrap ─────────────────────────────────────────────────

  private async initOrganization(organizationId: string) {
    const existing = await this.prisma.soaControl.count({ where: { organizationId } });
    if (existing === 0) {
      await this.prisma.soaControl.createMany({
        data: ISO_CONTROLS.map(c => ({
          organizationId,
          controlCode: c.code,
          theme: c.theme,
          title: c.title,
          description: c.description,
          status: SoaImplementationStatus.NOT_STARTED,
          applicable: true,
        })),
        skipDuplicates: true,
      });
    }
  }

  // ── Dashboard ─────────────────────────────────────────────────

  async getDashboard(organizationId: string) {
    await this.initOrganization(organizationId);

    const controls = await this.prisma.soaControl.findMany({ where: { organizationId } });

    const applicable = controls.filter(c => c.applicable);
    const byStatus = applicable.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const implemented = byStatus['IMPLEMENTED'] ?? 0;
    const partial     = byStatus['PARTIALLY_IMPLEMENTED'] ?? 0;
    const total       = applicable.length;
    const score       = total > 0 ? Math.round((implemented + partial * 0.5) / total * 100) : 0;

    const byTheme = ['Organizational', 'People', 'Physical', 'Technological'].map(theme => {
      const tc = applicable.filter(c => c.theme === theme);
      const ti = tc.filter(c => c.status === 'IMPLEMENTED').length;
      const tp = tc.filter(c => c.status === 'PARTIALLY_IMPLEMENTED').length;
      return {
        theme,
        total: tc.length,
        implemented: ti,
        partial: tp,
        score: tc.length > 0 ? Math.round((ti + tp * 0.5) / tc.length * 100) : 0,
      };
    });

    return {
      score,
      totalControls: controls.length,
      applicableControls: total,
      notApplicable: controls.length - total,
      byStatus,
      byTheme,
    };
  }

  // ── Controls ──────────────────────────────────────────────────

  async findAll(organizationId: string, theme?: string) {
    await this.initOrganization(organizationId);
    return this.prisma.soaControl.findMany({
      where: {
        organizationId,
        ...(theme && { theme }),
      },
      orderBy: { controlCode: 'asc' },
    });
  }

  async update(controlCode: string, organizationId: string, data: {
    status?: SoaImplementationStatus;
    applicable?: boolean;
    justification?: string;
    implementationNotes?: string;
    owner?: string;
    targetDate?: Date;
  }) {
    const control = await this.prisma.soaControl.findFirst({
      where: { controlCode, organizationId },
    });
    if (!control) throw new NotFoundException('Control not found');

    return this.prisma.soaControl.update({
      where: { id: control.id },
      data,
    });
  }

  async bulkUpdate(organizationId: string, updates: Array<{
    controlCode: string;
    status?: SoaImplementationStatus;
    applicable?: boolean;
    justification?: string;
    implementationNotes?: string;
    owner?: string;
  }>) {
    const results = await Promise.all(
      updates.map(u => this.update(u.controlCode, organizationId, u))
    );
    return results;
  }

  async getStats(organizationId: string) {
    return this.getDashboard(organizationId);
  }

  // ── Export ────────────────────────────────────────────────────

  async exportCsv(organizationId: string): Promise<string> {
    await this.initOrganization(organizationId);
    const controls = await this.prisma.soaControl.findMany({
      where: { organizationId },
      orderBy: { controlCode: 'asc' },
    });

    const STATUS_LABEL: Record<string, string> = {
      NOT_STARTED:           'Not Started',
      PLANNED:               'Planned',
      PARTIALLY_IMPLEMENTED: 'Partially Implemented',
      IMPLEMENTED:           'Implemented',
      NOT_APPLICABLE:        'Not Applicable',
    };

    const esc = (v: string | null | undefined) =>
      `"${String(v ?? '').replace(/"/g, '""')}"`;

    const header = [
      'Control Code', 'Theme', 'Title', 'Description',
      'Applicable', 'Status', 'Owner', 'Target Date',
      'Implementation Notes', 'Justification',
    ].map(esc).join(',');

    const rows = controls.map(c => [
      esc(c.controlCode),
      esc(c.theme),
      esc(c.title),
      esc(c.description),
      esc(c.applicable ? 'Yes' : 'No'),
      esc(STATUS_LABEL[c.status] ?? c.status),
      esc(c.owner),
      esc(c.targetDate ? c.targetDate.toISOString().split('T')[0] : null),
      esc(c.implementationNotes),
      esc(c.justification),
    ].join(','));

    // UTF-8 BOM prefix so Excel opens it correctly with accented chars
    return '﻿' + [header, ...rows].join('\r\n');
  }
}
