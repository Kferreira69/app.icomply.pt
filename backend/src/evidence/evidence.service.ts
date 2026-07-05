import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';
import { EvidenceStatus } from '@prisma/client';

@Injectable()
export class EvidenceService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async upload(
    file: Express.Multer.File,
    metadata: {
      title: string;
      description?: string;
      projectId?: string;
      taskId?: string;
      controlId?: string;
      riskId?: string;
      tags?: string[];
      expiresAt?: string;
    },
    uploadedById: string,
    organizationId: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    const { key, url, size } = await this.storage.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      `evidence/${organizationId}`,
    );

    return this.prisma.evidence.create({
      data: {
        title: metadata.title,
        description: metadata.description,
        fileName: file.originalname,
        fileSize: size,
        mimeType: file.mimetype,
        s3Key: key,
        s3Url: url,
        uploadedById,
        projectId: metadata.projectId || null,
        taskId: metadata.taskId || null,
        controlId: metadata.controlId || null,
        riskId: metadata.riskId || null,
        tags: metadata.tags || [],
        expiresAt: metadata.expiresAt ? new Date(metadata.expiresAt) : null,
        status: EvidenceStatus.PENDING,
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findAll(
    organizationId: string,
    projectId?: string,
    taskId?: string,
    status?: EvidenceStatus,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {
      uploadedBy: { organizationId },
      ...(projectId && { projectId }),
      ...(taskId && { taskId }),
      ...(status && { status }),
    };

    const [data, total] = await Promise.all([
      this.prisma.evidence.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: { select: { id: true, firstName: true, lastName: true } },
          project: { select: { id: true, name: true } },
          task: { select: { id: true, title: true } },
        },
      }),
      this.prisma.evidence.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, organizationId: string) {
    const ev = await this.prisma.evidence.findFirst({
      where: { id, uploadedBy: { organizationId } },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
        control: { select: { id: true, code: true, title: true } },
      },
    });
    if (!ev) throw new NotFoundException('Evidence not found');

    // Refresh presigned URL
    const freshUrl = await this.storage.getPresignedUrl(ev.s3Key);
    return { ...ev, s3Url: freshUrl };
  }

  async updateStatus(id: string, status: EvidenceStatus, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.evidence.update({
      where: { id },
      data: { status, reviewedAt: new Date() },
    });
  }

  async bulkUpdateStatus(ids: string[], status: EvidenceStatus, organizationId: string) {
    // Verify all belong to this org
    const count = await this.prisma.evidence.count({
      where: { id: { in: ids }, uploadedBy: { organizationId } },
    });
    if (count !== ids.length) throw new NotFoundException('Some evidence records not found');

    await this.prisma.evidence.updateMany({
      where: { id: { in: ids } },
      data: { status, reviewedAt: new Date() },
    });
    return { updated: ids.length, status };
  }

  async getGapAnalysis(organizationId: string, frameworkId: string) {
    const controls = await this.prisma.control.findMany({
      where: { frameworkId },
      include: {
        evidences: {
          where: {
            uploadedBy: { organizationId },
            status: EvidenceStatus.APPROVED,
          },
          select: { id: true },
        },
      },
    });

    const total = controls.length;
    const covered = controls.filter(c => c.evidences.length > 0).length;
    const gap = total - covered;

    return {
      total,
      covered,
      gap,
      coveragePercentage: total > 0 ? Math.round((covered / total) * 100) : 0,
      controls: controls.map(c => ({
        id: c.id,
        code: c.code,
        title: c.title,
        hasCoverage: c.evidences.length > 0,
        evidenceCount: c.evidences.length,
      })),
    };
  }
}
