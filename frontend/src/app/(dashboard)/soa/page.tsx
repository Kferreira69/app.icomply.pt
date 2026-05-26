'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { soaApi } from '@/lib/api';
import {
  FileCheck2, ChevronDown, ChevronRight, X,
  CheckCircle, AlertCircle, Clock, MinusCircle, XCircle,
} from 'lucide-react';

// ── Types / Constants ─────────────────────────────────────────────

type Status = 'NOT_STARTED' | 'PLANNED' | 'PARTIALLY_IMPLEMENTED' | 'IMPLEMENTED' | 'NOT_APPLICABLE';

const STATUS_META: Record<Status, { label: string; color: string; ring: string; icon: any }> = {
  NOT_STARTED:            { label: 'Não Iniciado',    color: 'bg-gray-100 text-gray-600',    ring: 'ring-gray-300',  icon: Clock },
  PLANNED:                { label: 'Planeado',        color: 'bg-blue-100 text-blue-700',    ring: 'ring-blue-400',  icon: Clock },
  PARTIALLY_IMPLEMENTED:  { label: 'Parcial',         color: 'bg-yellow-100 text-yellow-700',ring: 'ring-yellow-400',icon: AlertCircle },
  IMPLEMENTED:            { label: 'Implementado',    color: 'bg-green-100 text-green-700',  ring: 'ring-green-500', icon: CheckCircle },
  NOT_APPLICABLE:         { label: 'N/A',             color: 'bg-red-50 text-red-500',       ring: 'ring-red-300',   icon: XCircle },
};

const THEMES = ['Organizational', 'People', 'Physical', 'Technological'];

const THEME_LABELS: Record<string, string> = {
  Organizational: 'A.5 — Organizacional',
  People:         'A.6 — Pessoas',
  Physical:       'A.7 — Físico',
  Technological:  'A.8 — Tecnológico',
};

const THEME_COUNTS: Record<string, number> = {
  Organizational: 37, People: 8, Physical: 14, Technological: 34,
};

// ── Score Ring ────────────────────────────────────────────────────

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = size * 0.38, cx = size / 2, cy = size / 2;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  const col = score >= 75 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={size * 0.09} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={size * 0.09}
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize={size * 0.18} fontWeight="bold" fill={col}>
        {score}%
      </text>
    </svg>
  );
}

// ── Mini progress bar ─────────────────────────────────────────────

function ThemeBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold w-8 text-right">{score}%</span>
    </div>
  );
}

// ── Edit Control Modal ────────────────────────────────────────────

