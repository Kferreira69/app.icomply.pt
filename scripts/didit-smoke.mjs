#!/usr/bin/env node
// Smoke test of your Didit SANDBOX account, run on YOUR computer — the key never leaves your machine.
//
//   PowerShell:  $env:DIDIT_API_KEY="..."; $env:DIDIT_WORKFLOW_KYC="..."; node scripts/didit-smoke.mjs
//   (optional)   $env:DIDIT_WORKFLOW_KYB="..."
//
// What it checks, using exactly the calls the platform makes (backend/src/identity-verification/providers/didit-provider.service.ts):
//   1. a KYC session is created on your KYC workflow and returns the link a person would open
//   2. (if DIDIT_WORKFLOW_KYB is set) a KYB session is created
//   3. a standalone sanctions/PEP screening (synchronous) for a clearly harmless name
// It creates sandbox data only if the key belongs to a sandbox application. Use a SANDBOX key, never a live one.

const KEY = process.env.DIDIT_API_KEY;
const KYC = process.env.DIDIT_WORKFLOW_KYC;
const KYB = process.env.DIDIT_WORKFLOW_KYB;
const BASE = (process.env.DIDIT_BASE_URL || 'https://verification.didit.me').replace(/\/$/, '');
if (!KEY) { console.error('Set DIDIT_API_KEY (a sandbox key) first.'); process.exit(2); }

async function call(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}
const show = (label, ok, extra = '') => console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${extra ? ' — ' + extra : ''}`);
let failed = 0;

if (KYC) {
  const r = await call('/v3/session/', { workflow_id: KYC, vendor_data: crypto.randomUUID(), expected_details: { first_name: 'Ana', last_name: 'Teste', id_country: 'PT' } });
  const ok = r.status === 201 && r.json.session_id && r.json.url;
  show('KYC: criar sessão', ok, ok ? `estado "${r.json.status}"; link: ${r.json.url}` : `HTTP ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
  if (!ok) failed++;
} else console.log('--   KYC: ignorado (defina DIDIT_WORKFLOW_KYC)');

if (KYB) {
  const r = await call('/v3/session/', { workflow_id: KYB, vendor_data: crypto.randomUUID(), expected_details: { company_name: 'Empresa de Teste Lda', registry_country: 'PT' } });
  const ok = r.status === 201 && r.json.session_id && r.json.url;
  show('KYB: criar sessão', ok, ok ? `link: ${r.json.url}` : `HTTP ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
  if (!ok) failed++;
} else console.log('--   KYB: ignorado (defina DIDIT_WORKFLOW_KYB)');

{
  const r = await call('/v3/aml/', { full_name: 'Ana Maria Silva Teste', entity_type: 'person', date_of_birth: '1990-01-01', nationality: 'PT', include_adverse_media: false });
  const ok = r.status < 300 && r.json?.aml?.status;
  show('Sanções/PEP: rastreio', ok, ok ? `estado "${r.json.aml.status}", ${(r.json.aml.hits ?? []).length} correspondência(s)` : `HTTP ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
  if (!ok) failed++;
}

console.log(failed ? `\n${failed} verificação(ões) falharam.` : '\nTudo respondeu como esperado.');
process.exit(failed ? 1 : 0);
