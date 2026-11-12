#!/usr/bin/env node
// Route-level checks of the identity-verification module and its webhooks against a live environment.
// Usage: TEST_ACCOUNT_PASSWORD=... node scripts/e2e-kyc.mjs <dev|staging|prod>
//
// Read-only / refusal paths only: the automated-test organisation does not have the add-on, so nothing is created and
// nothing can be billed. (What happens inside — manual mode, terms, caps, routing, refresh, AML sync — is covered by
// the unit tests; this script proves the routes exist, are protected and answer as designed once deployed.)
// Requires the automated-test accounts to be ACTIVE (scripts/test-accounts.mjs).

const ENV = process.argv[2] || 'dev';
const CFG = {
  dev:     { api: 'https://api.dev.icomply.pt/api/v1',     users: ['teste.consultant@icomply-test.pt', 'teste.viewer2@icomply-test.pt'] },
  staging: { api: 'https://api.staging.icomply.pt/api/v1', users: ['teste.consultant@icomply-test.pt', 'teste.viewer.staging@icomply-test.pt'] },
  prod:    { api: 'https://api.icomply.pt/api/v1',         users: ['teste.consultant.prod@icomply-test.pt', 'teste.viewer.prod@icomply-test.pt'] },
}[ENV];
const PASSWORD = process.env.TEST_ACCOUNT_PASSWORD;
if (!CFG || !PASSWORD) { console.error('Usage: TEST_ACCOUNT_PASSWORD=... node scripts/e2e-kyc.mjs <dev|staging|prod>'); process.exit(2); }

