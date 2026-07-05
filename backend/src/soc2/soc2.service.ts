import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

const SOC2_CRITERIA = [
  // CC — Common Criteria (Security)
  { criterionCode: 'CC1.1', category: 'CC', title: 'COSO Principle 1 — Demonstrates Commitment to Integrity and Ethical Values', description: 'The entity demonstrates a commitment to integrity and ethical values.' },
  { criterionCode: 'CC1.2', category: 'CC', title: 'COSO Principle 2 — Exercises Oversight Responsibility', description: 'Board of directors demonstrates independence from management.' },
  { criterionCode: 'CC1.3', category: 'CC', title: 'COSO Principle 3 — Establishes Structure, Authority, and Responsibility', description: 'Management establishes structure, reporting lines, and authorities.' },
  { criterionCode: 'CC1.4', category: 'CC', title: 'COSO Principle 4 — Demonstrates Commitment to Competence', description: 'The entity demonstrates a commitment to attract, develop, and retain competent individuals.' },
  { criterionCode: 'CC1.5', category: 'CC', title: 'COSO Principle 5 — Enforces Accountability', description: 'The entity holds individuals accountable for their internal control responsibilities.' },
  { criterionCode: 'CC2.1', category: 'CC', title: 'COSO Principle 13 — Uses Relevant Information', description: 'The entity obtains or generates relevant, quality information to support the functioning of internal controls.' },
  { criterionCode: 'CC2.2', category: 'CC', title: 'COSO Principle 14 — Communicates Internally', description: 'The entity internally communicates information necessary to support the functioning of internal controls.' },
  { criterionCode: 'CC2.3', category: 'CC', title: 'COSO Principle 15 — Communicates Externally', description: 'The entity communicates with external parties regarding matters affecting the functioning of internal controls.' },
  { criterionCode: 'CC6.1', category: 'CC', title: 'Logical and Physical Access Controls — Restricts Logical Access', description: 'The entity implements logical access security software, infrastructure, and architectures.' },
  { criterionCode: 'CC6.2', category: 'CC', title: 'Logical and Physical Access Controls — Prior to Issuing Credentials', description: 'New internal and external users, including employees, are registered and authorized.' },
  { criterionCode: 'CC6.3', category: 'CC', title: 'Logical and Physical Access Controls — Removes Access', description: 'Access to system components is removed when access is no longer authorized.' },
  { criterionCode: 'CC6.6', category: 'CC', title: 'Logical and Physical Access Controls — Restricts Access to Threats', description: 'The entity implements controls to restrict access from outside its boundaries.' },
  { criterionCode: 'CC6.7', category: 'CC', title: 'Logical and Physical Access Controls — Restricts Transmission', description: 'The entity restricts the transmission, movement, and removal of information.' },
  { criterionCode: 'CC7.1', category: 'CC', title: 'System Operations — Detects and Monitors', description: 'The entity uses detection and monitoring procedures to identify changes to configurations.' },
  { criterionCode: 'CC7.2', category: 'CC', title: 'System Operations — Monitors System Components', description: 'The entity monitors system components to detect anomalies that indicate malicious acts.' },
  { criterionCode: 'CC7.4', category: 'CC', title: 'System Operations — Responds to Security Incidents', description: 'The entity responds to identified security incidents by executing a defined incident response program.' },
  { criterionCode: 'CC8.1', category: 'CC', title: 'Change Management — Authorizes Changes', description: 'The entity authorizes, designs, develops, configures, documents, and implements changes to infrastructure.' },
  { criterionCode: 'CC9.1', category: 'CC', title: 'Risk Mitigation — Identifies, Selects, and Develops Risk Mitigation Activities', description: 'The entity identifies, selects, and develops risk mitigation activities.' },
  { criterionCode: 'CC9.2', category: 'CC', title: 'Risk Mitigation — Assesses and Manages Risks from Vendors', description: 'The entity assesses and manages risks associated with vendors and business partners.' },
  // A — Availability
  { criterionCode: 'A1.1', category: 'A', title: 'Availability — Current Processing Capacity', description: 'The entity maintains, monitors, and evaluates current processing capacity and use of system components.' },
  { criterionCode: 'A1.2', category: 'A', title: 'Availability — Environmental Threats', description: 'The entity authorizes, designs, develops, implements, operates, approves, and reviews procedures.' },
  { criterionCode: 'A1.3', category: 'A', title: 'Availability — Recovery Plan', description: 'The entity tests recovery plan procedures to ensure system recovery in the event of a disaster.' },
  // PI — Processing Integrity
  { criterionCode: 'PI1.1', category: 'PI', title: 'Processing Integrity — Complete, Accurate Processing', description: 'The entity obtains or generates, uses, and communicates relevant, quality information to support processing integrity.' },
  { criterionCode: 'PI1.2', category: 'PI', title: 'Processing Integrity — System Inputs Properly Authorized', description: 'The entity implements policies and procedures over system inputs, including controls over completeness and accuracy.' },
  { criterionCode: 'PI1.3', category: 'PI', title: 'Processing Integrity — System Processing Complete and Accurate', description: 'The entity implements policies and procedures to ensure processing is complete, valid, and accurate.' },
  // C — Confidentiality
  { criterionCode: 'C1.1', category: 'C', title: 'Confidentiality — Identifies and Maintains Confidential Information', description: 'The entity identifies and maintains confidential information to meet the entity\'s objectives.' },
  { criterionCode: 'C1.2', category: 'C', title: 'Confidentiality — Disposes of Confidential Information', description: 'The entity disposes of confidential information to meet the entity\'s objectives.' },
  // P — Privacy
  { criterionCode: 'P1.1', category: 'P', title: 'Privacy — Notice', description: 'The entity provides notice to data subjects about its privacy practices.' },
  { criterionCode: 'P2.1', category: 'P', title: 'Privacy — Choice and Consent', description: 'The entity communicates choices available regarding the collection, use, retention, disclosure, and disposal of personal information.' },
  { criterionCode: 'P3.1', category: 'P', title: 'Privacy — Collection', description: 'Personal information is collected consistent with the entity\'s objectives.' },
  { criterionCode: 'P4.1', category: 'P', title: 'Privacy — Use, Retention, and Disposal', description: 'Personal information is limited to the purposes identified in the notice.' },
  { criterionCode: 'P5.1', category: 'P', title: 'Privacy — Access', description: 'The entity grants identified and authenticated data subjects the ability to access their information.' },
  { criterionCode: 'P6.1', category: 'P', title: 'Privacy — Disclosure and Notification', description: 'Personal information is disclosed only for the purposes identified in the notice.' },
  { criterionCode: 'P7.1', category: 'P', title: 'Privacy — Quality', description: 'The entity collects and maintains accurate, up-to-date, complete, and relevant personal information.' },
  { criterionCode: 'P8.1', category: 'P', title: 'Privacy — Monitoring and Enforcement', description: 'The entity monitors compliance with its privacy policies and procedures.' },
];

