import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TisaxService } from '../tisax.service';

const ORG = 'org-1';

function make(controls: any[] = [], assessments: any[] = []) {
  const prisma: any = {
    tisaxControl: {
      findMany: jest.fn().mockResolvedValue(controls),
      findFirst: jest.fn().mockResolvedValue(null),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'c', ...data })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    tisaxAssessment: {
      findMany: jest.fn().mockResolvedValue(assessments),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'a', ...data })),
      update: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'a', ...data })),
    },
  };
  return { service: new TisaxService(prisma), prisma };
}

const ctl = (over: any = {}) => ({ id: 'c1', chapter: 'IS-1', maturityLevel: 0, targetLevel: 3, ...over });

describe('TisaxService', () => {
  it('dashboard returns what the page reads: controls, stats and averageMaturity', async () => {
    const { service } = make([
      ctl({ id: 'a', maturityLevel: 3 }),
      ctl({ id: 'b', maturityLevel: 1, chapter: 'IS-2' }),
      ctl({ id: 'c', maturityLevel: 0 }),
    ]);
    const res = await service.getDashboard(ORG);
    expect(res.controls).toHaveLength(3);
    expect(res.stats).toEqual({ total: 3, metTarget: 1, inProgress: 1, notAssessed: 1 });
    expect(res.averageMaturity).toBe(1.3);
    expect(Object.keys(res.byChapter).sort()).toEqual(['IS-1', 'IS-2']);
  });

  describe('createAssessment', () => {
    it('cannot be pointed at another organisation, and parses plain dates', async () => {
      const { service, prisma } = make();
      await service.createAssessment(ORG, {
        assessmentScope: ' Site de Aveiro ', label: 'INFO', targetLevel: 2, assessmentDate: '2026-11-30',
        organizationId: 'evil-org', id: 'forced',
      });
      const data = prisma.tisaxAssessment.create.mock.calls[0][0].data;
      expect(data.organizationId).toBe(ORG);
      expect(data.assessmentScope).toBe('Site de Aveiro');
      expect(data.assessmentDate).toBeInstanceOf(Date);
      expect(data).not.toHaveProperty('id');
    });

    it('validates scope, label, level and score', async () => {
      const { service } = make();
      await expect(service.createAssessment(ORG, { label: 'INFO' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.createAssessment(ORG, { assessmentScope: 'x', label: 'NOPE' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.createAssessment(ORG, { assessmentScope: 'x', targetLevel: 9 })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.createAssessment(ORG, { assessmentScope: 'x', score: 101 })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('updates', () => {
    it('assessment: org-scoped, whitelisted', async () => {
      const { service, prisma } = make();
      await expect(service.updateAssessment(ORG, 'a', { notes: 'x' })).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.tisaxAssessment.findFirst.mock.calls[0][0].where).toEqual({ id: 'a', organizationId: ORG });
      prisma.tisaxAssessment.findFirst.mockResolvedValue({ id: 'a' });
      await service.updateAssessment(ORG, 'a', { status: 'APPROVED', organizationId: 'evil' });
      const data = prisma.tisaxAssessment.update.mock.calls[0][0].data;
      expect(data).toEqual({ status: 'APPROVED' });
    });

    it('control: only maturity, evidence, notes… and within 0-3', async () => {
      const { service, prisma } = make();
      prisma.tisaxControl.findFirst.mockResolvedValue(ctl());
      await service.updateControl(ORG, 'c1', { maturityLevel: 2, evidence: 'doc', requirementId: 'hack', organizationId: 'evil' });
      expect(prisma.tisaxControl.update.mock.calls[0][0].data).toEqual({ maturityLevel: 2, evidence: 'doc' });
      await expect(service.updateControl(ORG, 'c1', { maturityLevel: 5 })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('bulk: scoped to the organisation, bounded and validated', async () => {
      const { service, prisma } = make();
      await service.bulkUpdate(ORG, [{ id: 'a', maturityLevel: 3, organizationId: 'evil' } as any]);
      const call = prisma.tisaxControl.updateMany.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'a', organizationId: ORG });
      expect(call.data).toEqual({ maturityLevel: 3 });
      await expect(service.bulkUpdate(ORG, [])).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.bulkUpdate(ORG, [{ id: 'a', maturityLevel: 7 }])).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