let pass = 0, fail = 0;
const check = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : '  -> ' + d}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function call(method, path, token, json) {
  await sleep(200); // the API allows 10 requests/second per IP
  const headers = {}; if (token) headers.authorization = `Bearer ${token}`; if (json) headers['content-type'] = 'application/json';
  const r = await fetch(`${CFG.api}${path}`, { method, headers, body: json ? JSON.stringify(json) : undefined });
  const t = await r.text(); let body; try { body = JSON.parse(t); } catch { body = null; }
  return { status: r.status, body };
}
async function login(email) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`${CFG.api}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 429) { await sleep(65000); continue; }
    if (j.accessToken) return j.accessToken;
  }
  throw new Error('login failed for ' + email);
}

// a deploy is complete when the newest route answers 401 (it exists and rejects a fake token); 404 = old build, 5xx = restarting
for (let i = 0; i < 45; i++) {
  const r = await call('GET', '/identity-verification/admin/usage', 'x');
  if (r.status === 401) break;
  console.log(`waiting for deploy… (${i + 1})`); await sleep(20000);
}
console.log(`env=${ENV}\n`);

const NIL = '00000000-0000-0000-0000-000000000000';
const [cons, view] = [await login(CFG.users[0]), await login(CFG.users[1])];

// ── webhooks: public, authenticated by the provider's own signature ──
let r = await call('POST', '/identity-verification/webhook/didit', null, { session_id: 's', status: 'Approved' });
check('webhook Didit sem assinatura: não é 401 (403 recusado, ou 404 se não configurado)', [403, 404].includes(r.status), `${r.status}`);
r = await call('POST', '/identity-verification/webhook/sumsub', null, {});
check('webhook Sumsub sem assinatura: não é 401', [403, 404].includes(r.status), `${r.status}`);
r = await call('POST', '/identity-verification/webhook/stripe_identity', null, {});
check('webhook Stripe Identity sem assinatura: não é 401', [403, 404].includes(r.status), `${r.status}`);
r = await call('POST', '/identity-verification/webhook/naoexiste', null, {});
check('webhook de fornecedor desconhecido → 404', r.status === 404, `${r.status}`);
r = await call('POST', '/licensing/stripe/webhook', null, { id: 'evt_x' });
check('webhook Stripe (faturação) já não é bloqueado pelo login', [200, 201, 400].includes(r.status), `${r.status}`);

// ── customer side ──
r = await call('GET', '/identity-verification');
check('lista sem sessão → 401', r.status === 401, `${r.status}`);
r = await call('GET', '/identity-verification/providers', cons);
const s = r.body ?? {};
check('consultor vê o estado do módulo (200)', r.status === 200 && ['MANUAL', 'AUTOMATED'].includes(s.mode), `${r.status}`);
check('… incluindo se o add-on está ativo, o consumo e o teto', typeof s.addonActive === 'boolean' && s.usage && 'cap' in s.usage && 'capReached' in s.usage, JSON.stringify(s.usage));
check('… e quem serve cada funcionalidade', ['individual', 'business', 'sanctions'].every(k => k in (s.routing ?? {})), JSON.stringify(s.routing));
r = await call('GET', '/identity-verification/providers', view);
check('viewer sem acesso ao módulo AML → 403', r.status === 403, `${r.status}`);

r = await call('POST', '/identity-verification/individual', cons, { fullName: 'Teste E2E', country: 'PT' });
check('sem o add-on o pedido é recusado com mensagem clara (400)', r.status === 400 && /addon/i.test(JSON.stringify(r.body)), `${r.status} ${JSON.stringify(r.body)?.slice(0, 100)}`);
r = await call('POST', `/identity-verification/${NIL}/refresh`, cons);
check('atualizar estado sem add-on → 400', r.status === 400, `${r.status}`);
r = await call('POST', `/identity-verification/${NIL}/refresh`, view);
check('atualizar estado como viewer → 403', r.status === 403, `${r.status}`);
r = await call('POST', `/identity-verification/${NIL}/send-link`, cons, { email: 'não-é-um-email' });
check('enviar link com email inválido → 400', r.status === 400, `${r.status}`);
r = await call('POST', `/identity-verification/${NIL}/send-link`, cons, { email: 'pessoa@exemplo.pt' });
check('enviar link sem add-on → 400', r.status === 400, `${r.status}`);
r = await call('POST', `/identity-verification/${NIL}/send-link`, view, { email: 'pessoa@exemplo.pt' });
check('enviar link como viewer → 403', r.status === 403, `${r.status}`);
r = await call('POST', '/identity-verification/terms/accept', cons, { version: 1 });
check('consultor não aceita condições (só administrador) → 403', r.status === 403, `${r.status}`);
r = await call('PATCH', `/identity-verification/${NIL}/decision`, cons, { decision: 'TALVEZ' });
check('decisão inválida → 400', r.status === 400, `${r.status}`);
r = await call('PUT', '/identity-verification/provider', cons, { provider: 'DIDIT' });
check('o cliente já não escolhe fornecedor (rota removida → 404)', r.status === 404, `${r.status}`);

// ── platform operator only ──
for (const [label, method, path, body] of [
  ['relatório de consumo', 'GET', '/identity-verification/admin/usage', undefined],
  ['teste de ligação de um fornecedor', 'POST', '/identity-verification/admin/providers/DIDIT/check', undefined],
  ['estado de um cliente', 'GET', `/identity-verification/admin/${NIL}`, undefined],
  ['propor condições', 'PUT', `/identity-verification/admin/${NIL}/terms`, { currency: 'EUR', setupFee: 1, priceIndividual: 1 }],
  ['fornecedor de um cliente', 'PUT', `/identity-verification/admin/${NIL}/routing`, { individual: 'DIDIT' }],
  ['fornecedor de todos os clientes', 'PUT', '/identity-verification/admin/routing/all', { default: 'DIDIT' }],
  ['marcar taxa de arranque faturada', 'PUT', `/identity-verification/admin/${NIL}/setup-invoiced`, { invoiced: true }],
]) {
  r = await call(method, path, cons, body);
  check(`${label}: consultor → 403`, r.status === 403, `${r.status}`);
  r = await call(method, path, null, body);
  check(`${label}: sem sessão → 401`, r.status === 401, `${r.status}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
