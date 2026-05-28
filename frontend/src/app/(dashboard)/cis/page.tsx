'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cisApi } from '@/lib/api';
import {
  Shield, CheckCircle2, XCircle, AlertCircle, MinusCircle, Pencil, X, ChevronDown, ChevronRight,
} from 'lucide-react';

// ── Status config ─────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  IMPLEMENTED:     { label: 'Implemented',     color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200', icon: CheckCircle2 },
  PARTIAL:         { label: 'Partial',         color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-200', icon: AlertCircle },
  NOT_IMPLEMENTED: { label: 'Not Implemented', color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200',   icon: XCircle },
  NOT_APPLICABLE:  { label: 'N/A',             color: 'text-gray-500',   bg: 'bg-gray-50',    border: 'border-gray-200',  icon: MinusCircle },
};

// ── IG badge config ───────────────────────────────────────────

const IG_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  IG1: { label: 'IG1', color: 'text-green-700',  bg: 'bg-green-100' },
  IG2: { label: 'IG2', color: 'text-blue-700',   bg: 'bg-blue-100' },
  IG3: { label: 'IG3', color: 'text-purple-700', bg: 'bg-purple-100' },
};

// ── Security function badge config ────────────────────────────

const SEC_FN_CONFIG: Record<string, { color: string; bg: string }> = {
  Identify: { color: 'text-blue-700',   bg: 'bg-blue-100' },
  Protect:  { color: 'text-green-700',  bg: 'bg-green-100' },
  Detect:   { color: 'text-yellow-700', bg: 'bg-yellow-100' },
  Respond:  { color: 'text-orange-700', bg: 'bg-orange-100' },
  Recover:  { color: 'text-purple-700', bg: 'bg-purple-100' },
};

// ── Edit Modal ────────────────────────────────────────────────

