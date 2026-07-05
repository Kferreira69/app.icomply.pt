import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class IntakeService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, userId: string, dto: {
    title: string;
    description?: string;
    fields: any[];
  }) {
    return this.prisma.intakeForm.create({
      data: {
        organizationId,
        createdById: userId,
        title: dto.title,
        description: dto.description,
        fields: dto.fields,
        publicToken: uuid(),
      },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async findAll(organizationId: string) {
    const forms = await this.prisma.intakeForm.findMany({
      where: { organizationId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return forms;
  }

  async findOne(id: string, organizationId: string) {
    const form = await this.prisma.intakeForm.findFirst({
      where: { id, organizationId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { submissions: true } },
      },
    });
    if (!form) throw new NotFoundException('Intake form not found');
    return form;
  }

  async findByToken(token: string) {
    const form = await this.prisma.intakeForm.findUnique({
      where: { publicToken: token },
      select: { id: true, title: true, description: true, fields: true, isActive: true, organization: { select: { name: true } } },
    });
    if (!form) throw new NotFoundException('Form not found');
    if (!form.isActive) throw new ForbiddenException('This form is no longer accepting submissions');
    return form;
  }

  async update(id: string, organizationId: string, dto: {
    title?: string;
    description?: string;
    fields?: any[];
    isActive?: boolean;
  }) {
    await this.findOne(id, organizationId);
    return this.prisma.intakeForm.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    await this.prisma.intakeForm.delete({ where: { id } });
    return { success: true };
  }

  async submitPublic(token: string, dto: {
    answers: Record<string, any>;
    submitterName?: string;
    submitterEmail?: string;
    ipAddress?: string;
  }) {
    const form = await this.findByToken(token);
    return this.prisma.intakeSubmission.create({
      data: {
        intakeFormId: form.id,
        answers: dto.answers,
        submitterName: dto.submitterName,
        submitterEmail: dto.submitterEmail,
        ipAddress: dto.ipAddress,
      },
    });
  }

  async getSubmissions(id: string, organizationId: string, page = 1, limit = 20) {
    await this.findOne(id, organizationId);
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.intakeSubmission.findMany({
        where: { intakeFormId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.intakeSubmission.count({ where: { intakeFormId: id } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getSummary(organizationId: string) {
    const [total, active, totalSubmissions] = await Promise.all([
      this.prisma.intakeForm.count({ where: { organizationId } }),
      this.prisma.intakeForm.count({ where: { organizationId, isActive: true } }),
      this.prisma.intakeSubmission.count({
        where: { form: { organizationId } },
      }),
    ]);
    return { total, active, inactive: total - active, totalSubmissions };
  }
}
