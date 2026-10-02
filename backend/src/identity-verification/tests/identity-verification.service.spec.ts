import { BadGatewayException, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IdentityVerificationService, namesMatch } from '../identity-verification.service';

const ORG = 'org-1';

function fakeProvider(id: string, over: any = {}) {
  return {
    id,
    displayName: id[0] + id.slice(1).toLowerCase(),
    capabilities: { individual: true, business: true, sanctions: true, webhooks: true },
    verifyIndividual: jest.fn().mockResolvedValue({ status: 'PENDING', providerRefId: `${id}-ref`, rawResult: {} }),
    verifyBusiness: jest.fn().mockResolvedValue({ status: 'PENDING', providerRefId: `${id}-ref`, rawResult: {} }),
    screenSanctions: jest.fn().mockResolvedValue({ status: 'APPROVED', rawResult: {} }),
    handleWebhook: jest.fn().mockReturnValue({ providerRefId: 'ref-1', status: 'APPROVED', rawResult: { ok: true } }),
    ...over,
  };
}

const TERMS = { version: 1, currency: 'EUR', setupFee: 500, prices: { individual: 2, business: 5, sanctions: 1 }, proposedAt: '2026-10-02T00:00:00.000Z', proposedById: 'op' };
const ACCEPTED = { terms: TERMS, acceptance: { version: 1, acceptedAt: '2026-10-02T00:00:00.000Z', acceptedById: 'admin' } };

function make(opts: { addonActive?: boolean; metadata?: any; providers?: any[]; configured?: string[]; commercial?: any } = {}) {
  const sumsub = fakeProvider('SUMSUB');
  const trulioo = fakeProvider('TRULIOO', { capabilities: { individual: true, business: true, sanctions: true, webhooks: false } });
  // sanctions-only provider (like OpenSanctions): cannot verify people or companies
  const sanctionsOnly = fakeProvider('OPENSANCTIONS', { capabilities: { individual: false, business: false, sanctions: true, webhooks: false } });
  const byId: Record<string, any> = { SUMSUB: sumsub, TRULIOO: trulioo, OPENSANCTIONS: sanctionsOnly };
  const configured = opts.configured ?? ['SUMSUB', 'TRULIOO'];
  const registry: any = {
    resolve: jest.fn((pref?: string | null) => byId[(pref ?? '').toUpperCase()] && configured.includes((pref ?? '').toUpperCase()) ? byId[pref!.toUpperCase()] : byId[configured[0]]),
    get: jest.fn((id: string) => (configured.includes((id ?? '').toUpperCase()) ? byId[id.toUpperCase()] : undefined)),
    list: jest.fn(() => ['SUMSUB', 'TRULIOO', 'OPENSANCTIONS'].map(id => ({ id, displayName: byId[id].displayName, capabilities: byId[id].capabilities, configured: configured.includes(id) }))),
    defaultId: jest.fn(() => configured[0] ?? null),
    // same rules as the real registry: the requested provider if it can, else the default, else any that can
    resolveFor: jest.fn((feature: string, pref?: string | null) => {
      const get = (id?: string | null) => (id && configured.includes(id.toUpperCase()) ? byId[id.toUpperCase()] : undefined);
      const can = (p: any) => (p && p.capabilities[feature] ? p : null);
      return can(get(pref)) ?? can(get(configured[0] ?? null)) ?? configured.map(id => byId[id]).find(p => p.capabilities[feature]) ?? null;
    }),
  };
  const prisma: any = {
    license: { findUnique: jest.fn().mockResolvedValue({ id: 'lic-1' }) },
    licenseAddon: {
      findUnique: jest.fn().mockResolvedValue({ id: 'addon-1', enabled: true, metadata: { ...(opts.metadata ?? {}), ...(opts.commercial === null ? {} : { kycCommercial: opts.commercial ?? ACCEPTED }) } }),
      update: jest.fn().mockResolvedValue({}),
    },
    identityVerification: {
      create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'v1', ...data })),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const licensing: any = { hasActiveAddon: jest.fn().mockResolvedValue(opts.addonActive ?? true) };
  return { service: new IdentityVerificationService(prisma, licensing, registry), prisma, registry, sumsub, trulioo, sanctionsOnly, licensing };
}

const person = { fullName: 'Ana Silva', country: 'PT' };

