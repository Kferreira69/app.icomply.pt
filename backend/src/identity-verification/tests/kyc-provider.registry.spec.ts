import { ServiceUnavailableException } from '@nestjs/common';
import { KycProviderRegistry } from '../providers/kyc-provider.registry';

const config = (values: Record<string, string> = {}): any => ({
  get: (key: string, fallback?: string) => values[key] ?? fallback,
});

const SUMSUB = { SUMSUB_APP_TOKEN: 't', SUMSUB_SECRET_KEY: 's' };
const TRULIOO = { TRULIOO_API_KEY: 'k' };

describe('KycProviderRegistry', () => {
  it('lists every known provider and flags which ones have credentials', () => {
    const reg = new KycProviderRegistry(config(SUMSUB));
    const list = reg.list();
    expect(list.map(p => p.id)).toEqual(['SUMSUB', 'TRULIOO']);
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
