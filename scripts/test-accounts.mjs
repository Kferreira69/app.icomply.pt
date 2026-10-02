#!/usr/bin/env node
// Switch the automated-test accounts on and off (suspend / reactivate) in one environment.
//
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/test-accounts.mjs <dev|staging|prod> <status|off|on>
//
//   status  list the test accounts and whether each is active   (default)
//   off     suspend them  — they cannot log in; nothing is deleted
//   on      reactivate them — run this before the end-to-end tests, then turn them off again
//
// "Test accounts" = every user whose email ends in @icomply-test.pt. The credentials used are those of
// an ADMIN of the organisation that owns them (never stored here). The automated e2e suites need the
// accounts ON; leaving them OFF between test runs keeps known-password users from being a standing risk.

const ENVS = {
  dev: 'https://api.dev.icomply.pt/api/v1',
  staging: 'https://api.staging.icomply.pt/api/v1',
  prod: 'https://api.icomply.pt/api/v1',
};
const [env = 'dev', action = 'status'] = process.argv.slice(2);
const API = ENVS[env];
if (!API || !['status', 'on', 'off'].includes(action)) {
  console.error('Usage: node scripts/test-accounts.mjs <dev|staging|prod> <status|off|on>');
  process.exit(2);
}
const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (an ADMIN of the organisation that owns the test accounts).');
  process.exit(2);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function call(method, path, token, body) {
  await sleep(200); // the API allows 10 requests/second per IP
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json };
}

let login = await call('POST', '/auth/login', null, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
if (login.status === 429) { // login is limited to 5 per minute per IP
  console.log('Login rate-limited — waiting 65 s…'); await sleep(65000);
  login = await call('POST', '/auth/login', null, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
}
if (!login.json?.accessToken) { console.error(`Login failed (HTTP ${login.status}).`); process.exit(1); }
const token = login.json.accessToken;

const list = await call('GET', '/users?limit=100&search=icomply-test', token);
const users = (Array.isArray(list.json) ? list.json : list.json?.data ?? []).filter(u => /@icomply-test\.pt$/i.test(u.email));
if (!users.length) { console.log(`[${env}] no test accounts found.`); process.exit(0); }

let failed = 0;
for (const u of users) {
  let note = '';
  if (action === 'off' && u.status === 'ACTIVE') {
    const r = await call('PATCH', `/users/${u.id}/suspend`, token);
    note = r.status < 300 ? '→ SUSPENDED' : `FAILED (HTTP ${r.status})`; if (r.status >= 300) failed++;
  } else if (action === 'on' && u.status === 'SUSPENDED') {
    const r = await call('PATCH', `/users/${u.id}/reactivate`, token);
    note = r.status < 300 ? '→ ACTIVE' : `FAILED (HTTP ${r.status})`; if (r.status >= 300) failed++;
  }
  console.log(`[${env}] ${u.role.padEnd(18)} ${u.email.padEnd(48)} ${u.status.padEnd(10)} ${note}`);
}
console.log(`\n${users.length} test account(s) in ${env}. ${action === 'status' ? '' : failed ? `${failed} failed.` : 'Done.'}`);
process.exit(failed ? 1 : 0);
