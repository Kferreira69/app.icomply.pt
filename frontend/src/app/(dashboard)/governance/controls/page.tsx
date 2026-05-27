'use client';

import { useState, useEffect } from 'react';
import {
  Layers, Plus, Search, Filter, ChevronDown, ChevronRight,
  CheckCircle2, AlertTriangle, XCircle, Clock, GitMerge,
  Shield, Eye, Brain, Scale, Briefcase, Building2, Zap,
} from 'lucide-react';
import { unifiedControlsApi } from '@/lib/api';

// ── Status config ─────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  IMPLEMENTED:    { label: 'Implemented',    color: 'bg-green-900/30 text-green-400 border-green-700/30',  icon: CheckCircle2 },
  IN_PROGRESS:    { label: 'In Progress',    color: 'bg-blue-900/30 text-blue-400 border-blue-700/30',    icon: Clock },
  PLANNED:        { label: 'Planned',        color: 'bg-yellow-900/30 text-yellow-400 border-yellow-700/30', icon: Clock },
  NOT_APPLICABLE: { label: 'N/A',           color: 'bg-gray-800 text-gray-500 border-gray-700/30',        icon: XCircle },
  GAP:            { label: 'Gap',            color: 'bg-red-900/30 text-red-400 border-red-700/30',        icon: AlertTriangle },
};

const DOMAIN_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  SECURITY:        { label: 'Security Governance',   color: 'bg-blue-600',   icon: Shield },
  PRIVACY:         { label: 'Privacy Governance',    color: 'bg-purple-600', icon: Eye },
  AI_GOVERNANCE:   { label: 'AI Governance',         color: 'bg-violet-600', icon: Brain },
  ETHICS_SPEAKUP:  { label: 'Ethics & Speak-Up',     color: 'bg-orange-600', icon: Scale },
  WORKFORCE:       { label: 'Workforce Governance',  color: 'bg-green-600',  icon: Briefcase },
  THIRD_PARTY:     { label: 'Third-Party',           color: 'bg-teal-600',   icon: Building2 },
};

// ── Framework badge colors ────────────────────────────────────

const FW_COLORS: Record<string, string> = {
  ISO27001: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  NIS2:     'bg-cyan-900/40 text-cyan-300 border-cyan-700/40',
  DORA:     'bg-indigo-900/40 text-indigo-300 border-indigo-700/40',
  GDPR:     'bg-purple-900/40 text-purple-300 border-purple-700/40',
  SOC2:     'bg-sky-900/40 text-sky-300 border-sky-700/40',
  CIS:      'bg-gray-800 text-gray-300 border-gray-700/40',
  EUAIACT:  'bg-violet-900/40 text-violet-300 border-violet-700/40',
  ISO42001: 'bg-rose-900/40 text-rose-300 border-rose-700/40',
  NIST:     'bg-yellow-900/40 text-yellow-300 border-yellow-700/40',
  ISO22301: 'bg-green-900/40 text-green-300 border-green-700/40',
};

function getFrameworkColor(mapping: string) {
  const fw = mapping.split(':')[0];
  return FW_COLORS[fw] || 'bg-gray-800 text-gray-400 border-gray-700/40';
}

// ── ControlRow ────────────────────────────────────────────────

