import { BadGatewayException, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IdentityVerificationService } from '../identity-verification.service';

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
  const byId: Record<string, any> = { SUMSUB: sumsub, TRULIOO: trulioo };
  const configured = opts.configured ?? ['SUMSUB', 'TRULIOO'];
  const registry: any = {
    resolve: jest.fn((pref?: string | null) => byId[(pref ?? '').toUpperCase()] && configured.includes((pref ?? '').toUpperCase()) ? byId[pref!.toUpperCase()] : byId[configured[0]]),
    get: jest.fn((id: string) => (configured.includes((id ?? '').toUpperCase()) ? byId[id.toUpperCase()] : undefined)),
    list: jest.fn(() => ['SUMSUB', 'TRULIOO'].map(id => ({ id, displayName: byId[id].displayName, capabilities: byId[id].capabilities, configured: configured.includes(id) }))),
    defaultId: jest.fn(() => configured[0] ?? null),
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
    },
  };
  const licensing: any = { hasActiveAddon: jest.fn().mockResolvedValue(opts.addonActive ?? true) };
  return { service: new IdentityVerificationService(prisma, licensing, registry), prisma, registry, sumsub, trulioo, licensing };
}

const person = { fullName: 'Ana Silva', country: 'PT' };

describe('IdentityVerificationService — several providers', () => {
  describe('which provider is used', () => {
    it('uses the organisation\'s own choice and records it on the verification', async () => {
      const { service, prisma, registry, trulioo } = make({ metadata: { kycProvider: 'TRULIOO' } });
      const res = await service.verifyIndividual(ORG, 'u1', person);
      expect(registry.resolve).toHaveBeenCalledWith('TRULIOO');
      expect(trulioo.verifyIndividual).toHaveBeenCalled();
      expect(prisma.identityVerification.create.mock.calls[0][0].data).toMatchObject({ organizationId: ORG, provider: 'TRULIOO', subjectType: 'INDIVIDUAL' });
      expect(res.provider).toBe('TRULIOO');
    });

    it('uses the platform default when the organisation has not chosen', async () => {
      const { service, registry, sumsub } = make();
      await service.verifyBusiness(ORG, 'u1', { legalName: 'ACME', country: 'PT' });
      expect(registry.resolve).toHaveBeenCalledWith(null);
      expect(sumsub.verifyBusiness).toHaveBeenCalled();
    });

    it('does nothing when the add-on is not active', async () => {
      const { service, sumsub, prisma } = make({ addonActive: false });
      await expect(service.verifyIndividual(ORG, 'u1', person)).rejects.toBeInstanceOf(BadRequestException);
      expect(sumsub.verifyIndividual).not.toHaveBeenCalled();
      expect(prisma.identityVerification.create).not.toHaveBeenCalled();
    });

    it('falls back to a manual check for what the chosen provider cannot do', async () => {
      const { service, sumsub, prisma } = make();
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
      expect(s.providers.map(p => p.id)).toEqual(['SUMSUB', 'TRULIOO']);
      expect(s).toMatchObject({ selected: 'TRULIOO', effective: 'TRULIOO', platformDefault: 'SUMSUB' });
    });

    it('reports no effective provider when nothing is configured', async () => {
      const { service, registry } = make({ configured: [] });
      registry.resolve.mockImplementation(() => { throw new Error('none'); });
      const s = await service.getProviderSettings(ORG);
      expect(s.effective).toBeNull();
      expect(s.platformDefault).toBeNull();
    });

    it('stores the choice on the add-on, keeping its other metadata', async () => {
      const { service, prisma } = make({ metadata: { note: 'x' } });
      await service.setProvider(ORG, 'trulioo');
      expect(prisma.licenseAddon.update.mock.calls[0][0]).toEqual({
        where: { id: 'addon-1' },
        data: { metadata: { note: 'x', kycCommercial: ACCEPTED, kycProvider: 'TRULIOO' } },
      });
    });

    it('clears the choice with null', async () => {
      const { service, prisma } = make({ metadata: { kycProvider: 'TRULIOO' } });
      await service.setProvider(ORG, null);
      expect(prisma.licenseAddon.update.mock.calls[0][0].data.metadata).toEqual({ kycCommercial: ACCEPTED, kycProvider: null });
    });

    it('rejects unknown and unconfigured providers, and organisations without the add-on', async () => {
      const { service } = make({ configured: ['SUMSUB'] });
      await expect(service.setProvider(ORG, 'NOPE')).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.setProvider(ORG, 'TRULIOO')).rejects.toBeInstanceOf(BadRequestException);
      const { service: inactive } = make({ addonActive: false });
      await expect(inactive.setProvider(ORG, 'SUMSUB')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('independent of any provider: manual mode and commercial terms', () => {
    it('works with no provider configured at all: the check is recorded for a person to decide', async () => {
      const { service, registry, prisma } = make({ configured: [], commercial: null });
      registry.resolve.mockImplementation(() => { throw new Error('none'); });
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
      prisma.identityVerification.findFirst.mockResolvedValue({ id: 'v9', riskScore: 7, subjectName: 'Ana Silva' });
      const res = await service.handleWebhook('sumsub', {}, ctx);
      expect(prisma.identityVerification.findFirst.mock.calls[0][0].where).toEqual({ providerRefId: 'ref-1', provider: 'SUMSUB' });
      expect(prisma.identityVerification.update.mock.calls[0][0]).toMatchObject({ where: { id: 'v9' }, data: { status: 'APPROVED', riskScore: 7 } });
      expect(res).toEqual({ received: true });
    });
  });
});
