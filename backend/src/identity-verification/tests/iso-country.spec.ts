import { DiditProviderService } from '../providers/didit-provider.service';
import { toAlpha3 } from '../providers/iso-country';

describe('toAlpha3', () => {
  it('converts alpha-2 (any case) and keeps valid alpha-3', () => {
    expect(toAlpha3('PT')).toBe('PRT');
    expect(toAlpha3('pt')).toBe('PRT');
    expect(toAlpha3(' es ')).toBe('ESP');
    expect(toAlpha3('PRT')).toBe('PRT');
    expect(toAlpha3('XK')).toBe('RKS'); // Kosovo: Didit's own code
  });
  it('never guesses: unknown or empty → undefined', () => {
    expect(toAlpha3('ZZ')).toBeUndefined();
    expect(toAlpha3('XYZ')).toBeUndefined();
    expect(toAlpha3('')).toBeUndefined();
    expect(toAlpha3(undefined)).toBeUndefined();
  });
});

describe('Didit KYC session: id_country must be alpha-3 (Didit answers 400 to "PT")', () => {
  afterEach(() => jest.restoreAllMocks());
  it('sends PRT for a Portuguese person', async () => {
    const fetchMock = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true, json: async () => ({ session_id: 's1', url: 'https://x', status: 'Not Started' }),
    } as any);
    const provider = new DiditProviderService({ apiKey: 'k', workflowKyc: 'w', webhookSecret: 's' } as any);
    await provider.verifyIndividual({ fullName: 'Ana Maria Silva', country: 'PT' });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.expected_details).toEqual({ first_name: 'Ana', last_name: 'Maria Silva', id_country: 'PRT' });
  });
});
