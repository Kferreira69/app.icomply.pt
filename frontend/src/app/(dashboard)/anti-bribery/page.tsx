'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { antiBriberyApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck, CheckCircle2, XCircle, AlertCircle, MinusCircle, Pencil, X,
} from 'lucide-react';

type FilterStandard = 'ALL' | 'ISO_37001' | 'ISO_37301';

const STANDARD_FILTERS: { key: FilterStandard; label: string }[] = [
  { key: 'ALL',       label: 'All' },
  { key: 'ISO_37001', label: 'ISO 37001' },
  { key: 'ISO_37301', label: 'ISO 37301' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  NOT_IMPLEMENTED: { label: 'Not Implemented', color: 'text-red-600',    bg: 'bg-red-100',    icon: XCircle },
  PARTIAL:         { label: 'Partial',          color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertCircle },
  IMPLEMENTED:     { label: 'Implemented',      color: 'text-green-600',  bg: 'bg-green-100',  icon: CheckCircle2 },
  NOT_APPLICABLE:  { label: 'N/A',              color: 'text-gray-400',   bg: 'bg-gray-100',   icon: MinusCircle },
};

function EditModal({
  control,
  onClose,
  onSave,
}: {
  control: any;
  onClose: () => void;
  onSave: (d: any) => void;
}) {
  const [form, setForm] = useState({
    status:   control.status   ?? 'NOT_IMPLEMENTED',
    evidence: control.evidence ?? '',
    notes:    control.notes    ?? '',
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-5 border-b flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-mono text-gray-400">{control.controlCode}</span>
            {control.clauseNumber && (
              <span className="ml-2 text-xs text-gray-400">Clause {control.clauseNumber}</span>
            )}
            <h2 className="text-sm font-semibold text-gray-900 mt-0.5 max-w-md">{control.title}</h2>
          </div>
          <button onClick={onClose} className="flex-shrink-0 mt-0.5">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {control.description && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded p-3">{control.description}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Implementation Status</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => {
                const Icon = v.icon;
                return (
                  <button
                    key={k}
                    onClick={() => set('status', k)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${
                      form.status === k
                        ? `${v.bg} border-current font-medium ${v.color}`
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${form.status === k ? v.color : 'text-gray-400'}`} />
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Evidence</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
              rows={3}
              value={form.evidence}
              onChange={e => set('evidence', e.target.value)}
              placeholder="Describe the evidence supporting this control..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Additional notes or action items..."
            />
          </div>
        </div>

        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            onClick={() =>
              onSave({
                status:   form.status,
                evidence: form.evidence || null,
                notes:    form.notes    || null,
              })
            }
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AntiBriberyPage() {
  const qc = useQueryClient();
  const [editControl, setEditControl]     = useState<any>(null);
  const [activeFilter, setActiveFilter]   = useState<FilterStandard>('ALL');

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['anti-bribery-dashboard'],
    queryFn:  () => antiBriberyApi.dashboard().then(r => r.data),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => antiBriberyApi.updateControl(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anti-bribery-dashboard'] });
      setEditControl(null);
    },
  });

  const allControls: any[] = dashboard?.controls ?? [];

  const filteredControls = activeFilter === 'ALL'
    ? allControls
    : allControls.filter((c: any) => c.standard === activeFilter);

  const total          = allControls.length;
  const implemented    = allControls.filter((c: any) => c.status === 'IMPLEMENTED').length;
  const partial        = allControls.filter((c: any) => c.status === 'PARTIAL').length;
  const notImplemented = allControls.filter((c: any) => c.status === 'NOT_IMPLEMENTED').length;
  const score          = dashboard?.score ?? (total > 0 ? Math.round((implemented / total) * 100) : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            ISO 37001 / 37301 — Anti-Bribery &amp; Compliance
          </h1>
          <p className="text-sm text-gray-500">
            Anti-Bribery Management System (ABMS) &amp; Compliance Management System (CMS)
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : !dashboard ? null : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="md:col-span-1 bg-emerald-50 rounded-xl p-4">
              <div className="text-xs font-medium text-emerald-600 uppercase mb-2">Compliance Score</div>
              <div className="text-3xl font-bold text-emerald-700">{score}%</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs font-medium text-gray-500 uppercase mb-2">Total Controls</div>
              <div className="text-3xl font-bold text-gray-700">{total}</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-xs font-medium text-green-600 uppercase mb-2">Implemented</div>
              <div className="text-3xl font-bold text-green-700">{implemented}</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4">
              <div className="text-xs font-medium text-yellow-600 uppercase mb-2">Partial</div>
              <div className="text-3xl font-bold text-yellow-700">{partial}</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <div className="text-xs font-medium text-red-600 uppercase mb-2">Not Implemented</div>
              <div className="text-3xl font-bold text-red-700">{notImplemented}</div>
            </div>
          </div>

          {/* Filter buttons */}
          <div className="flex items-center gap-2">
            {STANDARD_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === f.key
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700'
                }`}
              >
                {f.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-400">
              {filteredControls.length} control{filteredControls.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Controls list */}
          <div className="bg-white rounded-xl border overflow-hidden">
            {filteredControls.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No controls found.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredControls.map((c: any) => {
                  const st      = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.NOT_IMPLEMENTED;
                  const StatusIcon = st.icon;
                  return (
                    <div
                      key={c.id}
                      className="flex items-start gap-3 px-4 py-4 hover:bg-gray-50 group"
                    >
                      <div className="flex-shrink-0 flex flex-col items-start gap-1 w-24">
                        <span className="text-xs font-mono text-gray-500">{c.controlCode}</span>
                        {c.clauseNumber && (
                          <span className="text-xs text-gray-400">§{c.clauseNumber}</span>
                        )}
                        {c.standard && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                            {c.standard === 'ISO_37001' ? '37001' : '37301'}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{c.title}</p>
                        {c.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{c.description}</p>
                        )}
                        {c.evidence && (
                          <p className="text-xs text-emerald-600 mt-1 truncate">&#10003; {c.evidence}</p>
                        )}
                      </div>

                      <span
                        className={`flex-shrink-0 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium ${st.bg} ${st.color}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {st.label}
                      </span>

                      <button
                        onClick={() => setEditControl(c)}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 hover:bg-gray-200 rounded text-gray-400 transition-opacity"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {editControl && (
        <EditModal
          control={editControl}
          onClose={() => setEditControl(null)}
          onSave={d => updateMut.mutate({ id: editControl.id, data: d })}
        />
      )}
    </div>
  );
}
