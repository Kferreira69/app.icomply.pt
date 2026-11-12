import { DiditProviderService, warningCodes } from '../providers/didit-provider.service';
import { OpenSanctionsProviderService } from '../providers/opensanctions-provider.service';
import { StripeIdentityProviderService } from '../providers/stripe-identity-provider.service';

const json = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as any;
let fetchMock: jest.Mock;
beforeEach(() => { fetchMock = jest.fn(); (global as any).fetch = fetchMock; });

describe('Didit — current state, reviewer context and credentials check', () => {
  const make = (over: any = {}) => new DiditProviderService({ apiKey: 'key', webhookSecret: 'whsec', workflowKyc: 'wf1', workflowKyb: 'wf2', ...over });

  it('fetches the decision of a session and normalises it like a webhook (top-level body)', async () => {
    fetchMock.mockResolvedValue(json({
      session_id: 'echoed-other', status: 'In Review', aml_screenings: [{ score: 41.6, total_hits: 2, warnings: ['POSSIBLE_MATCH_FOUND'] }],
      id_verifications: [{ status: 'In Review', warnings: [{ risk: 'EXPIRED_DOCUMENT', short_description: 'The document is expired' }] }],
    }));
    const out = await make().fetchStatus('s-1');
    expect(fetchMock.mock.calls[0][0]).toBe('https://verification.didit.me/v3/session/s-1/decision/');
    expect(fetchMock.mock.calls[0][1].headers['x-api-key']).toBe('key');
    expect(out).toMatchObject({ providerRefId: 's-1', status: 'REVIEW', riskScore: 42 }); // the session we asked about, not what the body echoes
    expect(out.rawResult.warnings).toEqual(['POSSIBLE_MATCH_FOUND', 'EXPIRED_DOCUMENT']);
    expect(out.rawResult.amlHits).toBe(2);
  });

  it('webhook payloads (decision nested) carry the same reviewer context', () => {
    const ts = Math.floor(Date.now() / 1000);
    const payload = { webhook_type: 'status.updated', session_id: 's-2', status: 'Declined', timestamp: ts, decision: { id_verifications: [{ warnings: ['FACE_MISMATCH'] }] } };
    const crypto = require('crypto');
    const sort = (v: any): any => (Array.isArray(v) ? v.map(sort) : v && typeof v === 'object' ? Object.keys(v).sort().reduce((o: any, k) => { o[k] = sort(v[k]); return o; }, {}) : v);
    const sig = crypto.createHmac('sha256', 'whsec').update(JSON.stringify(sort(payload))).digest('hex');
    const out = make().handleWebhook(payload, { rawBody: Buffer.from(JSON.stringify(payload)), headers: { 'x-timestamp': String(ts), 'x-signature-v2': sig } });
    expect(out).toMatchObject({ providerRefId: 's-2', status: 'REJECTED' });
    expect(out.rawResult.warnings).toEqual(['FACE_MISMATCH']);
  });

  it('collects warning codes defensively: any shape, deduplicated, bounded, codes only', () => {
    expect(warningCodes(undefined)).toEqual([]);
    expect(warningCodes({ warnings: ['A', 'A', { code: 'B' }, { nothing: true }, 5], liveness_checks: [{ warnings: [{ risk: 'C', name: 'Ana Silva' }] }], x: 'ignored' })).toEqual(['A', 'B', 'C']);
    expect(warningCodes({ warnings: Array.from({ length: 100 }, (_, i) => 'W' + i) })).toHaveLength(20);
    expect(JSON.stringify(warningCodes({ a: [{ warnings: [{ risk: 'C', name: 'Ana Silva' }] }] }))).not.toContain('Ana');
  });

  it('a failed fetch is an error, not a state', async () => {
    fetchMock.mockResolvedValue(json({ detail: 'nope' }, 404));
    await expect(make().fetchStatus('s-x')).rejects.toThrow(/Didit API error 404/);
  });

  it('credentials check: a rejected key is reported, an accepted one lists what is still missing', async () => {
    fetchMock.mockResolvedValue({ status: 401 });
    expect(await make().check()).toMatchObject({ ok: false, detail: expect.stringContaining('recusou') });
    fetchMock.mockResolvedValue({ status: 404 }); // valid key, unknown session
    const ok = await make({ workflowKyb: undefined, webhookSecret: undefined }).check();
    expect(ok.ok).toBe(true);
    expect(ok.detail).toContain('Sem fluxo KYB');
    expect(ok.detail).toContain('Sem segredo do webhook');
    expect((await make().check()).detail).toContain('Fluxo KYC configurado');
    expect(fetchMock.mock.calls[2][0]).toContain('/decision/'); // a harmless GET, nothing is created
    expect(fetchMock.mock.calls.every(c => !c[1]?.method || c[1].method === 'GET')).toBe(true);
  });

  it('credentials check: network trouble is not a crash', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    expect(await make().check()).toMatchObject({ ok: false });
  });
});

