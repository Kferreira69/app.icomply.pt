import { ServiceUnavailableException } from '@nestjs/common';
import { KycProviderRegistry } from '../providers/kyc-provider.registry';

const config = (values: Record<string, string> = {}): any => ({
  get: (key: string, fallback?: string) => values[key] ?? fallback,
});

const SUMSUB = { SUMSUB_APP_TOKEN: 't', SUMSUB_SECRET_KEY: 's' };
const TRULIOO = { TRULIOO_API_KEY: 'k' };

const DIDIT = { DIDIT_API_KEY: 'k', DIDIT_WORKFLOW_KYC: 'w1' };
const OPENSANCTIONS = { OPENSANCTIONS_API_KEY: 'k' };
const STRIPE_ID = { STRIPE_IDENTITY_SECRET_KEY: 'sk' };

describe('KycProviderRegistry — routing per feature', () => {
  it('Didit is the preferred default when configured, ahead of Sumsub', () => {
    expect(new KycProviderRegistry(config({ ...SUMSUB, ...DIDIT })).defaultId()).toBe('DIDIT');
  });

  it('Didit offers what is configured: KYC with a KYC workflow, KYB only with a KYB workflow, sanctions always', () => {
    const caps = (v: Record<string, string>) => new KycProviderRegistry(config(v)).get('DIDIT')!.capabilities;
    expect(caps(DIDIT)).toMatchObject({ individual: true, business: false, sanctions: true, webhooks: true });
    expect(caps({ DIDIT_API_KEY: 'k', DIDIT_WORKFLOW_KYB: 'w2' })).toMatchObject({ individual: false, business: true, sanctions: true });
    expect(new KycProviderRegistry(config({ DIDIT_API_KEY: 'k', DIDIT_WORKFLOW_KYC: 'a' })).list().find(p => p.id === 'DIDIT')?.capabilities.business).toBe(false);
  });

  it('documents → Didit, sanctions → OpenSanctions, even though Didit is the default', () => {
    const reg = new KycProviderRegistry(config({ ...DIDIT, ...OPENSANCTIONS }));
    expect(reg.resolveFor('individual', null)?.id).toBe('DIDIT');
    expect(reg.resolveFor('sanctions', 'OPENSANCTIONS')?.id).toBe('OPENSANCTIONS');
    expect(reg.resolveFor('sanctions', null)?.id).toBe('DIDIT'); // default can do sanctions too
  });

  it('a sanctions-only provider never gets documents: they go to the next one that can', () => {
    const reg = new KycProviderRegistry(config({ ...OPENSANCTIONS, ...STRIPE_ID }));
    expect(reg.defaultId()).toBe('STRIPE_IDENTITY');
    expect(reg.resolveFor('individual', 'OPENSANCTIONS')?.id).toBe('STRIPE_IDENTITY');
    expect(reg.resolveFor('business', null)).toBeNull(); // nobody does companies → manual
    expect(reg.resolveFor('sanctions', 'STRIPE_IDENTITY')?.id).toBe('OPENSANCTIONS');
  });

  it('can switch back to Sumsub or to Stripe + OpenSanctions without code changes', () => {
    const all = new KycProviderRegistry(config({ ...DIDIT, ...SUMSUB, ...STRIPE_ID, ...OPENSANCTIONS }));
    expect(all.resolveFor('individual', 'SUMSUB')?.id).toBe('SUMSUB');
    expect(all.resolveFor('individual', 'STRIPE_IDENTITY')?.id).toBe('STRIPE_IDENTITY');
    expect(all.resolveFor('sanctions', 'OPENSANCTIONS')?.id).toBe('OPENSANCTIONS');
    expect(all.isKnown('didit')).toBe(true);
    expect(all.isKnown('nope')).toBe(false);
  });

  it('nothing configured → null (the module then works manually)', () => {
    expect(new KycProviderRegistry(config()).resolveFor('individual', 'DIDIT')).toBeNull();
  });
});

describe('KycProviderRegistry', () => {
  it('lists every known provider and flags which ones have credentials', () => {
    const reg = new KycProviderRegistry(config(SUMSUB));
    const list = reg.list();
    expect(list.map(p => p.id)).toEqual(['DIDIT', 'SUMSUB', 'TRULIOO', 'STRIPE_IDENTITY', 'OPENSANCTIONS']);
    expect(list.find(p => p.id === 'SUMSUB')).toMatchObject({ configured: true, displayName: 'Sumsub' });
    expect(list.find(p => p.id === 'TRULIOO')?.configured).toBe(false);
    expect(list.find(p => p.id === 'TRULIOO')?.capabilities.webhooks).toBe(false);
  });

  it('needs both Sumsub credentials to consider it configured', () => {
    expect(new KycProviderRegistry(config({ SUMSUB_APP_TOKEN: 't' })).get('SUMSUB')).toBeUndefined();
  });

  it('defaults to the first configured provider, or to KYC_PROVIDER when that one is configured', () => {
    expect(new KycProviderRegistry(config({ ...SUMSUB, ...TRULIOO })).defaultId()).toBe('SUMSUB');
    expect(new KycProviderRegistry(config({ ...SUMSUB, ...TRULIOO, KYC_PROVIDER: 'trulioo' })).defaultId()).toBe('TRULIOO');
    // forcing a provider that has no credentials must not break the default
    expect(new KycProviderRegistry(config({ ...SUMSUB, KYC_PROVIDER: 'trulioo' })).defaultId()).toBe('SUMSUB');
    expect(new KycProviderRegistry(config(TRULIOO)).defaultId()).toBe('TRULIOO');
  });

  it('resolves an organisation\'s own choice (case-insensitive) when it is configured', () => {
    const reg = new KycProviderRegistry(config({ ...SUMSUB, ...TRULIOO }));
    expect(reg.resolve('trulioo').id).toBe('TRULIOO');
    expect(reg.resolve('SUMSUB').id).toBe('SUMSUB');
    expect(reg.resolve(null).id).toBe('SUMSUB');
  });

  it('falls back to the platform default when the chosen provider lost its credentials', () => {
    const reg = new KycProviderRegistry(config(SUMSUB));
    expect(reg.resolve('TRULIOO').id).toBe('SUMSUB');
    expect(reg.resolve('NOT_A_PROVIDER').id).toBe('SUMSUB');
  });

  it('refuses requests when no provider is configured at all', () => {
    const reg = new KycProviderRegistry(config());
    expect(reg.defaultId()).toBeNull();
    expect(reg.list().every(p => !p.configured)).toBe(true);
    expect(() => reg.resolve('SUMSUB')).toThrow(ServiceUnavailableException);
  });

  it('can serve several providers at the same time (e.g. webhooks of a previous provider)', () => {
    const reg = new KycProviderRegistry(config({ ...SUMSUB, ...TRULIOO }));
    expect(reg.get('sumsub')?.id).toBe('SUMSUB');
    expect(reg.get('TRULIOO')?.id).toBe('TRULIOO');
    expect(reg.get('other')).toBeUndefined();
    expect(reg.get(null)).toBeUndefined();
  });
});