@Injectable()
export class Soc2Service {
  constructor(private prisma: PrismaService) {}

  async initOrganization(orgId: string) {
    const db = this.prisma as any;

    for (const criterion of SOC2_CRITERIA) {
      const existing = await db.soc2Criterion.findUnique({
        where: {
          organizationId_criterionCode: {
            organizationId: orgId,
            criterionCode: criterion.criterionCode,
          },
        },
      });

      if (!existing) {
        await db.soc2Criterion.create({
          data: {
            ...criterion,
            organizationId: orgId,
            status: 'NOT_STARTED',
          },
        });
      }
    }
  }

  async getDashboard(orgId: string) {
    const db = this.prisma as any;

    const total = await db.soc2Criterion.count({
      where: { organizationId: orgId },
    });

    if (total === 0) {
      await this.initOrganization(orgId);
    }

    const criteria = await db.soc2Criterion.findMany({
      where: { organizationId: orgId },
      orderBy: [{ category: 'asc' }, { criterionCode: 'asc' }],
    });

    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = { CC: 0, A: 0, PI: 0, C: 0, P: 0 };

    for (const c of criteria) {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      if (c.category in byCategory) {
        byCategory[c.category] += 1;
      } else {
        byCategory[c.category] = 1;
      }
    }

    const implemented = byStatus['IMPLEMENTED'] || 0;
    const score = criteria.length > 0
      ? Math.round((implemented / criteria.length) * 100)
      : 0;

    return {
      total: criteria.length,
      byCategory,
      byStatus,
      score,
      criteria,
    };
  }

  async updateCriterion(orgId: string, criterionCode: string, data: any) {
    const db = this.prisma as any;

    return db.soc2Criterion.update({
      where: {
        organizationId_criterionCode: {
          organizationId: orgId,
          criterionCode,
        },
      },
      data,
    });
  }

  async bulkUpdate(
    orgId: string,
    updates: { criterionCode: string; status: string }[],
  ) {
    const db = this.prisma as any;

    const results = await Promise.all(
      updates.map((u) =>
        db.soc2Criterion.update({
          where: {
            organizationId_criterionCode: {
              organizationId: orgId,
              criterionCode: u.criterionCode,
            },
          },
          data: { status: u.status },
        }),
      ),
    );

    return results;
  }
}
