import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EnvironmentService, SIGNIFICANCE_THRESHOLD, computeSignificance } from '../environment.service';
import { ISO14001_REQUIREMENTS } from '../environment.requirements';

const ORG = 'org-1';

function makePrisma(overrides: Record<string, any> = {}) {
  const model = () => ({
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'new', ...data })),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
    update: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'x', ...data })),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
  });
  return {
    environmentalRequirement: model(),
    environmentalAspect: model(),
    environmentalObjective: model(),
    environmentalObligation: model(),
    user: { findFirst: jest.fn().mockResolvedValue({ id: 'u1' }) },
    ...overrides,
  } as any;
}

describe('EnvironmentService', () => {
  describe('computeSignificance', () => {
    it('is significant from the threshold upwards', () => {
      expect(SIGNIFICANCE_THRESHOLD).toBe(12);
      expect(computeSignificance(4, 3, 'NORMAL')).toEqual({ significance: 12, isSignificant: true });
      expect(computeSignificance(2, 5, 'NORMAL')).toEqual({ significance: 10, isSignificant: false });
    });

    it('treats a severe emergency scenario as significant even if unlikely', () => {
      expect(computeSignificance(4, 1, 'EMERGENCY').isSignificant).toBe(true);
      expect(computeSignificance(3, 1, 'EMERGENCY').isSignificant).toBe(false);
      expect(computeSignificance(4, 1, 'NORMAL').isSignificant).toBe(false);
    });
  });

  describe('dashboard', () => {
    it('seeds the ISO 14001 checklist on first use, scoped to the organisation', async () => {
      const prisma = makePrisma();
      const rows = ISO14001_REQUIREMENTS.map((r, i) => ({
        id: `r${i}`, code: `ISO14001-${r.clauseNumber}`, clauseNumber: r.clauseNumber, status: 'NOT_IMPLEMENTED',
      }));
      prisma.environmentalRequirement.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce(rows);
      const res = await new EnvironmentService(prisma).dashboard(ORG);

      const call = prisma.environmentalRequirement.createMany.mock.calls[0][0];
      expect(call.skipDuplicates).toBe(true);
      expect(call.data).toHaveLength(ISO14001_REQUIREMENTS.length);
      expect(call.data.every((d: any) => d.organizationId === ORG)).toBe(true);
      expect(res.summary.total).toBe(ISO14001_REQUIREMENTS.length);
      expect(res.score).toBe(0);
    });

    it('does not seed again and computes the score (partial counts half, N/A is excluded)', async () => {
      const prisma = makePrisma();
      prisma.environmentalRequirement.findMany.mockResolvedValue([
        { id: '1', clauseNumber: '4.1', status: 'IMPLEMENTED' },
        { id: '2', clauseNumber: '4.2', status: 'PARTIAL' },
        { id: '3', clauseNumber: '4.3', status: 'NOT_IMPLEMENTED' },
        { id: '4', clauseNumber: '4.4', status: 'NOT_APPLICABLE' },
      ]);
      const res = await new EnvironmentService(prisma).dashboard(ORG);
      expect(prisma.environmentalRequirement.createMany).not.toHaveBeenCalled();
      expect(res.score).toBe(50); // (1 + 0.5) / 3
      expect(res.summary).toMatchObject({ total: 4, implemented: 1, partial: 1, notApplicable: 1, notImplemented: 1 });
    });

    it('lists clauses in numeric order ("6.1.10" after "6.1.2")', async () => {
      const prisma = makePrisma();
      prisma.environmentalRequirement.findMany.mockResolvedValue([
        { id: 'a', clauseNumber: '6.1.10', status: 'NOT_IMPLEMENTED' },
        { id: 'b', clauseNumber: '10.1', status: 'NOT_IMPLEMENTED' },
        { id: 'c', clauseNumber: '6.1.2', status: 'NOT_IMPLEMENTED' },
        { id: 'd', clauseNumber: '4.4', status: 'NOT_IMPLEMENTED' },
      ]);
      const res = await new EnvironmentService(prisma).dashboard(ORG);
      expect(res.requirements.map((r: any) => r.clauseNumber)).toEqual(['4.4', '6.1.2', '6.1.10', '10.1']);
    });
  });

  describe('updateRequirement', () => {
    it('404s for another organisation\'s row and looks it up by org', async () => {
      const prisma = makePrisma();
      await expect(new EnvironmentService(prisma).updateRequirement(ORG, 'x', { status: 'PARTIAL' }))
        .rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.environmentalRequirement.findFirst.mock.calls[0][0].where).toEqual({ id: 'x', organizationId: ORG });
    });

    it('only writes whitelisted fields and stamps completion', async () => {
      const prisma = makePrisma();
      prisma.environmentalRequirement.findFirst.mockResolvedValue({ id: 'r', completedAt: null });
      await new EnvironmentService(prisma).updateRequirement(ORG, 'r', {
        status: 'IMPLEMENTED', evidence: ' ata ', organizationId: 'evil', id: 'evil', code: 'hacked',
      });
      const data = prisma.environmentalRequirement.update.mock.calls[0][0].data;
      expect(data.status).toBe('IMPLEMENTED');
      expect(data.evidence).toBe('ata');
      expect(data.completedAt).toBeInstanceOf(Date);
      expect(data).not.toHaveProperty('organizationId');
      expect(data).not.toHaveProperty('code');
      expect(data).not.toHaveProperty('id');
    });

    it('rejects an unknown status', async () => {
      const prisma = makePrisma();
      prisma.environmentalRequirement.findFirst.mockResolvedValue({ id: 'r' });
      await expect(new EnvironmentService(prisma).updateRequirement(ORG, 'r', { status: 'DONE' }))
        .rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('aspects', () => {
    const base = { activity: 'Produção', aspect: 'Consumo de energia', impact: 'Esgotamento de recursos' };

    it('computes significance on create', async () => {
      const prisma = makePrisma();
      await new EnvironmentService(prisma).createAspect(ORG, { ...base, severity: 4, probability: 4 });
      const data = prisma.environmentalAspect.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ organizationId: ORG, significance: 16, isSignificant: true, condition: 'NORMAL' });
    });

    it('validates required fields and the 1-5 scales', async () => {
      const svc = new EnvironmentService(makePrisma());
      await expect(svc.createAspect(ORG, { activity: 'x', aspect: '', impact: 'y' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(svc.createAspect(ORG, { ...base, severity: 6 })).rejects.toBeInstanceOf(BadRequestException);
      await expect(svc.createAspect(ORG, { ...base, probability: 0 })).rejects.toBeInstanceOf(BadRequestException);
      await expect(svc.createAspect(ORG, { ...base, condition: 'WEIRD' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a responsible person from another organisation', async () => {
      const prisma = makePrisma();
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(new EnvironmentService(prisma).createAspect(ORG, { ...base, responsibleId: 'stranger' }))
        .rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.findFirst.mock.calls[0][0].where).toEqual({ id: 'stranger', organizationId: ORG });
    });

    it('recomputes significance from the stored values when only one factor changes', async () => {
      const prisma = makePrisma();
      prisma.environmentalAspect.findFirst.mockResolvedValue({ id: 'a', severity: 4, probability: 2, condition: 'NORMAL' });
      await new EnvironmentService(prisma).updateAspect(ORG, 'a', { probability: 4 });
      const data = prisma.environmentalAspect.update.mock.calls[0][0].data;
      expect(data).toMatchObject({ severity: 4, probability: 4, significance: 16, isSignificant: true });
    });

    it('deletes only inside the organisation', async () => {
      const prisma = makePrisma();
      const svc = new EnvironmentService(prisma);
      await svc.removeAspect(ORG, 'a');
      expect(prisma.environmentalAspect.deleteMany.mock.calls[0][0].where).toEqual({ id: 'a', organizationId: ORG });
      prisma.environmentalAspect.deleteMany.mockResolvedValue({ count: 0 });
      await expect(svc.removeAspect(ORG, 'a')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('objectives & obligations', () => {
    it('parses numbers and dates and rejects garbage', async () => {
      const prisma = makePrisma();
      const svc = new EnvironmentService(prisma);
      await svc.createObjective(ORG, { title: 'Reduzir energia', baseline: '100', target: '90', deadline: '2027-12-31' });
      const data = prisma.environmentalObjective.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ baseline: 100, target: 90, status: 'PLANNED' });
      expect(data.deadline).toBeInstanceOf(Date);
      await expect(svc.createObjective(ORG, { title: 'x', target: 'abc' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(svc.createObjective(ORG, { title: 'x', deadline: 'not-a-date' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('stamps the evaluation date when a legal requirement is assessed', async () => {
      const prisma = makePrisma();
      prisma.environmentalObligation.findFirst.mockResolvedValue({ id: 'o' });
      await new EnvironmentService(prisma).updateObligation(ORG, 'o', { complianceStatus: 'COMPLIANT' });
      const data = prisma.environmentalObligation.update.mock.calls[0][0].data;
      expect(data.complianceStatus).toBe('COMPLIANT');
      expect(data.lastEvaluatedAt).toBeInstanceOf(Date);
    });

    it('requires a title and a valid category', async () => {
      const svc = new EnvironmentService(makePrisma());
      await expect(svc.createObligation(ORG, { source: 'DL' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(svc.createObligation(ORG, { title: 'x', category: 'NOPE' })).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