describe('IdentityVerificationService — several providers', () => {
  describe('which provider is used', () => {
    it('uses the organisation\'s own choice and records it on the verification', async () => {
      const { service, prisma, registry, trulioo } = make({ metadata: { kycProvider: 'TRULIOO' } });
      const res = await service.verifyIndividual(ORG, 'u1', person);
      expect(registry.resolveFor).toHaveBeenCalledWith('individual', 'TRULIOO');
      expect(trulioo.verifyIndividual).toHaveBeenCalled();
      expect(prisma.identityVerification.create.mock.calls[0][0].data).toMatchObject({ organizationId: ORG, provider: 'TRULIOO', subjectType: 'INDIVIDUAL' });
      expect(res.provider).toBe('TRULIOO');
    });

    it('uses the platform default when the organisation has not chosen', async () => {
      const { service, registry, sumsub } = make();
      await service.verifyBusiness(ORG, 'u1', { legalName: 'ACME', country: 'PT' });
      expect(registry.resolveFor).toHaveBeenCalledWith('business', null);
      expect(sumsub.verifyBusiness).toHaveBeenCalled();
    });

    it('does nothing when the add-on is not active', async () => {
      const { service, sumsub, prisma } = make({ addonActive: false });
      await expect(service.verifyIndividual(ORG, 'u1', person)).rejects.toBeInstanceOf(BadRequestException);
      expect(sumsub.verifyIndividual).not.toHaveBeenCalled();
      expect(prisma.identityVerification.create).not.toHaveBeenCalled();
    });

    it('falls back to a manual check when no configured provider can do it', async () => {
      const { service, sumsub, prisma } = make({ configured: ['SUMSUB'] });
      sumsub.capabilities.sanctions = false;
      const res = await service.screenSanctions(ORG, 'u1', { name: 'X' });
      expect(sumsub.screenSanctions).not.toHaveBeenCalled();
      expect(res).toMatchObject({ provider: 'MANUAL', status: 'REVIEW', automated: false });
      expect(prisma.identityVerification.create.mock.calls[0][0].data.unitPrice).toBeNull();
    });

    it('hides the provider\'s raw error from the caller and does not store a record', async () => {
      const { service, sumsub, prisma } = make();
      sumsub.verifyIndividual.mockRejectedValue(new Error('Sumsub API error 401: {"secret":"leak"}'));
      const err: any = await service.verifyIndividual(ORG, 'u1', person).catch(e => e);
      expect(err).toBeInstanceOf(BadGatewayException);
      expect(JSON.stringify(err.getResponse())).not.toContain('leak');
      expect(prisma.identityVerification.create).not.toHaveBeenCalled();
    });
  });

  describe('provider settings', () => {
    it('shows the available providers, the choice and the provider actually in effect', async () => {
      const { service } = make({ metadata: { kycProvider: 'TRULIOO' } });
      const s = await service.getProviderSettings(ORG);
      expect(s.providers.map(p => p.id)).toEqual(['SUMSUB', 'TRULIOO', 'OPENSANCTIONS']);
      expect(s).toMatchObject({ selected: 'TRULIOO', effective: 'TRULIOO', platformDefault: 'SUMSUB' });
    });

    it('reports no effective provider when nothing is configured', async () => {
      const { service, registry } = make({ configured: [] });
      registry.resolve.mockImplementation(() => { throw new Error('none'); });
      const s = await service.getProviderSettings(ORG);
      expect(s.effective).toBeNull();
      expect(s.mode).toBe('MANUAL');
      expect(s.platformDefault).toBeNull();
    });

    it('operator routes a feature to a provider, keeping the other metadata and routes', async () => {
      const { service, prisma } = make({ metadata: { note: 'x', kycRouting: { business: 'SUMSUB' } }, configured: ['SUMSUB', 'TRULIOO', 'OPENSANCTIONS'] });
      await service.setRouting(ORG, { sanctions: 'opensanctions', default: 'trulioo' });
      expect(prisma.licenseAddon.update.mock.calls[0][0]).toEqual({
        where: { id: 'addon-1' },
        data: { metadata: { note: 'x', kycCommercial: ACCEPTED, kycProvider: 'TRULIOO', kycRouting: { business: 'SUMSUB', sanctions: 'OPENSANCTIONS' } } },
      });
    });

    it('null clears a choice, absent leaves it', async () => {
      const { service, prisma } = make({ metadata: { kycProvider: 'TRULIOO', kycRouting: { individual: 'SUMSUB', sanctions: 'OPENSANCTIONS' } }, configured: ['SUMSUB', 'TRULIOO', 'OPENSANCTIONS'] });
      await service.setRouting(ORG, { default: null, individual: null });
      const md = prisma.licenseAddon.update.mock.calls[0][0].data.metadata;
      expect(md.kycProvider).toBeNull();
      expect(md.kycRouting).toEqual({ sanctions: 'OPENSANCTIONS' });
    });

    it('rejects unknown and unconfigured providers, and organisations without the add-on', async () => {
      const { service } = make({ configured: ['SUMSUB'] });
      await expect(service.setRouting(ORG, { individual: 'NOPE' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.setRouting(ORG, { individual: 'TRULIOO' })).rejects.toBeInstanceOf(BadRequestException);
      const { service: inactive } = make({ addonActive: false });
      await expect(inactive.setRouting(ORG, { individual: 'SUMSUB' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('switches EVERY customer in one step', async () => {
      const { service, prisma } = make({ configured: ['SUMSUB', 'TRULIOO'] });
      prisma.licenseAddon.findMany = jest.fn().mockResolvedValue([
        { id: 'a1', metadata: { kycProvider: 'SUMSUB' } }, { id: 'a2', metadata: null }, { id: 'a3', metadata: { kycRouting: { sanctions: 'SUMSUB' } } },
      ]);
      expect(await service.setRoutingForAll({ default: 'trulioo' })).toEqual({ updated: 3 });
      expect(prisma.licenseAddon.update).toHaveBeenCalledTimes(3);
      expect(prisma.licenseAddon.update.mock.calls.map((c: any) => c[0].data.metadata.kycProvider)).toEqual(['TRULIOO', 'TRULIOO', 'TRULIOO']);
      expect(prisma.licenseAddon.update.mock.calls[2][0].data.metadata.kycRouting).toEqual({ sanctions: 'SUMSUB' }); // untouched
    });
  });

  describe('each feature goes to the provider that can do it', () => {
    it('documents to one vendor, sanctions to another (e.g. Didit + OpenSanctions)', async () => {
      const { service, sumsub, sanctionsOnly } = make({
        configured: ['SUMSUB', 'OPENSANCTIONS'], metadata: { kycRouting: { sanctions: 'OPENSANCTIONS' } },
      });
      await service.verifyIndividual(ORG, 'u1', person);
      await service.screenSanctions(ORG, 'u1', { name: 'Ana Silva' });
      expect(sumsub.verifyIndividual).toHaveBeenCalled();
      expect(sumsub.screenSanctions).not.toHaveBeenCalled();
      expect(sanctionsOnly.screenSanctions).toHaveBeenCalled();
    });

    it('a sanctions-only provider as default still serves documents through another configured provider', async () => {
      const { service, sumsub, sanctionsOnly } = make({ configured: ['OPENSANCTIONS', 'SUMSUB'] });
      await service.verifyBusiness(ORG, 'u1', { legalName: 'ACME', country: 'PT' });
      expect(sanctionsOnly.verifyBusiness).not.toHaveBeenCalled();
      expect(sumsub.verifyBusiness).toHaveBeenCalled();
    });

    it('with only a sanctions-only provider, documents stay manual while sanctions are automatic', async () => {
      const { service, sanctionsOnly } = make({ configured: ['OPENSANCTIONS'] });
      expect((await service.verifyIndividual(ORG, 'u1', person)).provider).toBe('MANUAL');
      expect((await service.screenSanctions(ORG, 'u1', { name: 'X' })).provider).toBe('OPENSANCTIONS');
      expect(sanctionsOnly.screenSanctions).toHaveBeenCalled();
    });

    it('keeps the hosted link the person must open', async () => {
      const { service, sumsub, prisma } = make();
      sumsub.verifyIndividual.mockResolvedValue({ status: 'PENDING', providerRefId: 'r1', actionUrl: 'https://verify.example/s/abc', rawResult: {} });
      await service.verifyIndividual(ORG, 'u1', person);
      expect(prisma.identityVerification.create.mock.calls[0][0].data.actionUrl).toBe('https://verify.example/s/abc');
    });

    it('shows who serves each feature', async () => {
      const { service } = make({ configured: ['SUMSUB', 'OPENSANCTIONS'], metadata: { kycRouting: { sanctions: 'OPENSANCTIONS' } } });
      const s: any = await service.getProviderSettings(ORG);
      expect(s.routing.sanctions).toEqual({ chosen: 'OPENSANCTIONS', effective: 'OPENSANCTIONS' });
      expect(s.routing.individual).toEqual({ chosen: null, effective: 'SUMSUB' });
    });
  });

  describe('independent of any provider: manual mode and commercial terms', () => {
    it('works with no provider configured at all: the check is recorded for a person to decide', async () => {
      const { service, prisma } = make({ configured: [], commercial: null });
      const res = await service.verifyIndividual(ORG, 'u1', { ...person, documentNumber: '12345678' });
      expect(res).toMatchObject({ provider: 'MANUAL', status: 'REVIEW', automated: false, subjectName: 'Ana Silva' });
      const data = prisma.identityVerification.create.mock.calls[0][0].data;
      expect(data.rawResult.input.documentNumber).toBe('••••5678'); // never stores the full document number
      expect(data.unitPrice).toBeNull();
    });

    it('stays manual until the customer accepts the terms, even if a provider is configured (no surprise costs)', async () => {
      const { service, sumsub } = make({ commercial: { terms: TERMS } }); // proposed, not accepted
      const res = await service.verifyBusiness(ORG, 'u1', { legalName: 'ACME', country: 'PT' });
      expect(sumsub.verifyBusiness).not.toHaveBeenCalled();
      expect(res.provider).toBe('MANUAL');
      const { service: none, sumsub: s2 } = make({ commercial: null }); // no terms at all
      await none.verifyIndividual(ORG, 'u1', person);
      expect(s2.verifyIndividual).not.toHaveBeenCalled();
    });

    it('terms changed after the acceptance → manual again until the new version is accepted', async () => {
      const { service, sumsub } = make({ commercial: { terms: { ...TERMS, version: 2 }, acceptance: ACCEPTED.acceptance } });
      const res = await service.verifyIndividual(ORG, 'u1', person);
      expect(sumsub.verifyIndividual).not.toHaveBeenCalled();
      expect(res.provider).toBe('MANUAL');
    });

    it('a feature that is not in the accepted terms is served manually', async () => {
      const { service, sumsub } = make({ commercial: { ...ACCEPTED, terms: { ...TERMS, prices: { individual: 2 } } } });
      expect((await service.screenSanctions(ORG, 'u1', { name: 'X' })).provider).toBe('MANUAL');
      expect(sumsub.screenSanctions).not.toHaveBeenCalled();
      await service.verifyIndividual(ORG, 'u1', person);
      expect(sumsub.verifyIndividual).toHaveBeenCalled();
    });

    it('records the PAYG price in force on every automated check', async () => {
      const { service, prisma } = make();
      await service.verifyBusiness(ORG, 'u1', { legalName: 'ACME', country: 'PT' });
      expect(prisma.identityVerification.create.mock.calls[0][0].data).toMatchObject({
        automated: true, provider: 'SUMSUB', unitPrice: 5, currency: 'EUR', termsVersion: 1,
      });
    });

    it('reports manual mode, awaiting acceptance, and the month\'s usage', async () => {
      const { service, prisma } = make({ commercial: { terms: TERMS } });
      prisma.identityVerification.findMany.mockResolvedValue([{ unitPrice: 2, currency: 'EUR' }, { unitPrice: 5, currency: 'EUR' }]);
      const s = await service.getProviderSettings(ORG);
      expect(s.mode).toBe('MANUAL');
      expect(s.commercial).toMatchObject({ accepted: false, awaitingAcceptance: true, providerReady: true });
      expect(s.usage).toMatchObject({ automatedChecks: 2, amount: 7, currency: 'EUR' });
      const { service: ok } = make();
      expect((await ok.getProviderSettings(ORG)).mode).toBe('AUTOMATED');
    });

    it('operator proposes terms: versions increase, at least one price is required, an old acceptance no longer counts', async () => {
      const { service, prisma } = make();
      await service.proposeTerms(ORG, 'op', { currency: 'EUR', setupFee: 300, priceIndividual: 3 });
      const saved = prisma.licenseAddon.update.mock.calls[0][0].data.metadata.kycCommercial;
      expect(saved.terms).toMatchObject({ version: 2, setupFee: 300, prices: { individual: 3 } });
      expect(saved.acceptance.version).toBe(1); // stale → not accepted
      await expect(service.proposeTerms(ORG, 'op', { currency: 'EUR', setupFee: 0 })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('customer accepts exactly the version they saw, and only if there are terms', async () => {
      const { service, prisma } = make({ commercial: { terms: TERMS } });
      await expect(service.acceptTerms(ORG, 'admin', 7)).rejects.toBeInstanceOf(BadRequestException);
      await service.acceptTerms(ORG, 'admin', 1);
      expect(prisma.licenseAddon.update.mock.calls[0][0].data.metadata.kycCommercial.acceptance)
        .toMatchObject({ version: 1, acceptedById: 'admin' });
      const { service: none } = make({ commercial: null });
      await expect(none.acceptTerms(ORG, 'admin', 1)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('a person decides a manual verification once; decided or foreign ones are refused', async () => {
      const { service, prisma } = make();
      prisma.identityVerification.findFirst.mockResolvedValue({ id: 'v1', status: 'REVIEW', automated: false });
      await service.decide(ORG, 'v1', 'u2', { decision: 'APPROVED', note: 'Documentos conferidos' });
      expect(prisma.identityVerification.findFirst.mock.calls[0][0].where).toEqual({ id: 'v1', organizationId: ORG });
      expect(prisma.identityVerification.update.mock.calls[0][0].data).toMatchObject({ status: 'APPROVED', decidedById: 'u2', decisionNote: 'Documentos conferidos' });
      prisma.identityVerification.findFirst.mockResolvedValue({ id: 'v1', status: 'APPROVED', automated: false });
      await expect(service.decide(ORG, 'v1', 'u2', { decision: 'REJECTED' })).rejects.toBeInstanceOf(BadRequestException);
      prisma.identityVerification.findFirst.mockResolvedValue(null);
      await expect(service.decide(ORG, 'v1', 'u2', { decision: 'REJECTED' })).rejects.toBeInstanceOf(NotFoundException);
      prisma.identityVerification.findFirst.mockResolvedValue({ id: 'v2', status: 'PENDING', automated: true });
      await expect(service.decide(ORG, 'v2', 'u2', { decision: 'APPROVED' })).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('webhook safety', () => {
    const ctx = { rawBody: Buffer.from('{}'), headers: {} };

    it('never overwrites a decision taken by a person or a final outcome', async () => {
      const { service, prisma } = make();
      prisma.identityVerification.findFirst.mockResolvedValue({ id: 'v1', status: 'REJECTED', decidedAt: new Date(), subjectName: 'Ana Silva' });
      expect(await service.handleWebhook('sumsub', {}, ctx)).toEqual({ received: true });
      prisma.identityVerification.findFirst.mockResolvedValue({ id: 'v1', status: 'APPROVED', decidedAt: null, subjectName: 'Ana Silva' });
      await service.handleWebhook('sumsub', {}, ctx);
      expect(prisma.identityVerification.updateMany).not.toHaveBeenCalled();
      expect(prisma.identityVerification.update).not.toHaveBeenCalled();
    });

    it('writes only while the record is still open (guarded update)', async () => {
      const { service, prisma } = make();
      prisma.identityVerification.findFirst.mockResolvedValue({ id: 'v2', status: 'PENDING', decidedAt: null, subjectName: 'Ana Silva' });
      await service.handleWebhook('sumsub', {}, ctx);
      expect(prisma.identityVerification.updateMany.mock.calls[0][0].where).toEqual({ id: 'v2', decidedAt: null, status: { in: ['PENDING', 'REVIEW', 'ERROR'] } });
    });

    it('an approval for a different name goes to a person', async () => {
      const { service, prisma, sumsub } = make();
      sumsub.handleWebhook.mockReturnValue({ providerRefId: 'r', status: 'APPROVED', verifiedName: 'Maria Costa', rawResult: {} });
      prisma.identityVerification.findFirst.mockResolvedValue({ id: 'v3', status: 'PENDING', decidedAt: null, subjectName: 'Ana Silva' });
      await service.handleWebhook('sumsub', {}, ctx);
      expect(prisma.identityVerification.updateMany.mock.calls[0][0].data).toMatchObject({ status: 'REVIEW', rawResult: { nameMismatch: true } });
      sumsub.handleWebhook.mockReturnValue({ providerRefId: 'r', status: 'APPROVED', verifiedName: 'Ana Maria Silva', rawResult: {} });
      await service.handleWebhook('sumsub', {}, ctx);
      expect(prisma.identityVerification.updateMany.mock.calls[1][0].data.status).toBe('APPROVED');
    });

    it('compares names without accents, case or extra middle names', () => {
      expect(namesMatch('João da Silva', 'JOAO SILVA')).toBe(true);
      expect(namesMatch('Ana Silva', 'Ana Maria Silva')).toBe(true);
      expect(namesMatch('Ana Silva', 'Ana Costa')).toBe(false);
      expect(namesMatch('', 'Ana')).toBe(false);
    });

    it('a person can overturn an automatic REJECTED once, but not their own decision', async () => {
      const { service, prisma } = make();
      prisma.identityVerification.findFirst.mockResolvedValue({ id: 'v4', status: 'REJECTED', automated: true, decidedAt: null });
      await expect(service.decide(ORG, 'v4', 'u2', { decision: 'APPROVED', note: 'falso positivo' })).resolves.toBeDefined();
      prisma.identityVerification.findFirst.mockResolvedValue({ id: 'v4', status: 'APPROVED', automated: true, decidedAt: new Date() });
      await expect(service.decide(ORG, 'v4', 'u2', { decision: 'REJECTED' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('a null price is not a free check: the feature stays manual and cannot be proposed', async () => {
      const { service, sumsub } = make({ commercial: { ...ACCEPTED, terms: { ...TERMS, prices: { individual: null as any, business: 5 } } } });
      expect((await service.verifyIndividual(ORG, 'u1', person)).provider).toBe('MANUAL');
      expect(sumsub.verifyIndividual).not.toHaveBeenCalled();
      const { service: s2 } = make();
      await expect(s2.proposeTerms(ORG, 'op', { currency: 'EUR', setupFee: 1, priceSanctions: null as any })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('webhooks', () => {
    const ctx = { rawBody: Buffer.from('{}'), headers: {} };

    it('404s for an unknown, unconfigured or webhook-less provider (no information leak)', async () => {
      const { service } = make({ configured: ['SUMSUB'] });
      await expect(service.handleWebhook('nope', {}, ctx)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.handleWebhook('trulioo', {}, ctx)).rejects.toBeInstanceOf(NotFoundException);
      const { service: s2 } = make();
      await expect(s2.handleWebhook('trulioo', {}, ctx)).rejects.toBeInstanceOf(NotFoundException); // configured but no webhooks
    });

    it('a failed signature check stops everything before the database is touched', async () => {
      const { service, sumsub, prisma } = make();
      sumsub.handleWebhook.mockImplementation(() => { throw new ForbiddenException('Invalid webhook signature'); });
      await expect(service.handleWebhook('sumsub', {}, ctx)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.identityVerification.findFirst).not.toHaveBeenCalled();
      expect(prisma.identityVerification.update).not.toHaveBeenCalled();
    });

    it('passes the raw body and headers to the provider', async () => {
      const { service, sumsub } = make();
      const c = { rawBody: Buffer.from('abc'), headers: { 'x-payload-digest': 'd' } };
      await service.handleWebhook('SUMSUB', { a: 1 }, c);
      expect(sumsub.handleWebhook).toHaveBeenCalledWith({ a: 1 }, c);
    });

    it('acknowledges but ignores references it does not know', async () => {
      const { service, prisma } = make();
      expect(await service.handleWebhook('sumsub', {}, ctx)).toEqual({ ignored: true });
      expect(prisma.identityVerification.update).not.toHaveBeenCalled();
    });

    it('updates only the record of that provider and never echoes stored data back', async () => {
      const { service, prisma } = make();
      prisma.identityVerification.findFirst.mockResolvedValue({ id: 'v9', status: 'PENDING', decidedAt: null, riskScore: 7, subjectName: 'Ana Silva' });
      const res = await service.handleWebhook('sumsub', {}, ctx);
      expect(prisma.identityVerification.findFirst.mock.calls[0][0].where).toEqual({ providerRefId: 'ref-1', provider: 'SUMSUB' });
      expect(prisma.identityVerification.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: 'v9' }, data: { status: 'APPROVED', riskScore: 7 } });
      expect(res).toEqual({ received: true });
    });
  });
});
