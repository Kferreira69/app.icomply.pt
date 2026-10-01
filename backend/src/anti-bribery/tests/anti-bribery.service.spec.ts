import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AntiBriberyService } from '../anti-bribery.service';

const ORG = 'org-1';

function make(controls: any[] = []) {
  const prisma: any = {
    antiBriberyControl: {
      findMany: jest.fn().mockResolvedValue(controls),
      findFirst: jest.fn().mockResolvedValue(null),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'c', ...data })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    user: { findFirst: jest.fn().mockResolvedValue({ id: 'u1' }) },
  };
  return { service: new AntiBriberyService(prisma), prisma };
}

const control = (over: any = {}) => ({ id: 'c1', standard: 'ISO_37001', clauseNumber: '4.1', status: 'NOT_IMPLEMENTED', ...over });

describe('AntiBriberyService', () => {
  describe('getDashboard', () => {
    it('returns what the page reads: a flat `controls` list and a `score` (as well as the grouped data)', async () => {
      const { service } = make([
        control({ id: 'a', status: 'IMPLEMENTED' }),
        control({ id: 'b', status: 'PARTIAL', standard: 'ISO_37301' }),
        control({ id: 'c', status: 'NOT_IMPLEMENTED' }),
        control({ id: 'd', status: 'NOT_APPLICABLE' }),
      ]);
      const res = await service.getDashboard(ORG);
      expect(res.controls).toHaveLength(4);
      expect(res.score).toBe(50); // (1 + 0.5) / 3 applicable
      expect(res.overallScore).toBe(50);
      expect(res.summary).toMatchObject({ total: 4, implemented: 1, partial: 1, notApplicable: 1, notImplemented: 1 });
      expect(Object.keys(res.byStandard).sort()).toEqual(['ISO_37001', 'ISO_37301']);
    });

    it('seeds the checklist on first use without failing on a concurrent first visit', async () => {
      const { service, prisma } = make();
      prisma.antiBriberyControl.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([control()]);
      await service.getDashboard(ORG);
      const call = prisma.antiBriberyControl.createMany.mock.calls[0][0];
      expect(call.skipDuplicates).toBe(true);
      expect(call.data.every((d: any) => d.organizationId === ORG && d.status === 'NOT_IMPLEMENTED')).toBe(true);
      expect(call.data.length).toBeGreaterThanOrEqual(24);
    });
  });

  describe('updateControl', () => {
    it('is scoped to the organisation', async () => {
      const { service, prisma } = make();
      await expect(service.updateControl(ORG, 'c1', { status: 'PARTIAL' })).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.antiBriberyControl.findFirst.mock.calls[0][0].where).toEqual({ id: 'c1', organizationId: ORG });
    });

    it('ignores fields that are not editable (organisation, code, standard…)', async () => {
      const { service, prisma } = make();
      prisma.antiBriberyControl.findFirst.mockResolvedValue(control());
      await service.updateControl(ORG, 'c1', {
        status: 'IMPLEMENTED', evidence: ' acta ', organizationId: 'evil', controlCode: 'X', standard: 'Y', id: 'z',
      });
      const data = prisma.antiBriberyControl.update.mock.calls[0][0].data;
      expect(data).toMatchObject({ status: 'IMPLEMENTED', evidence: 'acta' });
      expect(data.completedAt).toBeInstanceOf(Date);
      for (const k of ['organizationId', 'controlCode', 'standard', 'id']) expect(data).not.toHaveProperty(k);
    });

    it('rejects an invalid status and a responsible person from another organisation', async () => {
      const { service, prisma } = make();
      prisma.antiBriberyControl.findFirst.mockResolvedValue(control());
      await expect(service.updateControl(ORG, 'c1', { status: 'DONE' })).rejects.toBeInstanceOf(BadRequestException);
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.updateControl(ORG, 'c1', { responsibleId: 'stranger' })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('bulkUpdate', () => {
    it('applies only whitelisted fields, always inside the organisation', async () => {
      const { service, prisma } = make();
      const r = await service.bulkUpdate(ORG, [{ id: 'a', status: 'PARTIAL', organizationId: 'evil' } as any]);
      expect(r.updated).toBe(1);
      const call = prisma.antiBriberyControl.updateMany.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'a', organizationId: ORG });
      expect(call.data).not.toHaveProperty('organizationId');
    });

    it('rejects empty, oversized and malformed requests', async () => {
      const { service } = make();
      await expect(service.bulkUpdate(ORG, [])).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.bulkUpdate(ORG, 'x' as any)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.bulkUpdate(ORG, Array.from({ length: 201 }, (_, i) => ({ id: `${i}`, status: 'PARTIAL' })))).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.bulkUpdate(ORG, [{ status: 'PARTIAL' } as any])).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.bulkUpdate(ORG, [{ id: 'a', status: 'NOPE' }])).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
