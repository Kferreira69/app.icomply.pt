'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workforceApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Users, CheckCircle2, XCircle, AlertCircle, MinusCircle, Circle, Pencil, X,
} from 'lucide-react';

type FilterFramework = 'ALL' | 'ISO_45001' | 'HR_GDPR' | 'WORKING_TIME' | 'DISCRIMINATION';

const FRAMEWORK_FILTERS: { key: FilterFramework; label: string }[] = [
  { key: 'ALL',            label: 'All' },
  { key: 'ISO_45001',      label: 'ISO 45001' },
  { key: 'HR_GDPR',        label: 'HR GDPR' },
  { key: 'WORKING_TIME',   label: 'Working Time' },
  { key: 'DISCRIMINATION', label: 'Discrimination' },
];

const FRAMEWORK_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ISO_45001:      { label: 'ISO 45001 OHS',      color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  HR_GDPR:        { label: 'HR GDPR',             color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  WORKING_TIME:   { label: 'Working Time',        color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  DISCRIMINATION: { label: 'Discrimination',      color: 'text-rose-700',   bg: 'bg-rose-50',   border: 'border-rose-200' },
  HEALTH_SAFETY:  { label: 'Health & Safety',     color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  NOT_ASSESSED:   { label: 'Not Assessed',  color: 'text-gray-500',   bg: 'bg-gray-100',   icon: Circle },
  NON_COMPLIANT:  { label: 'Non-Compliant', color: 'text-red-600',    bg: 'bg-red-100',    icon: XCircle },
  PARTIAL:        { label: 'Partial',       color: 'text-amber-600',  bg: 'bg-amber-100',  icon: AlertCircle },
  COMPLIANT:      { label: 'Compliant',     color: 'text-green-600',  bg: 'bg-green-100',  icon: CheckCircle2 },
  NOT_APPLICABLE: { label: 'N/A',           color: 'text-gray-400',   bg: 'bg-gray-50',    icon: MinusCircle },
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
    status:   control.status   ?? 'NOT_ASSESSED',
    evidence: control.evidence ?? '',
    notes:    control.notes    ?? '',
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const fw = FRAMEWORK_CONFIG[control.framework] ?? { label: control.framework, color: 'text-gray-600', bg: 'bg-gray-50', border: '' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-5 border-b flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-400">{control.controlCode}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${fw.bg} ${fw.color}`}>
                {fw.label}
              </span>
            </div>
            <h2 className="text-sm font-semibold text-gray-900 max-w-md">{control.clauseTitle ?? control.title}</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Compliance Status</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
              rows={3}
              value={form.evidence}
              onChange={e => set('evidence', e.target.value)}
              placeholder="Describe the evidence supporting this control..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
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

export default function WorkforcePage() {
  const qc = useQueryClient();
  const [editControl, setEditControl]   = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<FilterFramework>('ALL');

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['workforce-dashboard'],
    queryFn:  () => workforceApi.dashboard().then(r => r.data),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => workforceApi.updateControl(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workforce-dashboard'] });
      setEditControl(null);
    },
  });

  const allControls: any[] = dashboard?.controls ?? [];

  const filteredControls = activeFilter === 'ALL'
    ? allControls
    : allControls.filter((c: any) => c.framework === activeFilter);

  // Group filtered controls by framework
  const grouped: Record<string, any[]> = {};
  for (const c of filteredControls) {
    const fw = c.framework ?? 'OTHER';
    if (!grouped[fw]) grouped[fw] = [];
    grouped[fw].push(c);
  }

  const total        = allControls.length;
  const compliant    = allControls.filter((c: any) => c.status === 'COMPLIANT').length;
  const partial      = allControls.filter((c: any) => c.status === 'PARTIAL').length;
  const nonCompliant = allControls.filter((c: any) => c.status === 'NON_COMPLIANT').length;
  const score        = dashboard?.score ?? (total > 0 ? Math.round((compliant / total) * 100) : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workforce Governance</h1>
          <p className="text-sm text-gray-500">
            ISO 45001 OHS — HR Compliance — Working Time &amp; Discrimination
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : !dashboard ? null : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="md:col-span-1 bg-blue-50 rounded-xl p-4">
              <div className="text-xs font-medium text-blue-600 uppercase mb-2">Compliance Score</div>
              <div className="text-3xl font-bold text-blue-700">{score}%</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs font-medium text-gray-500 uppercase mb-2">Total Controls</div>
              <div className="text-3xl font-bold text-gray-700">{total}</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-xs font-medium text-green-600 uppercase mb-2">Compliant</div>
              <div className="text-3xl font-bold text-green-700">{compliant}</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <div className="text-xs font-medium text-amber-600 uppercase mb-2">Partial</div>
              <div className="text-3xl font-bold text-amber-700">{partial}</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <div className="text-xs font-medium text-red-600 uppercase mb-2">Non-Compliant</div>
              <div className="text-3xl font-bold text-red-700">{nonCompliant}</div>
            </div>
          </div>

          {/* Filter buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {FRAMEWORK_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === f.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700'
                }`}
              >
                {f.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-400">
              {filteredControls.length} control{filteredControls.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Controls grouped by framework */}
          {Object.keys(grouped).length === 0 ? (
            <div className="bg-white rounded-xl border text-center py-12 text-gray-400 text-sm">
              No controls found.
            </div>
          ) : (
            Object.entries(grouped).map(([fw, controls]) => {
              const fwCfg = FRAMEWORK_CONFIG[fw] ?? { label: fw, color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' };
              return (
                <div key={fw} className="bg-white rounded-xl border overflow-hidden">
                  <div className={`px-4 py-3 ${fwCfg.bg} border-b flex items-center gap-2`}>
                    <span className={`text-sm font-semibold ${fwCfg.color}`}>{fwCfg.label}</span>
                    <span className={`text-xs ${fwCfg.color}`}>
                      ({controls.length} control{controls.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {controls.map((c: any) => {
                      const st       = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.NOT_ASSESSED;
                      const StatusIcon = st.icon;
                      return (
                        <div
                          key={c.id}
                          className="flex items-start gap-3 px-4 py-4 hover:bg-gray-50 group"
                        >
                          <span className="text-xs font-mono text-gray-500 w-20 flex-shrink-0 mt-0.5">
                            {c.controlCode}
                          </span>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {c.clauseTitle ?? c.title}
                            </p>
                            {c.description && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                {c.description}
                              </p>
                            )}
                            {c.evidence && (
                              <p className="text-xs text-green-600 mt-1 truncate">&#10003; {c.evidence}</p>
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
                </div>
              );
            })
          )}
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
