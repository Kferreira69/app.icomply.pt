#!/usr/bin/env node
// Post-deploy smoke test against a live environment. Usage: node scripts/e2e-smoke.mjs <dev|staging|prod>
//
// Exercises what a dependency update can break: the HTTP stack (body parsing, multipart uploads through multer,
// authentication, rate limiting headers), the public endpoints and the web app's login page. It creates and deletes
// its own data (a quality document and a support ticket opened by the automated-test consultant account), so it is
// safe on production. Requires the automated-test accounts to be ACTIVE (see scripts/test-accounts.mjs) and their password
// in the TEST_ACCOUNT_PASSWORD environment variable (it is never stored in the repository).

const ENV = process.argv[2] || 'dev';
const CFG = {
  dev:     { api: 'https://api.dev.icomply.pt/api/v1',     app: 'https://dev.icomply.pt',     user: 'teste.consultant@icomply-test.pt' },
  staging: { api: 'https://api.staging.icomply.pt/api/v1', app: 'https://staging.icomply.pt', user: 'teste.consultant@icomply-test.pt' },
  prod:    { api: 'https://api.icomply.pt/api/v1',         app: 'https://app.icomply.pt',         user: 'teste.consultant.prod@icomply-test.pt' },
}[ENV];
if (!CFG) { console.error('Usage: node scripts/e2e-smoke.mjs <dev|staging|prod>'); process.exit(2); }
const PASSWORD = process.env.TEST_ACCOUNT_PASSWORD; // the automated-test accounts' password: never stored in the repository
if (!PASSWORD) { console.error('Set TEST_ACCOUNT_PASSWORD (the password of the automated-test accounts).'); process.exit(2); }

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + detail}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function http(method, url, { token, json, form, raw } = {}) {
  await sleep(200); // the API allows 10 requests/second per IP
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  let body;
  if (json !== undefined) { headers['content-type'] = 'application/json'; body = JSON.stringify(json); }
  if (form) body = form;
  const res = await fetch(url, { method, headers, body, redirect: 'manual' });
  const buf = Buffer.from(await res.arrayBuffer());
  let parsed = null; try { parsed = JSON.parse(buf.toString('utf8')); } catch { /* not json */ }
  return { status: res.status, body: parsed, bytes: buf, headers: res.headers, raw: raw ? buf.toString('utf8') : undefined };
}
const api = (m, p, o) => http(m, CFG.api + p, o);

// ── 1. platform is up ──
let r = await api('GET', '/health');
check('API saudável (base de dados, Redis)', r.status === 200 && r.body?.status === 'ok' && r.body?.services?.database === 'up', `${r.status} ${JSON.stringify(r.body)?.slice(0, 120)}`);
r = await http('GET', `${CFG.app}/login`);
check('página de login da aplicação responde 200', r.status === 200, `${r.status}`);

// ── 2. public endpoints (no session) ──
r = await api('GET', '/public/catalog');
check('catálogo público 200 com domínios', r.status === 200 && r.body?.domains?.length > 5, `${r.status}`);
r = await api('GET', '/quality-documents');
check('rota protegida sem sessão → 401', r.status === 401, `${r.status}`);

// ── 3. authentication (JSON body parsing) ──
let token;
for (let i = 0; i < 4 && !token; i++) {
  r = await api('POST', '/auth/login', { json: { email: CFG.user, password: PASSWORD } });
  if (r.status === 429) { console.log('login limitado (429) — a esperar 65 s…'); await sleep(65000); continue; }
  token = r.body?.accessToken;
  break;
}
check('login da conta de teste', !!token, `HTTP ${r.status} (as contas de teste estão ativas?)`);
if (!token) { console.log(`\n${pass} passed, ${fail} failed`); process.exit(1); }
r = await api('POST', '/auth/login', { json: { email: CFG.user, password: 'errada-errada' } });
check('palavra-passe errada → 401', r.status === 401, `${r.status}`);
r = await api('POST', '/auth/login', { raw: true, token: undefined });
check('corpo vazio no login é recusado (400/401), não rebenta (500)', [400, 401, 422].includes(r.status), `${r.status}`);

// ── 4. multipart upload through multer: quality documents ──
const bytes = Buffer.from('PK\u0003\u0004 documento de teste do smoke test ' + 'x'.repeat(2000));
const fd = (name, fields = {}) => { const f = new FormData(); for (const [k, v] of Object.entries(fields)) f.append(k, v); f.append('file', new Blob([bytes]), name); return f; };
r = await api('POST', '/quality-documents', { token, form: fd('Smoke.docx', { clause: '4', title: '[SMOKE] Documento de teste', docType: 'MANUAL' }) });
const docId = r.body?.id;
check('envio de ficheiro (multipart) cria o documento (201)', r.status === 201 && !!docId, `${r.status} ${JSON.stringify(r.body)?.slice(0, 120)}`);
if (docId) {
  r = await api('GET', `/quality-documents/${docId}/file`, { token });
  check('descarga devolve o ficheiro byte a byte', r.status === 200 && Buffer.compare(r.bytes, bytes) === 0, `${r.status} ${r.bytes.length}B`);
  r = await api('POST', `/quality-documents/${docId}/versions`, { token, form: fd('Smoke v2.docx', { changeNote: 'smoke' }) });
  check('nova versão por upload (201)', r.status === 201, `${r.status}`);
}
r = await api('POST', '/quality-documents', { token, form: fd('x.html', { clause: '4', title: 'x' }) });
check('extensão não permitida (.html) → 400', r.status === 400, `${r.status}`);
const big = new FormData(); big.append('clause', '4'); big.append('title', 'grande'); big.append('file', new Blob([Buffer.alloc(26 * 1024 * 1024)]), 'grande.docx');
r = await api('POST', '/quality-documents', { token, form: big });
check('ficheiro acima do limite (26 MB) é recusado, não aceite', [400, 413].includes(r.status), `${r.status}`);

// ── 5. support ticket with an attachment (multer again) and clean-up ──
r = await api('POST', '/support-tickets', { token, json: { subject: '[SMOKE] Teste automático', description: 'Ticket de teste — apagado no fim.', category: 'OTHER', priority: 'LOW' } });
const ticketId = r.body?.id;
check('abrir ticket de suporte (201)', r.status === 201 && !!ticketId, `${r.status}`);
if (ticketId) {
  r = await api('POST', `/support-tickets/${ticketId}/attachments`, { token, form: fd('anexo.txt') });
  check('anexo ao ticket (201)', r.status === 201 || r.status === 200, `${r.status}`);
}

// ── 6. search and a JSON read ──
r = await api('GET', '/search?q=' + encodeURIComponent('smoke documento'), { token });
check('pesquisa global responde 200', r.status === 200 && Array.isArray(r.body?.hits), `${r.status}`);

// ── clean-up (always) ──
if (docId) { r = await api('DELETE', `/quality-documents/${docId}`, { token }); check('limpeza: documento apagado', r.status === 200, `${r.status}`); }
if (ticketId) { r = await api('DELETE', `/support-tickets/${ticketId}`, { token }); check('limpeza: ticket de teste apagado', r.status === 200, `${r.status}`); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
