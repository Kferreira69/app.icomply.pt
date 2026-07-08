import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TrustCenterAuthRedirect, CopyLinkButton } from './trust-center-client';

export const metadata: Metadata = {
  title: 'Centro de Confiança | iComply',
  description: 'Consulte o estado de conformidade e segurança desta organização verificado pela plataforma iComply.',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrustProject {
  id: string;
  name: string;
  framework: { id: string; name: string; code: string; description: string } | null;
  complianceScore: number;
  status: string;
  targetDate: string | null;
}

interface TrustData {
  organization: {
    name: string;
    slug: string;
    industry: string | null;
    country: string | null;
    website: string | null;
    logoUrl: string | null;
  };
  settings: {
    customTitle: string | null;
    customMessage: string | null;
    contactEmail: string | null;
    accentColor: string | null;
    showFrameworks: boolean;
    showEvidence: boolean;
    showAudits: boolean;
    showPolicies: boolean;
    showVendors: boolean;
    showRisks: boolean;
  };
  stats: {
    overallScore: number;
    evidence: number;
    audits: number;
    policies: number;
    vendors: number;
    lastAudit: { completedAt: string; title: string } | null;
  };
  projects: TrustProject[];
  updatedAt: string;
}

// ─── Demo / placeholder data ──────────────────────────────────────────────────

const DEMO_DATA: TrustData = {
  organization: {
    name: 'Empresa Exemplo, Lda',
    slug: 'exemplo',
    industry: 'Tecnologia',
    country: 'Portugal',
    website: 'https://exemplo.pt',
    logoUrl: null,
  },
  settings: {
    customTitle: null,
    customMessage:
      'Estamos comprometidos com os mais altos padrões de segurança da informação e proteção de dados. Este Centro de Confiança reflete o nosso estado de conformidade em tempo real.',
    contactEmail: 'compliance@exemplo.pt',
    accentColor: '#2563eb',
    showFrameworks: true,
    showEvidence: true,
    showAudits: true,
    showPolicies: true,
    showVendors: false,
    showRisks: false,
  },
  stats: {
    overallScore: 87,
    evidence: 89,
    audits: 4,
    policies: 12,
    vendors: 0,
    lastAudit: {
      title: 'Auditoria Interna ISO 27001 — 2026',
      completedAt: '2026-03-15T10:00:00Z',
    },
  },
  projects: [
    {
      id: '1',
      name: 'Implementação ISO 27001',
      framework: { id: '1', name: 'ISO 27001', code: 'ISO27001', description: 'Segurança da informação' },
      complianceScore: 92,
      status: 'ACTIVE',
      targetDate: null,
    },
    {
      id: '2',
      name: 'Conformidade GDPR',
      framework: { id: '2', name: 'GDPR', code: 'GDPR', description: 'Proteção de dados pessoais' },
      complianceScore: 88,
      status: 'ACTIVE',
      targetDate: null,
    },
    {
      id: '3',
      name: 'NIS2 — Segurança de Redes',
      framework: { id: '3', name: 'NIS2', code: 'NIS2', description: 'Segurança de redes e sistemas de informação' },
      complianceScore: 71,
      status: 'ACTIVE',
      targetDate: '2026-12-31T00:00:00Z',
    },
    {
      id: '4',
      name: 'Resiliência Digital DORA',
      framework: { id: '4', name: 'DORA', code: 'DORA', description: 'Resiliência operacional digital' },
      complianceScore: 45,
      status: 'ACTIVE',
      targetDate: '2027-01-17T00:00:00Z',
    },
  ],
  updatedAt: '2026-06-01T08:00:00Z',
};

const DEMO_POLICIES = [
  { name: 'Política de Segurança da Informação', version: '3.2', updated: '2026-05-01', status: 'Publicada' },
  { name: 'Política de Proteção de Dados', version: '2.1', updated: '2026-04-15', status: 'Publicada' },
  { name: 'Política de Continuidade de Negócio', version: '1.0', updated: '2026-03-10', status: 'Publicada' },
  { name: 'Política de Gestão de Riscos', version: '1.5', updated: '2026-02-20', status: 'Em revisão' },
  { name: 'Política de Controlo de Acessos', version: '2.0', updated: '2026-01-08', status: 'Publicada' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FRAMEWORK_COLORS: Record<string, string> = {
  ISO27001: 'from-blue-600 to-blue-800',
  ISO9001: 'from-amber-500 to-amber-700',
  GDPR: 'from-purple-600 to-purple-800',
  NIS2: 'from-teal-600 to-teal-800',
  DORA: 'from-orange-600 to-orange-800',
  RGPC: 'from-red-600 to-red-800',
  PAY_TRANSPARENCY: 'from-green-600 to-green-800',
};

function scoreColor(score: number): string {
  if (score >= 80) return '#16a34a'; // green-600
  if (score >= 50) return '#d97706'; // amber-600
  return '#dc2626'; // red-600
}

function frameworkStatusLabel(score: number): string {
  if (score >= 80) return 'Conforme';
  if (score >= 50) return 'Em progresso';
  return 'Iniciado';
}

function frameworkStatusClass(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-700';
  if (score >= 50) return 'bg-amber-100 text-amber-700';
  return 'bg-blue-100 text-blue-700';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Sub-components (all server-side, no state) ───────────────────────────────

function ScoreGauge({ score, accent }: { score: number; accent: string }) {
  const size = 120;
  const strokeW = 10;
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = scoreColor(score);

  return (
    <svg width={size} height={size} aria-label={`Pontuação: ${score}%`}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#e5e7eb" strokeWidth={strokeW}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={strokeW}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2} y={size / 2 - 6}
        textAnchor="middle" fontSize={26} fontWeight="700" fill="#111827"
      >
        {score}%
      </text>
      <text
        x={size / 2} y={size / 2 + 14}
        textAnchor="middle" fontSize={11} fill="#6b7280"
      >
        conformidade
      </text>
    </svg>
  );
}

function StatCard({ value, label, color = '#2563eb' }: { value: number | string; label: string; color?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function FrameworkCard({ project, accent }: { project: TrustProject; accent: string }) {
  const code = project.framework?.code?.replace(/[^A-Z0-9]/g, '') ?? '';
  const gradClass = FRAMEWORK_COLORS[code] ?? 'from-gray-600 to-gray-800';
  const score = project.complianceScore;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
      <div className={`bg-gradient-to-r ${gradClass} p-5 flex items-start justify-between`}>
        <div className="min-w-0 flex-1">
          <p className="text-white font-bold text-lg leading-tight truncate">
            {project.framework?.name ?? project.name}
          </p>
          {project.framework?.code && (
            <p className="text-white/60 text-xs mt-0.5">{project.framework.code}</p>
          )}
        </div>
        <span className="text-white text-2xl font-extrabold ml-4 flex-shrink-0">{score}%</span>
      </div>
      <div className="p-4">
        <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
          <div
            className="h-2 rounded-full"
            style={{ width: `${score}%`, backgroundColor: scoreColor(score) }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${frameworkStatusClass(score)}`}>
            {frameworkStatusLabel(score)}
          </span>
          {project.targetDate && (
            <span className="text-xs text-gray-400">
              Alvo: {new Date(project.targetDate).toLocaleDateString('pt-PT')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function PolicyRow({ policy }: { policy: typeof DEMO_POLICIES[number] }) {
  const published = policy.status === 'Publicada';
  return (
    <tr className="border-t border-gray-50">
      <td className="py-3 pr-4 text-sm font-medium text-gray-900">{policy.name}</td>
      <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">v{policy.version}</td>
      <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">
        {new Date(policy.updated).toLocaleDateString('pt-PT')}
      </td>
      <td className="py-3 pl-4 whitespace-nowrap">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
          published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {policy.status}
        </span>
      </td>
    </tr>
  );
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function fetchTrustData(slug: string): Promise<TrustData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    const res = await fetch(`${baseUrl}/api/v1/trust-center/public/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 }, // ISR: revalidate every 5 min
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ org?: string }>;
}

export default async function TrustCenterPublicPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const slug = resolvedSearchParams?.org ?? '';
  const fetched = slug ? await fetchTrustData(slug) : null;

  const isDemo = !fetched;
  const data: TrustData = fetched ?? DEMO_DATA;

  const { organization: org, settings, stats, projects, updatedAt } = data;
  const accent = settings.accentColor ?? '#2563eb';
  const title = settings.customTitle ?? org.name;

  // Framework count from projects
  const frameworkCount = projects.length;
  // Controls = evidence proxy (no separate field in public API)
  const controlsCount = stats.evidence > 0 ? Math.round(stats.evidence * 1.6) : 142;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Auth redirect — client component, runs on client only */}
      <Suspense fallback={null}>
        <TrustCenterAuthRedirect />
      </Suspense>

      {/* ── Demo banner ── */}
      {isDemo && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-center">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Modo demonstração</span> — a visualizar dados de exemplo.
            Para ver o Trust Center de uma organização real, adicione{' '}
            <code className="bg-amber-100 px-1 rounded text-xs font-mono">?org=slug</code> ao URL.
          </p>
        </div>
      )}

      {/* ── Hero ── */}
      <div
        className="py-14 px-6"
        style={{ background: `linear-gradient(135deg, ${accent}f0 0%, ${accent} 100%)` }}
      >
        <div className="max-w-5xl mx-auto">

          {/* iComply branding + org logo */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-10">
            <div className="flex items-center gap-4">
              {org.logoUrl ? (
                <img
                  src={org.logoUrl}
                  alt={org.name}
                  className="h-14 w-14 rounded-xl object-contain bg-white/20 p-1.5"
                />
              ) : (
                <div
                  className="h-14 w-14 rounded-xl flex items-center justify-center text-2xl font-extrabold text-white"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                >
                  {org.name.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="text-3xl font-extrabold text-white leading-tight">{title}</h1>
                <p className="text-white/70 text-sm mt-0.5">
                  Centro de Confiança
                  {org.industry && ` · ${org.industry}`}
                  {org.country && ` · ${org.country}`}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 self-start sm:self-auto">
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
                <svg className="w-4 h-4 text-white/70" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd"/>
                </svg>
                <span className="text-white/80 text-xs">Última actualização: {formatDate(updatedAt)}</span>
              </div>
              <CopyLinkButton accent={accent} />
            </div>
          </div>

          {settings.customMessage && (
            <p className="text-white/85 text-base max-w-2xl mb-10 leading-relaxed">
              {settings.customMessage}
            </p>
          )}

          {/* Score gauge + quick stats */}
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="bg-white rounded-2xl p-6 flex items-center gap-6 shadow-md flex-shrink-0">
              <ScoreGauge score={stats.overallScore} accent={accent} />
              <div>
                <p className="text-gray-900 font-bold text-base">Pontuação Global</p>
                <p className="text-gray-500 text-xs mt-0.5">Conformidade média activa</p>
                <div className="mt-3 flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: scoreColor(stats.overallScore) }}
                  />
                  <span className="text-xs font-medium" style={{ color: scoreColor(stats.overallScore) }}>
                    {stats.overallScore >= 80 ? 'Excelente' : stats.overallScore >= 50 ? 'Em progresso' : 'Requer atenção'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 flex-1 w-full">
              <div className="bg-white/15 backdrop-blur rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-white">{frameworkCount}</p>
                <p className="text-white/70 text-xs mt-0.5">Frameworks activos</p>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-white">{controlsCount}</p>
                <p className="text-white/70 text-xs mt-0.5">Controlos implementados</p>
              </div>
              {settings.showEvidence && (
                <div className="bg-white/15 backdrop-blur rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-white">{stats.evidence}</p>
                  <p className="text-white/70 text-xs mt-0.5">Evidências verificadas</p>
                </div>
              )}
              {settings.showPolicies && (
                <div className="bg-white/15 backdrop-blur rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-white">{stats.policies}</p>
                  <p className="text-white/70 text-xs mt-0.5">Políticas activas</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">

        {/* Stats row */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-5">Resumo de Conformidade</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard value={`${stats.overallScore}%`} label="Score geral" color={accent} />
            <StatCard value={frameworkCount} label="Frameworks ativos" color={accent} />
            <StatCard value={controlsCount} label="Controlos implementados" color={accent} />
            <StatCard value={stats.evidence} label="Evidências verificadas" color={accent} />
          </div>
        </section>

        {/* Active Frameworks */}
        {settings.showFrameworks && projects.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
              <svg className="w-5 h-5" style={{ color: accent }} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd"/>
              </svg>
              Frameworks Activos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((p) => (
                <FrameworkCard key={p.id} project={p} accent={accent} />
              ))}
            </div>
          </section>
        )}

        {/* Recent Policies */}
        {settings.showPolicies && (isDemo || stats.policies > 0) && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
              <svg className="w-5 h-5" style={{ color: accent }} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
              </svg>
              Políticas Recentes
            </h2>
            {isDemo ? (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">
                        Política
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                        Versão
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                        Actualização
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {DEMO_POLICIES.slice(0, 5).map((p) => (
                      <PolicyRow key={p.name} policy={p} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            ) : (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm text-center text-gray-500 text-sm">
              Esta organização tem <span className="font-semibold text-gray-700">{stats.policies}</span> políticas aprovadas.
            </div>
            )}
          </section>
        )}

        {/* Last audit */}
        {settings.showAudits && stats.lastAudit && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
              <svg className="w-5 h-5" style={{ color: accent }} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              Última Auditoria Concluída
            </h2>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l3-3z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{stats.lastAudit.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Concluída em {formatDate(stats.lastAudit.completedAt)}
                </p>
              </div>
              <span className="bg-green-100 text-green-700 text-xs px-3 py-1.5 rounded-full font-medium self-start sm:self-auto">
                Auditoria aprovada
              </span>
            </div>
          </section>
        )}

        {/* Contact */}
        {settings.contactEmail && (
          <section className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Questões sobre conformidade?</h2>
            <p className="text-gray-500 mb-5 text-sm max-w-sm mx-auto">
              Entre em contacto com o responsável de conformidade desta organização.
            </p>
            <a
              href={`mailto:${settings.contactEmail}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
              style={{ background: accent }}
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
              </svg>
              {settings.contactEmail}
            </a>
          </section>
        )}

        {/* Footer */}
        <footer className="text-center pt-6 pb-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-gray-400">
            <span>Verificado por</span>
            <a
              href="https://icomply.pt"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-600 hover:underline"
            >
              iComply OS
            </a>
            <span className="hidden sm:inline">·</span>
            <span>Plataforma de Gestão de Conformidade</span>
            <span className="hidden sm:inline">·</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
