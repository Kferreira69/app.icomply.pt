'use client';

import { useState, useEffect } from 'react';
import { ScrollText, Plus, Search, AlertTriangle, Clock, CheckCircle2, X } from 'lucide-react';
import { unifiedControlsApi } from '@/lib/api';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE:   { label: 'Active',   color: 'bg-green-900/30 text-green-400 border-green-700/30' },
  PENDING:  { label: 'Pending',  color: 'bg-yellow-900/30 text-yellow-400 border-yellow-700/30' },
  EXPIRED:  { label: 'Expired',  color: 'bg-red-900/30 text-red-400 border-red-700/30' },
  ARCHIVED: { label: 'Archived', color: 'bg-gray-800 text-gray-500 border-gray-700/30' },
};

const IMPACT_COLOR: Record<string, string> = {
  CRITICAL: 'text-red-400',
  HIGH:     'text-orange-400',
  MEDIUM:   'text-yellow-400',
  LOW:      'text-blue-400',
};

// ── CreateModal ───────────────────────────────────────────────

function CreateObligationModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: any) => Promise<void>;
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    framework: '',
    clause: '',
    jurisdiction: 'EU',
    effectiveDate: '',
    impactLevel: 'MEDIUM',
    status: 'PENDING',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onCreate(form); onClose(); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">New Regulatory Obligation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Title *</label>
            <input required value={form.title} onChange={e => set('title', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Framework</label>
              <input value={form.framework} onChange={e => set('framework', e.target.value)}
                placeholder="e.g. NIS2, AI Act"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Clause / Article</label>
              <input value={form.clause} onChange={e => set('clause', e.target.value)}
                placeholder="e.g. Art. 21.2"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Jurisdiction</label>
              <select value={form.jurisdiction} onChange={e => set('jurisdiction', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl text-sm focus:outline-none">
                {['EU', 'PT', 'ES', 'DE', 'FR', 'UK', 'GLOBAL'].map(j => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Impact Level</label>
              <select value={form.impactLevel} onChange={e => set('impactLevel', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl text-sm focus:outline-none">
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Effective Date</label>
            <input type="date" value={form.effectiveDate} onChange={e => set('effectiveDate', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Obligation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function ObligationsPage() {
  const [obligations, setObligations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await unifiedControlsApi.listObligations();
      setObligations(res.data);
    } catch {
      setObligations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (data: any) => {
    await unifiedControlsApi.createObligation(data);
    await load();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await unifiedControlsApi.updateObligation(id, { status });
    setObligations(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  const filtered = obligations.filter(o =>
    !search ||
    o.title?.toLowerCase().includes(search.toLowerCase()) ||
    o.framework?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-6">
      {showCreate && (
        <CreateObligationModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="w-6 h-6 text-rose-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Regulatory Horizon</h1>
            <p className="text-gray-400 text-sm">Track regulatory obligations and upcoming deadlines</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Obligation
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total',   value: obligations.length,                                          color: 'text-white' },
          { label: 'Active',  value: obligations.filter(o => o.status === 'ACTIVE').length,        color: 'text-green-400' },
          { label: 'Pending', value: obligations.filter(o => o.status === 'PENDING').length,       color: 'text-yellow-400' },
          { label: 'Expired', value: obligations.filter(o => o.status === 'EXPIRED').length,       color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search obligations…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-xl text-sm focus:outline-none focus:border-rose-500"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <ScrollText className="w-12 h-12 text-gray-700 mb-4" />
          <p className="text-gray-400">
            {obligations.length === 0 ? 'No obligations tracked yet' : 'No results'}
          </p>
          {obligations.length === 0 && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm rounded-xl transition-colors"
            >
              Add First Obligation
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(obl => {
            const statusCfg = STATUS_CONFIG[obl.status] || STATUS_CONFIG.PENDING;
            const impactColor = IMPACT_COLOR[obl.impactLevel] || 'text-gray-400';
            return (
              <div key={obl.id} className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 hover:bg-gray-900/70 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-medium text-gray-100">{obl.title}</p>
                      <span className={`text-xs border px-2 py-0.5 rounded-full flex-shrink-0 ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                      {obl.impactLevel && (
                        <span className={`text-xs font-bold flex-shrink-0 ${impactColor}`}>
                          {obl.impactLevel}
                        </span>
                      )}
                    </div>
                    {obl.description && (
                      <p className="text-xs text-gray-500 mb-2">{obl.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      {obl.framework && <span className="font-mono bg-gray-800 px-2 py-0.5 rounded">{obl.framework}</span>}
                      {obl.clause && <span>{obl.clause}</span>}
                      {obl.jurisdiction && <span>🌍 {obl.jurisdiction}</span>}
                      {obl.effectiveDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(obl.effectiveDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <select
                    value={obl.status}
                    onChange={e => handleStatusChange(obl.id, e.target.value)}
                    className={`text-xs border rounded-lg px-2 py-1 bg-transparent cursor-pointer flex-shrink-0 ${statusCfg.color}`}
                  >
                    {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                      <option key={val} value={val} className="bg-gray-900 text-gray-100">{cfg.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
