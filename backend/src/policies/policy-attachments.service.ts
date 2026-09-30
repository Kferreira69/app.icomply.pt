import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';
import {
  DOC_ALLOWED_EXT, DOC_MAX_BYTES, isAllowedDocFile, nextMinorVersion,
} from '../common/storage/upload-rules';
import { PolicyStatus } from '../generated/prisma/client';

const USER_SELECT = { select: { id: true, firstName: true, lastName: true } };

@Injectable()
export class PolicyAttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private assertFile(file?: Express.Multer.File): Express.Multer.File {
    if (!file) throw new BadRequestException('Ficheiro em falta');
    if (!isAllowedDocFile(file.originalname)) {
      throw new BadRequestException(
        `Tipo de ficheiro não permitido. Permitidos: ${DOC_ALLOWED_EXT.join(', ')}`,
      );
    }
    if (file.size > DOC_MAX_BYTES) {
      throw new BadRequestException('Ficheiro demasiado grande (máx. 25 MB)');
    }
    return file;
  }

  private async getPolicy(policyId: string, organizationId: string) {
    const policy = await this.prisma.policy.findFirst({ where: { id: policyId, organizationId } });
    if (!policy) throw new NotFoundException('Policy not found');
    return policy;
  }

  private async getAttachment(policyId: string, attachmentId: string, organizationId: string) {
    await this.getPolicy(policyId, organizationId);
    const att = await this.prisma.policyAttachment.findFirst({
      where: { id: attachmentId, policyId },
      include: { versions: { orderBy: { createdAt: 'desc' }, include: { uploadedBy: USER_SELECT } } },
    });
    if (!att) throw new NotFoundException('Anexo não encontrado');
    return att;
  }

  /**
   * Any change to the files of a policy invalidates a previous review/approval:
   * an IN_REVIEW/APPROVED policy goes back to DRAFT. Archived policies are
   * read-only (reactivate first).
   */
  private assertEditable(policy: { status: PolicyStatus }) {
    if (policy.status === PolicyStatus.ARCHIVED) {
      throw new BadRequestException('Política arquivada: reative-a como rascunho para alterar os anexos');
    }
  }

  private async revertIfNeeded(policy: { id: string; status: PolicyStatus }) {
    if (policy.status !== PolicyStatus.DRAFT) {
      await this.prisma.policy.update({
        where: { id: policy.id },
        data: { status: PolicyStatus.DRAFT, approverId: null, approvedAt: null },
      });
    }
  }

  async list(policyId: string, organizationId: string) {
    await this.getPolicy(policyId, organizationId);
    return this.prisma.policyAttachment.findMany({
      where: { policyId },
      orderBy: { createdAt: 'asc' },
      include: { versions: { orderBy: { createdAt: 'desc' }, include: { uploadedBy: USER_SELECT } } },
    });
  }

  async add(policyId: string, organizationId: string, userId: string, body: any, file?: Express.Multer.File) {
    const policy = await this.getPolicy(policyId, organizationId);
    const f = this.assertFile(file);
    this.assertEditable(policy);

    const { key, size } = await this.storage.uploadFile(
      f.buffer, f.originalname, f.mimetype, `policy-attachments/${organizationId}`,
    );
    const version = String(body?.version ?? '').trim() || '1.0';
    const created = await this.prisma.policyAttachment.create({
      data: {
        policyId,
        title: String(body?.title ?? '').trim() || f.originalname,
        description: body?.description ? String(body.description) : null,
        currentVersion: version,
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
      include: { versions: { include: { uploadedBy: USER_SELECT } } },
    });
    await this.revertIfNeeded(policy);
    return created;
  }

  async addVersion(
    policyId: string, attachmentId: string, organizationId: string, userId: string,
    body: any, file?: Express.Multer.File,
  ) {
    const att = await this.getAttachment(policyId, attachmentId, organizationId);
    const policy = await this.getPolicy(policyId, organizationId);
    const f = this.assertFile(file);
    const version = String(body?.version ?? '').trim() || nextMinorVersion(att.currentVersion);
    if (att.versions.some(v => v.version === version)) {
      throw new BadRequestException(`A versão ${version} já existe`);
    }
    this.assertEditable(policy);

    const { key, size } = await this.storage.uploadFile(
      f.buffer, f.originalname, f.mimetype, `policy-attachments/${organizationId}`,
    );
    await this.prisma.$transaction([
      this.prisma.policyAttachmentVersion.create({
        data: {
          attachmentId,
          version,
          fileName: f.originalname,
          fileSize: size,
          mimeType: f.mimetype,
          s3Key: key,
          changeNote: body?.changeNote ? String(body.changeNote) : null,
          uploadedById: userId,
        },
      }),
      this.prisma.policyAttachment.update({ where: { id: attachmentId }, data: { currentVersion: version } }),
    ]);
    await this.revertIfNeeded(policy);
    return this.getAttachment(policyId, attachmentId, organizationId);
  }

  /** Streams through the API (authenticated + org-scoped); see QualityDocumentsService.getFile. */
  async getFile(policyId: string, attachmentId: string, versionId: string | undefined, organizationId: string) {
    const att = await this.getAttachment(policyId, attachmentId, organizationId);
    const version = versionId
      ? att.versions.find(v => v.id === versionId)
      : att.versions.find(v => v.version === att.currentVersion) ?? att.versions[0];
    if (!version) throw new NotFoundException('Versão não encontrada');
    const buffer =
      this.storage.readLocalFile(version.s3Key) ?? (await this.storage.readS3Buffer(version.s3Key));
    if (!buffer) throw new NotFoundException('Ficheiro não encontrado no armazenamento');
    return { buffer, fileName: version.fileName, mimeType: version.mimeType };
  }

  async remove(policyId: string, attachmentId: string, organizationId: string) {
    const att = await this.getAttachment(policyId, attachmentId, organizationId);
    const policy = await this.getPolicy(policyId, organizationId);
    this.assertEditable(policy);
    await this.prisma.policyAttachment.delete({ where: { id: attachmentId } });
    await this.deleteFiles(att.versions.map(v => v.s3Key));
    await this.revertIfNeeded(policy);
    return { deleted: true };
  }

  /** Removes the stored files of every attachment of a policy (before deleting the policy). */
  async deleteAllFilesOfPolicy(policyId: string) {
    const versions = await this.prisma.policyAttachmentVersion.findMany({
      where: { attachment: { policyId } },
      select: { s3Key: true },
    });
    await this.deleteFiles(versions.map(v => v.s3Key));
  }

  /** Latest uploader of any attachment version of the policy (for segregation of duties). */
  async lastUploaderId(policyId: string): Promise<string | null> {
    const v = await this.prisma.policyAttachmentVersion.findFirst({
      where: { attachment: { policyId } },
      orderBy: { createdAt: 'desc' },
      select: { uploadedById: true },
    });
    return v?.uploadedById ?? null;
  }

  private async deleteFiles(keys: string[]) {
    for (const key of keys) await this.storage.deleteFile(key).catch(() => undefined);
  }
}
