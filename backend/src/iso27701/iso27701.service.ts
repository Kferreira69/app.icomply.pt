import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

const ISO_27701_CONTROLS = [
  // Annex A — PIMS-specific controls for PII controllers
  { controlCode: 'A.7.2.1', clause: 'Annex A', title: 'Identify and document purpose', description: 'The organization shall identify and document the specific purposes for which PII will be processed.', applicableTo: 'CONTROLLER' },
  { controlCode: 'A.7.2.2', clause: 'Annex A', title: 'Identify lawful basis', description: 'The organization shall determine and document the lawful basis for the processing of PII for each purpose.', applicableTo: 'CONTROLLER' },
  { controlCode: 'A.7.2.3', clause: 'Annex A', title: 'Determine when and how consent is obtained', description: 'The organization shall determine, document and implement a process for obtaining consent.', applicableTo: 'CONTROLLER' },
  { controlCode: 'A.7.2.4', clause: 'Annex A', title: 'Obtain and record consent', description: 'The organization shall obtain and keep records of PII principals consent where processing is based on consent.', applicableTo: 'CONTROLLER' },
  { controlCode: 'A.7.2.5', clause: 'Annex A', title: 'Privacy impact assessment', description: 'The organization shall conduct privacy impact assessments when required by applicable law.', applicableTo: 'CONTROLLER' },
  { controlCode: 'A.7.2.6', clause: 'Annex A', title: 'Data minimization', description: 'The organization shall limit the processing of PII to that which is adequate, relevant and necessary.', applicableTo: 'CONTROLLER' },
  { controlCode: 'A.7.2.7', clause: 'Annex A', title: 'Accuracy and quality', description: 'The organization shall ensure that PII processed is accurate and up-to-date.', applicableTo: 'CONTROLLER' },
  { controlCode: 'A.7.2.8', clause: 'Annex A', title: 'PII minimization objectives', description: 'The organization shall establish specific objectives for PII minimization.', applicableTo: 'CONTROLLER' },
  { controlCode: 'A.7.3.1', clause: 'Annex A', title: 'Limit processing to purposes', description: 'Ensure PII is not processed beyond identified purposes unless PII principal consents.', applicableTo: 'CONTROLLER' },
  { controlCode: 'A.7.3.2', clause: 'Annex A', title: 'Compatible use', description: 'Determine whether the use of PII for new purposes is compatible with the original purpose.', applicableTo: 'CONTROLLER' },
  { controlCode: 'A.7.4.1', clause: 'Annex A', title: 'Information to PII principals', description: 'Provide PII principals with information about how their data is processed (privacy notices).', applicableTo: 'CONTROLLER' },
  { controlCode: 'A.7.4.2', clause: 'Annex A', title: 'Providing information', description: 'Ensure privacy notices are clear, concise and accessible.', applicableTo: 'CONTROLLER' },
  { controlCode: 'A.7.5.1', clause: 'Annex A', title: 'Access, rectification and erasure', description: 'Provide PII principals with the ability to access, correct or delete their PII.', applicableTo: 'CONTROLLER' },
  { controlCode: 'A.7.5.2', clause: 'Annex A', title: 'Complaints and inquiries', description: 'Handle complaints and inquiries from PII principals about the processing of their PII.', applicableTo: 'CONTROLLER' },
  { controlCode: 'A.7.5.3', clause: 'Annex A', title: 'Right to data portability', description: 'Provide PII principals with their data in portable format when legally required.', applicableTo: 'CONTROLLER' },
  { controlCode: 'A.7.5.4', clause: 'Annex A', title: 'Right to object', description: 'Provide mechanisms for PII principals to object to processing of their PII.', applicableTo: 'CONTROLLER' },
  // Annex B — PIMS-specific controls for PII processors
  { controlCode: 'B.8.2.1', clause: 'Annex B', title: 'Customer agreement', description: 'Process PII only in accordance with agreements with PII controllers.', applicableTo: 'PROCESSOR' },
  { controlCode: 'B.8.2.2', clause: 'Annex B', title: 'Organization purposes', description: 'Ensure PII is not processed for unauthorized organizational purposes.', applicableTo: 'PROCESSOR' },
  { controlCode: 'B.8.2.3', clause: 'Annex B', title: 'Marketing and advertising', description: 'Do not use PII for marketing without explicit authorization from PII controller.', applicableTo: 'PROCESSOR' },
  { controlCode: 'B.8.2.4', clause: 'Annex B', title: 'Infringing instruction', description: 'Notify controller if instructions would infringe applicable legislation.', applicableTo: 'PROCESSOR' },
  { controlCode: 'B.8.2.5', clause: 'Annex B', title: 'Customer obligations', description: 'Document customer obligations related to PII processing in contracts.', applicableTo: 'PROCESSOR' },
  { controlCode: 'B.8.2.6', clause: 'Annex B', title: 'Sub-processors', description: 'Obtain authorization before engaging sub-processors and ensure same obligations apply.', applicableTo: 'PROCESSOR' },
  { controlCode: 'B.8.3.1', clause: 'Annex B', title: 'Disclosure to third parties', description: 'Disclose PII only with explicit authorization from PII controller.', applicableTo: 'PROCESSOR' },
  { controlCode: 'B.8.4.1', clause: 'Annex B', title: 'Return, transfer, or disposal', description: 'Return or securely dispose of PII per controller instructions.', applicableTo: 'PROCESSOR' },
  { controlCode: 'B.8.5.1', clause: 'Annex B', title: 'PII processing agreement', description: 'Establish documented agreements covering all required PII processing obligations.', applicableTo: 'PROCESSOR' },
];

