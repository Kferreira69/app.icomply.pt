import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';
import {
  DOC_ALLOWED_EXT, DOC_MAX_BYTES, isAllowedDocFile, nextMinorVersion,
} from '../common/storage/upload-rules';

export const QUALITY_DOC_TYPES = ['MANUAL', 'PROCEDURE', 'INSTRUCTION', 'FORM', 'RECORD', 'OTHER'] as const;
export const QUALITY_DOC_MAX_BYTES = DOC_MAX_BYTES;
export const QUALITY_DOC_ALLOWED_EXT = DOC_ALLOWED_EXT;

const USER_SELECT = { select: { id: true, firstName: true, lastName: true } };

@Injectable()
export class QualityDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  static isAllowedFile(originalName: string): boolean {
    return isAllowedDocFile(originalName);
  }

  private assertFile(file?: Express.Multer.File): Express.Multer.File {
    if (!file) throw new BadRequestException('Ficheiro em falta');
    if (!QualityDocumentsService.isAllowedFile(file.originalname)) {
      throw new BadRequestException(
        `Tipo de ficheiro não permitido. Permitidos: ${QUALITY_DOC_ALLOWED_EXT.join(', ')}`,
      );
    }
    if (file.size > QUALITY_DOC_MAX_BYTES) {
      throw new BadRequestException('Ficheiro demasiado grande (máx. 25 MB)');
    }
    return file;
  }

  private parseTags(raw: unknown): string[] {
    if (Array.isArray(raw)) return raw.map(String).map(t => t.trim()).filter(Boolean);
    if (typeof raw === 'string') return raw.split(',').map(t => t.trim()).filter(Boolean);
    return [];
  }

  private parseDate(raw: unknown): Date | null {
    if (!raw || typeof raw !== 'string') return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  async list(orgId: string, filters: { clause?: string; status?: string; docType?: string }) {
    const where: any = { organizationId: orgId };
    if (filters.clause) where.clause = filters.clause;
    if (filters.status) where.status = filters.status;
    if (filters.docType) where.docType = filters.docType;
    return this.prisma.qualityDocument.findMany({
      where,
      orderBy: [{ clause: 'asc' }, { title: 'asc' }],
      include: {
        owner: USER_SELECT,
        approver: USER_SELECT,
        _count: { select: { versions: true } },
      },
    });
  }

  async get(id: string, orgId: string) {
    const doc = await this.prisma.qualityDocument.findFirst({
      where: { id, organizationId: orgId },
      include: {
        owner: USER_SELECT,
        approver: USER_SELECT,
        versions: { orderBy: { createdAt: 'desc' }, include: { uploadedBy: USER_SELECT } },
      },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado');
    return doc;
  }

  async create(orgId: string, userId: string, body: any, file?: Express.Multer.File) {
    const f = this.assertFile(file);
    const title = String(body?.title ?? '').trim();
    const clause = String(body?.clause ?? '').trim();
    if (!title) throw new BadRequestException('Título obrigatório');
    if (!/^\d+(\.\d+)*$/.test(clause)) {
      throw new BadRequestException('Cláusula inválida (ex.: 4, 5.3, 7.5, 8.2)');
    }
    const docType = QUALITY_DOC_TYPES.includes(body?.docType) ? body.docType : 'OTHER';
    const version = String(body?.version ?? '1.0').trim() || '1.0';

    const { key, size } = await this.storage.uploadFile(
      f.buffer, f.originalname, f.mimetype, `quality-documents/${orgId}`,
    );

    return this.prisma.qualityDocument.create({
      data: {
        organizationId: orgId,
        clause,
        code: body?.code ? String(body.code).trim() : null,
        title,
        docType,
        description: body?.description ? String(body.description) : null,
        currentVersion: version,
        ownerId: userId,
        effectiveDate: this.parseDate(body?.effectiveDate),
        reviewDate: this.parseDate(body?.reviewDate),
        tags: this.parseTags(body?.tags),
        versions: {
          create: {
            version,
            fileName: f.originalname,
            fileSize: size,
            mimeType: f.mimetype,
            s3Key: key,
            changeNote: 'Versão inicial',
            uploadedById: userId,
          },
        },
      },
      include: { owner: USER_SELECT, versions: true },
    });
  }

  async update(id: string, orgId: string, body: any) {
    await this.get(id, orgId);
    const data: any = {};
    if (body.title !== undefined) data.title = String(body.title).trim();
    if (body.code !== undefined) data.code = body.code ? String(body.code).trim() : null;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.docType !== undefined && QUALITY_DOC_TYPES.includes(body.docType)) data.docType = body.docType;
    if (body.clause !== undefined) {
      if (!/^\d+(\.\d+)*$/.test(String(body.clause))) throw new BadRequestException('Cláusula inválida');
      data.clause = String(body.clause);
    }
    if (body.effectiveDate !== undefined) data.effectiveDate = this.parseDate(body.effectiveDate);
    if (body.reviewDate !== undefined) data.reviewDate = this.parseDate(body.reviewDate);
    if (body.tags !== undefined) data.tags = this.parseTags(body.tags);
    return this.prisma.qualityDocument.update({
      where: { id },
      data,
      include: { owner: USER_SELECT, approver: USER_SELECT },
    });
  }

  /** Upload a new file version. The document goes back to DRAFT and must be re-approved. */
  async addVersion(id: string, orgId: string, userId: string, body: any, file?: Express.Multer.File) {
    const doc = await this.get(id, orgId);
    const f = this.assertFile(file);
    const version = String(body?.version ?? '').trim() || nextMinorVersion(doc.currentVersion);
    if (doc.versions.some(v => v.version === version)) {
      throw new BadRequestException(`A versão ${version} já existe`);
    }
    const { key, size } = await this.storage.uploadFile(
      f.buffer, f.originalname, f.mimetype, `quality-documents/${orgId}`,
    );
    const [, updated] = await this.prisma.$transaction([
      this.prisma.qualityDocumentVersion.create({
        data: {
          documentId: id,
          version,
          fileName: f.originalname,
          fileSize: size,
          mimeType: f.mimetype,
          s3Key: key,
          changeNote: body?.changeNote ? String(body.changeNote) : null,
          uploadedById: userId,
        },
      }),
      this.prisma.qualityDocument.update({
        where: { id },
        data: { currentVersion: version, status: 'DRAFT', approverId: null, approvedAt: null },
        include: { owner: USER_SELECT },
      }),
    ]);
    return updated;
  }

  private async transition(id: string, orgId: string, from: string[], data: any) {
    const doc = await this.get(id, orgId);
    if (!from.includes(doc.status)) {
      throw new BadRequestException(`Transição inválida a partir do estado ${doc.status}`);
    }
    return this.prisma.qualityDocument.update({
      where: { id },
      data,
      include: { owner: USER_SELECT, approver: USER_SELECT },
    });
  }

  submit(id: string, orgId: string) {
    return this.transition(id, orgId, ['DRAFT'], { status: 'IN_REVIEW' });
  }

  async approve(id: string, orgId: string, approverId: string) {
    // Segregation of duties (same principle as policy approval): whoever
    // uploaded the version being approved cannot approve it.
    const doc = await this.get(id, orgId);
    if (doc.status !== 'IN_REVIEW') {
      throw new BadRequestException(`Transição inválida a partir do estado ${doc.status}`);
    }
    const current = doc.versions.find(v => v.version === doc.currentVersion);
    if (current && current.uploadedById === approverId) {
      throw new ForbiddenException(
        'Quem carregou esta versão não pode aprová-la (separação de funções)',
      );
    }
    return this.transition(id, orgId, ['IN_REVIEW'], {
      status: 'APPROVED', approverId, approvedAt: new Date(),
    });
  }

  markObsolete(id: string, orgId: string) {
    return this.transition(id, orgId, ['DRAFT', 'IN_REVIEW', 'APPROVED'], { status: 'OBSOLETE' });
  }

  revertToDraft(id: string, orgId: string) {
    return this.transition(id, orgId, ['IN_REVIEW', 'APPROVED', 'OBSOLETE'], {
      status: 'DRAFT', approverId: null, approvedAt: null,
    });
  }

  /**
   * Streams the file through the API instead of handing out a storage URL:
   * the S3 endpoint is an internal Docker hostname (not reachable from a
   * browser) and this way every download is authenticated + org-scoped.
   */
  async getFile(id: string, versionId: string | undefined, orgId: string) {
    const doc = await this.get(id, orgId);
    const version = versionId
      ? doc.versions.find(v => v.id === versionId)
      : doc.versions.find(v => v.version === doc.currentVersion) ?? doc.versions[0];
    if (!version) throw new NotFoundException('Versão não encontrada');
    const buffer =
      this.storage.readLocalFile(version.s3Key) ?? (await this.storage.readS3Buffer(version.s3Key));
    if (!buffer) throw new NotFoundException('Ficheiro não encontrado no armazenamento');
    return { buffer, fileName: version.fileName, mimeType: version.mimeType };
  }

  async remove(id: string, orgId: string) {
    const doc = await this.get(id, orgId);
    for (const v of doc.versions) {
      await this.storage.deleteFile(v.s3Key).catch(() => undefined);
    }
    await this.prisma.qualityDocument.delete({ where: { id } });
    return { deleted: true };
  }
}
