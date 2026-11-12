import { BadGatewayException, BadRequestException, NotFoundException } from '@nestjs/common';
import { AML_RESULT_OF_STATUS, IdentityVerificationService, LINK_SEND_LIMIT } from '../identity-verification.service';

const ORG = 'org-1';
const TERMS = { version: 1, currency: 'EUR', setupFee: 500, prices: { individual: 2, business: 5, sanctions: 1 }, proposedAt: '2026-11-01T00:00:00.000Z', proposedById: 'op' };
const ACCEPTED = { terms: TERMS, acceptance: { version: 1, acceptedAt: '2026-11-02T00:00:00.000Z', acceptedById: 'admin' } };

/** A provider that can fetch status and be checked; capabilities are configurable. */
function provider(id: string, over: any = {}) {
  return {
    id, displayName: id[0] + id.slice(1).toLowerCase(),
    capabilities: { individual: true, business: true, sanctions: true, webhooks: true },
    verifyIndividual: jest.fn().mockResolvedValue({ status: 'PENDING', providerRefId: 'ref-new', actionUrl: 'https://verify.example/s/1', rawResult: {} }),
    verifyBusiness: jest.fn().mockResolvedValue({ status: 'PENDING', providerRefId: 'ref-biz', rawResult: {} }),
    screenSanctions: jest.fn().mockResolvedValue({ status: 'APPROVED', providerRefId: 'ref-s', rawResult: {} }),
    handleWebhook: jest.fn().mockReturnValue({ providerRefId: 'ref-1', status: 'APPROVED', rawResult: {} }),
    fetchStatus: jest.fn().mockResolvedValue({ providerRefId: 'ref-1', status: 'APPROVED', rawResult: { fresh: true } }),
    check: jest.fn().mockResolvedValue({ ok: true, detail: 'A chave foi aceite.' }),
    ...over,
  };
}

function make(opts: { commercial?: any; addonActive?: boolean; providers?: any[]; usageRows?: any[] } = {}) {
  const providers = opts.providers ?? [provider('DIDIT')];
  const byId = Object.fromEntries(providers.map(p => [p.id, p]));
  const registry: any = {
    get: jest.fn((id: string) => byId[(id ?? '').toUpperCase()]),
    list: jest.fn(() => providers.map(p => ({ id: p.id, displayName: p.displayName, capabilities: p.capabilities, configured: true }))),
    defaultId: jest.fn(() => providers[0]?.id ?? null),
    resolve: jest.fn(() => providers[0]),
    resolveFor: jest.fn((f: string) => providers.find(p => p.capabilities[f]) ?? null),
  };
  const addon = { id: 'addon-1', metadata: { kycCommercial: opts.commercial === undefined ? ACCEPTED : opts.commercial } };
  const prisma: any = {
    license: { findUnique: jest.fn().mockResolvedValue({ id: 'lic-1' }) },
    licenseAddon: { findUnique: jest.fn().mockResolvedValue(addon), update: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]) },
    identityVerification: {
      create: jest.fn(async ({ data }: any) => ({ id: 'v-new', ...data })),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue(opts.usageRows ?? []),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    organization: { findUnique: jest.fn().mockResolvedValue({ name: 'ACME <SA>' }) },
    amlScreening: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  const licensing: any = { hasActiveAddon: jest.fn().mockResolvedValue(opts.addonActive ?? true) };
  const mail: any = { sendTicketEmail: jest.fn().mockResolvedValue(undefined) };
  return { service: new IdentityVerificationService(prisma, licensing, registry, mail), prisma, registry, mail, licensing, providers: byId, addon };
}

const person = { fullName: 'Ana Silva', country: 'PT' };

