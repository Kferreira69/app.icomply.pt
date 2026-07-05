'use client';

import { useState, useEffect } from 'react';
import { GitMerge, CheckCircle2, AlertTriangle, Minus, Clock, Shield } from 'lucide-react';
import { unifiedControlsApi } from '@/lib/api';

// Status symbol for matrix cell
const STATUS_SYMBOL: Record<string, { symbol: string; bg: string }> = {
  IMPLEMENTED:    { symbol: '✓', bg: 'bg-green-900/70' },
  IN_PROGRESS:    { symbol: '~', bg: 'bg-blue-900/70' },
  PLANNED:        { symbol: '○', bg: 'bg-yellow-900/70' },
  GAP:            { symbol: '!', bg: 'bg-red-900/70' },
  NOT_STARTED:    { symbol: '!', bg: 'bg-red-900/70' },
  NOT_APPLICABLE: { symbol: '—', bg: 'bg-gray-800/70' },
};

const FRAMEWORKS = ['ISO27001', 'NIS2', 'DORA', 'GDPR', 'AI_Act', 'ISO42001', 'SOC2', 'CIS'];

export default function CoverageMatrixPage() {
  const [controls, setControls] = useState<any[]>([]);
  const [frameworkSummary, setFrameworkSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      unifiedControlsApi.list({ limit: 200 }),
      unifiedControlsApi.coverageMatrix(),
    ])
      .then(([ctrlRes, matrixRes]) => {
        setControls(ctrlRes.data || []);
        setFrameworkSummary(Array.isArray(matrixRes.data) ? matrixRes.data : []);
      })
      .catch(() => { setControls([]); setFrameworkSummary([]); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96 text-gray-500">
        Building coverage matrix…
      </div>
    );
  }

  // Determine which frameworks are actually present in the data
  const fwsInData = new Set<string>();
  controls.forEach(c => {
    (c.frameworkMappings || []).forEach((m: string) => fwsInData.add(m.split(':')[0]));
  });
  const cols = FRAMEWORKS.filter(f => fwsInData.has(f));

  if (controls.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <GitMerge className="w-6 h-6 text-rose-400" />
          <h1 className="text-2xl font-bold text-white">Coverage Matrix</h1>
        </div>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <GitMerge className="w-12 h-12 text-gray-700 mb-4" />
          <p className="text-gray-400">No controls found. Seed controls first in the Control Library.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <GitMerge className="w-6 h-6 text-rose-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Coverage Matrix</h1>
          <p className="text-gray-400 text-sm">How unified controls map across regulatory frameworks</p>
        </div>
      </div>

      {/* Per-framework summary cards */}
      {frameworkSummary.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {frameworkSummary.slice(0, 8).map((fw: any) => (
            <div key={fw.framework} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-mono font-semibold text-gray-300">{fw.framework}</p>
                <p className="text-sm font-bold text-white">{fw.coverage}%</p>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${fw.coverage >= 80 ? 'bg-green-500' : fw.coverage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${fw.coverage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{fw.implemented}/{fw.total} controls</p>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_SYMBOL).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-gray-400">
            <div className={`w-5 h-5 rounded text-center text-[10px] leading-5 text-white font-bold ${v.bg}`}>{v.symbol}</div>
            <span>{k.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      {/* Matrix table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-3 text-gray-400 font-medium text-xs uppercase tracking-wider w-56 min-w-40 sticky left-0 bg-gray-950">
                Control
              </th>
              {cols.map(fw => (
                <th key={fw} className="py-3 px-2 text-center text-gray-400 font-mono text-[11px] w-16 min-w-14">
                  {fw}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {controls.map((ctrl: any) => {
              const statusCfg = STATUS_SYMBOL[ctrl.status] || STATUS_SYMBOL.NOT_STARTED;
              return (
                <tr key={ctrl.id} className="border-b border-gray-700/40 hover:bg-gray-800/40 transition-colors">
                  <td className="py-2.5 px-3 sticky left-0 bg-gray-950 hover:bg-gray-800/40">
                    <p className="text-gray-200 font-medium text-xs truncate max-w-52" title={ctrl.title}>
                      {ctrl.title}
                    </p>
                    <p className="text-gray-600 text-[10px]">{ctrl.domain}</p>
                  </td>
                  {cols.map(fw => {
                    const mapping = (ctrl.frameworkMappings || []).find((m: string) => m.startsWith(fw + ':'));
                    return (
                      <td key={fw} className="py-2.5 px-2 text-center">
                        {mapping ? (
                          <div
                            title={mapping}
                            className={`mx-auto w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white ${statusCfg.bg}`}
                          >
                            {statusCfg.symbol}
                          </div>
                        ) : (
                          <div className="mx-auto w-6 h-6 flex items-center justify-center">
                            <span className="text-gray-700 text-xs">·</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
