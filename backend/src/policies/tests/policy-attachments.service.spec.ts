import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PolicyAttachmentsService } from '../policy-attachments.service';
import { PoliciesService } from '../policies.service';

const mockPrisma: any = {
  policy: { findFirst: jest.fn(), update: jest.fn() },
  policyAttachment: {
    findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
  },
  policyAttachmentVersion: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
  $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
};
const mockStorage: any = {
  uploadFile: jest.fn(), deleteFile: jest.fn(), readLocalFile: jest.fn(), readS3Buffer: jest.fn(),
};

const file = (name = 'politica.docx', size = 1024): Express.Multer.File =>
  ({ originalname: name, mimetype: 'application/octet-stream', buffer: Buffer.from('x'), size } as any);

const policy = (status: string) => ({ id: 'p1', organizationId: 'o1', status, ownerId: 'owner' });

describe('PolicyAttachmentsService', () => {
  let service: PolicyAttachmentsService;

  beforeEach(() => {
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
    mockStorage.uploadFile.mockResolvedValue({ key: 'policy-attachments/o1/abc.docx', url: 'u', size: 1024 });
    mockStorage.deleteFile.mockResolvedValue(undefined);
    mockPrisma.policyAttachment.create.mockResolvedValue({ id: 'a1', versions: [] });
    service = new PolicyAttachmentsService(mockPrisma, mockStorage);
  });

  describe('add', () => {
    it('rejects a missing file', async () => {
      mockPrisma.policy.findFirst.mockResolvedValue(policy('DRAFT'));
      await expect(service.add('p1', 'o1', 'u1', {}, undefined)).rejects.toThrow(BadRequestException);
    });

    it.each(['malware.html', 'x.svg', 'run.exe', 'script.js', 'noextension'])(
      'rejects disallowed file %s without uploading',
      async name => {
        mockPrisma.policy.findFirst.mockResolvedValue(policy('DRAFT'));
        await expect(service.add('p1', 'o1', 'u1', {}, file(name))).rejects.toThrow(BadRequestException);
        expect(mockStorage.uploadFile).not.toHaveBeenCalled();
      },
    );

    it('rejects files over 25 MB', async () => {
      mockPrisma.policy.findFirst.mockResolvedValue(policy('DRAFT'));
      await expect(service.add('p1', 'o1', 'u1', {}, file('a.docx', 26 * 1024 * 1024))).rejects.toThrow(/grande/);
    });

    it('404s for a policy of another organization', async () => {
      mockPrisma.policy.findFirst.mockResolvedValue(null);
      await expect(service.add('p1', 'other-org', 'u1', {}, file())).rejects.toThrow(NotFoundException);
      expect(mockPrisma.policy.findFirst).toHaveBeenCalledWith({ where: { id: 'p1', organizationId: 'other-org' } });
    });

    it('keeps a DRAFT policy as is', async () => {
      mockPrisma.policy.findFirst.mockResolvedValue(policy('DRAFT'));
      await service.add('p1', 'o1', 'u1', { title: 'Manual' }, file());
      expect(mockPrisma.policy.update).not.toHaveBeenCalled();
      expect(mockPrisma.policyAttachment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ policyId: 'p1', title: 'Manual', currentVersion: '1.0' }) }),
      );
    });

    it.each(['APPROVED', 'IN_REVIEW'])('sends a %s policy back to DRAFT and clears the approval', async status => {
      mockPrisma.policy.findFirst.mockResolvedValue(policy(status));
      await service.add('p1', 'o1', 'u1', {}, file());
      expect(mockPrisma.policy.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { status: 'DRAFT', approverId: null, approvedAt: null },
      });
    });

    it('refuses to change an ARCHIVED policy and does not upload', async () => {
      mockPrisma.policy.findFirst.mockResolvedValue(policy('ARCHIVED'));
      await expect(service.add('p1', 'o1', 'u1', {}, file())).rejects.toThrow(/arquivada/);
      expect(mockStorage.uploadFile).not.toHaveBeenCalled();
    });

    it('defaults the title to the file name', async () => {
      mockPrisma.policy.findFirst.mockResolvedValue(policy('DRAFT'));
      await service.add('p1', 'o1', 'u1', {}, file('Manual da Qualidade.docx'));
      expect(mockPrisma.policyAttachment.create.mock.calls[0][0].data.title).toBe('Manual da Qualidade.docx');
    });
  });

  describe('addVersion', () => {
    const attachment = (versions = ['1.0', '1.1']) => ({
      id: 'a1', policyId: 'p1', currentVersion: versions[versions.length - 1],
      versions: versions.map(v => ({ id: `v${v}`, version: v, s3Key: `k${v}` })),
    });

    it('auto-increments the minor version', async () => {
      mockPrisma.policy.findFirst.mockResolvedValue(policy('APPROVED'));
      mockPrisma.policyAttachment.findFirst.mockResolvedValue(attachment());
      await service.addVersion('p1', 'a1', 'o1', 'u1', {}, file());
      expect(mockPrisma.policyAttachmentVersion.create.mock.calls[0][0].data.version).toBe('1.2');
      expect(mockPrisma.policyAttachment.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { currentVersion: '1.2' } });
      expect(mockPrisma.policy.update).toHaveBeenCalled(); // approved -> draft
    });

    it('rejects an already existing version number', async () => {
      mockPrisma.policy.findFirst.mockResolvedValue(policy('DRAFT'));
      mockPrisma.policyAttachment.findFirst.mockResolvedValue(attachment());
      await expect(service.addVersion('p1', 'a1', 'o1', 'u1', { version: '1.0' }, file())).rejects.toThrow(/já existe/);
      expect(mockStorage.uploadFile).not.toHaveBeenCalled();
    });

    it('404s for an attachment that is not in the policy', async () => {
      mockPrisma.policy.findFirst.mockResolvedValue(policy('DRAFT'));
      mockPrisma.policyAttachment.findFirst.mockResolvedValue(null);
      await expect(service.addVersion('p1', 'nope', 'o1', 'u1', {}, file())).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFile', () => {
    const att = {
      id: 'a1', policyId: 'p1', currentVersion: '1.1',
      versions: [
        { id: 'v11', version: '1.1', s3Key: 'k11', fileName: 'b.docx', mimeType: 'x' },
        { id: 'v10', version: '1.0', s3Key: 'k10', fileName: 'a.docx', mimeType: 'x' },
      ],
    };

    beforeEach(() => {
      mockPrisma.policy.findFirst.mockResolvedValue(policy('DRAFT'));
      mockPrisma.policyAttachment.findFirst.mockResolvedValue(att);
    });

    it('returns the current version by default', async () => {
      mockStorage.readLocalFile.mockReturnValue(Buffer.from('cur'));
      const f = await service.getFile('p1', 'a1', undefined, 'o1');
      expect(f.fileName).toBe('b.docx');
      expect(mockStorage.readLocalFile).toHaveBeenCalledWith('k11');
    });

    it('returns a specific older version', async () => {
      mockStorage.readLocalFile.mockReturnValue(Buffer.from('old'));
      const f = await service.getFile('p1', 'a1', 'v10', 'o1');
      expect(f.fileName).toBe('a.docx');
    });

    it('falls back to S3 when not stored locally', async () => {
      mockStorage.readLocalFile.mockReturnValue(null);
      mockStorage.readS3Buffer.mockResolvedValue(Buffer.from('s3'));
      const f = await service.getFile('p1', 'a1', undefined, 'o1');
      expect(f.buffer.toString()).toBe('s3');
    });

    it('404s for an unknown version and for a missing stored file', async () => {
      await expect(service.getFile('p1', 'a1', 'zzz', 'o1')).rejects.toThrow(/Versão/);
      mockStorage.readLocalFile.mockReturnValue(null);
      mockStorage.readS3Buffer.mockResolvedValue(null);
      await expect(service.getFile('p1', 'a1', undefined, 'o1')).rejects.toThrow(/armazenamento/);
    });
  });

  describe('remove', () => {
    it('deletes the row and every stored version file, and reopens an approved policy', async () => {
      mockPrisma.policy.findFirst.mockResolvedValue(policy('APPROVED'));
      mockPrisma.policyAttachment.findFirst.mockResolvedValue({
        id: 'a1', policyId: 'p1', versions: [{ s3Key: 'k1' }, { s3Key: 'k2' }],
      });
      await service.remove('p1', 'a1', 'o1');
      expect(mockPrisma.policyAttachment.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
      expect(mockStorage.deleteFile).toHaveBeenCalledWith('k1');
      expect(mockStorage.deleteFile).toHaveBeenCalledWith('k2');
      expect(mockPrisma.policy.update).toHaveBeenCalled();
    });

    it('does not delete anything on an ARCHIVED policy', async () => {
      mockPrisma.policy.findFirst.mockResolvedValue(policy('ARCHIVED'));
      mockPrisma.policyAttachment.findFirst.mockResolvedValue({ id: 'a1', policyId: 'p1', versions: [{ s3Key: 'k1' }] });
      await expect(service.remove('p1', 'a1', 'o1')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.policyAttachment.delete).not.toHaveBeenCalled();
      expect(mockStorage.deleteFile).not.toHaveBeenCalled();
    });
  });
});