describe('add-on state and monthly spending cap', () => {
  it('tells the UI whether the add-on is active, so it can show an activation notice instead of a form that fails', async () => {
    expect((await make({ addonActive: false }).service.getProviderSettings(ORG)).addonActive).toBe(false);
    expect((await make().service.getProviderSettings(ORG)).addonActive).toBe(true);
  });

  it('keeps serving automatically while under the cap, and goes manual (flagged) when a check would exceed it', async () => {
    const terms = { ...TERMS, monthlyCap: 6 };
    const ok = make({ commercial: { ...ACCEPTED, terms }, usageRows: [{ unitPrice: 2, currency: 'EUR' }, { unitPrice: 2, currency: 'EUR' }] });
    await ok.service.verifyIndividual(ORG, 'u1', person); // 4 + 2 = 6 ≤ 6
    expect(ok.providers.DIDIT.verifyIndividual).toHaveBeenCalled();

    const over = make({ commercial: { ...ACCEPTED, terms }, usageRows: [{ unitPrice: 2, currency: 'EUR' }, { unitPrice: 2, currency: 'EUR' }, { unitPrice: 1, currency: 'EUR' }] });
    const res = await over.service.verifyIndividual(ORG, 'u1', person); // 5 + 2 = 7 > 6
    expect(over.providers.DIDIT.verifyIndividual).not.toHaveBeenCalled();
    expect(res).toMatchObject({ provider: 'MANUAL', automated: false, feature: 'individual' });
    expect(over.prisma.identityVerification.create.mock.calls[0][0].data.rawResult.capReached).toBe(true);
    // a cheaper feature may still fit in what is left
    await over.service.screenSanctions(ORG, 'u1', { name: 'X' }); // 5 + 1 = 6
    expect(over.providers.DIDIT.screenSanctions).toHaveBeenCalled();
  });

  it('no cap = no ceiling', async () => {
    const m = make({ usageRows: Array.from({ length: 500 }, () => ({ unitPrice: 2, currency: 'EUR' })) });
    await m.service.verifyIndividual(ORG, 'u1', person);
    expect(m.providers.DIDIT.verifyIndividual).toHaveBeenCalled();
  });

  it('reports usage against the cap, and when it is exhausted', async () => {
    const m = make({ commercial: { ...ACCEPTED, terms: { ...TERMS, monthlyCap: 10 } }, usageRows: Array.from({ length: 5 }, () => ({ unitPrice: 2, currency: 'EUR' })) });
    const s = await m.service.getProviderSettings(ORG);
    expect(s.usage).toMatchObject({ automatedChecks: 5, amount: 10, cap: 10, capReached: true });
    const free = make({ commercial: { ...ACCEPTED, terms: { ...TERMS, monthlyCap: 100 } } });
    expect((await free.service.getProviderSettings(ORG)).usage).toMatchObject({ cap: 100, capReached: false });
  });

  it('the operator can set a cap in the proposed terms; it needs a new acceptance like any change', async () => {
    const m = make();
    await m.service.proposeTerms(ORG, 'op', { currency: 'EUR', setupFee: 100, priceIndividual: 1, monthlyCap: 250 } as any);
    const saved = m.prisma.licenseAddon.update.mock.calls[0][0].data.metadata.kycCommercial;
    expect(saved.terms).toMatchObject({ version: 2, monthlyCap: 250 });
    expect(saved.acceptance.version).toBe(1);
  });
});

