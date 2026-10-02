import * as crypto from 'crypto';
import { ForbiddenException } from '@nestjs/common';
import { DiditProviderService, mapDiditStatus } from '../providers/didit-provider.service';
import { OpenSanctionsProviderService } from '../providers/opensanctions-provider.service';
import { StripeIdentityProviderService, mapStripeIdentity } from '../providers/stripe-identity-provider.service';

const json = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as any;
let fetchMock: jest.Mock;
beforeEach(() => { fetchMock = jest.fn(); (global as any).fetch = fetchMock; });

const hmac = (secret: string, data: string | Buffer) => crypto.createHmac('sha256', secret).update(data).digest('hex');
const now = () => Math.floor(Date.now() / 1000);

const sortedKeys = (v: any): any => (Array.isArray(v) ? v.map(sortedKeys) : v && typeof v === 'object'
  ? Object.keys(v).sort().reduce((o: any, k) => { o[k] = sortedKeys(v[k]); return o; }, {}) : v);

describe('Didit', () => {
  const cfg = { apiKey: 'key', webhookSecret: 'whsec', workflowKyc: 'wf-kyc', workflowKyb: 'wf-kyb', callbackUrl: 'https://app.test/done' };
  const make = (over: any = {}) => new DiditProviderService({ ...cfg, ...over });

  it('maps its exact, case-sensitive statuses; anything unknown goes to a person', () => {
    expect(mapDiditStatus('Approved')).toBe('APPROVED');
    expect(mapDiditStatus('Declined')).toBe('REJECTED');
    expect(mapDiditStatus('In Review')).toBe('REVIEW');
    expect(mapDiditStatus('In Progress')).toBe('PENDING');
    expect(mapDiditStatus('Kyc Expired')).toBe('ERROR');
    expect(mapDiditStatus('approved')).toBe('REVIEW'); // not the documented spelling → never auto-approve
    expect(mapDiditStatus(undefined)).toBe('REVIEW');
  });

  it('offers only what is configured', () => {
    expect(make().capabilities).toMatchObject({ individual: true, business: true, sanctions: true });
    expect(make({ workflowKyb: undefined }).capabilities.business).toBe(false);
    expect(make({ workflowKyc: undefined }).capabilities.individual).toBe(false);
  });

  it('creates a KYC session on the right workflow and returns the hosted link', async () => {
    fetchMock.mockResolvedValue(json({ session_id: 's-1', session_number: 7, url: 'https://verify.didit.me/s/abc', status: 'Not Started', workflow_id: 'wf-kyc' }, 201));
    const r = await make().verifyIndividual({ fullName: 'Ana Maria Silva', country: 'PT', email: 'ana@x.pt' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://verification.didit.me/v3/session/');
    expect(init.headers['x-api-key']).toBe('key');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ workflow_id: 'wf-kyc', callback: 'https://app.test/done', expected_details: { first_name: 'Ana', last_name: 'Maria Silva', id_country: 'PT' } });
    expect(body.vendor_data).toMatch(/^[0-9a-f-]{36}$/); // unique per request
    expect(r).toMatchObject({ status: 'PENDING', providerRefId: 's-1', actionUrl: 'https://verify.didit.me/s/abc' });
  });

  it('creates a KYB session with the company details', async () => {
    fetchMock.mockResolvedValue(json({ session_id: 's-2', url: 'https://verify.didit.me/s/biz', status: 'Not Started' }, 201));
    await make().verifyBusiness({ legalName: 'ACME Lda', country: 'PT', vatNumber: '500000000' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ workflow_id: 'wf-kyb', expected_details: { company_name: 'ACME Lda', registry_country: 'PT', registration_number: '500000000' } });
  });

  it('screens sanctions synchronously and reports hits for a person to review', async () => {
    fetchMock.mockResolvedValue(json({ request_id: 'r-1', aml: { status: 'In Review', hits: [{ risk_score: 62, match_score: 90 }], warnings: ['POSSIBLE_MATCH_FOUND'] } }));
    const r = await make().screenSanctions({ name: 'Ana Silva', country: 'PT', dateOfBirth: '1990-01-01' });
    expect(fetchMock.mock.calls[0][0]).toBe('https://verification.didit.me/v3/aml/');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ full_name: 'Ana Silva', entity_type: 'person', nationality: 'PT' });
    expect(r).toMatchObject({ status: 'REVIEW', riskScore: 62, providerRefId: 'r-1' });
    fetchMock.mockResolvedValue(json({ request_id: 'r-2', aml: { status: 'Approved', hits: [] } }));
    expect(await make().screenSanctions({ name: 'X' })).toMatchObject({ status: 'APPROVED', riskScore: 0 });
  });

  it('an AML "Approved" that still lists hits is sent to a person, and a malformed answer is an error, not "clean"', async () => {
    fetchMock.mockResolvedValue(json({ request_id: 'r-3', aml: { status: 'Approved', hits: [{ risk_score: 10 }] } }));
    expect((await make().screenSanctions({ name: 'Ana' })).status).toBe('REVIEW');
    fetchMock.mockResolvedValue(json({ request_id: 'r-4' }));
    await expect(make().screenSanctions({ name: 'Ana' })).rejects.toThrow(/without a status/);
  });

  it('fails when the API errors (the service hides the raw error from callers)', async () => {
    fetchMock.mockResolvedValue(json({ detail: 'bad key' }, 401));
    await expect(make().verifyIndividual({ fullName: 'A B', country: 'PT' })).rejects.toThrow(/Didit API error 401/);
  });

  describe('webhook authenticity (fails closed)', () => {
    const payload = { webhook_type: 'status.updated', session_id: 's-1', status: 'Approved', vendor_data: 'v', decision: { aml_screenings: [{ score: 12.4, total_hits: 1 }] } };
    // canonical form Didit signs for V2: keys sorted recursively
    const canonical = JSON.stringify({ decision: { aml_screenings: [{ score: 12.4, total_hits: 1 }] }, session_id: 's-1', status: 'Approved', vendor_data: 'v', webhook_type: 'status.updated' });
    const ctx = (h: Record<string, string>, raw = Buffer.from(JSON.stringify(payload))) => ({ rawBody: raw, headers: h });

    it('accepts a valid X-Signature-V2 and normalises the result', () => {
      const out = make().handleWebhook(payload, ctx({ 'x-timestamp': String(now()), 'x-signature-v2': hmac('whsec', canonical) }));
      expect(out).toMatchObject({ providerRefId: 's-1', status: 'APPROVED', riskScore: 12 });
      expect(JSON.stringify(out.rawResult)).not.toContain('vendor'); // no echo of identifiers beyond what is needed
    });

    it('accepts a valid X-Signature over the raw bytes', () => {
      const raw = Buffer.from('{"session_id":"s-1","status":"Declined"}');
      const out = make().handleWebhook(JSON.parse(raw.toString()), ctx({ 'x-timestamp': String(now()), 'x-signature': hmac('whsec', raw) }, raw));
      expect(out).toMatchObject({ providerRefId: 's-1', status: 'REJECTED' });
    });

    it('rejects a wrong signature, a missing one, an old timestamp and a missing secret', () => {
      const good = hmac('whsec', canonical);
      expect(() => make().handleWebhook(payload, ctx({ 'x-timestamp': String(now()), 'x-signature-v2': hmac('other', canonical) }))).toThrow(ForbiddenException);
      expect(() => make().handleWebhook(payload, ctx({ 'x-timestamp': String(now()) }))).toThrow(ForbiddenException);
      expect(() => make().handleWebhook(payload, ctx({ 'x-timestamp': String(now() - 301), 'x-signature-v2': good }))).toThrow(ForbiddenException);
      expect(() => make().handleWebhook(payload, ctx({ 'x-signature-v2': good }))).toThrow(ForbiddenException);
      expect(() => make({ webhookSecret: undefined }).handleWebhook(payload, ctx({ 'x-timestamp': String(now()), 'x-signature-v2': good }))).toThrow(ForbiddenException);
    });

    it('a replayed body with a fresh X-Timestamp header is rejected because the signed body carries its own timestamp', () => {
      const old = { ...payload, timestamp: now() - 3600 };
      const canon = JSON.stringify(sortedKeys(old));
      expect(() => make().handleWebhook(old, ctx({ 'x-timestamp': String(now()), 'x-signature-v2': hmac('whsec', canon) }))).toThrow(ForbiddenException);
      const fresh = { ...payload, timestamp: now() };
      expect(make().handleWebhook(fresh, ctx({ 'x-timestamp': String(now()), 'x-signature-v2': hmac('whsec', JSON.stringify(sortedKeys(fresh))) })).status).toBe('APPROVED');
    });

    it('a tampered body no longer matches its signature', () => {
      const tampered = { ...payload, status: 'Approved', session_id: 's-EVIL' };
      expect(() => make().handleWebhook(tampered, ctx({ 'x-timestamp': String(now()), 'x-signature-v2': hmac('whsec', canonical) }))).toThrow(ForbiddenException);
    });
  });
});