describe('PoliciesService.approve — separation of duties with attachments', () => {
  const attachments: any = { lastUploaderId: jest.fn(), deleteAllFilesOfPolicy: jest.fn() };
  let service: PoliciesService;

  beforeEach(() => {
    jest.resetAllMocks();
    mockPrisma.policy.update.mockResolvedValue({ id: 'p1', status: 'APPROVED' });
    service = new PoliciesService(mockPrisma, attachments);
  });

  it('lets a third person approve an IN_REVIEW policy', async () => {
    mockPrisma.policy.findFirst.mockResolvedValue(policy('IN_REVIEW'));
    attachments.lastUploaderId.mockResolvedValue('uploader');
    await service.approve('p1', 'o1', 'approver');
    expect(mockPrisma.policy.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED', approverId: 'approver' }) }),
    );
  });

  it('blocks the policy owner (existing rule)', async () => {
    mockPrisma.policy.findFirst.mockResolvedValue(policy('IN_REVIEW'));
    attachments.lastUploaderId.mockResolvedValue(null);
    await expect(service.approve('p1', 'o1', 'owner')).rejects.toThrow(ForbiddenException);
  });

  it('blocks whoever uploaded the latest attachment version', async () => {
    mockPrisma.policy.findFirst.mockResolvedValue(policy('IN_REVIEW'));
    attachments.lastUploaderId.mockResolvedValue('uploader');
    await expect(service.approve('p1', 'o1', 'uploader')).rejects.toThrow(/anexo/);
    expect(mockPrisma.policy.update).not.toHaveBeenCalled();
  });

  it('does not approve a policy that is not IN_REVIEW', async () => {
    mockPrisma.policy.findFirst.mockResolvedValue(policy('DRAFT'));
    await expect(service.approve('p1', 'o1', 'approver')).rejects.toThrow(ForbiddenException);
  });

  it('removes attachment files before deleting a policy', async () => {
    mockPrisma.policy.findFirst.mockResolvedValue(policy('DRAFT'));
    mockPrisma.policy.delete = jest.fn().mockResolvedValue({ id: 'p1' });
    await service.remove('p1', 'o1');
    expect(attachments.deleteAllFilesOfPolicy).toHaveBeenCalledWith('p1');
  });
});
