import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';
import { PermissionsService } from '../permissions/permissions.service';
import {
  DOC_ALLOWED_EXT, DOC_MAX_BYTES, isAllowedDocFile, nextMinorVersion,
} from '../common/storage/upload-rules';
import { DEFAULT_DOC_STANDARD, DOC_STANDARDS, DOC_STANDARD_KEYS, standardLabel } from './document-standards';

export const QUALITY_DOC_TYPES = ['MANUAL', 'PROCEDURE', 'INSTRUCTION', 'FORM', 'RECORD', 'OTHER'] as const;
export const QUALITY_DOC_MAX_BYTES = DOC_MAX_BYTES;
export const QUALITY_DOC_ALLOWED_EXT = DOC_ALLOWED_EXT;

const USER_SELECT = { select: { id: true, firstName: true, lastName: true } };

type Level = 1 | 2; // 1 = read, 2 = write

@Injectable()
export class QualityDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly permissions: PermissionsService,
  ) {}

  static isAllowedFile(originalName: string): boolean {
    return isAllowedDocFile(originalName);
  }

  // ── access: decided per standard, by the permission module of that standard ──

  private levelOf(perms: Record<string, number>, standard: string): number {
    const mod = DOC_STANDARDS.find(s => s.key === standard)?.module;
    return mod ? perms[mod] ?? 0 : 0;
  }

  private async assertAccess(userId: string, standard: string, need: Level) {
    const perms = await this.permissions.getUserPermissions(userId);
    if (this.levelOf(perms, standard) < need) {
      throw new ForbiddenException(
        need === 2
          ? 'Sem permissão de escrita neste sistema de gestão'
          : 'Sem acesso aos documentos deste sistema de gestão',
      );
    }
  }

  /**
   * A document serves its primary standard plus any `alsoStandards`. Reading it needs read access to
   * ANY of them (a shared procedure is visible to every team it serves); changing it — new version,
   * approval, move, delete — needs write access to the PRIMARY one, which stays its single owner.
   */
  private canOn(perms: Record<string, number>, doc: { standard: string; alsoStandards?: string[] }, need: Level): boolean {
    if (need === 2) return this.levelOf(perms, doc.standard) >= 2;
    return [doc.standard, ...(doc.alsoStandards ?? [])].some(k => this.levelOf(perms, k) >= 1);
  }

  /** Validates the "also applies to" list: known standards, no duplicates, not the primary one. */
  private parseAlso(raw: unknown, primary: string): string[] {
    const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : [];
    const keys = [...new Set(list.map(x => String(x).trim()).filter(Boolean))].filter(k => k !== primary);
    const bad = keys.filter(k => !DOC_STANDARD_KEYS.includes(k));
    if (bad.length) throw new BadRequestException(`Sistema de gestão inválido: ${bad.join(', ')}`);
    return keys;
  }

  /** Sharing a document with a standard makes it visible to that standard's team, so it needs write access there too. */
  private async assertCanShare(userId: string, keys: string[], already: string[] = []) {
    const added = keys.filter(k => !already.includes(k));
    if (!added.length) return;
    const perms = await this.permissions.getUserPermissions(userId);
    const denied = added.filter(k => this.levelOf(perms, k) < 2);
    if (denied.length) {
      throw new ForbiddenException(`Sem permissão de escrita para partilhar com: ${denied.map(standardLabel).join(', ')}`);
    }
  }

  /** Standards the caller can see, with whether they can also change them. */
  async standards(userId: string) {
    const perms = await this.permissions.getUserPermissions(userId);
    return DOC_STANDARDS
      .map(s => ({ key: s.key, label: s.label, canWrite: this.levelOf(perms, s.key) >= 2, canRead: this.levelOf(perms, s.key) >= 1 }))
      .filter(s => s.canRead)
      .map(({ key, label, canWrite }) => ({ key, label, canWrite }));
  }

  private assertStandard(raw: unknown): string {
    const standard = String(raw ?? DEFAULT_DOC_STANDARD).trim() || DEFAULT_DOC_STANDARD;
    if (!DOC_STANDARD_KEYS.includes(standard)) {
      throw new BadRequestException(`Sistema de gestão inválido. Permitidos: ${DOC_STANDARD_KEYS.join(', ')}`);
    }
    return standard;
  }

  // ── helpers ──

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

  // ── queries ──

  async list(
    orgId: string, userId: string,
    filters: { standard?: string; clause?: string; status?: string; docType?: string },
  ) {
    const perms = await this.permissions.getUserPermissions(userId);
    const allowed = DOC_STANDARDS.filter(s => this.levelOf(perms, s.key) >= 1).map(s => s.key);
    if (!allowed.length) throw new ForbiddenException('Sem acesso a documentos');

    const where: any = { organizationId: orgId };
    if (filters.standard) {
      // A standard's list = documents filed under it + documents shared with it.
      const standard = this.assertStandard(filters.standard);
      if (!allowed.includes(standard)) throw new ForbiddenException('Sem acesso aos documentos deste sistema de gestão');
      where.OR = [{ standard }, { alsoStandards: { has: standard } }];
    } else {
      where.OR = [{ standard: { in: allowed } }, { alsoStandards: { hasSome: allowed } }];
    }
    if (filters.clause) where.clause = filters.clause;
    if (filters.status) where.status = filters.status;
    if (filters.docType) where.docType = filters.docType;
    const docs = await this.prisma.qualityDocument.findMany({
      where,
      orderBy: [{ standard: 'asc' }, { clause: 'asc' }, { title: 'asc' }],
      include: {
        owner: USER_SELECT,
        approver: USER_SELECT,
        _count: { select: { versions: true } },
      },
    });
    // canWrite is per document: a shared document can be read here but only changed by its primary standard's team.
    return docs.map(d => ({ ...d, canWrite: this.canOn(perms, d, 2) }));
  }

  private async load(id: string, orgId: string) {
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

  /** Load a document and check the caller may read (1) or change (2) it. */
  private async open(id: string, orgId: string, userId: string, need: Level) {
    const doc = await this.load(id, orgId);
    const perms = await this.permissions.getUserPermissions(userId);
    if (!this.canOn(perms, doc, need)) {
      throw new ForbiddenException(
        need === 2
          ? 'Sem permissão de escrita neste sistema de gestão'
          : 'Sem acesso aos documentos deste sistema de gestão',
      );
    }
    return doc;
  }

  async get(id: string, orgId: string, userId: string) {
    const doc = await this.open(id, orgId, userId, 1);
    const perms = await this.permissions.getUserPermissions(userId);
    return { ...doc, canWrite: this.canOn(perms, doc, 2) };
  }

  // ── commands ──

  async create(orgId: string, userId: string, body: any, file?: Express.Multer.File) {
    const standard = this.assertStandard(body?.standard);
    await this.assertAccess(userId, standard, 2);
    const also = this.parseAlso(body?.alsoStandards, standard);
    await this.assertCanShare(userId, also);
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
        standard,
        alsoStandards: also,
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

  async update(id: string, orgId: string, userId: string, body: any) {
    const current = await this.open(id, orgId, userId, 2);
    const data: any = {};
    if (body.standard !== undefined) {
      data.standard = this.assertStandard(body.standard);
      await this.assertAccess(userId, data.standard, 2); // moving a document needs write access to the target too
    }
    if (body.alsoStandards !== undefined || data.standard !== undefined) {
      const primary = data.standard ?? current.standard;
      const also = this.parseAlso(body.alsoStandards !== undefined ? body.alsoStandards : current.alsoStandards, primary);
      await this.assertCanShare(userId, also, current.alsoStandards);
      data.alsoStandards = also;
    }
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
    const doc = await this.open(id, orgId, userId, 2);
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

  private async transition(id: string, orgId: string, userId: string, from: string[], data: any) {
    const doc = await this.open(id, orgId, userId, 2);
    if (!from.includes(doc.status)) {
      throw new BadRequestException(`Transição inválida a partir do estado ${doc.status}`);
    }
    return this.prisma.qualityDocument.update({
      where: { id },
      data,
      include: { owner: USER_SELECT, approver: USER_SELECT },
    });
  }

  submit(id: string, orgId: string, userId: string) {
    return this.transition(id, orgId, userId, ['DRAFT'], { status: 'IN_REVIEW' });
  }

  async approve(id: string, orgId: string, approverId: string) {
    // Segregation of duties (same principle as policy approval): whoever
    // uploaded the version being approved cannot approve it.
    const doc = await this.open(id, orgId, approverId, 2);
    if (doc.status !== 'IN_REVIEW') {
      throw new BadRequestException(`Transição inválida a partir do estado ${doc.status}`);
    }
    const current = doc.versions.find(v => v.version === doc.currentVersion);
    if (current && current.uploadedById === approverId) {
      throw new ForbiddenException(
        'Quem carregou esta versão não pode aprová-la (separação de funções)',
      );
    }
    return this.transition(id, orgId, approverId, ['IN_REVIEW'], {
      status: 'APPROVED', approverId, approvedAt: new Date(),
    });
  }

  markObsolete(id: string, orgId: string, userId: string) {
    return this.transition(id, orgId, userId, ['DRAFT', 'IN_REVIEW', 'APPROVED'], { status: 'OBSOLETE' });
  }

  revertToDraft(id: string, orgId: string, userId: string) {
    return this.transition(id, orgId, userId, ['IN_REVIEW', 'APPROVED', 'OBSOLETE'], {
      status: 'DRAFT', approverId: null, approvedAt: null,
    });
  }

  /**
   * Streams the file through the API instead of handing out a storage URL:
   * the S3 endpoint is an internal Docker hostname (not reachable from a
   * browser) and this way every download is authenticated + org-scoped.
   */
  async getFile(id: string, versionId: string | undefined, orgId: string, userId: string) {
    const doc = await this.open(id, orgId, userId, 1);
    const version = versionId
      ? doc.versions.find(v => v.id === versionId)
      : doc.versions.find(v => v.version === doc.currentVersion) ?? doc.versions[0];
    if (!version) throw new NotFoundException('Versão não encontrada');
    const buffer =
      this.storage.readLocalFile(version.s3Key) ?? (await this.storage.readS3Buffer(version.s3Key));
    if (!buffer) throw new NotFoundException('Ficheiro não encontrado no armazenamento');
    return { buffer, fileName: version.fileName, mimeType: version.mimeType };
  }

  async remove(id: string, orgId: string, userId: string) {
    const doc = await this.open(id, orgId, userId, 2);
    for (const v of doc.versions) {
      await this.storage.deleteFile(v.s3Key).catch(() => undefined);
    }
    await this.prisma.qualityDocument.delete({ where: { id } });
    return { deleted: true };
  }
}