function EditModal({
  control,
  onClose,
  onSave,
  isSaving,
}: {
  control: any;
  onClose: () => void;
  onSave: (d: any) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState({
    status: control.status ?? 'NOT_IMPLEMENTED',
    evidence: control.evidence ?? '',
    notes: control.notes ?? '',
  });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const igCfg = IG_CONFIG[control.implementationGroup] ?? { label: control.implementationGroup, color: 'text-gray-600', bg: 'bg-gray-100' };
  const secFnCfg = SEC_FN_CONFIG[control.securityFunction] ?? { color: 'text-gray-600', bg: 'bg-gray-100' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b flex items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-mono font-semibold text-gray-500">{control.controlId}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${igCfg.bg} ${igCfg.color}`}>
                {igCfg.label}
              </span>
              {control.securityFunction && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${secFnCfg.bg} ${secFnCfg.color}`}>
                  {control.securityFunction}
                </span>
              )}
            </div>
            <h2 className="text-sm font-semibold text-gray-900 leading-snug">{control.title}</h2>
            {control.assetType && (
              <p className="text-xs text-gray-400 mt-0.5">Asset type: {control.assetType}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded flex-shrink-0"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {control.description && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 leading-relaxed">
              {control.description}
            </p>
          )}

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => {
                const Icon = v.icon;
                const isSelected = form.status === k;
                return (
                  <button
                    key={k}
                    onClick={() => s('status', k)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? `${v.bg} ${v.border} ${v.color} font-semibold`
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? v.color : 'text-gray-400'}`} />
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Evidence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Evidence</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Link to evidence, document reference, or description..."
              value={form.evidence}
              onChange={e => s('evidence', e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Implementation notes, gaps, or action items..."
              value={form.notes}
              onChange={e => s('notes', e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t flex justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ status: form.status, evidence: form.evidence || null, notes: form.notes || null })}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Control Row ───────────────────────────────────────────────

function ControlRow({ c, onEdit }: { c: any; onEdit: (c: any) => void }) {
  const st = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.NOT_IMPLEMENTED;
  const StatusIcon = st.icon;
  const igCfg = IG_CONFIG[c.implementationGroup] ?? { label: c.implementationGroup ?? '—', color: 'text-gray-600', bg: 'bg-gray-100' };
  const secFnCfg = SEC_FN_CONFIG[c.securityFunction] ?? { color: 'text-gray-600', bg: 'bg-gray-100' };

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 group border-b border-gray-100 last:border-0">
      {/* Control ID */}
      <span className="text-xs font-mono text-gray-500 w-16 flex-shrink-0 pt-0.5">{c.controlId}</span>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
        {c.description && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{c.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {c.implementationGroup && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${igCfg.bg} ${igCfg.color}`}>
              {igCfg.label}
            </span>
          )}
          {c.securityFunction && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${secFnCfg.bg} ${secFnCfg.color}`}>
              {c.securityFunction}
            </span>
          )}
          {c.assetType && (
            <span className="text-xs text-gray-400">{c.assetType}</span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${st.bg} ${st.color}`}>
        <StatusIcon className="w-3 h-3" />
        {st.label}
      </span>

      {/* Edit button */}
      <button
        onClick={() => onEdit(c)}
        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded text-gray-400 flex-shrink-0 transition-opacity"
        title="Edit control"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── IG Section (collapsible) ──────────────────────────────────

function IGSection({
  ig,
  label,
  description,
  controls,
  accentClass,
  onEdit,
  defaultOpen,
}: {
  ig: string;
  label: string;
  description: string;
  controls: any[];
  accentClass: string;
  onEdit: (c: any) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const implemented = controls.filter(c => c.status === 'IMPLEMENTED').length;
  const partial = controls.filter(c => c.status === 'PARTIAL').length;
  const total = controls.length;
  const score = total > 0 ? Math.round(((implemented + partial * 0.5) / total) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <button
        className={`w-full flex items-center justify-between px-4 py-3 ${accentClass} hover:opacity-90 transition-opacity`}
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <div className="text-left">
            <span className="text-sm font-semibold">{ig} — {label}</span>
            <span className="text-xs ml-2 opacity-70">{description}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="opacity-70">{controls.length} controls</span>
          <span className="font-semibold">{score}% complete</span>
        </div>
      </button>

      {open && (
        <div>
          {controls.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No controls in this group.</p>
          ) : (
            controls.map((c: any) => (
              <ControlRow key={c.id ?? c.controlId} c={c} onEdit={onEdit} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Score Bar ─────────────────────────────────────────────────

function ScoreBar({ score, implemented, partial, notImplemented, notApplicable, total }: {
  score: number;
  implemented: number;
  partial: number;
  notImplemented: number;
  notApplicable: number;
  total: number;
}) {
  const pctImplemented = total > 0 ? (implemented / total) * 100 : 0;
  const pctPartial = total > 0 ? (partial / total) * 100 : 0;
  const pctNot = total > 0 ? (notImplemented / total) * 100 : 0;
  const pctNA = total > 0 ? (notApplicable / total) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">Overall Score</span>
        <span className="text-2xl font-bold text-blue-600">{score}%</span>
      </div>
      <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden flex">
        {pctImplemented > 0 && (
          <div className="h-full bg-green-500 transition-all" style={{ width: `${pctImplemented}%` }} title={`Implemented: ${implemented}`} />
        )}
        {pctPartial > 0 && (
          <div className="h-full bg-yellow-400 transition-all" style={{ width: `${pctPartial}%` }} title={`Partial: ${partial}`} />
        )}
        {pctNot > 0 && (
          <div className="h-full bg-red-400 transition-all" style={{ width: `${pctNot}%` }} title={`Not Implemented: ${notImplemented}`} />
        )}
        {pctNA > 0 && (
          <div className="h-full bg-gray-300 transition-all" style={{ width: `${pctNA}%` }} title={`N/A: ${notApplicable}`} />
        )}
      </div>
      <div className="flex items-center gap-4 mt-2.5 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
          Implemented ({implemented})
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
          Partial ({partial})
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
          Not Implemented ({notImplemented})
        </div>
        {notApplicable > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />
            N/A ({notApplicable})
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function CisPage() {
  const qc = useQueryClient();
  const [editControl, setEditControl] = useState<any>(null);

  const { data: dashboard, isLoading, isError } = useQuery({
    queryKey: ['cis-dashboard'],
    queryFn: () => cisApi.dashboard().then(r => r.data),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => cisApi.updateControl(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cis-dashboard'] });
      setEditControl(null);
    },
  });

  const controls: any[] = dashboard?.controls ?? [];

  const ig1Controls = controls.filter(c => c.implementationGroup === 'IG1');
  const ig2Controls = controls.filter(c => c.implementationGroup === 'IG2');
  const ig3Controls = controls.filter(c => c.implementationGroup === 'IG3');

  const totalControls = dashboard?.total ?? controls.length;
  const implemented = dashboard?.byStatus?.IMPLEMENTED ?? controls.filter(c => c.status === 'IMPLEMENTED').length;
  const partial = dashboard?.byStatus?.PARTIAL ?? controls.filter(c => c.status === 'PARTIAL').length;
  const notImplemented = dashboard?.byStatus?.NOT_IMPLEMENTED ?? controls.filter(c => c.status === 'NOT_IMPLEMENTED').length;
  const notApplicable = dashboard?.byStatus?.NOT_APPLICABLE ?? controls.filter(c => c.status === 'NOT_APPLICABLE').length;
  const score = dashboard?.score ?? (totalControls > 0 ? Math.round(((implemented + partial * 0.5) / totalControls) * 100) : 0);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CIS Controls v8</h1>
          <p className="text-sm text-gray-500">18 Controls, 3 Implementation Groups</p>
        </div>
      </div>

      {/* Loading / error */}
      {isLoading && (
        <div className="text-center py-16 text-gray-400">Loading CIS Controls…</div>
      )}
      {isError && (
        <div className="text-center py-16 text-red-400">Failed to load CIS Controls data.</div>
      )}

      {!isLoading && !isError && dashboard && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Total Controls</div>
              <div className="text-3xl font-bold text-blue-700">{totalControls}</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Implemented</div>
              <div className="text-3xl font-bold text-green-700">{implemented}</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4">
              <div className="text-xs font-medium text-yellow-600 uppercase tracking-wide mb-1">Partial</div>
              <div className="text-3xl font-bold text-yellow-700">{partial}</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <div className="text-xs font-medium text-red-600 uppercase tracking-wide mb-1">Not Implemented</div>
              <div className="text-3xl font-bold text-red-700">{notImplemented}</div>
            </div>
          </div>

          {/* Score bar */}
          <ScoreBar
            score={score}
            implemented={implemented}
            partial={partial}
            notImplemented={notImplemented}
            notApplicable={notApplicable}
            total={totalControls}
          />

          {/* IG Sections */}
          <IGSection
            ig="IG1"
            label="Basic Cyber Hygiene"
            description="Essential cyber hygiene for all organisations"
            controls={ig1Controls}
            accentClass="bg-green-50 text-green-800 border-b border-green-100"
            onEdit={setEditControl}
            defaultOpen={true}
          />
          <IGSection
            ig="IG2"
            label="Advanced"
            description="Organisations handling sensitive data or facing higher risk"
            controls={ig2Controls}
            accentClass="bg-blue-50 text-blue-800 border-b border-blue-100"
            onEdit={setEditControl}
            defaultOpen={false}
          />
          <IGSection
            ig="IG3"
            label="Expert"
            description="Organisations exposed to sophisticated adversaries"
            controls={ig3Controls}
            accentClass="bg-purple-50 text-purple-800 border-b border-purple-100"
            onEdit={setEditControl}
            defaultOpen={false}
          />
        </>
      )}

      {/* Edit Modal */}
      {editControl && (
        <EditModal
          control={editControl}
          onClose={() => setEditControl(null)}
          onSave={data => updateMut.mutate({ id: editControl.id, data })}
          isSaving={updateMut.isPending}
        />
      )}
    </div>
  );
}