@Injectable()
export class Iso27701Service {
  constructor(private prisma: PrismaService) {}

  async initOrganization(orgId: string) {
    const db = this.prisma as any;

    for (const control of ISO_27701_CONTROLS) {
      const existing = await db.iso27701Control.findUnique({
        where: {
          organizationId_controlCode: {
            organizationId: orgId,
            controlCode: control.controlCode,
          },
        },
      });

      if (!existing) {
        await db.iso27701Control.create({
          data: {
            ...control,
            organizationId: orgId,
            status: 'NOT_STARTED',
          },
        });
      }
    }
  }

  async getDashboard(orgId: string) {
    const db = this.prisma as any;

    const total = await db.iso27701Control.count({
      where: { organizationId: orgId },
    });

    if (total === 0) {
      await this.initOrganization(orgId);
    }

    const controls = await db.iso27701Control.findMany({
      where: { organizationId: orgId },
      orderBy: [{ clause: 'asc' }, { controlCode: 'asc' }],
    });

    const byStatus: Record<string, number> = {};
    const byApplicableTo: Record<string, number> = {};

    for (const c of controls) {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      byApplicableTo[c.applicableTo] = (byApplicableTo[c.applicableTo] || 0) + 1;
    }

    const implemented = byStatus['IMPLEMENTED'] || 0;
    const score = controls.length > 0
      ? Math.round((implemented / controls.length) * 100)
      : 0;

    return {
      total: controls.length,
      byStatus,
      byApplicableTo,
      score,
      controls,
    };
  }

  async updateControl(orgId: string, controlCode: string, data: any) {
    const db = this.prisma as any;

    await db.iso27701Control.findUnique({
      where: {
        organizationId_controlCode: {
          organizationId: orgId,
          controlCode,
        },
      },
    });

    return db.iso27701Control.update({
      where: {
        organizationId_controlCode: {
          organizationId: orgId,
          controlCode,
        },
      },
      data,
    });
  }

  async bulkUpdateStatus(
    orgId: string,
    updates: { controlCode: string; status: string }[],
  ) {
    const db = this.prisma as any;

    const results = await Promise.all(
      updates.map((u) =>
        db.iso27701Control.update({
          where: {
            organizationId_controlCode: {
              organizationId: orgId,
              controlCode: u.controlCode,
            },
          },
          data: { status: u.status },
        }),
      ),
    );

    return results;
  }
}