describe('refresh and reconciliation of pending verifications', () => {
  const pending = (over: any = {}) => ({ id: 'v1', organizationId: ORG, provider: 'DIDIT', providerRefId: 'ref-1', automated: true, status: 'PENDING', decidedAt: null, subjectName: 'Ana Silva', amlScreeningId: null, ...over });

  it('asks the provider for the current state and applies it', async () => {
    const m = make();
    m.prisma.identityVerification.findFirst.mockResolvedValueOnce(pending()).mockResolvedValueOnce(pending({ status: 'APPROVED' }));
    const out = await m.service.refresh(ORG, 'v1');
    expect(m.providers.DIDIT.fetchStatus).toHaveBeenCalledWith('ref-1');
    expect(m.prisma.identityVerification.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: 'v1', decidedAt: null }, data: { status: 'APPROVED' } });
    expect(m.prisma.identityVerification.findFirst.mock.calls[0][0].where).toEqual({ id: 'v1', organizationId: ORG });
    expect(out.status).toBe('APPROVED');
  });

  it('refuses manual verifications, ones without a provider reference, unknown ones and providers that cannot be queried', async () => {
    const m = make();
    m.prisma.identityVerification.findFirst.mockResolvedValue(pending({ automated: false, provider: 'MANUAL' }));
    await expect(m.service.refresh(ORG, 'v1')).rejects.toBeInstanceOf(BadRequestException);
    m.prisma.identityVerification.findFirst.mockResolvedValue(pending({ providerRefId: null }));
    await expect(m.service.refresh(ORG, 'v1')).rejects.toBeInstanceOf(BadRequestException);
    m.prisma.identityVerification.findFirst.mockResolvedValue(null);
    await expect(m.service.refresh(ORG, 'x')).rejects.toBeInstanceOf(NotFoundException);
    const noFetch = make({ providers: [provider('OPENSANCTIONS', { fetchStatus: undefined })] });
    noFetch.prisma.identityVerification.findFirst.mockResolvedValue(pending({ provider: 'OPENSANCTIONS' }));
    await expect(noFetch.service.refresh(ORG, 'v1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('a provider failure is a 502 that does not leak its message, and nothing is changed', async () => {
    const m = make();
    m.providers.DIDIT.fetchStatus.mockRejectedValue(new Error('Didit API error 500: {"secret":"leak"}'));
    m.prisma.identityVerification.findFirst.mockResolvedValue(pending());
    const err: any = await m.service.refresh(ORG, 'v1').catch(e => e);
    expect(err).toBeInstanceOf(BadGatewayException);
    expect(JSON.stringify(err.getResponse())).not.toContain('leak');
    expect(m.prisma.identityVerification.updateMany).not.toHaveBeenCalled();
  });

  it('never overrides a decision taken by a person, even through refresh', async () => {
    const m = make();
    m.prisma.identityVerification.findFirst.mockResolvedValue(pending({ status: 'REJECTED', decidedAt: new Date() }));
    await m.service.refresh(ORG, 'v1');
    expect(m.prisma.identityVerification.updateMany).not.toHaveBeenCalled();
  });

  it('the scheduled reconciliation updates stale PENDING checks, skips what cannot be queried and survives one failure', async () => {
    const dead = provider('SUMSUB', { fetchStatus: undefined });
    const m = make({ providers: [provider('DIDIT'), dead] });
    const rows = [pending({ id: 'a' }), pending({ id: 'b', provider: 'SUMSUB' }), pending({ id: 'c', providerRefId: 'ref-bad' })];
    m.prisma.identityVerification.findMany.mockResolvedValue(rows);
    m.providers.DIDIT.fetchStatus.mockImplementation(async (ref: string) => {
      if (ref === 'ref-bad') throw new Error('boom');
      return { providerRefId: ref, status: 'APPROVED', rawResult: {} };
    });
    const now = new Date('2026-11-12T12:00:00Z');
    expect(await m.service.reconcilePending(now)).toBe(1);
    const where = m.prisma.identityVerification.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ automated: true, status: 'PENDING', providerRefId: { not: null } });
    expect(where.updatedAt.lt.toISOString()).toBe('2026-11-12T11:50:00.000Z'); // waits 10 minutes before asking
    expect(where.createdAt.gt.toISOString()).toBe('2026-10-13T12:00:00.000Z'); // gives up after 30 days
    expect(m.prisma.identityVerification.findMany.mock.calls[0][0].take).toBe(50);
  });

  it('the AML screening follows the verification: provider outcome and human decision both update it', async () => {
    const m = make();
    const linked = pending({ amlScreeningId: 'aml-9' });
    m.prisma.identityVerification.findFirst.mockResolvedValue(linked);
    await m.service.handleWebhook('didit', {}, { rawBody: Buffer.from('{}'), headers: {} });
    expect(m.prisma.amlScreening.updateMany).toHaveBeenCalledWith({ where: { id: 'aml-9', organizationId: ORG }, data: { result: 'CLEAR' } });

    const review = pending({ status: 'REVIEW', amlScreeningId: 'aml-9' });
    m.prisma.identityVerification.findFirst.mockResolvedValue(review);
    await m.service.decide(ORG, 'v1', 'u2', { decision: 'REJECTED', note: 'listas oficiais' });
    expect(m.prisma.amlScreening.updateMany).toHaveBeenLastCalledWith({ where: { id: 'aml-9', organizationId: ORG }, data: { result: 'HIT' } });
  });

  it('nothing is written to AML when there is no link, or when the status did not change', async () => {
    const m = make();
    m.prisma.identityVerification.findFirst.mockResolvedValue(pending({ amlScreeningId: null }));
    await m.service.handleWebhook('didit', {}, { rawBody: Buffer.from('{}'), headers: {} });
    expect(m.prisma.amlScreening.updateMany).not.toHaveBeenCalled();
    m.providers.DIDIT.handleWebhook.mockReturnValue({ providerRefId: 'ref-1', status: 'PENDING', rawResult: {} });
    m.prisma.identityVerification.findFirst.mockResolvedValue(pending({ amlScreeningId: 'aml-9' }));
    await m.service.handleWebhook('didit', {}, { rawBody: Buffer.from('{}'), headers: {} });
    expect(m.prisma.amlScreening.updateMany).not.toHaveBeenCalled();
  });

  it('a failure while updating the AML list never breaks the verification', async () => {
    const m = make();
    m.prisma.amlScreening.updateMany.mockRejectedValue(new Error('db'));
    m.prisma.identityVerification.findFirst.mockResolvedValue(pending({ amlScreeningId: 'aml-9' }));
    await expect(m.service.handleWebhook('didit', {}, { rawBody: Buffer.from('{}'), headers: {} })).resolves.toEqual({ received: true });
  });

  it('the AML list only ever gets values its screen knows', () => {
    expect(Object.values(AML_RESULT_OF_STATUS).sort()).toEqual(['CLEAR', 'HIT', 'PENDING', 'POTENTIAL_MATCH', 'POTENTIAL_MATCH']);
  });
});

