#!/usr/bin/env node
// End-to-end of the identity-verification module against a live environment, with Didit's SANDBOX
// (never billed). Unlike e2e-kyc.mjs (read-only), this one CHANGES data: it activates the add-on on the
// organisation of the account you log in with, proposes + accepts commercial terms and creates verifications.
//
// Credentials are NOT passed on the command line or typed in the chat. Put them in a file OUTSIDE the repository
// (default: %USERPROFILE%\.icomply-e2e.env, or the path in E2E_ENV_FILE), one per line:
//   E2E_EMAIL=...            platform super-admin (Contemporary Constellation)
//   E2E_PASSWORD=...
//   E2E_CUSTOMER_EMAIL=...   an ADMIN of the CUSTOMER organisation to test with (accepts the terms and requests the checks)
//   E2E_CUSTOMER_PASSWORD=...
// The organisation under test is the one of the customer account. If the customer pair is left out, E2E_EMAIL is used
// for both (only works when that account is super-admin AND ADMIN of an organisation that has a licence).
// (All four may also come from the environment.)
//
// Phases (Didit's sandbox sessions are closed in between, with the Didit MCP / console "simulate"):
//   node scripts/e2e-kyc-flow.mjs <dev|staging> setup    -> checks provider, activates add-on, routing, terms, acceptance,
//                                                           creates 3 verifications; writes the state file
//   node scripts/e2e-kyc-flow.mjs <dev|staging> verify   -> waits for webhooks, checks statuses, tests "Atualizar estado"
//   node scripts/e2e-kyc-flow.mjs <dev|staging> cleanup  -> switches the add-on off again (history stays)
// Never runs against prod (a live Didit app bills every session).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ENV = process.argv[2];
const PHASE = process.argv[3];
const API = { dev: 'https://api.dev.icomply.pt/api/v1', staging: 'https://api.staging.icomply.pt/api/v1' }[ENV];
if (!API || !['setup', 'verify', 'cleanup'].includes(PHASE)) {
  console.error('Usage: node scripts/e2e-kyc-flow.mjs <dev|staging> <setup|verify|cleanup>'); process.exit(2);
}

const envFile = process.env.E2E_ENV_FILE || path.join(os.homedir(), '.icomply-e2e.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const { E2E_EMAIL, E2E_PASSWORD } = process.env;
const CUSTOMER_EMAIL = process.env.E2E_CUSTOMER_EMAIL || E2E_EMAIL;
const CUSTOMER_PASSWORD = process.env.E2E_CUSTOMER_PASSWORD || E2E_PASSWORD;
if (!E2E_EMAIL || !E2E_PASSWORD) { console.error(`Missing E2E_EMAIL / E2E_PASSWORD (file ${envFile} or environment).`); process.exit(2); }

const STATE = path.join(os.tmpdir(), `icomply-e2e-kyc-${ENV}.json`);
let pass = 0, fail = 0;
const check = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : '  -> ' + d}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const short = x => JSON.stringify(x)?.slice(0, 160);

async function call(method, p, token, json) {
  await sleep(250); // the API allows 10 requests/second per IP
  const headers = {}; if (token) headers.authorization = `Bearer ${token}`; if (json) headers['content-type'] = 'application/json';
  const r = await fetch(`${API}${p}`, { method, headers, body: json ? JSON.stringify(json) : undefined });
  const t = await r.text(); let body; try { body = JSON.parse(t); } catch { body = t; }
  return { status: r.status, body };
}
async function login(email, password) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 429) { await sleep(65000); continue; }
    if (j.accessToken) return j.accessToken;
    throw new Error(`login failed (${r.status})`);
  }
  throw new Error('login rate-limited');
}
const jwt = t => JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString());

const token = await login();
const claims = jwt(token);
const orgId = claims.organizationId ?? claims.orgId;
console.log(`env=${ENV} phase=${PHASE} org=${orgId}\n`);
if (!orgId) { console.error('Could not read the organisation from the token.'); process.exit(2); }

