import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { QualityDocumentsService } from '../quality-documents.service';

const ORG = 'org-1';

// Permission levels (0 none / 1 read / 2 write) per module
const consultant = { quality: 2, environment: 2, workforce: 1, soa: 2, bcp: 2, antiBribery: 2, iso27701: 2, aiGovernance: 2, policies: 2 };
const viewer = { quality: 0, environment: 0, workforce: 1, soa: 0, bcp: 0, antiBribery: 0, iso27701: 0, aiGovernance: 0, policies: 1 };
const nobody = { quality: 0, environment: 0, workforce: 0, soa: 0, bcp: 0, antiBribery: 0, iso27701: 0, aiGovernance: 0, policies: 0 };

function make(perms: Record<string, number>, doc?: any) {
  const prisma: any = {
    qualityDocument: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(doc ?? null),
      create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'd1', ...data })),
      update: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'd1', ...data })),
      delete: jest.fn(),
    },
    qualityDocumentVersion: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const storage: any = {
    uploadFile: jest.fn().mockResolvedValue({ key: 'k', size: 10 }),
    deleteFile: jest.fn().mockResolvedValue(undefined),
  };
  const permissions: any = { getUserPermissions: jest.fn().mockResolvedValue(perms) };
  return { service: new QualityDocumentsService(prisma, storage, permissions), prisma, storage };
}

const file = { originalname: 'Manual.docx', mimetype: 'application/octet-stream', size: 10, buffer: Buffer.from('x') } as any;
const docOf = (standard: string, extra: any = {}) => ({
  id: 'd1', organizationId: ORG, standard, status: 'IN_REVIEW', currentVersion: '1.0',
  versions: [{ id: 'v1', version: '1.0', uploadedById: 'author', s3Key: 'k', fileName: 'a.docx', mimeType: 'x' }], ...extra,
});

describe('QualityDocumentsService — access by management-system standard', () => {
  describe('standards()', () => {
    it('lists only the standards the user can read and flags the writable ones', async () => {
      const { service } = make(viewer);
      const s = await service.standards('u');
      expect(s.map(x => x.key).sort()).toEqual(['GENERAL', 'ISO_45001']);
      expect(s.every(x => x.canWrite === false)).toBe(true);
      const { service: svc2 } = make(consultant);
      expect((await svc2.standards('u')).find(x => x.key === 'ISO_14001')?.canWrite).toBe(true);
    });
  });

  describe('list()', () => {
    it('is forbidden when the user can read no standard at all', async () => {
      const { service } = make(nobody);
      await expect(service.list(ORG, 'u', {})).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('limits the query to the organisation and to the readable standards', async () => {
      const { service, prisma } = make(viewer);
      await service.list(ORG, 'u', {});
      const where = prisma.qualityDocument.findMany.mock.calls[0][0].where;
      expect(where.organizationId).toBe(ORG);
      expect(where.standard.in.sort()).toEqual(['GENERAL', 'ISO_45001']);
    });

    it('refuses a standard the user cannot read, and rejects an unknown one', async () => {
      const { service } = make(viewer);
      await expect(service.list(ORG, 'u', { standard: 'ISO_9001' })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.list(ORG, 'u', { standard: 'ISO_999' })).rejects.toBeInstanceOf(BadRequestException);
      const { service: ok, prisma } = make(consultant);
      await ok.list(ORG, 'u', { standard: 'ISO_14001' });
      expect(prisma.qualityDocument.findMany.mock.calls[0][0].where.standard).toBe('ISO_14001');
    });
  });

  describe('get()', () => {
    it('is org-scoped (404 for a document of another organisation)', async () => {
      const { service, prisma } = make(consultant);
      await expect(service.get('d1', ORG, 'u')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.qualityDocument.findFirst.mock.calls[0][0].where).toEqual({ id: 'd1', organizationId: ORG });
    });

    it('is forbidden when the user cannot read the document\'s standard', async () => {
      const { service } = make(viewer, docOf('ISO_9001'));
      await expect(service.get('d1', ORG, 'u')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('is allowed when the user can read it', async () => {
      const { service } = make(viewer, docOf('ISO_45001'));
      await expect(service.get('d1', ORG, 'u')).resolves.toBeDefined();
    });
  });

  describe('create()', () => {
    it('defaults to ISO 9001 and needs write access to it', async () => {
      const { service, prisma } = make(consultant);
      await service.create(ORG, 'u', { title: 'Manual', clause: '4' }, file);
      expect(prisma.qualityDocument.create.mock.calls[0][0].data.standard).toBe('ISO_9001');
    });

    it('creates documents of another standard when allowed', async () => {
      const { service, prisma } = make(consultant);
      await service.create(ORG, 'u', { title: 'Procedimento de resíduos', clause: '8.1', standard: 'ISO_14001' }, file);
      expect(prisma.qualityDocument.create.mock.calls[0][0].data.standard).toBe('ISO_14001');
    });

    it('refuses read-only users and unknown standards, before touching the storage', async () => {
      const { service, storage } = make(viewer);
      await expect(service.create(ORG, 'u', { title: 'x', clause: '4', standard: 'ISO_45001' }, file))
        .rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.create(ORG, 'u', { title: 'x', clause: '4', standard: 'NOPE' }, file))
        .rejects.toBeInstanceOf(BadRequestException);
      expect(storage.uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('workflow', () => {
    it('does not let a read-only user change state', async () => {
      const { service } = make(viewer, docOf('ISO_45001', { status: 'DRAFT' }));
      await expect(service.submit('d1', ORG, 'u')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.remove('d1', ORG, 'u')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('checks the state first, then segregation of duties', async () => {
      const { service: draft } = make(consultant, docOf('ISO_14001', { status: 'DRAFT' }));
      await expect(draft.approve('d1', ORG, 'author')).rejects.toBeInstanceOf(BadRequestException);
      const { service: review } = make(consultant, docOf('ISO_14001', { status: 'IN_REVIEW' }));
      await expect(review.approve('d1', ORG, 'author')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(review.approve('d1', ORG, 'someone-else')).resolves.toMatchObject({ status: 'APPROVED' });
    });

    it('does not allow moving a document into a standard the user cannot write', async () => {
      const { service } = make({ ...consultant, antiBribery: 1 }, docOf('ISO_14001', { status: 'DRAFT' }));
      await expect(service.update('d1', ORG, 'u', { standard: 'ISO_37001' })).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
