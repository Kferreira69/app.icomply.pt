'use client';

import { useState, useEffect } from 'react';
import { Zap, AlertTriangle, TrendingUp, Target, BarChart2 } from 'lucide-react';
import { unifiedControlsApi } from '@/lib/api';

const DOMAIN_LABEL: Record<string, string> = {
  SECURITY:       'Security Governance',
  PRIVACY:        'Privacy Governance',
  AI_GOVERNANCE:  'AI Governance',
  ETHICS_SPEAKUP: 'Ethics & Speak-Up',
  WORKFORCE:      'Workforce',
  THIRD_PARTY:    'Third-Party',
};

const STATUS_COLOR: Record<string, string> = {
  NOT_STARTED: 'text-red-400 bg-red-900/30 border-red-700/40',
  PLANNED:     'text-yellow-400 bg-yellow-900/30 border-yellow-700/40',
};

export default function GapImpactPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    unifiedControlsApi.gapImpact()
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96 text-gray-500">
        Analysing gaps…
      </div>
    );
  }

  const gaps: any[]     = data?.gaps || [];
  const fwImpact: any[] = data?.frameworkImpact || [];
  const totalGaps       = data?.totalGaps ?? gaps.length;

  if (totalGaps === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Zap className="w-6 h-6 text-rose-400" />
          <h1 className="text-2xl font-bold text-white">Gap & Impact Analysis</h1>
        </div>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Target className="w-12 h-12 text-green-700 mb-4" />
          <p className="text-green-400 font-medium">No gaps detected!</p>
          <p className="text-gray-500 text-sm mt-1">All applicable controls are implemented or in progress.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="w-6 h-6 text-rose-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Gap & Impact Analysis</h1>
          <p className="text-gray-400 text-sm">Controls not yet implemented and their regulatory exposure</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Total Gaps</p>
          <p className="text-3xl font-bold text-red-400">{totalGaps}</p>
        </div>
        <div className="bg-orange-900/20 border border-orange-700/30 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Frameworks Affected</p>
          <p className="text-3xl font-bold text-orange-400">{fwImpact.length}</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Regulatory Exposures</p>
          <p className="text-3xl font-bold text-white">
            {fwImpact.reduce((s: number, f: any) => s + f.gapCount, 0)}
          </p>
        </div>
      </div>

      {/* Framework impact bar chart */}
      {fwImpact.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-300">Regulatory Framework Impact</h2>
          </div>
          <div className="space-y-2">
            {fwImpact.map((f: any) => {
              const maxGaps = fwImpact[0]?.gapCount || 1;
              const pct = Math.round((f.gapCount / maxGaps) * 100);
              return (
                <div key={f.framework} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-300 w-20 flex-shrink-0">{f.framework}</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-16 text-right flex-shrink-0">
                    {f.gapCount} gap{f.gapCount !== 1 ? 's' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gap list */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Controls with Gaps ({gaps.length}{totalGaps > gaps.length ? ` of ${totalGaps} shown` : ''})
        </h2>
        {gaps.map((gap: any, i: number) => {
          const statusCfg = STATUS_COLOR[gap.status] || STATUS_COLOR.NOT_STARTED;
          return (
            <div key={gap.controlId || i} className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 hover:bg-gray-900/70 transition-colors">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-medium text-gray-100">{gap.title}</p>
                    <span className={`text-xs border px-2 py-0.5 rounded-full flex-shrink-0 ${statusCfg}`}>
                      {gap.status?.replace('_', ' ')}
                    </span>
                    {gap.domain && (
                      <span className="text-xs text-gray-500">
                        {DOMAIN_LABEL[gap.domain] || gap.domain}
                      </span>
                    )}
                  </div>
                  {/* Affected framework mappings */}
                  {gap.frameworkMappings?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-xs text-gray-500 mr-1">Affects:</span>
                      {gap.frameworkMappings.map((m: string) => (
                        <span key={m} className="text-[10px] font-mono bg-gray-800 border border-gray-700 text-gray-400 px-1.5 py-0.5 rounded">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Framework count = regulatory exposure */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-500">Reg. Exposure</p>
                  <p className="text-xl font-bold text-red-400">
                    {gap.frameworkMappings?.length ?? 0}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
