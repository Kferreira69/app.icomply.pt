import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ISO9001_CONTROLS = [
  { controlCode: 'ISO9001-4.1', clauseNumber: '4.1', title: 'Understanding the organization', description: 'Determine external and internal issues relevant to quality objectives' },
  { controlCode: 'ISO9001-4.2', clauseNumber: '4.2', title: 'Interested parties', description: 'Determine interested parties and their requirements' },
  { controlCode: 'ISO9001-4.4', clauseNumber: '4.4', title: 'QMS processes', description: 'Establish, implement, maintain and improve QMS processes' },
  { controlCode: 'ISO9001-5.1', clauseNumber: '5.1', title: 'Leadership and commitment', description: 'Management demonstrates leadership and commitment to QMS' },
  { controlCode: 'ISO9001-5.2', clauseNumber: '5.2', title: 'Quality policy', description: 'Establish, implement and communicate the quality policy' },
  { controlCode: 'ISO9001-6.1', clauseNumber: '6.1', title: 'Risks and opportunities', description: 'Determine risks and opportunities relevant to QMS' },
  { controlCode: 'ISO9001-6.2', clauseNumber: '6.2', title: 'Quality objectives', description: 'Establish quality objectives at relevant levels and functions' },
  { controlCode: 'ISO9001-7.1', clauseNumber: '7.1', title: 'Resources', description: 'Determine and provide necessary resources for QMS' },
  { controlCode: 'ISO9001-7.2', clauseNumber: '7.2', title: 'Competence', description: 'Determine competence of persons affecting quality performance' },
  { controlCode: 'ISO9001-7.5', clauseNumber: '7.5', title: 'Documented information', description: 'Maintain and retain documented information required by QMS' },
  { controlCode: 'ISO9001-8.1', clauseNumber: '8.1', title: 'Operational planning and control', description: 'Plan, implement and control processes to meet requirements' },
  { controlCode: 'ISO9001-8.2', clauseNumber: '8.2', title: 'Customer requirements', description: 'Determine, review and communicate customer requirements' },
  { controlCode: 'ISO9001-8.4', clauseNumber: '8.4', title: 'Externally provided processes', description: 'Control externally provided products and services' },
  { controlCode: 'ISO9001-8.5', clauseNumber: '8.5', title: 'Production and service provision', description: 'Implement production and service provision under controlled conditions' },
  { controlCode: 'ISO9001-8.6', clauseNumber: '8.6', title: 'Release of products/services', description: 'Implement planned arrangements for product/service release' },
  { controlCode: 'ISO9001-8.7', clauseNumber: '8.7', title: 'Nonconforming outputs', description: 'Ensure nonconforming outputs are identified and controlled' },
  { controlCode: 'ISO9001-9.1', clauseNumber: '9.1', title: 'Monitoring and measurement', description: 'Monitor, measure, analyse and evaluate QMS performance' },
  { controlCode: 'ISO9001-9.2', clauseNumber: '9.2', title: 'Internal audit', description: 'Conduct internal audits at planned intervals' },
  { controlCode: 'ISO9001-9.3', clauseNumber: '9.3', title: 'Management review', description: 'Top management reviews the QMS at planned intervals' },
  { controlCode: 'ISO9001-10.1', clauseNumber: '10.1', title: 'Continual improvement', description: 'Determine and select opportunities for improvement' },
  { controlCode: 'ISO9001-10.2', clauseNumber: '10.2', title: 'Nonconformity and corrective action', description: 'React to nonconformities and take corrective action' },
];

@Injectable()
export class QualityService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(organizationId: string) {
    const [controls, capas] = await Promise.all([
      (this.prisma as any).qualityControl.findMany({
        where: { organizationId },
        orderBy: { clauseNumber: 'asc' },
      }),
      (this.prisma as any).capaRecord.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    if (controls.length === 0) {
      await this.seedControls(organizationId);
      return this.getDashboard(organizationId);
    }

    const totalControls = controls.length;
    const assessed = controls.filter((c: any) => c.status !== 'NOT_ASSESSED').length;
    const implemented = controls.filter((c: any) => c.status === 'IMPLEMENTED').length;

    const openCapas = capas.filter((c: any) => ['OPEN', 'IN_PROGRESS', 'PENDING_VERIFICATION'].includes(c.status)).length;
    const closedCapas = capas.filter((c: any) => c.status === 'CLOSED').length;

    const overdue = capas.filter((c: any) =>
      c.dueDate && new Date(c.dueDate) < new Date() && c.status !== 'CLOSED' && c.status !== 'CANCELLED'
    ).length;

    return {
      summary: { totalControls, assessed, implemented, openCapas, closedCapas, overdue },
      controls,
      recentCapas: capas,
    };
  }

  // CAPA CRUD
  async createCapa(organizationId: string, userId: string, dto: any) {
    const capaId = 'CAPA-' + Date.now().toString().slice(-6);
    return (this.prisma as any).capaRecord.create({
      data: { organizationId, capaId, responsibleId: userId, ...dto },
    });
  }

  async listCapas(organizationId: string, type?: string, status?: string) {
    const where: any = { organizationId };
    if (type) where.type = type;
    if (status) where.status = status;
    return (this.prisma as any).capaRecord.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async updateCapa(organizationId: string, id: string, dto: any) {
    const capa = await (this.prisma as any).capaRecord.findFirst({ where: { id, organizationId } });
    if (!capa) throw new NotFoundException('CAPA not found');
    const data: any = { ...dto };
    if (dto.status === 'CLOSED' && !capa.closedAt) data.closedAt = new Date();
    if (dto.status === 'PENDING_VERIFICATION' && !capa.verifiedAt) data.verifiedAt = null;
    return (this.prisma as any).capaRecord.update({ where: { id }, data });
  }

  async removeCapa(organizationId: string, id: string) {
    const capa = await (this.prisma as any).capaRecord.findFirst({ where: { id, organizationId } });
    if (!capa) throw new NotFoundException('CAPA not found');
    return (this.prisma as any).capaRecord.delete({ where: { id } });
  }

  // Controls
  async updateControl(organizationId: string, id: string, dto: any) {
    const control = await (this.prisma as any).qualityControl.findFirst({ where: { id, organizationId } });
    if (!control) throw new NotFoundException('Control not found');
    return (this.prisma as any).qualityControl.update({ where: { id }, data: dto });
  }

  private async seedControls(organizationId: string) {
    for (const c of ISO9001_CONTROLS) {
      await (this.prisma as any).qualityControl.upsert({
        where: { organizationId_controlCode: { organizationId, controlCode: c.controlCode } },
        create: { organizationId, ...c, status: 'NOT_ASSESSED' },
        update: {},
      });
    }
  }
}
