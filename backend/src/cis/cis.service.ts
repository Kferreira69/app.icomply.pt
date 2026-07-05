import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

const CIS_CONTROLS = [
  // IG1 - Basic Cyber Hygiene
  { controlId: 'CIS-1', safeGuardId: 'CIS-1.1', implementationGroup: 'IG1', title: 'Inventory of Enterprise Assets', description: 'Establish and maintain detailed inventory of all enterprise assets', assetType: 'Devices', securityFunction: 'Identify' },
  { controlId: 'CIS-2', safeGuardId: 'CIS-2.1', implementationGroup: 'IG1', title: 'Inventory of Software Assets', description: 'Establish and maintain detailed inventory of all licensed software', assetType: 'Software', securityFunction: 'Identify' },
  { controlId: 'CIS-3', safeGuardId: 'CIS-3.1', implementationGroup: 'IG1', title: 'Data Protection', description: 'Establish and maintain data management process', assetType: 'Data', securityFunction: 'Protect' },
  { controlId: 'CIS-4', safeGuardId: 'CIS-4.1', implementationGroup: 'IG1', title: 'Secure Configuration of Enterprise Assets', description: 'Establish and maintain secure configuration process', assetType: 'Devices', securityFunction: 'Protect' },
  { controlId: 'CIS-5', safeGuardId: 'CIS-5.1', implementationGroup: 'IG1', title: 'Account Management', description: 'Use processes and tools to assign and manage authorization to credentials', assetType: 'Users', securityFunction: 'Protect' },
  { controlId: 'CIS-6', safeGuardId: 'CIS-6.1', implementationGroup: 'IG1', title: 'Access Control Management', description: 'Use processes and tools to create, assign, manage and revoke access', assetType: 'Users', securityFunction: 'Protect' },
  { controlId: 'CIS-7', safeGuardId: 'CIS-7.1', implementationGroup: 'IG1', title: 'Continuous Vulnerability Management', description: 'Develop a plan to assess and track vulnerabilities on all enterprise assets', assetType: 'Network', securityFunction: 'Identify' },
  { controlId: 'CIS-8', safeGuardId: 'CIS-8.1', implementationGroup: 'IG1', title: 'Audit Log Management', description: 'Collect, alert, review and retain audit logs', assetType: 'Network', securityFunction: 'Detect' },
  { controlId: 'CIS-9', safeGuardId: 'CIS-9.1', implementationGroup: 'IG1', title: 'Email and Web Browser Protections', description: 'Improve protections and detections of threats from email and web vectors', assetType: 'Network', securityFunction: 'Protect' },
  { controlId: 'CIS-10', safeGuardId: 'CIS-10.1', implementationGroup: 'IG1', title: 'Malware Defenses', description: 'Prevent or control installation, spread and execution of malicious applications', assetType: 'Devices', securityFunction: 'Protect' },
  { controlId: 'CIS-11', safeGuardId: 'CIS-11.1', implementationGroup: 'IG1', title: 'Data Recovery', description: 'Establish and maintain data recovery practices', assetType: 'Data', securityFunction: 'Recover' },
  // IG2 - Advanced
  { controlId: 'CIS-12', safeGuardId: 'CIS-12.1', implementationGroup: 'IG2', title: 'Network Infrastructure Management', description: 'Establish, implement and actively manage network devices', assetType: 'Network', securityFunction: 'Protect' },
  { controlId: 'CIS-13', safeGuardId: 'CIS-13.1', implementationGroup: 'IG2', title: 'Network Monitoring and Defense', description: 'Operate processes and tooling to establish and maintain network monitoring', assetType: 'Network', securityFunction: 'Detect' },
  { controlId: 'CIS-14', safeGuardId: 'CIS-14.1', implementationGroup: 'IG2', title: 'Security Awareness and Skills Training', description: 'Establish and maintain security awareness program', assetType: 'Users', securityFunction: 'Protect' },
  { controlId: 'CIS-15', safeGuardId: 'CIS-15.1', implementationGroup: 'IG2', title: 'Service Provider Management', description: 'Develop a process to evaluate service providers', assetType: 'Network', securityFunction: 'Identify' },
  { controlId: 'CIS-16', safeGuardId: 'CIS-16.1', implementationGroup: 'IG2', title: 'Application Software Security', description: 'Manage security lifecycle of in-house developed, hosted or acquired software', assetType: 'Software', securityFunction: 'Protect' },
  // IG3 - Expert
  { controlId: 'CIS-17', safeGuardId: 'CIS-17.1', implementationGroup: 'IG3', title: 'Incident Response Management', description: 'Establish a program to develop and maintain incident response capability', assetType: 'Network', securityFunction: 'Respond' },
  { controlId: 'CIS-18', safeGuardId: 'CIS-18.1', implementationGroup: 'IG3', title: 'Penetration Testing', description: 'Test the effectiveness and resiliency of enterprise assets through penetration testing', assetType: 'Network', securityFunction: 'Identify' },
];

@Injectable()
export class CisService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(organizationId: string) {
    const controls = await (this.prisma as any).cisControl.findMany({
      where: { organizationId },
      orderBy: [{ controlId: 'asc' }, { safeGuardId: 'asc' }],
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

    const ig1 = controls.filter((c: any) => c.implementationGroup === 'IG1');
    const ig2 = controls.filter((c: any) => c.implementationGroup === 'IG2');
    const ig3 = controls.filter((c: any) => c.implementationGroup === 'IG3');

    const igScore = (arr: any[]) => {
      const applicable = arr.filter((c: any) => c.status !== 'NOT_APPLICABLE');
      if (!applicable.length) return 0;
      const imp = applicable.filter((c: any) => c.status === 'IMPLEMENTED').length;
      const par = applicable.filter((c: any) => c.status === 'PARTIAL').length;
      return Math.round(((imp + par * 0.5) / applicable.length) * 100);
    };

    return {
      summary: { total, implemented, partial, notImplemented, notApplicable },
      overallScore: igScore(controls.filter((c: any) => c.status !== 'NOT_APPLICABLE')),
      byGroup: {
        IG1: { controls: ig1, score: igScore(ig1) },
        IG2: { controls: ig2, score: igScore(ig2) },
        IG3: { controls: ig3, score: igScore(ig3) },
      },
    };
  }

  async updateControl(organizationId: string, id: string, dto: any) {
    const control = await (this.prisma as any).cisControl.findFirst({ where: { id, organizationId } });
    if (!control) throw new NotFoundException('Control not found');
    return (this.prisma as any).cisControl.update({ where: { id }, data: dto });
  }

  async bulkUpdate(organizationId: string, updates: { id: string; status: string; evidence?: string; notes?: string }[]) {
    const results = await Promise.all(
      updates.map(({ id, ...data }) =>
        (this.prisma as any).cisControl.updateMany({ where: { id, organizationId }, data }),
      ),
    );
    return { updated: results.reduce((sum, r) => sum + r.count, 0) };
  }

  private async seedControls(organizationId: string) {
    for (const c of CIS_CONTROLS) {
      await (this.prisma as any).cisControl.upsert({
        where: { organizationId_controlId_safeGuardId: { organizationId, controlId: c.controlId, safeGuardId: c.safeGuardId } },
        create: { organizationId, ...c, status: 'NOT_IMPLEMENTED' },
        update: {},
      });
    }
  }
}