describe('Stripe Identity — current state and credentials check', () => {
  const make = (over: any = {}) => new StripeIdentityProviderService({ secretKey: 'sk_test_1', webhookSecret: 'whsec_x', ...over });

  it('a verified session reports the name on the document for the name check', async () => {
    fetchMock.mockResolvedValue(json({ id: 'vs_1', status: 'verified', verified_outputs: { first_name: 'Ana', last_name: 'Silva' } }));
    const out = await make().fetchStatus('vs_1');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.stripe.com/v1/identity/verification_sessions/vs_1?expand[]=verified_outputs');
    expect(out).toMatchObject({ providerRefId: 'vs_1', status: 'APPROVED', verifiedName: 'Ana Silva' });
    expect(JSON.stringify(out.rawResult)).not.toContain('Silva');
  });

  it('verified without a name is not auto-approved', async () => {
    fetchMock.mockResolvedValue(json({ id: 'vs_1', status: 'verified' }));
    expect(await make().fetchStatus('vs_1')).toMatchObject({ status: 'REVIEW', rawResult: { nameUnavailable: true } });
  });

  it('"requires_input" means still waiting for the person — unless there is an error, then a person decides', async () => {
    fetchMock.mockResolvedValue(json({ id: 'vs_2', status: 'requires_input', last_error: null }));
    expect((await make().fetchStatus('vs_2')).status).toBe('PENDING');
    fetchMock.mockResolvedValue(json({ id: 'vs_2', status: 'requires_input', last_error: { code: 'document_expired', reason: 'expired', extra: 'PII' } }));
    const failed = await make().fetchStatus('vs_2');
    expect(failed.status).toBe('REVIEW');
    expect(JSON.stringify(failed.rawResult)).toContain('document_expired');
    expect(JSON.stringify(failed.rawResult)).not.toContain('PII');
    fetchMock.mockResolvedValue(json({ id: 'vs_2', status: 'canceled' }));
    expect((await make().fetchStatus('vs_2')).status).toBe('ERROR');
  });

  it('credentials check distinguishes a bad key from a key without Identity permissions', async () => {
    fetchMock.mockResolvedValue({ status: 401, ok: false });
    expect(await make().check()).toMatchObject({ ok: false, detail: expect.stringContaining('401') });
    fetchMock.mockResolvedValue({ status: 403, ok: false });
    expect(await make().check()).toMatchObject({ ok: false, detail: expect.stringContaining('Identity') });
    fetchMock.mockResolvedValue({ status: 200, ok: true });
    expect(await make().check()).toMatchObject({ ok: true });
    expect(fetchMock.mock.calls[2][0]).toBe('https://api.stripe.com/v1/identity/verification_sessions?limit=1'); // a list, not a create
  });
});

describe('OpenSanctions — the check never costs money', () => {
  it('does not query the (billed) API: it says the key is only proven by the first real screening', async () => {
    const out = await new OpenSanctionsProviderService({ apiKey: 'k' }).check();
    expect(out.ok).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