function EditControlModal({ control, onClose }: { control: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    status: control.status as Status,
    applicable: control.applicable,
    justification: control.justification ?? '',
    implementationNotes: control.implementationNotes ?? '',
    owner: control.owner ?? '',
    targetDate: control.targetDate ? control.targetDate.slice(0, 10) : '',
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => soaApi.update(control.controlCode, {
      ...form,
      targetDate: form.targetDate ? new Date(form.targetDate).toISOString() : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['soa-controls'] });
      qc.invalidateQueries({ queryKey: ['soa-dashboard'] });
      onClose();
    },
  });

  const STATUSES: Status[] = ['NOT_STARTED', 'PLANNED', 'PARTIALLY_IMPLEMENTED', 'IMPLEMENTED', 'NOT_APPLICABLE'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <div>
            <p className="text-xs font-mono text-gray-400">{control.controlCode}</p>
            <h2 className="text-base font-bold text-gray-900 mt-0.5">{control.title}</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Description */}
          <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">{control.description}</p>

          {/* Applicable */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.applicable} onChange={e => {
                set('applicable', e.target.checked);
                if (!e.target.checked) set('status', 'NOT_APPLICABLE');
                else if (form.status === 'NOT_APPLICABLE') set('status', 'NOT_STARTED');
              }} className="w-4 h-4 rounded" />
              Controlo Aplicável
            </label>
          </div>

          {/* Status */}
          {form.applicable && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado de Implementação</label>
              <div className="grid grid-cols-2 gap-2">
                {STATUSES.filter(s => s !== 'NOT_APPLICABLE').map(s => {
                  const m = STATUS_META[s];
                  const Icon = m.icon;
                  return (
                    <button key={s} onClick={() => set('status', s)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left border-2 transition-all ${
                        form.status === s ? `${m.color} border-current ring-2 ${m.ring}` : 'border-gray-100 hover:border-gray-200'
                      }`}>
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Justification (when not applicable) */}
          {!form.applicable && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Justificação de Exclusão</label>
              <textarea value={form.justification} onChange={e => set('justification', e.target.value)} rows={3}
                placeholder="Justifique por que este controlo não é aplicável..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas de Implementação</label>
            <textarea value={form.implementationNotes} onChange={e => set('implementationNotes', e.target.value)} rows={3}
              placeholder="Descreva como este controlo está implementado..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
              <input value={form.owner} onChange={e => set('owner', e.target.value)}
                placeholder="Nome ou cargo"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Alvo</label>
              <input type="date" value={form.targetDate} onChange={e => set('targetDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {mutation.isPending ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Control Row ───────────────────────────────────────────────────

function ControlRow({ control, onEdit }: { control: any; onEdit: () => void }) {
  const m = STATUS_META[control.status as Status] ?? STATUS_META.NOT_STARTED;
  const Icon = m.icon;
  return (
    <tr className={`border-t border-gray-50 hover:bg-gray-50/60 cursor-pointer group transition-colors ${!control.applicable ? 'opacity-50' : ''}`}
      onClick={onEdit}>
      <td className="px-4 py-2.5">
        <span className="font-mono text-xs font-semibold text-blue-700">{control.controlCode}</span>
      </td>
      <td className="px-4 py-2.5">
        <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors">
          {control.title}
        </p>
        {control.owner && <p className="text-xs text-gray-400 mt-0.5">👤 {control.owner}</p>}
      </td>
      <td className="px-4 py-2.5">
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${m.color}`}>
          <Icon className="w-3 h-3" />
          {m.label}
        </span>
      </td>
      <td className="px-4 py-2.5">
        {!control.applicable ? (
          <span className="text-xs text-gray-400 italic">{control.justification || 'N/A'}</span>
        ) : control.implementationNotes ? (
          <p className="text-xs text-gray-500 truncate max-w-xs">{control.implementationNotes}</p>
        ) : null}
      </td>
      <td className="px-4 py-2.5 text-xs text-gray-400">
        {control.targetDate ? new Date(control.targetDate).toLocaleDateString('pt-PT') : '—'}
      </td>
    </tr>
  );
}

// ── Theme Section ─────────────────────────────────────────────────

function ThemeSection({ theme, controls, onEdit }: {
  theme: string; controls: any[]; onEdit: (c: any) => void;
}) {
  const [open, setOpen] = useState(true);
  const applicable = controls.filter(c => c.applicable);
  const implemented = applicable.filter(c => c.status === 'IMPLEMENTED').length;
  const partial     = applicable.filter(c => c.status === 'PARTIALLY_IMPLEMENTED').length;
  const score = applicable.length > 0 ? Math.round((implemented + partial * 0.5) / applicable.length * 100) : 0;
  const colScore = score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <span className="font-semibold text-gray-900">{THEME_LABELS[theme]}</span>
          <span className="text-xs text-gray-400">({controls.length} controlos)</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeBar score={score} color={colScore} />
          <div className="flex gap-1 text-xs">
            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">{implemented} impl.</span>
            {partial > 0 && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">{partial} parcial</span>}
          </div>
        </div>
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/70 border-t border-gray-100">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 w-20">Código</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Controlo</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 w-40">Estado</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Notas</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 w-28">Data Alvo</th>
              </tr>
            </thead>
            <tbody>
              {controls.map(c => (
                <ControlRow key={c.id} control={c} onEdit={() => onEdit(c)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────

export default function SoaPage() {
  const [activeTheme, setActiveTheme] = useState<string>('');
  const [editControl, setEditControl] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: dashboard } = useQuery({
    queryKey: ['soa-dashboard'],
    queryFn: () => soaApi.dashboard().then(r => r.data),
  });

  const { data: controls = [], isLoading } = useQuery({
    queryKey: ['soa-controls'],
    queryFn: () => soaApi.list().then(r => r.data),
  });

  // Group by theme
  const grouped = useMemo(() => {
    const filtered = statusFilter
      ? controls.filter((c: any) => c.status === statusFilter)
      : controls;
    return THEMES.reduce((acc, theme) => {
      acc[theme] = filtered.filter((c: any) => c.theme === theme);
      return acc;
    }, {} as Record<string, any[]>);
  }, [controls, statusFilter]);

  const d = dashboard ?? {
    score: 0, totalControls: 93, applicableControls: 0, notApplicable: 0,
    byStatus: {}, byTheme: [],
  };

  const themeScoreColor = (score: number) =>
    score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileCheck2 className="w-7 h-7 text-blue-600" />
            Statement of Applicability (SoA)
          </h1>
          <p className="text-gray-500 mt-1 text-sm">ISO 27001:2022 — 93 controlos em 4 temas</p>
        </div>
      </div>

      {/* Dashboard row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Score card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-5">
          <ScoreRing score={d.score} size={110} />
          <div>
            <p className="text-sm font-semibold text-gray-700">Score Global</p>
            <p className="text-xs text-gray-400 mt-1">{d.applicableControls} aplicáveis de {d.totalControls}</p>
            <p className="text-xs text-gray-400">{d.notApplicable} excluídos</p>
            <div className="mt-2 space-y-1">
              {Object.entries(d.byStatus as Record<string, number>).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-gray-500">{STATUS_META[k as Status]?.label ?? k}</span>
                  <span className="font-semibold">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* By theme */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Score por Tema</h2>
          <div className="space-y-4">
            {d.byTheme?.map((t: any) => (
              <div key={t.theme}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span className="font-medium">{THEME_LABELS[t.theme]}</span>
                  <span>{t.implemented} impl. · {t.partial} parcial · {t.total} total</span>
                </div>
                <ThemeBar score={t.score} color={themeScoreColor(t.score)} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100">
        <span className="text-sm font-medium text-gray-600 self-center">Filtrar:</span>
        {(['', ...Object.keys(STATUS_META)] as string[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              statusFilter === s
                ? 'bg-blue-600 text-white border-blue-600'
                : 'text-gray-600 border-gray-200 hover:border-gray-300'
            }`}>
            {s === '' ? 'Todos' : STATUS_META[s as Status]?.label}
          </button>
        ))}
      </div>

      {/* Controls by theme */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">A carregar controlos...</div>
      ) : (
        <div className="space-y-4">
          {THEMES.map(theme => (
            grouped[theme]?.length > 0 && (
              <ThemeSection
                key={theme}
                theme={theme}
                controls={grouped[theme]}
                onEdit={setEditControl}
              />
            )
          ))}
        </div>
      )}

      {/* Legal notice */}
      <div className="text-xs text-gray-400 text-center py-4 border-t border-gray-100">
        ISO/IEC 27001:2022 — Annex A Controls — Este documento é confidencial e sujeito a revisão periódica.
        Score = (Implementados + Parciais × 0,5) / Aplicáveis × 100
      </div>

      {/* Edit modal */}
      {editControl && (
        <EditControlModal control={editControl} onClose={() => setEditControl(null)} />
      )}
    </div>
  );
}
