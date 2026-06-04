'use client';

import { useQuery } from '@tanstack/react-query';
import { orgApi, soaApi, nis2Api, cisApi, soc2Api, workforceApi, antiBriberyApi, qualityApi } from '@/lib/api';
import { Activity, TrendingUp, TrendingDown, Minus, RefreshCw, Loader2, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface DomainScore { domain: string; score: number; maturity: number; href: string; color: string; trend?: 'up' | 'down' | 'stable' }

const MATURITY_LABELS = ['Não Iniciado', 'Inicial', 'Em Desenvolvimento', 'Definido', 'Gerido', 'Optimizado'];
const MATURITY_COLORS = ['#9CA3AF', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981'];

function ScoreGauge({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size / 2) - 8;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#8B5CF6' : score >= 40 ? '#F59E0B' : '#EF4444';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E7EB" strokeWidth="6" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 0.8s ease-in-out' }} />
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fontSize={size > 70 ? 16 : 12} fontWeight="bold" fill={color}>{score}%</text>
    </svg>
  );
}

export default function ComplianceMonitorPage() {
  const { data: dashData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['compliance-monitor'],
    queryFn: () => orgApi.dashboard().then(r => r.data),
    refetchInterval: 60000,
  });

  const domains: DomainScore[] = [
    ...(dashData?.domainScores || []).map((d: any) => ({
      domain: d.domain, score: d.score, maturity: d.maturity,
      href: d.domain.includes('27001') ? '/soa' : d.domain === 'NIS2' ? '/nis2' : d.domain.includes('CIS') ? '/cis' : d.domain.includes('SOC') ? '/soc2' : d.domain.includes('27701') ? '/iso27701' : d.domain.includes('45001') ? '/workforce' : d.domain.includes('Anti') ? '/anti-bribery' : d.domain.includes('9001') ? '/quality' : '/governance/controls',
      color: d.color || '#3B82F6',
      trend: 'stable' as const,
    })),
  ];

  const alerts = dashData?.alerts || [];
  const overallMaturity = dashData?.overallMaturity ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><Activity className="w-5 h-5 text-gray-300" /><span className="text-gray-400 text-xs font-medium uppercase tracking-widest">Monitorização Contínua</span></div>
            <h1 className="text-2xl font-bold">Compliance Monitor</h1>
            <p className="text-gray-300 text-sm mt-1">Estado em tempo real de todos os frameworks de conformidade</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-4xl font-black" style={{ color: MATURITY_COLORS[Math.round(overallMaturity)] }}>{overallMaturity.toFixed(1)}</p>
              <p className="text-gray-400 text-xs">{MATURITY_LABELS[Math.round(overallMaturity)]}</p>
            </div>
            <button onClick={() => refetch()} disabled={isFetching} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <RefreshCw className={cn('w-5 h-5 text-gray-300', isFetching && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
      ) : (
        <>
          {/* Domain scores grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {domains.map(d => (
              <Link key={d.domain} href={d.href}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all group">
                <ScoreGauge score={d.score} />
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{d.domain}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: MATURITY_COLORS[d.maturity] }} />
                    <p className="text-xs text-gray-500">{MATURITY_LABELS[d.maturity]}</p>
                  </div>
                </div>
                {/* Maturity bar */}
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(d.maturity / 5) * 100}%`, background: MATURITY_COLORS[d.maturity] }} />
                </div>
              </Link>
            ))}
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-500" /> Alertas Ativos ({alerts.length})
              </h3>
              <div className="space-y-2">
                {alerts.map((alert: any, i: number) => (
                  <Link key={i} href={alert.href}
                    className={cn('flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-colors hover:opacity-90',
                      alert.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-700' :
                      alert.severity === 'high'     ? 'bg-orange-50 border-orange-200 text-orange-700' :
                      'bg-yellow-50 border-yellow-200 text-yellow-700')}>
                    <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', alert.severity === 'critical' ? 'bg-red-500' : alert.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500')} />
                    <span className="flex-1">{alert.message}</span>
                    <span className="text-xs opacity-60 flex-shrink-0">→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* No data state */}
          {domains.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16">
              <Activity className="w-12 h-12 text-gray-200 mb-4" />
              <p className="text-gray-400 font-medium">Sem dados de conformidade disponíveis</p>
              <p className="text-gray-400 text-sm mt-1">Configure os frameworks e comece a registar dados</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
