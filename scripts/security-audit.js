#!/usr/bin/env node
// =============================================================================
// iComply Security Audit — Local Runner
// =============================================================================
// Produces the same report format as the GitHub Actions quarterly workflow.
//
// Usage:
//   node scripts/security-audit.js [--output report.txt]
//
// Requirements:
//   - Node.js 18+
//   - npm available on PATH
//   - Run from the repo root (icomply_app_mvp/)
//
// The script will:
//   1. Run npm audit on backend/ and frontend/
//   2. Validate the Prisma schema
//   3. Run TypeScript builds in both directories
//   4. Print a security report (and optionally save to --output file)
// =============================================================================

'use strict';

const { execSync, spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

// ── CLI args ────────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const outputIdx  = args.indexOf('--output');
const outputFile = outputIdx !== -1 ? args[outputIdx + 1] : null;

// ── Colours ──────────────────────────────────────────────────────────────────
const C = {
  reset  : '\x1b[0m',
  red    : '\x1b[31m',
  yellow : '\x1b[33m',
  green  : '\x1b[32m',
  cyan   : '\x1b[36m',
  bold   : '\x1b[1m',
};
const color = (c, s) => process.stdout.isTTY ? `${c}${s}${C.reset}` : s;

// ── helpers ──────────────────────────────────────────────────────────────────
function run(cmd, cwd, silent = false) {
  if (!silent) console.log(color(C.cyan, `  → ${cmd}`));
  const result = spawnSync(cmd, { shell: true, cwd, encoding: 'utf8' });
  return {
    stdout : result.stdout ?? '',
    stderr : result.stderr ?? '',
    status : result.status ?? 1,
  };
}

function runAudit(dir, label) {
  console.log(`\nRunning npm audit on ${label}…`);
  const r = run('npm audit --json --audit-level=none', dir, true);
  let data = null;
  try { data = JSON.parse(r.stdout); } catch { /* ignore */ }
  return parseAudit(data, label);
}

function parseAudit(data, label) {
  if (!data) return { label, error: true, critical:0, high:0, medium:0, low:0, total:0, advisories:[] };
  const vuln     = data?.metadata?.vulnerabilities ?? {};
  const critical = vuln.critical ?? 0;
  const high     = vuln.high     ?? 0;
  const medium   = vuln.medium   ?? 0;
  const low      = vuln.low      ?? 0;
  const total    = vuln.total    ?? (critical + high + medium + low);

  const advisories = [];
  const vulnMap = data?.vulnerabilities ?? data?.advisories ?? {};
  for (const [pkg, info] of Object.entries(vulnMap)) {
    const sev = (info.severity ?? '').toUpperCase();
    if (sev === 'CRITICAL' || sev === 'HIGH') {
      const via = Array.isArray(info.via)
        ? info.via.filter(v => typeof v === 'object').map(v => v.title ?? v.url ?? '').join('; ')
        : '';
      advisories.push({ pkg, severity: sev, title: via || info.title || pkg, fixAvailable: !!info.fixAvailable });
    }
  }
  return { label, error: false, critical, high, medium, low, total, advisories };
}

function runPrismaValidate(backendDir) {
  console.log('\nValidating Prisma schema…');
  const r = run('npx prisma validate --schema=prisma/schema.prisma', backendDir);
  return r.status === 0 ? 'PASS' : 'FAIL';
}

function runTsBuild(dir, label) {
  console.log(`\nTypeScript build — ${label}…`);
  const r = run('npm run build', dir);
  if (r.status !== 0) {
    console.log(color(C.yellow, `  Build output:\n${r.stderr.slice(0, 2000)}`));
  }
  return r.status === 0 ? 'PASS' : 'FAIL';
}

// ── entry point ──────────────────────────────────────────────────────────────
async function main() {
  const rootDir    = path.resolve(__dirname, '..');
  const backendDir = path.join(rootDir, 'backend');
  const frontendDir = path.join(rootDir, 'frontend');

  console.log(color(C.bold, '\n════════════════════════════════════════════'));
  console.log(color(C.bold,   ' iComply Platform — Local Security Audit'));
  console.log(color(C.bold, '════════════════════════════════════════════\n'));

  // 1. npm audit
  const backendAudit  = runAudit(backendDir,  'Backend');
  const frontendAudit = runAudit(frontendDir, 'Frontend');

  // 2. Prisma validate
  const prismaStatus = runPrismaValidate(backendDir);

  // 3. TS builds
  const tsBackend  = runTsBuild(backendDir,  'backend');
  const tsFrontend = runTsBuild(frontendDir, 'frontend');

  // 4. Totals
  const totalCritical = backendAudit.critical  + frontendAudit.critical;
  const totalHigh     = backendAudit.high      + frontendAudit.high;
  const totalMedium   = backendAudit.medium    + frontendAudit.medium;
  const totalLow      = backendAudit.low       + frontendAudit.low;
  const totalAll      = totalCritical + totalHigh + totalMedium + totalLow;

  const now     = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const quarter = ['Q1','Q1','Q1','Q2','Q2','Q2','Q3','Q3','Q3','Q4','Q4','Q4'][new Date().getMonth()];

  const overallStatus =
    (totalCritical > 0 || tsBackend === 'FAIL' || tsFrontend === 'FAIL' || prismaStatus === 'FAIL')
      ? 'ACTION REQUIRED'
      : totalHigh > 0
      ? 'ATTENTION NEEDED'
      : 'HEALTHY';

  // 5. Build report string
  let report = '';
  report += `iComply Platform — ${quarter} Security Audit Report\n`;
  report += `Generated: ${now}\n`;
  report += `Repository: https://github.com/Kferreira69/app.icomply.pt\n`;
  report += `\n`;
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  report += `OVERALL STATUS: ${overallStatus}\n`;
  report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  report += `\n`;
  report += `── 1. DEPENDENCY VULNERABILITIES (npm audit) ──────────────\n\n`;

  for (const a of [backendAudit, frontendAudit]) {
    if (a.error) {
      report += `  ${a.label}: audit file not available\n`;
    } else {
      report += `  ${a.label}:\n`;
      report += `    CRITICAL : ${a.critical}\n`;
      report += `    HIGH     : ${a.high}\n`;
      report += `    MEDIUM   : ${a.medium}\n`;
      report += `    LOW      : ${a.low}\n`;
      report += `    TOTAL    : ${a.total}\n`;
    }
  }

  report += `\n  COMBINED TOTALS:\n`;
  report += `    Critical : ${totalCritical}\n`;
  report += `    High     : ${totalHigh}\n`;
  report += `    Medium   : ${totalMedium}\n`;
  report += `    Low      : ${totalLow}\n`;
  report += `    Total    : ${totalAll}\n`;

  const allAdvisories = [
    ...backendAudit.advisories.map(a => ({ ...a, source: 'backend' })),
    ...frontendAudit.advisories.map(a => ({ ...a, source: 'frontend' })),
  ];

  report += `\n── 2. CRITICAL / HIGH VULNERABILITY DETAILS ───────────────\n\n`;
  if (allAdvisories.length > 0) {
    for (const adv of allAdvisories) {
      report += `  [${adv.severity}] ${adv.source}/${adv.pkg}\n`;
      if (adv.title) report += `    Issue    : ${adv.title}\n`;
      report += `    Fix avail: ${adv.fixAvailable ? 'Yes — run npm audit fix' : 'No / manual action needed'}\n`;
    }
  } else {
    report += `  No critical or high vulnerabilities found.\n`;
  }

  report += `\n── 3. CODE QUALITY CHECKS ──────────────────────────────────\n\n`;
  report += `  Prisma schema validation   : ${prismaStatus}\n`;
  report += `  TypeScript build (backend) : ${tsBackend}\n`;
  report += `  TypeScript build (frontend): ${tsFrontend}\n`;

  report += `\n── 4. RECOMMENDED ACTIONS ──────────────────────────────────\n\n`;
  if (totalCritical > 0) {
    report += `  !! URGENT — ${totalCritical} critical vulnerabilit${totalCritical === 1 ? 'y' : 'ies'} found.\n`;
    report += `     Run 'npm audit fix --force' in affected directories.\n`;
    report += `     Review advisories above and update packages manually if needed.\n`;
  }
  if (totalHigh > 0) {
    report += `  !  HIGH — ${totalHigh} high-severity vulnerabilit${totalHigh === 1 ? 'y' : 'ies'} found.\n`;
    report += `     Run 'npm audit fix' in backend/ and/or frontend/.\n`;
  }
  if (totalMedium > 0 || totalLow > 0) {
    report += `  i  ${totalMedium} medium and ${totalLow} low vulnerabilities detected.\n`;
    report += `     Schedule remediation in next sprint.\n`;
  }
  if (tsBackend === 'FAIL' || tsFrontend === 'FAIL') {
    report += `  !! TypeScript build failure detected — fix type errors before next release.\n`;
  }
  if (prismaStatus === 'FAIL') {
    report += `  !! Prisma schema validation failed — review schema.prisma immediately.\n`;
  }
  if (overallStatus === 'HEALTHY') {
    report += `  No critical issues detected. Continue scheduled dependency updates.\n`;
    report += `  Consider running 'npm update' to keep packages current.\n`;
  }

  report += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  report += `iComply Security Bot | Manual Local Audit\n`;

  // 6. Output
  const statusColor = overallStatus === 'HEALTHY' ? C.green
    : overallStatus === 'ATTENTION NEEDED' ? C.yellow
    : C.red;

  console.log('\n' + color(C.bold, '────────────────── REPORT ──────────────────'));
  console.log(report);
  console.log(color(C.bold + statusColor, `OVERALL: ${overallStatus}`));

  if (outputFile) {
    fs.writeFileSync(outputFile, report, 'utf8');
    console.log(color(C.cyan, `\nReport saved to: ${outputFile}`));
  }

  // Exit with non-zero if action required so CI callers can detect it
  process.exit(overallStatus === 'ACTION REQUIRED' ? 1 : 0);
}

main().catch(err => {
  console.error(color(C.red, `\nFatal error: ${err.message}`));
  process.exit(2);
});