describe('sending the verification link to the person', () => {
  const live = (over: any = {}) => ({ id: 'v1', organizationId: ORG, automated: true, status: 'PENDING', actionUrl: 'https://verify.example/s/abc', linkSentCount: 0, ...over });

  it('emails the hosted link in the organisation\'s name and counts the send', async () => {
    const m = make();
    m.prisma.identityVerification.findFirst.mockResolvedValue(live());
    const out = await m.service.sendLink(ORG, 'v1', ' ana@x.pt ');
    const [to, subject, body] = m.mail.sendTicketEmail.mock.calls[0];
    expect(to).toBe('ana@x.pt');
    expect(subject).toContain('ACME <SA>'); // escaping is the mail template's job
    expect(body).toMatchObject({ url: 'https://verify.example/s/abc', cta: 'Confirmar a minha identidade' });
    expect(JSON.stringify(body)).not.toContain('Ana Silva'); // the subject's name never goes in the email
    expect(m.prisma.identityVerification.update.mock.calls[0][0].data).toMatchObject({ linkSentCount: 1 });
    expect(out).toEqual({ sent: true, remaining: LINK_SEND_LIMIT - 1 });
  });

  it('refuses a bad address, a finished or manual verification, a non-https link and too many sends', async () => {
    const m = make();
    m.prisma.identityVerification.findFirst.mockResolvedValue(live());
    for (const bad of ['', 'sem-arroba', 'a@b', 'a b@c.pt', '<x>@y.pt']) await expect(m.service.sendLink(ORG, 'v1', bad)).rejects.toBeInstanceOf(BadRequestException);
    for (const v of [live({ status: 'APPROVED' }), live({ automated: false }), live({ actionUrl: null }), live({ actionUrl: 'http://verify.example/s' }), live({ linkSentCount: LINK_SEND_LIMIT })]) {
      m.prisma.identityVerification.findFirst.mockResolvedValue(v);
      await expect(m.service.sendLink(ORG, 'v1', 'ana@x.pt')).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(m.mail.sendTicketEmail).not.toHaveBeenCalled();
    m.prisma.identityVerification.findFirst.mockResolvedValue(null);
    await expect(m.service.sendLink(ORG, 'x', 'ana@x.pt')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('a mail failure is reported and does not use up a send', async () => {
    const m = make();
    m.prisma.identityVerification.findFirst.mockResolvedValue(live());
    m.mail.sendTicketEmail.mockRejectedValue(new Error('smtp down: user=secret'));
    const err: any = await m.service.sendLink(ORG, 'v1', 'ana@x.pt').catch(e => e);
    expect(err).toBeInstanceOf(BadGatewayException);
    expect(JSON.stringify(err.getResponse())).not.toContain('secret');
    expect(m.prisma.identityVerification.update).not.toHaveBeenCalled();
  });
});

describe('operator tools: connection check, usage report, set-up fee', () => {
  it('checks the credentials of a configured provider, without any billable call', async () => {
    const m = make();
    expect(await m.service.checkProvider('didit')).toMatchObject({ id: 'DIDIT', ok: true });
    m.providers.DIDIT.check.mockResolvedValue({ ok: false, detail: 'recusou a chave' });
    expect(await m.service.checkProvider('DIDIT')).toMatchObject({ ok: false, detail: 'recusou a chave' });
    m.providers.DIDIT.check.mockRejectedValue(new Error('network: key=abc'));
    const r: any = await m.service.checkProvider('DIDIT');
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain('abc');
  });

  it('says clearly when a provider is not configured, cannot be checked for free, or does not exist', async () => {
    const m = make({ providers: [provider('DIDIT'), provider('SUMSUB', { check: undefined })] });
    expect(await m.service.checkProvider('SUMSUB')).toMatchObject({ ok: null });
    m.registry.get.mockImplementation((id: string) => (id.toUpperCase() === 'DIDIT' ? undefined : m.providers[id.toUpperCase()]));
    expect(await m.service.checkProvider('DIDIT')).toMatchObject({ ok: false, detail: expect.stringContaining('não está configurado') });
    await expect(m.service.checkProvider('NOPE')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('usage report: per customer, provider and feature, with prices charged and the set-up fees', async () => {
    const m = make();
    m.prisma.identityVerification.findMany.mockResolvedValue([
      { organizationId: 'o1', provider: 'DIDIT', feature: 'individual', subjectType: 'INDIVIDUAL', unitPrice: 2, currency: 'EUR', organization: { name: 'Beta Lda' } },
      { organizationId: 'o1', provider: 'DIDIT', feature: 'individual', subjectType: 'INDIVIDUAL', unitPrice: 2, currency: 'EUR', organization: { name: 'Beta Lda' } },
      { organizationId: 'o1', provider: 'DIDIT', feature: null, subjectType: 'BUSINESS', unitPrice: 5, currency: 'EUR', organization: { name: 'Beta Lda' } }, // before the column existed
      { organizationId: 'o0', provider: 'OPENSANCTIONS', feature: 'sanctions', subjectType: 'INDIVIDUAL', unitPrice: 0.5, currency: 'EUR', organization: { name: 'Alfa SA' } },
    ]);
    m.prisma.licenseAddon.findMany.mockResolvedValue([
      { metadata: { kycCommercial: { ...ACCEPTED, setupInvoicedAt: '2026-11-05T00:00:00.000Z' } }, license: { organization: { id: 'o1', name: 'Beta Lda' } } },
      { metadata: { kycCommercial: { terms: TERMS } }, license: { organization: { id: 'o2', name: 'Gama' } } }, // proposed, not accepted → no fee yet
      { metadata: {}, license: { organization: { id: 'o3', name: 'Delta' } } },
    ]);
    const r = await m.service.usageReport('2026-10');
    const where = m.prisma.identityVerification.findMany.mock.calls[0][0].where;
    expect(where.automated).toBe(true);
    expect(where.createdAt.gte.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(where.createdAt.lt.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(r.rows.map((x: any) => [x.organizationName, x.provider, x.feature, x.checks, x.amount])).toEqual([
      ['Alfa SA', 'OPENSANCTIONS', 'sanctions', 1, 0.5],
      ['Beta Lda', 'DIDIT', 'business', 1, 5],
      ['Beta Lda', 'DIDIT', 'individual', 2, 4],
    ]);
    expect(r.totals).toEqual({ checks: 4, amount: 9.5, currency: 'EUR' });
    expect(r.setupFees).toHaveLength(1);
    expect(r.setupFees[0]).toMatchObject({ organizationName: 'Beta Lda', amount: 500, invoicedAt: '2026-11-05T00:00:00.000Z' });
  });

  it('an invalid month falls back to the current one', async () => {
    const m = make();
    const r = await m.service.usageReport('2026-13; DROP');
    expect(r.month).toMatch(/^\d{4}-\d{2}$/);
  });

  it('marks the set-up fee as invoiced (and back), only once the customer accepted', async () => {
    const m = make();
    await m.service.setSetupInvoiced(ORG, true);
    const saved = m.prisma.licenseAddon.update.mock.calls[0][0].data.metadata.kycCommercial;
    expect(saved.setupInvoicedAt).toEqual(expect.any(String));
    expect(saved.acceptance).toBeDefined();
    await m.service.setSetupInvoiced(ORG, false);
    expect(m.prisma.licenseAddon.update.mock.calls[1][0].data.metadata.kycCommercial.setupInvoicedAt).toBeNull();
    await expect(make({ commercial: { terms: TERMS } }).service.setSetupInvoiced(ORG, true)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepting new terms keeps the invoiced marker of an earlier acceptance', async () => {
    const m = make({ commercial: { ...ACCEPTED, setupInvoicedAt: '2026-11-05T00:00:00.000Z' } });
    await m.service.acceptTerms(ORG, 'admin', 1);
    expect(m.prisma.licenseAddon.update.mock.calls[0][0].data.metadata.kycCommercial.setupInvoicedAt).toBe('2026-11-05T00:00:00.000Z');
  });

  it('every verification records which feature it was (for the report)', async () => {
    const m = make();
    await m.service.verifyIndividual(ORG, 'u1', person);
    await m.service.screenSanctions(ORG, 'u1', { name: 'X' });
    expect(m.prisma.identityVerification.create.mock.calls.map((c: any) => c[0].data.feature)).toEqual(['individual', 'sanctions']);
  });
});