describe('OpenSanctions', () => {
  const make = (over: any = {}) => new OpenSanctionsProviderService({ apiKey: 'os-key', ...over });

  it('only does sanctions', () => {
    expect(make().capabilities).toEqual({ individual: false, business: false, sanctions: true, webhooks: false });
  });

  it('sends the person to /match with the ApiKey header and approves when nothing matches', async () => {
    fetchMock.mockResolvedValue(json({ responses: { q1: { results: [{ id: 'Q1', caption: 'Someone Else', score: 0.31, match: false }] } } }));
    const r = await make().screenSanctions({ name: 'Ana Silva', country: 'PT', dateOfBirth: '1990-02-03' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.opensanctions.org/match/default');
    expect(init.headers.Authorization).toBe('ApiKey os-key');
    expect(JSON.parse(init.body)).toEqual({ queries: { q1: { schema: 'Person', properties: { name: ['Ana Silva'], birthDate: ['1990-02-03'], country: ['pt'] } } } });
    expect(r).toMatchObject({ status: 'APPROVED', riskScore: 31 });
  });

  it('a potential match is never auto-rejected: it goes to a person with only the essentials', async () => {
    fetchMock.mockResolvedValue(json({ responses: { q1: { results: [
      { id: 'NK-1', caption: 'Ana Silva', score: 0.93, match: true, topics: ['sanction', 'role.pep'], datasets: ['eu_fsf', 'us_ofac_sdn'], properties: { secret: 'x'.repeat(5000) } },
    ] } } }));
    const r = await make().screenSanctions({ name: 'Ana Silva' });
    expect(r.status).toBe('REVIEW');
    expect(r.riskScore).toBe(93);
    expect(JSON.stringify(r.rawResult)).not.toContain('xxxx'); // no full entity dump
    expect((r.rawResult as any).matches[0]).toMatchObject({ id: 'NK-1', topics: ['sanction', 'role.pep'] });
  });

  it('a malformed 200 is an error, never "no match"', async () => {
    fetchMock.mockResolvedValue(json({ responses: {} }));
    await expect(make().screenSanctions({ name: 'A' })).rejects.toThrow(/unexpected response/);
    fetchMock.mockResolvedValue(json({}));
    await expect(make().screenSanctions({ name: 'A' })).rejects.toThrow(/unexpected response/);
  });

  it('does not pretend to verify documents or companies, and surfaces API errors', async () => {
    await expect(make().verifyIndividual({ fullName: 'A', country: 'PT' })).rejects.toThrow();
    await expect(make().verifyBusiness({ legalName: 'A', country: 'PT' })).rejects.toThrow();
    fetchMock.mockResolvedValue(json({ detail: 'unauthorized' }, 401));
    await expect(make().screenSanctions({ name: 'A' })).rejects.toThrow(/OpenSanctions API error 401/);
  });

  it('a configured dataset and base URL are used', async () => {
    fetchMock.mockResolvedValue(json({ responses: { q1: { results: [] } } }));
    await make({ dataset: 'sanctions', baseUrl: 'https://os.internal/' }).screenSanctions({ name: 'A' });
    expect(fetchMock.mock.calls[0][0]).toBe('https://os.internal/match/sanctions');
  });
});

describe('Stripe Identity', () => {
  const make = (over: any = {}) => new StripeIdentityProviderService({ secretKey: 'sk_test_1', webhookSecret: 'whsec_x', returnUrl: 'https://app.test/back', ...over });

  it('only verifies people', () => {
    expect(make().capabilities).toEqual({ individual: true, business: false, sanctions: false, webhooks: true });
  });

  it('creates a document + selfie session (form-encoded, idempotent) and returns the hosted link', async () => {
    fetchMock.mockResolvedValue(json({ id: 'vs_1', url: 'https://verify.stripe.com/start/x', status: 'requires_input', type: 'document', livemode: false }));
    const r = await make().verifyIndividual({ fullName: 'Ana Silva', country: 'PT', email: 'ana@x.pt' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.stripe.com/v1/identity/verification_sessions');
    expect(init.headers.Authorization).toBe('Bearer sk_test_1');
    expect(init.headers['Idempotency-Key']).toBeTruthy();
    const form = new URLSearchParams(init.body);
    expect(form.get('type')).toBe('document');
    expect(form.get('options[document][require_matching_selfie]')).toBe('true');
    expect(form.get('provided_details[email]')).toBe('ana@x.pt');
    expect(form.get('return_url')).toBe('https://app.test/back');
    expect(form.get('metadata[source]')).toBe('icomply');
    expect(r).toMatchObject({ status: 'PENDING', providerRefId: 'vs_1', actionUrl: 'https://verify.stripe.com/start/x' });
  });

  it('maps events and statuses; a failed check goes to a person, never straight to rejected', () => {
    expect(mapStripeIdentity('verified', 'identity.verification_session.verified')).toBe('APPROVED');
    expect(mapStripeIdentity('requires_input', 'identity.verification_session.requires_input')).toBe('REVIEW');
    expect(mapStripeIdentity('canceled', 'identity.verification_session.canceled')).toBe('ERROR');
    expect(mapStripeIdentity('processing', 'identity.verification_session.processing')).toBe('PENDING');
    expect(mapStripeIdentity('requires_input')).toBe('PENDING'); // fresh session, nothing submitted
  });

  describe('webhook authenticity (fails closed)', () => {
    const event = { id: 'evt_1', type: 'identity.verification_session.verified', data: { object: { id: 'vs_1', status: 'verified', last_error: null } } };
    const raw = Buffer.from(JSON.stringify(event));
    const sign = (t: number, secret = 'whsec_x', body: Buffer = raw) => `t=${t},v1=${hmac(secret, `${t}.${body.toString('utf8')}`)}`;
    const ctx = (sig?: string) => ({ rawBody: raw, headers: sig ? { 'stripe-signature': sig } : {} });

    it('accepts a valid Stripe-Signature and normalises the event, reporting the name on the verified document', async () => {
      fetchMock.mockResolvedValue(json({ id: 'vs_1', verified_outputs: { first_name: 'Ana', last_name: 'Silva' } }));
      const out = await make().handleWebhook(event, ctx(sign(now())));
      expect(out).toMatchObject({ providerRefId: 'vs_1', status: 'APPROVED', verifiedName: 'Ana Silva' });
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.stripe.com/v1/identity/verification_sessions/vs_1?expand[]=verified_outputs');
      expect(JSON.stringify(out.rawResult)).not.toContain('Silva'); // the name is compared, never stored
    });

    it('if the verified name cannot be fetched, a verified session is NOT auto-approved', async () => {
      fetchMock.mockResolvedValue(json({ error: 'x' }, 500));
      expect(await make().handleWebhook(event, ctx(sign(now())))).toMatchObject({ status: 'REVIEW', rawResult: { nameUnavailable: true } });
    });

    it('never stores personal data from a failure, only the error code and reason', async () => {
      const failed = { type: 'identity.verification_session.requires_input', data: { object: { id: 'vs_2', status: 'requires_input', last_error: { code: 'document_expired', reason: 'The document is expired.', extra: 'PII' } } } };
      const r = Buffer.from(JSON.stringify(failed));
      const out = await make().handleWebhook(failed, { rawBody: r, headers: { 'stripe-signature': sign(now(), 'whsec_x', r) } });
      expect(out.status).toBe('REVIEW');
      expect(JSON.stringify(out.rawResult)).toContain('document_expired');
      expect(JSON.stringify(out.rawResult)).not.toContain('PII');
    });

    it('rejects wrong secret, missing header, stale timestamp, tampered body and missing configuration', async () => {
      await expect(make().handleWebhook(event, ctx(sign(now(), 'other')))).rejects.toBeInstanceOf(ForbiddenException);
      await expect(make().handleWebhook(event, ctx())).rejects.toBeInstanceOf(ForbiddenException);
      await expect(make().handleWebhook(event, ctx(sign(now() - 400)))).rejects.toBeInstanceOf(ForbiddenException);
      await expect(make().handleWebhook(event, { rawBody: Buffer.from('{"tampered":true}'), headers: { 'stripe-signature': sign(now()) } })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(make({ webhookSecret: undefined }).handleWebhook(event, ctx(sign(now())))).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('an unrelated Stripe event carries no session reference (ignored by the service)', async () => {
      const other = { type: 'charge.succeeded', data: { object: { id: 'ch_1' } } };
      const r = Buffer.from(JSON.stringify(other));
      const out = await make().handleWebhook(other, { rawBody: r, headers: { 'stripe-signature': sign(now(), 'whsec_x', r) } });
      expect(out.providerRefId).toBe('');
    });
  });
});
