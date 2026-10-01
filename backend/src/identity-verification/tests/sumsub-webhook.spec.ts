import * as crypto from 'crypto';
import { ForbiddenException } from '@nestjs/common';
import { SumsubProviderService } from '../providers/sumsub-provider.service';

const SECRET = 'webhook-secret';
const provider = (webhookSecret: string | undefined = SECRET) =>
  new SumsubProviderService({ appToken: 't', secretKey: 's', webhookSecret });

const body = (payload: object) => Buffer.from(JSON.stringify(payload));
const digest = (raw: Buffer, algo = 'sha256', secret = SECRET) => crypto.createHmac(algo, secret).update(raw).digest('hex');
const ctx = (raw: Buffer, headers: Record<string, any>) => ({ rawBody: raw, headers });

const REVIEWED = { applicantId: 'app-1', reviewResult: { reviewAnswer: 'GREEN' } };

describe('Sumsub webhook authenticity', () => {
  it('accepts a correctly signed call and normalises the result', () => {
    const raw = body(REVIEWED);
    const res = provider().handleWebhook(REVIEWED, ctx(raw, { 'x-payload-digest': digest(raw), 'x-payload-digest-alg': 'HMAC_SHA256_HEX' }));
    expect(res).toMatchObject({ providerRefId: 'app-1', status: 'APPROVED' });
  });

  it('maps the review answers', () => {
    const map = (answer?: string) => {
      const payload = { applicantId: 'a', reviewResult: answer ? { reviewAnswer: answer } : undefined };
      const raw = body(payload);
      return provider().handleWebhook(payload, ctx(raw, { 'x-payload-digest': digest(raw), 'x-payload-digest-alg': 'HMAC_SHA256_HEX' })).status;
    };
    expect(map('GREEN')).toBe('APPROVED');
    expect(map('RED')).toBe('REJECTED');
    expect(map('YELLOW')).toBe('REVIEW');
    expect(map(undefined)).toBe('REVIEW');
  });

  it('supports the SHA-1 (default) and SHA-512 digests and an array-valued header', () => {
    const raw = body(REVIEWED);
    expect(() => provider().handleWebhook(REVIEWED, ctx(raw, { 'x-payload-digest': digest(raw, 'sha1') }))).not.toThrow();
    expect(() => provider().handleWebhook(REVIEWED, ctx(raw, { 'x-payload-digest': digest(raw, 'sha512'), 'x-payload-digest-alg': 'HMAC_SHA512_HEX' }))).not.toThrow();
    expect(() => provider().handleWebhook(REVIEWED, ctx(raw, { 'x-payload-digest': [digest(raw, 'sha1')] }))).not.toThrow();
  });

  it('rejects a wrong secret, a tampered body and a different algorithm', () => {
    const raw = body(REVIEWED);
    const good = digest(raw);
    expect(() => provider().handleWebhook(REVIEWED, ctx(raw, { 'x-payload-digest': digest(raw, 'sha256', 'other'), 'x-payload-digest-alg': 'HMAC_SHA256_HEX' })))
      .toThrow(ForbiddenException);
    const tampered = body({ ...REVIEWED, reviewResult: { reviewAnswer: 'RED' } });
    expect(() => provider().handleWebhook(REVIEWED, ctx(tampered, { 'x-payload-digest': good, 'x-payload-digest-alg': 'HMAC_SHA256_HEX' })))
      .toThrow(ForbiddenException);
    expect(() => provider().handleWebhook(REVIEWED, ctx(raw, { 'x-payload-digest': good, 'x-payload-digest-alg': 'HMAC_SHA1_HEX' })))
      .toThrow(ForbiddenException);
  });

  it('fails closed: no secret configured, no digest, unknown algorithm or no raw body', () => {
    const raw = body(REVIEWED);
    const headers = { 'x-payload-digest': digest(raw), 'x-payload-digest-alg': 'HMAC_SHA256_HEX' };
    expect(() => provider('').handleWebhook(REVIEWED, ctx(raw, headers))).toThrow(ForbiddenException); // '' = secret not configured
    expect(() => provider().handleWebhook(REVIEWED, ctx(raw, {}))).toThrow(ForbiddenException);
    expect(() => provider().handleWebhook(REVIEWED, ctx(raw, { ...headers, 'x-payload-digest-alg': 'HMAC_MD5_HEX' }))).toThrow(ForbiddenException);
    expect(() => provider().handleWebhook(REVIEWED, { headers })).toThrow(ForbiddenException);
    expect(() => provider().handleWebhook(REVIEWED, ctx(raw, { ...headers, 'x-payload-digest': 'zz' }))).toThrow(ForbiddenException);
  });
});