if (PHASE === 'setup') {
  // 1. platform operator + provider reachable
  let r = await call('GET', '/identity-verification/admin/usage', adminToken);
  check('a conta é super-admin da plataforma', r.status === 200, `${r.status} ${short(r.body)}`);
  if (r.status !== 200) process.exit(1);
  r = await call('POST', '/identity-verification/admin/providers/DIDIT/check', adminToken);
  check('Didit configurada e acessível ("Testar ligação")', r.status === 200 && (r.body?.ok === true || r.body?.reachable === true || r.body?.configured === true), `${r.status} ${short(r.body)}`);

  // 2. add-on, routing, terms, acceptance
  r = await call('PATCH', `/licensing/clients/${orgId}/addons/identity_verification`, adminToken, { enabled: true });
  check('add-on Verificação de Identidade ativado', [200, 201].includes(r.status), `${r.status} ${short(r.body)}`);
  r = await call('PUT', `/identity-verification/admin/${orgId}/routing`, adminToken, { default: 'DIDIT', individual: 'DIDIT', business: 'DIDIT' });
  check('encaminhamento: Didit serve indivíduos e empresas', [200, 201].includes(r.status), `${r.status} ${short(r.body)}`);
  r = await call('PUT', `/identity-verification/admin/${orgId}/terms`, adminToken,
    { currency: 'EUR', setupFee: 0, priceIndividual: 1, priceBusiness: 3, priceSanctions: 0.5, monthlyCap: 3, note: 'E2E sandbox — teto baixo de propósito' });
  check('condições propostas (teto mensal de 3 verificações automáticas)', [200, 201].includes(r.status), `${r.status} ${short(r.body)}`);
  r = await call('GET', '/identity-verification/providers', token);
  const version = r.body?.commercial?.terms?.version;
  check('as condições aparecem com versão', Number.isInteger(version), short(r.body));
  r = await call('POST', '/identity-verification/terms/accept', token, { version });
  check('o administrador do cliente aceita as condições', [200, 201].includes(r.status), `${r.status} ${short(r.body)}`);
  r = await call('GET', '/identity-verification/providers', token);
  check('modo AUTOMATED (add-on + Didit + condições aceites)', r.body?.mode === 'AUTOMATED', short(r.body?.mode) + ' ' + short(r.body?.reason));

  // 3. three verifications; the sandbox scenario is chosen when the sessions are closed afterwards
  const made = [];
  for (const [name, fullName] of [['approve', 'E2E Aprovada'], ['aml_hit', 'E2E Sancoes'], ['review', 'E2E Revisao']]) {
    r = await call('POST', '/identity-verification/individual', token, { fullName, country: 'PT' });
    const ok = [200, 201].includes(r.status) && r.body?.automated === true && r.body?.provider === 'DIDIT' && r.body?.status === 'PENDING' && !!r.body?.providerRefId;
    check(`verificação "${name}" criada na Didit (PENDING, com link)`, ok, `${r.status} ${short(r.body)}`);
    if (ok) made.push({ name, id: r.body.id, providerRefId: r.body.providerRefId, actionUrl: r.body.actionUrl });
  }
  fs.writeFileSync(STATE, JSON.stringify({ orgId, made }, null, 2));
  console.log(`\nState: ${STATE}`);
  for (const m of made) console.log(`SESSION ${m.name}  didit_session=${m.providerRefId}`);

  // 4. the monthly cap: 3 automated checks used -> the 4th falls back to manual
  r = await call('POST', '/identity-verification/individual', token, { fullName: 'E2E Acima do teto', country: 'PT' });
  check('acima do teto mensal o pedido passa a manual (REVIEW, sem custo)', [200, 201].includes(r.status) && r.body?.automated === false && r.body?.status === 'REVIEW', `${r.status} ${short(r.body)}`);
}

if (PHASE === 'verify') {
  const st = JSON.parse(fs.readFileSync(STATE, 'utf8'));
  const want = { approve: 'APPROVED', aml_hit: 'REJECTED', review: 'REVIEW' };
  const deadline = Date.now() + 90_000;
  let rows = {};
  while (Date.now() < deadline) {
    rows = {};
    for (const m of st.made) {
      const r = await call('GET', '/identity-verification', token);
      const list = Array.isArray(r.body) ? r.body : r.body?.data ?? [];
      rows[m.name] = list.find(v => v.id === m.id);
    }
    if (st.made.every(m => rows[m.name]?.status === want[m.name])) break;
    await sleep(5000);
  }
  for (const m of st.made) {
    check(`webhook da Didit atualizou "${m.name}" → ${want[m.name]}`, rows[m.name]?.status === want[m.name], `está ${rows[m.name]?.status}`);
  }
  const hit = rows.aml_hit;
  check('cenário de sanções: o resultado AML ficou registado', !!hit && (hit.riskScore != null || JSON.stringify(hit.rawResult ?? {}).toLowerCase().includes('aml')), short(hit?.rawResult));

  // "Atualizar estado" goes to the provider and must agree with what the webhook said
  const first = st.made[0];
  const r = await call('POST', `/identity-verification/${first.id}/refresh`, token);
  check('"Atualizar estado" consulta a Didit e concorda com o webhook', r.status === 200 && r.body?.status === want[first.name], `${r.status} ${short(r.body?.status)}`);

  const u = await call('GET', '/identity-verification/providers', token);
  // the cap is an amount in EUR: 3 EUR = three individual checks at 1 EUR
  check('consumo do mês regista as 3 verificações automáticas (3 €) e o teto de 3 €', u.body?.usage?.cap === 3 && Number(u.body?.usage?.amount) >= 3 && u.body?.usage?.capReached === true, short(u.body?.usage));
}

if (PHASE === 'cleanup') {
  const r = await call('PATCH', `/licensing/clients/${orgId}/addons/identity_verification`, adminToken, { enabled: false });
  check('add-on desativado outra vez (o histórico fica)', [200, 201].includes(r.status), `${r.status} ${short(r.body)}`);
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
