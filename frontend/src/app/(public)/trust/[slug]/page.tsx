'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { trustCenterApi } from '@/lib/api';
import { CheckCircle2, Shield, FileText, Users, ClipboardCheck, Globe, Mail, AlertCircle } from 'lucide-react';

function ScoreRing({ score, size = 80, color = '#2563eb' }: { score: number; size?: number; color?: string }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2} y={size / 2 + 5}
        textAnchor="middle" fontSize={18} fontWeight="700" fill="#111827"
      >
        {score}%
      </text>
    </svg>
  );
}

const FRAMEWORK_ICONS: Record<string, string> = {
  ISO27001: '🔒', ISO9001: '⭐', GDPR: '🇪🇺', NIS2: '🛡️',
  DORA: '🏦', RGPC: '📢', PAY_TRANSPARENCY: '⚖️',
};

const FRAMEWORK_COLORS: Record<string, string> = {
  ISO27001: 'from-blue-600 to-blue-800',
  ISO9001: 'from-amber-500 to-amber-700',
  GDPR: 'from-purple-600 to-purple-800',
  NIS2: 'from-teal-600 to-teal-800',
  DORA: 'from-orange-600 to-orange-800',
  RGPC: 'from-red-600 to-red-800',
  PAY_TRANSPARENCY: 'from-green-600 to-green-800',
};

export default function TrustCenterPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    trustCenterApi.getPublic(slug)
      .then(r => setData(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">A carregar Trust Center...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Trust Center não disponível</h2>
          <p className="text-gray-500 text-sm">
            Esta organização não tem um Trust Center público configurado, ou o link está incorrecto.
          </p>
        </div>
      </div>
    );
  }

  const { organization: org, settings, stats, projects, updatedAt } = data;
  const accent = settings.accentColor || '#2563eb';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero header */}
      <div
        className="py-16 px-6 text-white"
        style={{ background: `linear-gradient(135deg, ${accent}ee 0%, ${accent} 100%)` }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            {org.logoUrl ? (
              <img src={org.logoUrl} alt={org.name} className="h-12 rounded-lg bg-white/20 p-1" />
            ) : (
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-2xl font-bold">
                {org.name[0]}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold">{settings.customTitle || org.name}</h1>
              <p className="text-white/70 mt-0.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                {org.industry || 'Organização'} · {org.country}
              </p>
            </div>
          </div>

          {settings.customMessage && (
            <p className="text-white/85 text-lg max-w-2xl mb-8 leading-relaxed">
              {settings.customMessage}
            </p>
          )}

          {/* Overall score */}
          <div className="flex items-center gap-8">
            <div className="bg-white/15 backdrop-blur rounded-2xl p-6 flex items-center gap-5">
              <ScoreRing score={stats.overallScore} size={88} color="white" />
              <div>
                <p className="text-white font-bold text-lg">Pontuação Global</p>
                <p className="text-white/70 text-sm">Conformidade média activa</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {settings.showEvidence && (
                <div className="bg-white/15 backdrop-blur rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-white">{stats.evidence}</p>
                  <p className="text-white/70 text-xs mt-0.5">Evidências aprovadas</p>
                </div>
              )}
              {settings.showPolicies && (
                <div className="bg-white/15 backdrop-blur rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-white">{stats.policies}</p>
                  <p className="text-white/70 text-xs mt-0.5">Políticas activas</p>
                </div>
              )}
              {settings.showAudits && (
                <div className="bg-white/15 backdrop-blur rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-white">{stats.audits}</p>
                  <p className="text-white/70 text-xs mt-0.5">Auditorias realizadas</p>
                </div>
              )}
              {settings.showVendors && (
                <div className="bg-white/15 backdrop-blur rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-white">{stats.vendors}</p>
                  <p className="text-white/70 text-xs mt-0.5">Fornecedores avaliados</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">

        {/* Frameworks */}
        {settings.showFrameworks && projects.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5" style={{ color: accent }} />
              Frameworks de Conformidade
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((p: any) => {
                const fcode = p.framework?.code?.replace(/[^A-Z0-9]/g, '') || '';
                const gradClass = FRAMEWORK_COLORS[fcode] || 'from-gray-600 to-gray-800';
                const icon = FRAMEWORK_ICONS[fcode] || '📋';
                return (
                  <div key={p.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <div className={`bg-gradient-to-r ${gradClass} p-4 flex items-center gap-3`}>
                      <span className="text-2xl">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold truncate">{p.framework?.name || p.name}</p>
                        <p className="text-white/70 text-xs">{p.framework?.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-2xl font-bold">{p.complianceScore}%</p>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${p.complianceScore}%`,
                            background: accent,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          p.complianceScore >= 80 ? 'bg-green-100 text-green-700' :
                          p.complianceScore >= 50 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {p.complianceScore >= 80 ? 'Em conformidade' :
                           p.complianceScore >= 50 ? 'Em progresso' : 'Inicial'}
                        </span>
                        {p.targetDate && (
                          <span className="text-xs text-gray-400">
                            Alvo: {new Date(p.targetDate).toLocaleDateString('pt-PT')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Last audit */}
        {settings.showAudits && stats.lastAudit && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" style={{ color: accent }} />
              Última Auditoria
            </h2>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center gap-6">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{stats.lastAudit.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Concluída em {new Date(stats.lastAudit.completedAt).toLocaleDateString('pt-PT', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
              <div className="ml-auto">
                <span className="bg-green-100 text-green-700 text-xs px-3 py-1.5 rounded-full font-medium">
                  ✓ Auditoria aprovada
                </span>
              </div>
            </div>
          </section>
        )}

        {/* What's verified */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" style={{ color: accent }} />
            O que está verificado
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              settings.showFrameworks && { icon: Shield, label: 'Frameworks activos', value: projects.length },
              settings.showEvidence && { icon: FileText, label: 'Evidências', value: stats.evidence },
              settings.showPolicies && { icon: ClipboardCheck, label: 'Políticas', value: stats.policies },
              settings.showAudits && { icon: Users, label: 'Auditorias', value: stats.audits },
            ].filter(Boolean).map((item: any) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
                  <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center"
                    style={{ backgroundColor: `${accent}15` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: accent }} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Contact */}
        {settings.contactEmail && (
          <section className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Questões sobre conformidade?</h2>
            <p className="text-gray-500 mb-4 text-sm">
              Entre em contacto com o responsável de conformidade desta organização.
            </p>
            <a
              href={`mailto:${settings.contactEmail}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
              style={{ background: accent }}
            >
              <Mail className="w-4 h-4" />
              {settings.contactEmail}
            </a>
          </section>
        )}

        {/* Footer */}
        <footer className="text-center pt-4 pb-8 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            Última actualização: {new Date(updatedAt).toLocaleDateString('pt-PT')} ·{' '}
            Powered by{' '}
            <a href="https://icomply.pt" className="text-blue-600 hover:underline font-medium">
              iComply
            </a>
            {' '}— Plataforma de Gestão de Conformidade
          </p>
        </footer>
      </div>
    </div>
  );
}
