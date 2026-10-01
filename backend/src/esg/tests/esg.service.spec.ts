import { EsgService } from '../esg.service';

const ORG = 'org-1';

function make(existing: Array<{ standardCode: string; framework: string }> = []) {
  const prisma: any = {
    esgMetric: {
      findMany: jest.fn().mockResolvedValue(existing),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
  return { service: new EsgService(prisma), prisma };
}

describe('EsgService.initOrganization', () => {
  it('seeds CSRD + GRI metrics with columns that exist on the table (indicator, not title)', async () => {
    const { service, prisma } = make();
    const res = await service.initOrganization(ORG, 2026);
    const rows = prisma.esgMetric.createMany.mock.calls[0][0].data;
    expect(res.seeded).toBe(rows.length);
    expect(rows.length).toBeGreaterThan(30);
    for (const r of rows) {
      expect(r).not.toHaveProperty('title');
      expect(r.indicator).toEqual(expect.any(String));
      expect(r).toMatchObject({ organizationId: ORG, year: 2026, status: 'NOT_REPORTED' });
      expect(['ENVIRONMENTAL', 'SOCIAL', 'GOVERNANCE']).toContain(r.pillar);
      expect(['CSRD', 'GRI']).toContain(r.framework);
    }
    // the energy metric the ISO 14001 module links to must be there
    expect(rows.find((r: any) => r.framework === 'CSRD' && r.standardCode === 'E1-5')).toMatchObject({ pillar: 'ENVIRONMENTAL', unit: 'MWh' });
  });

  it('is idempotent: metrics that already exist are not created again', async () => {
    const { service, prisma } = make([{ standardCode: 'E1-5', framework: 'CSRD' }]);
    await service.initOrganization(ORG, 2026);
    const rows = prisma.esgMetric.createMany.mock.calls[0][0].data;
    expect(rows.some((r: any) => r.framework === 'CSRD' && r.standardCode === 'E1-5')).toBe(false);
    expect(prisma.esgMetric.createMany.mock.calls[0][0].skipDuplicates).toBe(true);
  });

  it('does nothing when everything exists', async () => {
    const { service, prisma } = make();
    await service.initOrganization(ORG, 2026);
    const all = prisma.esgMetric.createMany.mock.calls[0][0].data.map((r: any) => ({ standardCode: r.standardCode, framework: r.framework }));
    const { service: again, prisma: p2 } = make(all);
    expect((await again.initOrganization(ORG, 2026)).seeded).toBe(0);
    expect(p2.esgMetric.createMany).not.toHaveBeenCalled();
  });
});
