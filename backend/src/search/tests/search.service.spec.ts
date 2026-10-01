import { SearchService } from '../search.service';

const ORG = 'org-1';

function makeService(opts: {
  perms: Record<string, number>;
  policies?: any[];
  tasks?: any[];
  failPolicies?: boolean;
}) {
  const policyFind = opts.failPolicies
    ? jest.fn().mockRejectedValue(new Error('boom'))
    : jest.fn().mockResolvedValue(opts.policies ?? []);
  const taskFind = jest.fn().mockResolvedValue(opts.tasks ?? []);
  const prisma: any = new Proxy(
    { policy: { findMany: policyFind }, task: { findMany: taskFind } },
    // every other model: an empty table
    { get: (t: any, k: string) => t[k] ?? { findMany: jest.fn().mockResolvedValue([]) } },
  );
  const permissions: any = { getUserPermissions: jest.fn().mockResolvedValue(opts.perms) };
  return { service: new SearchService(prisma, permissions), policyFind, taskFind, permissions };
}

const policy = (id: string, title: string, content = '', extra: any = {}) => ({
  id, title, description: null, content, tags: [], category: 'OTHER', status: 'APPROVED', version: '1.0', ...extra,
});

describe('SearchService', () => {
  it('returns nothing for an empty / stop-word-free query', async () => {
    const { service, policyFind } = makeService({ perms: { policies: 2 } });
    const r = await service.search('u1', ORG, '   ');
    expect(r.hits).toEqual([]);
    expect(policyFind).not.toHaveBeenCalled();
  });

  it('only scans the caller\'s organisation', async () => {
    const { service, policyFind, taskFind } = makeService({ perms: { policies: 2, tasks: 1 } });
    await service.search('u1', ORG, 'segurança');
    expect(policyFind.mock.calls[0][0].where).toEqual({ organizationId: ORG });
    expect(taskFind.mock.calls[0][0].where).toEqual({ project: { organizationId: ORG } });
  });

  it('skips modules the user has no access to', async () => {
    const { service, policyFind, taskFind } = makeService({ perms: { policies: 1, tasks: 0 } });
    await service.search('u1', ORG, 'segurança');
    expect(policyFind).toHaveBeenCalled();
    expect(taskFind).not.toHaveBeenCalled();
  });

  it('finds words inside the content, accent-insensitively, and explains where', async () => {
    const { service } = makeService({
      perms: { policies: 2 },
      policies: [policy('p1', 'Política Geral', 'Todos os colaboradores devem ter formação anual em segurança.')],
    });
    const r = await service.search('u1', ORG, 'formacao');
    expect(r.hits).toHaveLength(1);
    expect(r.hits[0]).toMatchObject({ type: 'policy', tier: 'exact', matchedIn: 'conteúdo' });
    expect(r.hits[0].snippet).toContain('formação anual');
  });

  it('orders exact before partial before related, best score first', async () => {
    const { service } = makeService({
      perms: { policies: 2 },
      policies: [
        policy('related', 'Guia rápido', 'Ver o tutorial e os vídeos de apoio.'),
        policy('partial', 'Plano de segurança'),
        policy('exact-body', 'Plano anual', 'A formação de segurança é obrigatória.'),
        policy('exact-title', 'Formação de segurança'),
      ],
    });
    const r = await service.search('u1', ORG, 'formação segurança');
    // "Guia rápido … tutorial e vídeos" has neither word, but belongs to the training concept.
    expect(r.hits.map(h => h.id)).toEqual(['exact-title', 'exact-body', 'partial', 'related']);
    expect(r.counts).toEqual({ exact: 2, partial: 1, related: 1 });

    const rel = await service.search('u1', ORG, 'formação');
    expect(rel.hits.find(h => h.id === 'related')?.tier).toBe('related');
    expect(rel.hits.find(h => h.id === 'exact-title')?.tier).toBe('exact');
    expect(rel.hits[rel.hits.length - 1].tier).toBe('related');
  });

  it('keeps working when one entity fails', async () => {
    const { service } = makeService({
      perms: { policies: 2, tasks: 1 },
      failPolicies: true,
      tasks: [{ id: 't1', title: 'Rever formação', description: null, status: 'TODO', tags: [], project: { name: 'P' } }],
    });
    const r = await service.search('u1', ORG, 'formacao');
    expect(r.hits.map(h => h.id)).toEqual(['t1']);
  });

  it('caps the number of results per tier', async () => {
    const many = Array.from({ length: 10 }, (_, i) => policy(`p${i}`, `Segurança ${i}`));
    const { service } = makeService({ perms: { policies: 2 }, policies: many });
    const r = await service.search('u1', ORG, 'segurança', 4);
    expect(r.hits).toHaveLength(4);
    expect(r.total).toBe(10);
  });
});
