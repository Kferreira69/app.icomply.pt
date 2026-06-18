'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cisApi } from '@/lib/api';
import {
  Shield, CheckCircle2, XCircle, AlertCircle, MinusCircle, Pencil, X,
  ChevronDown, ChevronRight, ListChecks, PieChart, Clock, AlertTriangle,
} from 'lucide-react';

// ── Status config ─────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  IMPLEMENTED:     { label: 'Implemented',     color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200', icon: CheckCircle2 },
  PARTIAL:         { label: 'Partial',         color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-200', icon: AlertCircle },
  NOT_IMPLEMENTED: { label: 'Not Implemented', color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200',   icon: XCircle },
  NOT_APPLICABLE:  { label: 'N/A',             color: 'text-gray-500',   bg: 'bg-gray-50',    border: 'border-gray-200',  icon: MinusCircle },
};

// Workflow statuses for the Implementação tab
const IMPL_STATUS_CONFIG: Record<string, { label: string; ptLabel: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  NOT_IMPLEMENTED: { label: 'Not Implemented', ptLabel: 'Por Fazer',    color: 'text-gray-600',  bg: 'bg-gray-100',   border: 'border-gray-200',  icon: MinusCircle },
  PARTIAL:         { label: 'Partial',         ptLabel: 'Em Curso',     color: 'text-blue-700',  bg: 'bg-blue-100',   border: 'border-blue-200',  icon: Clock },
  IMPLEMENTED:     { label: 'Implemented',     ptLabel: 'Implementado', color: 'text-green-700', bg: 'bg-green-100',  border: 'border-green-200', icon: CheckCircle2 },
  NOT_APPLICABLE:  { label: 'N/A',             ptLabel: 'N/A',          color: 'text-gray-400',  bg: 'bg-gray-50',    border: 'border-gray-200',  icon: MinusCircle },
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

// ── Helpers ───────────────────────────────────────────────────

function isOverdue(c: any): boolean {
  if (!c.targetDate) return false;
  if (c.status === 'IMPLEMENTED') return false;
  return new Date(c.targetDate) < new Date();
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Edit Modal (overview tab) ─────────────────────────────────

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
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded flex-shrink-0">
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
            Cancelar
          </button>
          <button
            onClick={() => onSave({ status: form.status, evidence: form.evidence || null, notes: form.notes || null })}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'A guardar…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Implementation Modal ──────────────────────────────────────

function ImplementationModal({
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
    status:       control.status      ?? 'NOT_IMPLEMENTED',
    assignedTo:   control.assignedTo  ?? '',
    targetDate:   control.targetDate  ? control.targetDate.slice(0, 10) : '',
    notes:        control.notes       ?? '',
    evidence:     control.evidence    ?? '',
  });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const igCfg = IG_CONFIG[control.implementationGroup] ?? { label: control.implementationGroup, color: 'text-gray-600', bg: 'bg-gray-100' };
  const overdue = isOverdue({ ...control, status: form.status, targetDate: form.targetDate || control.targetDate });

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
              {overdue && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                  Atrasado
                </span>
              )}
            </div>
            <h2 className="text-sm font-semibold text-gray-900 leading-snug">{control.title}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded flex-shrink-0">
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

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(IMPL_STATUS_CONFIG).map(([k, v]) => {
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
                    {v.ptLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Responsável */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nome do responsável..."
              value={form.assignedTo}
              onChange={e => s('assignedTo', e.target.value)}
            />
          </div>

          {/* Data Alvo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Alvo</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={form.targetDate}
              onChange={e => s('targetDate', e.target.value)}
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Notas de implementação, lacunas ou próximas ações..."
              value={form.notes}
              onChange={e => s('notes', e.target.value)}
            />
          </div>

          {/* Evidência */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Evidência</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder="Link para evidência, referência de documento..."
              value={form.evidence}
              onChange={e => s('evidence', e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t flex justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave({
              status:     form.status,
              notes:      form.notes || null,
              evidence:   form.evidence || null,
              targetDate: form.targetDate ? new Date(form.targetDate).toISOString() : null,
            })}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'A guardar…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Control Row (overview tab) ────────────────────────────────

function ControlRow({ c, onEdit }: { c: any; onEdit: (c: any) => void }) {
  const st = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.NOT_IMPLEMENTED;
  const StatusIcon = st.icon;
  const igCfg = IG_CONFIG[c.implementationGroup] ?? { label: c.implementationGroup ?? '—', color: 'text-gray-600', bg: 'bg-gray-100' };
  const secFnCfg = SEC_FN_CONFIG[c.securityFunction] ?? { color: 'text-gray-600', bg: 'bg-gray-100' };

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 group border-b border-gray-100 last:border-0">
      <span className="text-xs font-mono text-gray-500 w-16 flex-shrink-0 pt-0.5">{c.controlId}</span>
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
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${st.bg} ${st.color}`}>
        <StatusIcon className="w-3 h-3" />
        {st.label}
      </span>
      <button
        onClick={() => onEdit(c)}
        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded text-gray-400 flex-shrink-0 transition-opacity"
        title="Editar controlo"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── IG Section (collapsible) ──────────────────────────────────

function IGSection({
  ig, label, description, controls, accentClass, onEdit, defaultOpen,
}: {
  ig: string; label: string; description: string; controls: any[];
  accentClass: string; onEdit: (c: any) => void; defaultOpen: boolean;
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
          <span className="opacity-70">{controls.length} controlos</span>
          <span className="font-semibold">{score}% completo</span>
        </div>
      </button>
      {open && (
        <div>
          {controls.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sem controlos neste grupo.</p>
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
  score: number; implemented: number; partial: number;
  notImplemented: number; notApplicable: number; total: number;
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

// ── Implementation Row ────────────────────────────────────────

function ImplRow({ c, onEdit }: { c: any; onEdit: (c: any) => void }) {
  const st = IMPL_STATUS_CONFIG[c.status] ?? IMPL_STATUS_CONFIG.NOT_IMPLEMENTED;
  const StatusIcon = st.icon;
  const igCfg = IG_CONFIG[c.implementationGroup] ?? { label: c.implementationGroup ?? '—', color: 'text-gray-600', bg: 'bg-gray-100' };
  const overdue = isOverdue(c);

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group border-b border-gray-100 last:border-0">
      {/* Control ID */}
      <span className="text-xs font-mono text-gray-500 w-16 flex-shrink-0">{c.controlId}</span>

      {/* Title + IG */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${igCfg.bg} ${igCfg.color}`}>
            {igCfg.label}
          </span>
          {overdue && (
            <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded font-medium bg-red-100 text-red-700">
              <AlertTriangle className="w-3 h-3" />
              Atrasado
            </span>
          )}
        </div>
      </div>

      {/* Responsible */}
      <span className="text-xs text-gray-500 w-28 flex-shrink-0 truncate hidden md:block">
        {c.assignedTo || '—'}
      </span>

      {/* Target date */}
      <span className={`text-xs w-24 flex-shrink-0 hidden lg:block ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
        {fmtDate(c.targetDate)}
      </span>

      {/* Status badge */}
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${st.bg} ${st.color}`}>
        <StatusIcon className="w-3 h-3" />
        {st.ptLabel}
      </span>

      {/* Edit */}
      <button
        onClick={() => onEdit(c)}
        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded text-gray-400 flex-shrink-0 transition-opacity"
        title="Editar implementação"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Implementação Tab ─────────────────────────────────────────

const IMPL_FILTERS = [
  { key: 'ALL',             label: 'Todos' },
  { key: 'NOT_IMPLEMENTED', label: 'Por Fazer' },
  { key: 'PARTIAL',         label: 'Em Curso' },
  { key: 'IMPLEMENTED',     label: 'Implementado' },
  { key: 'NOT_APPLICABLE',  label: 'N/A' },
  { key: 'OVERDUE',         label: 'Atrasados' },
] as const;

function ImplTab({
  controls,
  onEdit,
}: {
  controls: any[];
  onEdit: (c: any) => void;
}) {
  const [filter, setFilter] = useState<string>('ALL');

  const notIniciados  = controls.filter(c => c.status === 'NOT_IMPLEMENTED').length;
  const emCurso       = controls.filter(c => c.status === 'PARTIAL').length;
  const implementados = controls.filter(c => c.status === 'IMPLEMENTED').length;
  const na            = controls.filter(c => c.status === 'NOT_APPLICABLE').length;
  const atrasados     = controls.filter(c => isOverdue(c)).length;

  const filtered = useMemo(() => {
    if (filter === 'ALL')     return controls;
    if (filter === 'OVERDUE') return controls.filter(c => isOverdue(c));
    return controls.filter(c => c.status === filter);
  }, [controls, filter]);

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Não Iniciados</div>
          <div className="text-2xl font-bold text-gray-700">{notIniciados}</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Em Curso</div>
          <div className="text-2xl font-bold text-blue-700">{emCurso}</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <div className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Implementados</div>
          <div className="text-2xl font-bold text-green-700">{implementados}</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4">
          <div className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">N/A</div>
          <div className="text-2xl font-bold text-purple-700">{na}</div>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <div className="text-xs font-medium text-red-600 uppercase tracking-wide mb-1">Atrasados</div>
          <div className="text-2xl font-bold text-red-700">{atrasados}</div>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {IMPL_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
            {f.key === 'OVERDUE' && atrasados > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                filter === f.key ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
              }`}>
                {atrasados}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wide">
          <span className="w-16 flex-shrink-0">ID</span>
          <span className="flex-1">Controlo</span>
          <span className="w-28 flex-shrink-0 hidden md:block">Responsável</span>
          <span className="w-24 flex-shrink-0 hidden lg:block">Data Alvo</span>
          <span className="w-28 flex-shrink-0">Estado</span>
          <span className="w-8 flex-shrink-0" />
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">Sem controlos neste filtro.</p>
        ) : (
          filtered.map((c: any) => (
            <ImplRow key={c.id ?? c.controlId} c={c} onEdit={onEdit} />
          ))
        )}
      </div>
    </div>
  );
}

// ── IG Analysis Tab ───────────────────────────────────────────

function IGBar({ label, implemented, total, color }: {
  label: string; implemented: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.round((implemented / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-gray-600 w-8 flex-shrink-0">{label}</span>
      <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-16 text-right flex-shrink-0">
        {implemented}/{total} ({pct}%)
      </span>
    </div>
  );
}

function IGAnalysisTab({ controls }: { controls: any[] }) {
  const ig1 = controls.filter(c => c.implementationGroup === 'IG1');
  const ig2 = controls.filter(c => c.implementationGroup === 'IG2');
  const ig3 = controls.filter(c => c.implementationGroup === 'IG3');

  const igStats = (arr: any[]) => {
    const applicable = arr.filter(c => c.status !== 'NOT_APPLICABLE');
    const implemented = applicable.filter(c => c.status === 'IMPLEMENTED').length;
    const partial = applicable.filter(c => c.status === 'PARTIAL').length;
    const pct = applicable.length > 0
      ? Math.round(((implemented + partial * 0.5) / applicable.length) * 100)
      : 0;
    return { total: applicable.length, implemented: implemented + partial, partial, pct };
  };

  const s1 = igStats(ig1);
  const s2 = igStats(ig2);
  const s3 = igStats(ig3);

  const IG_CARDS = [
    {
      ig: 'IG1',
      label: 'Higiene Básica',
      desc: 'Controlos essenciais para todas as organizações. Devem atingir 100%.',
      stats: s1,
      colorCard: 'bg-green-50 border-green-200',
      colorTitle: 'text-green-800',
      colorBadge: 'bg-green-100 text-green-700',
      colorBar: 'bg-green-500',
      alert: s1.pct < 100,
    },
    {
      ig: 'IG2',
      label: 'Avançado',
      desc: 'Para organizações que lidam com dados sensíveis ou enfrentam riscos elevados.',
      stats: s2,
      colorCard: 'bg-blue-50 border-blue-200',
      colorTitle: 'text-blue-800',
      colorBadge: 'bg-blue-100 text-blue-700',
      colorBar: 'bg-blue-500',
      alert: false,
    },
    {
      ig: 'IG3',
      label: 'Especializado',
      desc: 'Para organizações expostas a adversários sofisticados.',
      stats: s3,
      colorCard: 'bg-purple-50 border-purple-200',
      colorTitle: 'text-purple-800',
      colorBadge: 'bg-purple-100 text-purple-700',
      colorBar: 'bg-purple-500',
      alert: false,
    },
  ];

  return (
    <div className="space-y-5">
      {/* IG cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {IG_CARDS.map(({ ig, label, desc, stats, colorCard, colorTitle, colorBadge, colorBar, alert }) => (
          <div key={ig} className={`rounded-xl border p-5 ${colorCard}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className={`text-base font-bold ${colorTitle}`}>{ig}</span>
                <span className={`ml-2 text-xs font-medium ${colorTitle} opacity-70`}>{label}</span>
              </div>
              <span className={`text-xl font-bold px-2 py-0.5 rounded-lg ${colorBadge}`}>
                {stats.pct}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">{desc}</p>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <IGBar
                label="Total"
                implemented={stats.implemented}
                total={stats.total}
                color={colorBar}
              />
            </div>

            {/* IG1 alert */}
            {alert && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                IG1 deve atingir 100% — {stats.total - stats.implemented} controlo(s) pendente(s)
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Detailed breakdown table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">Detalhe por Grupo de Implementação</h3>
        </div>
        <div className="p-5 space-y-5">
          {IG_CARDS.map(({ ig, label, stats, colorBar }) => (
            <div key={ig}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{ig} — {label}</span>
                <span className="text-xs text-gray-500">{stats.implemented} / {stats.total} controlos</span>
              </div>
              <div className="w-full h-4 rounded-full bg-gray-100 overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all ${colorBar}`}
                  style={{ width: `${stats.pct}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white mix-blend-difference">
                  {stats.pct}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status breakdown per IG */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">Distribuição de Status por IG</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Grupo</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Por Fazer</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Em Curso</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Implementado</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">N/A</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { ig: 'IG1', controls: ig1 },
                { ig: 'IG2', controls: ig2 },
                { ig: 'IG3', controls: ig3 },
              ].map(({ ig, controls: arr }) => {
                const notImpl  = arr.filter(c => c.status === 'NOT_IMPLEMENTED').length;
                const partial  = arr.filter(c => c.status === 'PARTIAL').length;
                const impl     = arr.filter(c => c.status === 'IMPLEMENTED').length;
                const na       = arr.filter(c => c.status === 'NOT_APPLICABLE').length;
                return (
                  <tr key={ig} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${IG_CONFIG[ig]?.bg} ${IG_CONFIG[ig]?.color}`}>
                        {ig}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-xs font-medium text-gray-600">{notImpl}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-xs font-medium text-blue-600">{partial}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-xs font-medium text-green-600">{impl}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-xs font-medium text-gray-400">{na}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-xs font-semibold text-gray-700">{arr.length}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tabs config ───────────────────────────────────────────────

const TABS = [
  { key: 'overview',        label: 'Visão Geral',  icon: Shield },
  { key: 'implementacao',   label: 'Implementação', icon: ListChecks },
  { key: 'analise-ig',      label: 'Análise IG',    icon: PieChart },
] as const;

type TabKey = typeof TABS[number]['key'];

// ── Page ──────────────────────────────────────────────────────

export default function CisPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [editControl, setEditControl] = useState<any>(null);
  const [implEditControl, setImplEditControl] = useState<any>(null);

  const { data: dashboard, isLoading, isError } = useQuery({
    queryKey: ['cis-dashboard'],
    queryFn: () => cisApi.dashboard().then(r => r.data),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => cisApi.updateControl(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cis-dashboard'] });
      setEditControl(null);
      setImplEditControl(null);
    },
  });

  // Normalise backend shape — backend returns byGroup.IG1.controls etc.
  const controls: any[] = useMemo(() => {
    if (!dashboard) return [];
    if (dashboard.controls) return dashboard.controls;
    if (dashboard.byGroup) {
      return [
        ...(dashboard.byGroup.IG1?.controls ?? []),
        ...(dashboard.byGroup.IG2?.controls ?? []),
        ...(dashboard.byGroup.IG3?.controls ?? []),
      ];
    }
    return [];
  }, [dashboard]);

  const ig1Controls = controls.filter(c => c.implementationGroup === 'IG1');
  const ig2Controls = controls.filter(c => c.implementationGroup === 'IG2');
  const ig3Controls = controls.filter(c => c.implementationGroup === 'IG3');

  const totalControls = controls.length;
  const implemented   = controls.filter(c => c.status === 'IMPLEMENTED').length;
  const partial       = controls.filter(c => c.status === 'PARTIAL').length;
  const notImplemented = controls.filter(c => c.status === 'NOT_IMPLEMENTED').length;
  const notApplicable = controls.filter(c => c.status === 'NOT_APPLICABLE').length;
  const score = totalControls > 0
    ? Math.round(((implemented + partial * 0.5) / totalControls) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CIS Controls v8</h1>
          <p className="text-sm text-gray-500">18 Controlos, 3 Grupos de Implementação</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading / error */}
      {isLoading && (
        <div className="text-center py-16 text-gray-400">A carregar CIS Controls…</div>
      )}
      {isError && (
        <div className="text-center py-16 text-red-400">Falha ao carregar dados CIS Controls.</div>
      )}

      {!isLoading && !isError && dashboard && (
        <>
          {/* ── Visão Geral ── */}
          {activeTab === 'overview' && (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Total Controlos</div>
                  <div className="text-3xl font-bold text-blue-700">{totalControls}</div>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Implementados</div>
                  <div className="text-3xl font-bold text-green-700">{implemented}</div>
                </div>
                <div className="bg-yellow-50 rounded-xl p-4">
                  <div className="text-xs font-medium text-yellow-600 uppercase tracking-wide mb-1">Parcial</div>
                  <div className="text-3xl font-bold text-yellow-700">{partial}</div>
                </div>
                <div className="bg-red-50 rounded-xl p-4">
                  <div className="text-xs font-medium text-red-600 uppercase tracking-wide mb-1">Não Implementados</div>
                  <div className="text-3xl font-bold text-red-700">{notImplemented}</div>
                </div>
              </div>

              <ScoreBar
                score={score}
                implemented={implemented}
                partial={partial}
                notImplemented={notImplemented}
                notApplicable={notApplicable}
                total={totalControls}
              />

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

          {/* ── Implementação ── */}
          {activeTab === 'implementacao' && (
            <ImplTab controls={controls} onEdit={setImplEditControl} />
          )}

          {/* ── Análise IG ── */}
          {activeTab === 'analise-ig' && (
            <IGAnalysisTab controls={controls} />
          )}
        </>
      )}

      {/* Overview Edit Modal */}
      {editControl && (
        <EditModal
          control={editControl}
          onClose={() => setEditControl(null)}
          onSave={data => updateMut.mutate({ id: editControl.id, data })}
          isSaving={updateMut.isPending}
        />
      )}

      {/* Implementation Edit Modal */}
      {implEditControl && (
        <ImplementationModal
          control={implEditControl}
          onClose={() => setImplEditControl(null)}
          onSave={data => updateMut.mutate({ id: implEditControl.id, data })}
          isSaving={updateMut.isPending}
        />
      )}
    </div>
  );
}
