import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StandardsService } from '../standards.service';
import { findStandard } from '../standards.registry';

const ORG = 'org-1';
const FULL = { quality: 2, itsm: 2, iso27701: 2, vendors: 2, aiGovernance: 2 };

function make(levels: Record<string, number>, rows: any[] = []) {
  const prisma: any = {
    standardRequirement: {
      findMany: jest.fn().mockResolvedValue(rows),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'r', ...data })),
    },
    user: { findFirst: jest.fn().mockResolvedValue({ id: 'u2' }) },
  };
  const permissions: any = { getUserPermissions: jest.fn().mockResolvedValue(levels) };
  return { service: new StandardsService(prisma, permissions), prisma };
}

describe('StandardsService', () => {
  describe('list', () => {
    it('only shows standards whose module the user can read, and whether they can write', async () => {
      const { service } = make({ quality: 1, aiGovernance: 2 });
      const list = await service.list(ORG, 'u1');
      expect(list.map(s => s.key).sort()).toEqual(['ISO_13485', 'ISO_22000', 'ISO_23894', 'NIST_AI_RMF']);
      expect(list.find(s => s.key === 'ISO_22000')!.canWrite).toBe(false);
      expect(list.find(s => s.key === 'NIST_AI_RMF')!.canWrite).toBe(true);
    });

    it('shows the checklist size before the first visit, and the progress after', async () => {
      const { service: fresh } = make(FULL);
      const nist = (await fresh.list(ORG, 'u1')).find(s => s.key === 'NIST_AI_RMF')!;
      expect(nist).toMatchObject({ started: false, total: 19, score: 0 });
      const { service: started } = make(FULL, [
        { standardKey: 'NIST_AI_RMF', status: 'IMPLEMENTED' }, { standardKey: 'NIST_AI_RMF', status: 'NOT_IMPLEMENTED' },
      ]);
      expect((await started.list(ORG, 'u1')).find(s => s.key === 'NIST_AI_RMF')).toMatchObject({ started: true, total: 2, score: 50 });
    });

    it('is empty for someone without access to any of the modules', async () => {
      const { service } = make({});
      expect(await service.list(ORG, 'u1')).toEqual([]);
    });
  });

  describe('dashboard', () => {
    it('creates the organisation\'s checklist on the first visit, in the standard\'s order', async () => {
      const { service, prisma } = make(FULL);
      const def = findStandard('ISO_27018')!;
      prisma.standardRequirement.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce(def.requirements.map((r, i) => ({ id: `${i}`, status: 'NOT_IMPLEMENTED' })));
      const res = await service.dashboard(ORG, 'u1', 'ISO_27018');
      const call = prisma.standardRequirement.createMany.mock.calls[0][0];
      expect(call.skipDuplicates).toBe(true);
      expect(call.data).toHaveLength(def.requirements.length);
      expect(call.data.every((d: any) => d.organizationId === ORG && d.standardKey === 'ISO_27018')).toBe(true);
      expect(call.data.map((d: any) => d.sortOrder)).toEqual(def.requirements.map((_, i) => i));
      expect(res.standard).toMatchObject({ key: 'ISO_27018', canWrite: true });
      expect(res.total).toBe(10);
    });

    it('does not seed again, and scores partial as half and N/A as excluded', async () => {
      const { service, prisma } = make(FULL, [
        { status: 'IMPLEMENTED' }, { status: 'PARTIAL' }, { status: 'NOT_IMPLEMENTED' }, { status: 'NOT_APPLICABLE' },
      ]);
      const res = await service.dashboard(ORG, 'u1', 'ISO_22000');
      expect(prisma.standardRequirement.createMany).not.toHaveBeenCalled();
      expect(res.score).toBe(50);
      expect(res).toMatchObject({ implemented: 1, partial: 1, notApplicable: 1, notImplemented: 1 });
    });

    it('404s for unknown standards and 403s without read access to its module', async () => {
      const { service } = make({ quality: 0 });
      await expect(service.dashboard(ORG, 'u1', 'ISO_NOPE')).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.dashboard(ORG, 'u1', 'ISO_22000')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('updateRequirement', () => {
    it('needs write access', async () => {
      const { service } = make({ quality: 1 });
      await expect(service.updateRequirement(ORG, 'u1', 'ISO_22000', 'r', { status: 'PARTIAL' })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('is scoped to the organisation and to that standard', async () => {
      const { service, prisma } = make(FULL);
      await expect(service.updateRequirement(ORG, 'u1', 'ISO_22000', 'r', { status: 'PARTIAL' })).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.standardRequirement.findFirst.mock.calls[0][0].where).toEqual({ id: 'r', organizationId: ORG, standardKey: 'ISO_22000' });
    });

    it('writes only the editable fields and stamps completion', async () => {
      const { service, prisma } = make(FULL);
      prisma.standardRequirement.findFirst.mockResolvedValue({ id: 'r', completedAt: null });
      await service.updateRequirement(ORG, 'u1', 'ISO_22000', 'r', {
        status: 'IMPLEMENTED', evidence: ' plano HACCP ', organizationId: 'evil', code: 'x', standardKey: 'ISO_9001', title: 'hack',
      });
      const data = prisma.standardRequirement.update.mock.calls[0][0].data;
      expect(data).toMatchObject({ status: 'IMPLEMENTED', evidence: 'plano HACCP' });
      expect(data.completedAt).toBeInstanceOf(Date);
      for (const k of ['organizationId', 'code', 'standardKey', 'title']) expect(data).not.toHaveProperty(k);
    });

    it('rejects an invalid status and a responsible person from another organisation', async () => {
      const { service, prisma } = make(FULL);
      prisma.standardRequirement.findFirst.mockResolvedValue({ id: 'r' });
      await expect(service.updateRequirement(ORG, 'u1', 'ISO_22000', 'r', { status: 'DONE' })).rejects.toBeInstanceOf(BadRequestException);
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.updateRequirement(ORG, 'u1', 'ISO_22000', 'r', { responsibleId: 'x' })).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