function ControlRow({
  control,
  onStatusChange,
}: {
  control: any;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_CONFIG[control.status] || STATUS_CONFIG.GAP;
  const StatusIcon = status.icon;
  const domain = DOMAIN_CONFIG[control.domain];
  const DomainIcon = domain?.icon || Layers;

  return (
    <div className="border border-gray-700/50 rounded-xl overflow-hidden bg-gray-900/40 hover:bg-gray-900/70 transition-colors">
      {/* Row header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-gray-500 hover:text-gray-300 flex-shrink-0"
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Domain dot */}
        {domain && (
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${domain.color}`} title={domain.label} />
        )}

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-100 truncate">{control.title}</p>
          <p className="text-xs text-gray-500 truncate">{control.description}</p>
        </div>

        {/* Framework badges */}
        <div className="hidden lg:flex items-center gap-1 flex-wrap max-w-xs">
          {(control.frameworkMappings || []).slice(0, 4).map((m: string) => (
            <span
              key={m}
              className={`text-[10px] font-mono border px-1.5 py-0.5 rounded ${getFrameworkColor(m)}`}
            >
              {m.split(':')[0]}
            </span>
          ))}
          {(control.frameworkMappings || []).length > 4 && (
            <span className="text-[10px] text-gray-500">+{control.frameworkMappings.length - 4}</span>
          )}
        </div>

        {/* Status selector */}
        <select
          value={control.status}
          onChange={e => onStatusChange(control.id, e.target.value)}
          className={`text-xs border rounded-lg px-2 py-1 bg-transparent cursor-pointer flex-shrink-0 ${status.color}`}
        >
          {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
            <option key={val} value={val} className="bg-gray-900 text-gray-100">{cfg.label}</option>
          ))}
        </select>

        {/* Evidence count */}
        <span className="text-xs text-gray-500 flex-shrink-0 w-16 text-right">
          {control._count?.evidenceLinks ?? 0} evidences
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-10 pb-4 border-t border-gray-700/30 bg-gray-900/20">
          <div className="pt-3 space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Objective</p>
              <p className="text-sm text-gray-300">{control.objective || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Framework Mappings</p>
              <div className="flex flex-wrap gap-1.5">
                {(control.frameworkMappings || []).map((m: string) => (
                  <span
                    key={m}
                    className={`text-xs font-mono border px-2 py-0.5 rounded ${getFrameworkColor(m)}`}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
            {control.notes && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-gray-300">{control.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

const DOMAINS_TO_SEED = ['SECURITY', 'PRIVACY', 'AI_GOVERNANCE'];

export default function UnifiedControlsPage() {
  const [controls, setControls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await unifiedControlsApi.list({ domain: domainFilter || undefined });
      setControls(res.data);
    } catch {
      setControls([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [domainFilter]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await unifiedControlsApi.seed(DOMAINS_TO_SEED);
      await load();
    } finally {
      setSeeding(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await unifiedControlsApi.update(id, { status });
      setControls(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    } catch { /* ignore */ }
  };

  const filtered = controls.filter(c => {
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) &&
        !c.description?.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });

  // Stats
  const total = controls.length;
  const implemented = controls.filter(c => c.status === 'IMPLEMENTED').length;
  const gaps = controls.filter(c => c.status === 'GAP').length;
  const inProgress = controls.filter(c => c.status === 'IN_PROGRESS').length;
  const coveragePct = total > 0 ? Math.round((implemented / total) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitMerge className="w-6 h-6 text-rose-400" />
            <h1 className="text-2xl font-bold text-white">Unified Control Library</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Cross-framework control mapping — one control, multiple frameworks (ISO 27001 · NIS2 · DORA · GDPR · AI Act)
          </p>
        </div>
        {controls.length === 0 && !loading && (
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            {seeding ? 'Seeding…' : 'Seed from Catalogue'}
          </button>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Controls', value: total, color: 'text-white' },
          { label: 'Implemented', value: implemented, color: 'text-green-400' },
          { label: 'In Progress', value: inProgress, color: 'text-blue-400' },
          { label: 'Gaps', value: gaps, color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Coverage bar */}
      {total > 0 && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-300">Overall Coverage</span>
            <span className="text-sm font-bold text-white">{coveragePct}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-rose-500 to-green-500 h-2 rounded-full transition-all duration-700"
              style={{ width: `${coveragePct}%` }}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search controls…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-xl text-sm focus:outline-none focus:border-rose-500"
          />
        </div>
        <select
          value={domainFilter}
          onChange={e => setDomainFilter(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl text-sm focus:outline-none"
        >
          <option value="">All Domains</option>
          {Object.entries(DOMAIN_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl text-sm focus:outline-none"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        {controls.length > 0 && (
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            {seeding ? 'Reseeding…' : 'Add from Catalogue'}
          </button>
        )}
      </div>

      {/* Controls list */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Loading controls…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <GitMerge className="w-12 h-12 text-gray-700 mb-4" />
          <p className="text-gray-400 font-medium">
            {controls.length === 0 ? 'No controls yet' : 'No controls match your filters'}
          </p>
          {controls.length === 0 && (
            <p className="text-gray-600 text-sm mt-1">
              Click "Seed from Catalogue" to import cross-framework controls
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Group by domain */}
          {Object.entries(
            filtered.reduce<Record<string, any[]>>((acc, c) => {
              const d = c.domain || 'OTHER';
              if (!acc[d]) acc[d] = [];
              acc[d].push(c);
              return acc;
            }, {}),
          ).map(([domain, domainControls]) => {
            const cfg = DOMAIN_CONFIG[domain];
            const DomainIcon = cfg?.icon || Layers;
            return (
              <div key={domain} className="space-y-2">
                <div className="flex items-center gap-2 pt-2 pb-1">
                  <div className={`w-5 h-5 rounded flex items-center justify-center ${cfg?.color || 'bg-gray-600'}`}>
                    <DomainIcon className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {cfg?.label || domain} ({domainControls.length})
                  </span>
                </div>
                {domainControls.map(c => (
                  <ControlRow
                    key={c.id}
                    control={c}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
