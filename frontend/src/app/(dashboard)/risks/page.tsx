'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { risksApi, frameworksApi } from '@/lib/api';
import {
  Plus, AlertTriangle, Loader2, Grid3X3, Pencil, Shield,
  CheckCircle2, History,
  ChevronUp, ChevronDown, ChevronsUpDown, FileQuestion,
  LayoutGrid, ShieldCheck, Download,
} from 'lucide-react';
import { usePdfExport } from '@/hooks/usePdfExport';
import { RiskTreatmentModal } from '@/components/risks/risk-treatment-modal';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { cn, getStatusColor, formatDate, cleanFormData } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { HelpButton } from '@/components/help/HelpButton';
import { ModuleGuard } from '@/components/module-guard';

// ── Types ──────────────────────────────────────────────────────
type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type RiskSortKey = 'title' | 'score' | 'status' | 'dueDate';
type SortDir = 'asc' | 'desc';
type MainTab = 'list' | 'heatmap' | 'treatments';

const RISK_LEVELS: RiskLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const LEVEL_STYLES: Record<RiskLevel, string> = {
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH:     'bg-orange-100 text-orange-800',
  MEDIUM:   'bg-yellow-100 text-yellow-800',
  LOW:      'bg-green-100 text-green-800',
};

// ── Curated risk category list (GRC/compliance domains) ─────────
// category stays a free-text String? in the DB — this is a curated UI list,
// plus an "Outro" (custom) option so any value remains valid.
const RISK_CATEGORIES = [
  'Operacional',
  'Tecnológico / Cibersegurança',
  'Legal / Regulatório',
  'Financeiro',
  'Reputacional',
  'Estratégico',
  'Terceiros / Fornecedores',
  'Continuidade de Negócio',
  'Privacidade de Dados (GDPR)',
  'Recursos Humanos',
  'Conformidade',
  'Fraude',
  'Branqueamento de Capitais (AML/CFT)',
  'Segurança da Informação (ISO 27001)',
  'Resiliência Digital (DORA)',
  'Cibersegurança de Rede e Informação (NIS2)',
  'Ambiental, Social e Governação (ESG)',
  'Ética e Anticorrupção',
  'Saúde e Segurança no Trabalho',
  'Qualidade',
  'Propriedade Intelectual',
  'Contratual',
  'Tecnologia da Informação (TI/IT)',
  'Inteligência Artificial / Governação de IA',
  'Continuidade de TI / Recuperação de Desastre',
  'Fiscal / Tributário',
  'Governação Corporativa',
  'Cadeia de Abastecimento',
  'Físico / Instalações',
  'Outro',
] as const;

const CUSTOM_CATEGORY_VALUE = 'Outro';

// Resolve the <select> value + custom text for a given stored category.
// If the stored value isn't in the curated list, treat it as a custom "Outro" value
// so existing risks aren't silently discarded.
function resolveCategorySelection(category?: string | null): { select: string; custom: string } {
  if (!category) return { select: '', custom: '' };
  if ((RISK_CATEGORIES as readonly string[]).includes(category) && category !== CUSTOM_CATEGORY_VALUE) {
    return { select: category, custom: '' };
  }
  return { select: CUSTOM_CATEGORY_VALUE, custom: category };
}

// ── Category select + custom "Outro" input ───────────────────────
function CategoryField({
  label, selectValue, customValue, onSelectChange, onCustomChange, inputClassName,
}: {
  label: string;
  selectValue: string;
  customValue: string;
  onSelectChange: (v: string) => void;
  onCustomChange: (v: string) => void;
  inputClassName: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={selectValue}
        onChange={e => onSelectChange(e.target.value)}
        className={inputClassName}
      >
        <option value="">Selecionar categoria...</option>
        {RISK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      {selectValue === CUSTOM_CATEGORY_VALUE && (
        <input
          value={customValue}
          onChange={e => onCustomChange(e.target.value)}
          className={inputClassName + ' mt-2'}
          placeholder="Especifique a categoria..."
        />
      )}
    </div>
  );
}

// ── Frameworks multi-select (checkbox group, modeled on webhooks EVENT_GROUPS) ──
function FrameworkCheckboxGroup({
  selectedIds, onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const { data: frameworksData } = useQuery({
    queryKey: ['frameworks'],
    queryFn: () => frameworksApi.list().then(r => r.data),
  });
  const frameworks: any[] = frameworksData || [];

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  };

  if (frameworks.length === 0) return null;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Frameworks Associados</label>
      <div className="grid grid-cols-2 gap-1.5">
        {frameworks.map((fw: any) => (
          <label key={fw.id} className={cn('flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs border transition-colors',
            selectedIds.includes(fw.id) ? 'bg-primary/5 border-primary/30 text-primary' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300')}>
            <input type="checkbox" checked={selectedIds.includes(fw.id)} onChange={() => toggle(fw.id)} className="w-3 h-3" />
            {fw.name} <span className="opacity-60">({fw.code})</span>
          </label>
        ))}
      </div>
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {frameworks.filter((fw: any) => selectedIds.includes(fw.id)).map((fw: any) => (
            <span key={fw.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {fw.code}
              <button type="button" onClick={() => toggle(fw.id)} className="hover:text-red-600">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function scoreToLevel(score: number): RiskLevel {
  if (score >= 20) return 'CRITICAL';
  if (score >= 12) return 'HIGH';
  if (score >= 6)  return 'MEDIUM';
  return 'LOW';
}

// ── Helpers ────────────────────────────────────────────────────
const LIKELIHOOD_NUM: Record<string, number> = {
  RARE: 1, UNLIKELY: 2, POSSIBLE: 3, LIKELY: 4, ALMOST_CERTAIN: 5,
};
const IMPACT_NUM: Record<string, number> = {
  NEGLIGIBLE: 1, MINOR: 2, MODERATE: 3, MAJOR: 4, CATASTROPHIC: 5,
};

// ── Level badge ────────────────────────────────────────────────
function LevelBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-xs text-gray-400">—</span>;
  const level = scoreToLevel(score);
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold', LEVEL_STYLES[level])}>
      {level}
      <span className="opacity-60">({score})</span>
    </span>
  );
}

// ── Sort icon ──────────────────────────────────────────────────
function SortIcon({ col, sortKey, sortDir }: { col: RiskSortKey; sortKey: RiskSortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 text-gray-300 inline ml-1" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-primary inline ml-1" />
    : <ChevronDown className="w-3 h-3 text-primary inline ml-1" />;
}

// ── Heatmap cell score → color ─────────────────────────────────
function heatmapCellColor(score: number): string {
  if (score >= 20) return 'bg-red-500';
  if (score >= 15) return 'bg-orange-400';
  if (score >= 10) return 'bg-amber-400';
  if (score >= 5)  return 'bg-yellow-300';
  return 'bg-green-300';
}

// ── Treatment type badge ───────────────────────────────────────
const TREATMENT_TYPE_STYLES: Record<string, string> = {
  ACCEPT:   'bg-blue-100 text-blue-700',
  MITIGATE: 'bg-green-100 text-green-700',
  TRANSFER: 'bg-purple-100 text-purple-700',
  AVOID:    'bg-red-100 text-red-700',
};
const TREATMENT_TYPE_LABELS: Record<string, string> = {
  ACCEPT:   'Aceitar',
  MITIGATE: 'Mitigar',
  TRANSFER: 'Transferir',
  AVOID:    'Evitar',
};

const TREATMENT_STATUS_STYLES: Record<string, string> = {
  PLANNED:     'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED:   'bg-green-100 text-green-700',
};
const TREATMENT_STATUS_LABELS: Record<string, string> = {
  PLANNED:     'Planeado',
  IN_PROGRESS: 'Em Curso',
  COMPLETED:   'Concluído',
};

// ── Heatmap tab ────────────────────────────────────────────────
function HeatmapTab({ risks }: { risks: any[] }) {
  const [selectedCell, setSelectedCell] = useState<{ l: number; i: number } | null>(null);

  const LIKELIHOOD_LABELS_PT = ['Rara', 'Improvável', 'Possível', 'Provável', 'Quase Certa'];
  const IMPACT_LABELS_PT = ['Negligível', 'Menor', 'Moderado', 'Maior', 'Catastrófico'];

  // Build matrix: matrix[likelihood 1-5][impact 1-5] = risk[]
  const matrix = useMemo(() => {
    const m: Record<number, Record<number, any[]>> = {};
    for (let l = 1; l <= 5; l++) {
      m[l] = {};
      for (let i = 1; i <= 5; i++) m[l][i] = [];
    }
    risks.forEach(r => {
      const l = LIKELIHOOD_NUM[r.likelihood];
      const i = IMPACT_NUM[r.impact];
      if (l && i) m[l][i].push(r);
    });
    return m;
  }, [risks]);

  const selectedRisks = selectedCell
    ? (matrix[selectedCell.l]?.[selectedCell.i] ?? [])
    : [];

  // Rows top-to-bottom: likelihood 5 → 1
  const likelihoodRows = [5, 4, 3, 2, 1];
  const impactCols = [1, 2, 3, 4, 5];

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
        {([
          ['bg-green-300', 'Baixo (1-4)'],
          ['bg-yellow-300', 'Médio (5-9)'],
          ['bg-amber-400', 'Médio-Alto (10-14)'],
          ['bg-orange-400', 'Alto (15-19)'],
          ['bg-red-500', 'Crítico (20-25)'],
        ] as [string, string][]).map(([c, l]) => (
          <div key={l} className="flex items-center gap-1.5">
            <div className={cn('w-3 h-3 rounded', c)} />
            {l}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        {/* Matrix */}
        <div className="overflow-x-auto">
          <div className="min-w-[520px]">
            {/* Header row: Impact labels */}
            <div className="flex items-end mb-1">
              <div className="w-28 flex-shrink-0" />
              {impactCols.map((i) => (
                <div key={i} className="flex-1 text-center text-xs font-semibold text-gray-500 pb-1 px-1">
                  {IMPACT_LABELS_PT[i - 1]}
                </div>
              ))}
            </div>
            {/* Axis label */}
            <div className="flex items-center mb-0.5">
              <div className="w-28 flex-shrink-0 text-xs text-gray-400 text-right pr-2 italic">
                Prob. ↓ / Impacto →
              </div>
              {impactCols.map(i => (
                <div key={i} className="flex-1 text-center text-xs text-gray-400 font-medium">{i}</div>
              ))}
            </div>

            {likelihoodRows.map((l) => (
              <div key={l} className="flex items-center mb-1">
                <div className="w-28 flex-shrink-0 text-right pr-2">
                  <span className="text-xs font-medium text-gray-600">{LIKELIHOOD_LABELS_PT[l - 1]}</span>
                  <span className="text-xs text-gray-400 ml-1">({l})</span>
                </div>
                {impactCols.map((i) => {
                  const score = l * i;
                  const cellRisks = matrix[l][i] ?? [];
                  const count = cellRisks.length;
                  const isSelected = selectedCell?.l === l && selectedCell?.i === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedCell(isSelected ? null : { l, i })}
                      className={cn(
                        'flex-1 h-12 rounded-lg m-0.5 flex flex-col items-center justify-center transition-all',
                        heatmapCellColor(score),
                        count > 0 ? 'cursor-pointer shadow-sm hover:scale-105 hover:shadow-md' : 'opacity-40 cursor-default',
                        isSelected && 'ring-2 ring-offset-1 ring-gray-800 scale-105',
                      )}
                    >
                      {count > 0 && (
                        <>
                          <span className="text-sm font-bold text-white drop-shadow">{count}</span>
                          <span className="text-xs text-white/80 leading-none">{score}</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Selected cell detail */}
        {selectedCell && selectedRisks.length > 0 && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Riscos em Probabilidade {selectedCell.l} × Impacto {selectedCell.i} (score {selectedCell.l * selectedCell.i})
            </p>
            <div className="space-y-2">
              {selectedRisks.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.title}</p>
                    {r.category && <p className="text-xs text-gray-400">{r.category}</p>}
                  </div>
                  <LevelBadge score={r.inherentScore} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Treatment edit modal ───────────────────────────────────────
function TreatmentEditModal({ risk, onClose }: { risk: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      treatmentType:   risk.treatmentType   || 'MITIGATE',
      treatmentStatus: risk.treatmentStatus || 'PLANNED',
      treatmentPlan:   risk.treatmentPlan   || '',
      residualScore:   risk.residualScore   || '',
      treatmentOwner:  risk.treatmentOwner  || '',
      treatmentDueDate: risk.treatmentDueDate ? risk.treatmentDueDate.split('T')[0] : '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: any) => risksApi.updateTreatment(risk.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risks'] }); onClose(); },
  });

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Editar Tratamento</h3>
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{risk.title}</p>
        </div>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
            <strong>Score inerente:</strong> {risk.inherentScore ?? '—'}
            {risk.residualScore && <> → <strong>Score residual atual:</strong> {risk.residualScore}</>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Tratamento</label>
              <select {...register('treatmentType')} className={inp}>
                <option value="MITIGATE">Mitigar</option>
                <option value="ACCEPT">Aceitar</option>
                <option value="TRANSFER">Transferir</option>
                <option value="AVOID">Evitar</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
              <select {...register('treatmentStatus')} className={inp}>
                <option value="PLANNED">Planeado</option>
                <option value="IN_PROGRESS">Em Curso</option>
                <option value="COMPLETED">Concluído</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Score Residual (1-25)</label>
              <input type="number" min={1} max={25} {...register('residualScore')} className={inp} placeholder="após controlos" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prazo</label>
              <input type="date" {...register('treatmentDueDate')} className={inp} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Plano de Tratamento</label>
            <textarea {...register('treatmentPlan')} rows={4} className={inp + ' resize-none'} placeholder="Descreva as ações concretas para tratar este risco..." />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <CheckCircle2 className="w-4 h-4" />
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Treatments tab ─────────────────────────────────────────────
function TreatmentsTab({ risks }: { risks: any[] }) {
  const [editingTreatment, setEditingTreatment] = useState<any | null>(null);

  const treatmentRisks = useMemo(
    () => risks.filter(r => r.treatmentType),
    [risks],
  );

  const kpiCounts = useMemo(() => ({
    ACCEPT:   treatmentRisks.filter(r => r.treatmentType === 'ACCEPT').length,
    MITIGATE: treatmentRisks.filter(r => r.treatmentType === 'MITIGATE').length,
    TRANSFER: treatmentRisks.filter(r => r.treatmentType === 'TRANSFER').length,
    AVOID:    treatmentRisks.filter(r => r.treatmentType === 'AVOID').length,
  }), [treatmentRisks]);

  const KPI_CARDS = [
    { key: 'MITIGATE', label: 'Mitigar',    color: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
    { key: 'ACCEPT',   label: 'Aceitar',    color: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
    { key: 'TRANSFER', label: 'Transferir', color: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    { key: 'AVOID',    label: 'Evitar',     color: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {KPI_CARDS.map(({ key, label, color, text, border }) => (
          <div key={key} className={cn('rounded-xl border p-4', color, border)}>
            <p className={cn('text-xs uppercase font-semibold tracking-wide mb-1', text)}>{label}</p>
            <p className={cn('text-3xl font-bold', text)}>{kpiCounts[key]}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Risco</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Score Residual</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Prazo</th>
              <th className="px-4 py-3 w-16" />
            </tr>
          </thead>
          <tbody>
            {treatmentRisks.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum risco com tratamento definido</p>
                  <p className="text-xs mt-1 text-gray-300">Use o botão "Tratar" na lista de riscos para adicionar planos</p>
                </td>
              </tr>
            ) : (
              treatmentRisks.map((r: any) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{r.title}</p>
                    {r.category && <p className="text-xs text-gray-400">{r.category}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {r.treatmentType ? (
                      <span className={cn('text-xs px-2 py-1 rounded-full font-medium', TREATMENT_TYPE_STYLES[r.treatmentType] ?? 'bg-gray-100 text-gray-600')}>
                        {TREATMENT_TYPE_LABELS[r.treatmentType] ?? r.treatmentType}
                      </span>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.treatmentStatus ? (
                      <span className={cn('text-xs px-2 py-1 rounded-full font-medium', TREATMENT_STATUS_STYLES[r.treatmentStatus] ?? 'bg-gray-100 text-gray-600')}>
                        {TREATMENT_STATUS_LABELS[r.treatmentStatus] ?? r.treatmentStatus}
                      </span>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.residualScore != null ? (
                      <LevelBadge score={r.residualScore} />
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {r.treatmentDueDate ? formatDate(r.treatmentDueDate) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditingTreatment(r)}
                      className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-100 transition-colors"
                      title="Editar tratamento"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {treatmentRisks.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            {treatmentRisks.length} risco{treatmentRisks.length !== 1 ? 's' : ''} com tratamento
          </div>
        )}
      </div>

      {editingTreatment && (
        <TreatmentEditModal risk={editingTreatment} onClose={() => setEditingTreatment(null)} />
      )}
    </div>
  );
}

// ── NewRiskModal ───────────────────────────────────────────────
function NewRiskModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations('risks');
  const tCommon = useTranslations('common');
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const [categorySelect, setCategorySelect] = useState('');
  const [categoryCustom, setCategoryCustom] = useState('');
  const [frameworkIds, setFrameworkIds] = useState<string[]>([]);
  const createMutation = useMutation({
    mutationFn: (data: any) => risksApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risks'] }); onClose(); },
  });

  const LIKELIHOOD_LABELS: Record<string, string> = {
    RARE: t('likelihood_values.RARE'),
    UNLIKELY: t('likelihood_values.UNLIKELY'),
    POSSIBLE: t('likelihood_values.POSSIBLE'),
    LIKELY: t('likelihood_values.LIKELY'),
    ALMOST_CERTAIN: t('likelihood_values.ALMOST_CERTAIN'),
  };
  const IMPACT_LABELS: Record<string, string> = {
    NEGLIGIBLE: t('impact_values.NEGLIGIBLE'),
    MINOR: t('impact_values.MINOR'),
    MODERATE: t('impact_values.MODERATE'),
    MAJOR: t('impact_values.MAJOR'),
    CATASTROPHIC: t('impact_values.CATASTROPHIC'),
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{t('registerRisk')}</h3>
        <form onSubmit={handleSubmit(d => createMutation.mutate({
          ...d,
          category: categorySelect === CUSTOM_CATEGORY_VALUE ? categoryCustom : categorySelect,
          frameworkIds,
        }))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('titleField')} *</label>
            <input {...register('title', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Risco de acesso não autorizado..." />
          </div>
          <CategoryField
            label={t('category')}
            selectValue={categorySelect}
            customValue={categoryCustom}
            onSelectChange={setCategorySelect}
            onCustomChange={setCategoryCustom}
            inputClassName="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
          />
          <FrameworkCheckboxGroup selectedIds={frameworkIds} onChange={setFrameworkIds} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tCommon('description')}</label>
            <textarea {...register('description')} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('likelihood')} *</label>
              <select {...register('likelihood', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                {Object.entries(LIKELIHOOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('impact')} *</label>
              <select {...register('impact', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                {Object.entries(IMPACT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('mitigationPlan')}</label>
            <textarea {...register('mitigationPlan')} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">{tCommon('cancel')}</button>
            <button type="submit" disabled={createMutation.isPending} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('registerRisk')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── EditRiskModal ──────────────────────────────────────────────
function EditRiskModal({ risk, onClose }: { risk: any; onClose: () => void }) {
  const t = useTranslations('risks');
  const tCommon = useTranslations('common');
  const qc = useQueryClient();
  const [tab, setTab] = useState<'risk' | 'treatment' | 'history'>('risk');
  const initialCategory = resolveCategorySelection(risk.category);
  const [categorySelect, setCategorySelect] = useState(initialCategory.select);
  const [categoryCustom, setCategoryCustom] = useState(initialCategory.custom);
  const [frameworkIds, setFrameworkIds] = useState<string[]>(
    (risk.frameworks || []).map((rf: any) => rf.frameworkId || rf.framework?.id).filter(Boolean),
  );

  const { data: historyData = [] } = useQuery({
    queryKey: ['risk-history', risk?.id],
    queryFn: () => risksApi.history(risk.id).then(r => r.data),
    enabled: !!risk?.id && tab === 'history',
  });

  const { register, handleSubmit } = useForm({
    defaultValues: {
      title: risk.title,
      description: risk.description || '', likelihood: risk.likelihood,
      impact: risk.impact, mitigationPlan: risk.mitigationPlan || '', status: risk.status,
    },
  });
  const { register: regTreatment, handleSubmit: handleTreatment } = useForm({
    defaultValues: {
      treatmentType:   risk.treatmentType   || 'MITIGATE',
      treatmentPlan:   risk.treatmentPlan   || '',
      treatmentStatus: risk.treatmentStatus || 'PLANNED',
      residualScore:   risk.residualScore   || '',
      riskAppetite:    risk.riskAppetite    || '',
      treatmentDueDate: risk.treatmentDueDate ? risk.treatmentDueDate.split('T')[0] : '',
    },
  });

  const LIKELIHOOD_LABELS: Record<string, string> = {
    RARE: t('likelihood_values.RARE'), UNLIKELY: t('likelihood_values.UNLIKELY'),
    POSSIBLE: t('likelihood_values.POSSIBLE'), LIKELY: t('likelihood_values.LIKELY'),
    ALMOST_CERTAIN: t('likelihood_values.ALMOST_CERTAIN'),
  };
  const IMPACT_LABELS: Record<string, string> = {
    NEGLIGIBLE: t('impact_values.NEGLIGIBLE'), MINOR: t('impact_values.MINOR'),
    MODERATE: t('impact_values.MODERATE'), MAJOR: t('impact_values.MAJOR'),
    CATASTROPHIC: t('impact_values.CATASTROPHIC'),
  };

  const updateMutation = useMutation({
    mutationFn: (data: any) => risksApi.update(risk.id, cleanFormData(data)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risks'] }); onClose(); },
  });
  const treatmentMutation = useMutation({
    mutationFn: (data: any) => risksApi.updateTreatment(risk.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risks'] }); onClose(); },
  });

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="px-6 pt-5 pb-0">
          <h3 className="text-lg font-bold text-gray-900 mb-3">{t('editRisk')}</h3>
          <div className="flex gap-1 border-b border-gray-100">
            {[
                      { key: 'risk',      label: 'Risco',              icon: AlertTriangle },
              { key: 'treatment', label: 'Plano de Tratamento', icon: Shield },
              { key: 'history',   label: 'Histórico',           icon: History },
            ].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key as any)}
                className={cn('flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors',
                  tab === key ? 'border-primary text-primary font-medium' : 'border-transparent text-gray-500 hover:text-gray-700')}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 pt-4">
          {tab === 'risk' && (
            <form onSubmit={handleSubmit(d => updateMutation.mutate({
              ...d,
              category: categorySelect === CUSTOM_CATEGORY_VALUE ? categoryCustom : categorySelect,
              frameworkIds,
            }))} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('titleField')} *</label>
                <input {...register('title', { required: true })} className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <CategoryField
                  label={t('category')}
                  selectValue={categorySelect}
                  customValue={categoryCustom}
                  onSelectChange={setCategorySelect}
                  onCustomChange={setCategoryCustom}
                  inputClassName={inp}
                />
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{tCommon('status')}</label>
                  <select {...register('status')} className={inp}>
                    {(['IDENTIFIED','ASSESSED','MITIGATED','ACCEPTED','CLOSED'] as const).map(s => (
                      <option key={s} value={s}>{t(`status.${s}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('likelihood')}</label>
                  <select {...register('likelihood')} className={inp}>
                    {Object.entries(LIKELIHOOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('impact')}</label>
                  <select {...register('impact')} className={inp}>
                    {Object.entries(IMPACT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <FrameworkCheckboxGroup selectedIds={frameworkIds} onChange={setFrameworkIds} />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{tCommon('description')}</label>
                <textarea {...register('description')} rows={2} className={inp + ' resize-none'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('mitigationPlan')}</label>
                <textarea {...register('mitigationPlan')} rows={2} className={inp + ' resize-none'} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50">{tCommon('cancel')}</button>
                <button type="submit" disabled={updateMutation.isPending} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}{tCommon('save')}
                </button>
              </div>
            </form>
          )}

          {tab === 'treatment' && (
            <form onSubmit={handleTreatment(d => treatmentMutation.mutate(d))} className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                <strong>Score inerente:</strong> {risk.inherentScore ?? '—'} ({risk.riskLevel ?? 'N/A'})
                {risk.residualScore && <> → <strong>Score residual:</strong> {risk.residualScore}</>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Tratamento</label>
                  <select {...regTreatment('treatmentType')} className={inp}>
                    <option value="MITIGATE">Mitigar</option>
                    <option value="ACCEPT">Aceitar</option>
                    <option value="TRANSFER">Transferir</option>
                    <option value="AVOID">Evitar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Estado do Tratamento</label>
                  <select {...regTreatment('treatmentStatus')} className={inp}>
                    <option value="PLANNED">Planeado</option>
                    <option value="IN_PROGRESS">Em Curso</option>
                    <option value="COMPLETED">Concluído</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Score Residual (1-25)</label>
                  <input type="number" min={1} max={25} {...regTreatment('residualScore')} className={inp} placeholder="após controlos" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Prazo de Tratamento</label>
                  <input type="date" {...regTreatment('treatmentDueDate')} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Apetite de Risco</label>
                  <select {...regTreatment('riskAppetite')} className={inp}>
                    <option value="">Selecionar...</option>
                    <option value="BELOW">Abaixo do Apetite</option>
                    <option value="AT">Dentro do Apetite</option>
                    <option value="ABOVE">Acima do Apetite</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plano de Tratamento Detalhado</label>
                <textarea {...regTreatment('treatmentPlan')} rows={4} placeholder="Descreva as ações concretas para tratar este risco..." className={inp + ' resize-none'} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50">{tCommon('cancel')}</button>
                <button type="submit" disabled={treatmentMutation.isPending} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
                  {treatmentMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <CheckCircle2 className="w-4 h-4" /> Guardar Plano
                </button>
              </div>
            </form>
          )}

          {/* History tab */}
          {tab === 'history' && (
            <div className="space-y-4">
              {(historyData as any[]).length === 0 ? (
                <div className="flex flex-col items-center py-8 text-gray-400">
                  <History className="w-8 h-8 mb-2" />
                  <p className="text-sm">Sem histórico disponível</p>
                  <p className="text-xs mt-1">O histórico começa a ser registado a partir da próxima atualização</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                    Evolução do score de risco ao longo do tempo
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={(historyData as any[]).map((h: any) => ({ date: new Date(h.capturedAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }), inerente: h.inherentScore, residual: h.residualScore }))}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 25]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <ReferenceLine y={20} stroke="#dc2626" strokeDasharray="3 3" label={{ value: 'Crítico', fontSize: 9 }} />
                      <ReferenceLine y={12} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Alto', fontSize: 9 }} />
                      <Line type="monotone" dataKey="inerente" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} name="Score Inerente" />
                      <Line type="monotone" dataKey="residual" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Score Residual" strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="space-y-1">
                    {(historyData as any[]).slice().reverse().slice(0, 5).map((h: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 text-xs text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-50">
                        <span className="text-gray-400 w-20 flex-shrink-0">{new Date(h.capturedAt).toLocaleDateString('pt-PT')}</span>
                        <span>Score: <strong>{h.inherentScore}</strong></span>
                        {h.residualScore && <span>Residual: <strong className="text-green-600">{h.residualScore}</strong></span>}
                        <span className={cn('text-xs px-1.5 py-0.5 rounded-full', h.status === 'CLOSED' ? 'bg-gray-100' : h.status === 'MITIGATED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>{h.status}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function RisksPage() {
  const t = useTranslations('risks');
  const tCommon = useTranslations('common');
  const [showNew, setShowNew] = useState(false);
  const [editingRisk, setEditingRisk] = useState<any | null>(null);
  const [treatmentRisk, setTreatmentRisk] = useState<any | null>(null);
  const [view, setView] = useState<MainTab>('list');
  const [levelFilter, setLevelFilter] = useState<RiskLevel | ''>('');
  const [statusFilter, setStatusFilter] = useState('');
  const [frameworkFilter, setFrameworkFilter] = useState('');
  const [showNoTreatmentOnly, setShowNoTreatmentOnly] = useState(false);
  const [sortKey, setSortKey] = useState<RiskSortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const { exportRisks } = usePdfExport();

  const { data, isLoading } = useQuery({
    queryKey: ['risks'],
    queryFn: () => risksApi.list({ limit: 100 }).then(r => r.data),
  });

  const { data: heatmap } = useQuery({
    queryKey: ['risks', 'heatmap'],
    queryFn: () => risksApi.heatmap().then(r => r.data),
  });

  const { data: frameworksData } = useQuery({
    queryKey: ['frameworks'],
    queryFn: () => frameworksApi.list().then(r => r.data),
  });
  const allFrameworks: any[] = frameworksData || [];

  const allRisks: any[] = data?.data || [];
  const summary = heatmap?.summary || {};

  // Collect unique statuses from data
  const uniqueStatuses = useMemo(() => {
    const set = new Set<string>(allRisks.map((r: any) => r.status).filter(Boolean));
    return Array.from(set);
  }, [allRisks]);

  const LIKELIHOOD_LABELS: Record<string, string> = {
    RARE: t('likelihood_values.RARE'),
    UNLIKELY: t('likelihood_values.UNLIKELY'),
    POSSIBLE: t('likelihood_values.POSSIBLE'),
    LIKELY: t('likelihood_values.LIKELY'),
    ALMOST_CERTAIN: t('likelihood_values.ALMOST_CERTAIN'),
  };
  const IMPACT_LABELS: Record<string, string> = {
    NEGLIGIBLE: t('impact_values.NEGLIGIBLE'),
    MINOR: t('impact_values.MINOR'),
    MODERATE: t('impact_values.MODERATE'),
    MAJOR: t('impact_values.MAJOR'),
    CATASTROPHIC: t('impact_values.CATASTROPHIC'),
  };

  // ── Client-side filter + sort ──────────────────────────────
  const risks = useMemo(() => {
    let list = [...allRisks];

    if (levelFilter) {
      list = list.filter((r: any) => scoreToLevel(r.inherentScore) === levelFilter);
    }
    if (statusFilter) {
      list = list.filter((r: any) => r.status === statusFilter);
    }
    if (showNoTreatmentOnly) {
      list = list.filter((r: any) => !r.treatmentPlan || r.treatmentPlan.trim() === '');
    }
    if (frameworkFilter) {
      list = list.filter((r: any) =>
        (r.frameworks || []).some((rf: any) => (rf.frameworkId || rf.framework?.id) === frameworkFilter),
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'title') {
        cmp = (a.title || '').localeCompare(b.title || '');
      } else if (sortKey === 'score') {
        cmp = (a.inherentScore ?? 0) - (b.inherentScore ?? 0);
      } else if (sortKey === 'status') {
        cmp = (a.status || '').localeCompare(b.status || '');
      } else if (sortKey === 'dueDate') {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        cmp = da - db;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [allRisks, levelFilter, statusFilter, frameworkFilter, showNoTreatmentOnly, sortKey, sortDir]);

  const noTreatmentCount = useMemo(
    () => allRisks.filter((r: any) => !r.treatmentPlan || r.treatmentPlan.trim() === '').length,
    [allRisks],
  );

  function handleSort(key: RiskSortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'score' ? 'desc' : 'asc');
    }
  }

  const LEVEL_CARD_STYLES: Record<RiskLevel, string> = {
    CRITICAL: 'border-red-500 bg-red-50 text-red-700',
    HIGH:     'border-orange-500 bg-orange-50 text-orange-700',
    MEDIUM:   'border-yellow-500 bg-yellow-50 text-yellow-700',
    LOW:      'border-green-500 bg-green-50 text-green-700',
  };

  const VIEW_TABS = [
    { value: 'list' as MainTab,       label: t('viewList'),        icon: Grid3X3 },
    { value: 'heatmap' as MainTab,    label: 'Heatmap',            icon: LayoutGrid },
    { value: 'treatments' as MainTab, label: 'Tratamentos',        icon: ShieldCheck },
  ];

  return (
    <ModuleGuard moduleKey="risks">
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* View tab toggles */}
          {VIEW_TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setView(value)}
              className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                view === value ? 'bg-primary text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50')}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}

          {/* Level filter — only relevant in list view */}
          {view === 'list' && (
            <>
              <select
                value={levelFilter}
                onChange={e => setLevelFilter(e.target.value as RiskLevel | '')}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none bg-white"
              >
                <option value="">Todos os níveis</option>
                {RISK_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">Todos os estados</option>
                {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {allFrameworks.length > 0 && (
                <select
                  value={frameworkFilter}
                  onChange={e => setFrameworkFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none bg-white"
                >
                  <option value="">Todos os frameworks</option>
                  {allFrameworks.map((fw: any) => <option key={fw.id} value={fw.id}>{fw.name}</option>)}
                </select>
              )}

              <button
                onClick={() => setShowNoTreatmentOnly(v => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                  showNoTreatmentOnly
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50',
                )}
              >
                <FileQuestion className="w-3.5 h-3.5" />
                Sem tratamento
                {noTreatmentCount > 0 && (
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full font-semibold',
                    showNoTreatmentOnly ? 'bg-amber-200 text-amber-800' : 'bg-amber-100 text-amber-700',
                  )}>
                    {noTreatmentCount}
                  </span>
                )}
              </button>
            </>
          )}
        </div>

        <button onClick={() => exportRisks(risks)} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 bg-white transition-colors">
          <Download className="w-4 h-4" />PDF
        </button>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> {t('registerRisk')}
        </button>
      </div>

      {/* Summary cards — clickable level filters */}
      <div className="grid grid-cols-4 gap-4">
        {([
          { level: 'CRITICAL' as RiskLevel, count: summary.critical ?? 0 },
          { level: 'HIGH'     as RiskLevel, count: summary.high     ?? 0 },
          { level: 'MEDIUM'   as RiskLevel, count: summary.medium   ?? 0 },
          { level: 'LOW'      as RiskLevel, count: summary.low      ?? 0 },
        ]).map(({ level, count }) => (
          <button
            key={level}
            onClick={() => {
              setLevelFilter(levelFilter === level ? '' : level);
              setView('list');
            }}
            className={cn(
              'bg-white rounded-xl border-2 shadow-sm p-4 text-center transition-all hover:shadow-md',
              LEVEL_CARD_STYLES[level],
              levelFilter === level && 'ring-2 ring-offset-1 ring-current',
            )}
          >
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-sm font-medium">{t(`level.${level}`)}</p>
          </button>
        ))}
      </div>

      {/* ── Heatmap tab ── */}
      {view === 'heatmap' && <HeatmapTab risks={allRisks} />}

      {/* ── Treatments tab ── */}
      {view === 'treatments' && <TreatmentsTab risks={allRisks} />}

      {/* ── List tab ── */}
      {view === 'list' && (
        isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {/* Sortable: Risk name */}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    <button onClick={() => handleSort('title')} className="flex items-center gap-1 hover:text-gray-700 transition-colors">
                      {t('colRisk')}
                      <SortIcon col="title" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('colCategory')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('colLikelihood')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('colImpact')}</th>
                  {/* Sortable: Level/score */}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    <button onClick={() => handleSort('score')} className="flex items-center gap-1 hover:text-gray-700 transition-colors">
                      {t('colLevel')}
                      <SortIcon col="score" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                  {/* Sortable: Status */}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    <button onClick={() => handleSort('status')} className="flex items-center gap-1 hover:text-gray-700 transition-colors">
                      {t('colStatus')}
                      <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                  {/* Sortable: Due date */}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    <button onClick={() => handleSort('dueDate')} className="flex items-center gap-1 hover:text-gray-700 transition-colors">
                      {t('colDueDate')}
                      <SortIcon col="dueDate" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-3 w-28" />
                </tr>
              </thead>
              <tbody>
                {risks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">{t('noRisks')}</p>
                    </td>
                  </tr>
                ) : risks.map((r: any) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{r.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{r.description}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {r.category || '—'}
                      {(r.frameworks || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {r.frameworks.map((rf: any) => (
                            <span key={rf.id || rf.frameworkId} className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                              {rf.framework?.code || rf.framework?.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{LIKELIHOOD_LABELS[r.likelihood]}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{IMPACT_LABELS[r.impact]}</td>
                    <td className="px-4 py-3">
                      <LevelBadge score={r.inherentScore} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-1 rounded-full', getStatusColor(r.status))}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(r.dueDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setTreatmentRisk(r)}
                          title="Adicionar tratamento"
                          className={cn(
                            'flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors font-medium',
                            r.treatmentPlan
                              ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                              : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
                          )}
                        >
                          <Shield className="w-3 h-3" />
                          {r.treatmentPlan ? 'Rever' : 'Tratar'}
                        </button>
                        <button onClick={() => setEditingRisk(r)} className="p-1 text-gray-300 hover:text-primary rounded transition-colors" title={tCommon('edit') as string}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
              {risks.length} risco{risks.length !== 1 ? 's' : ''} encontrado{risks.length !== 1 ? 's' : ''}
              {(levelFilter || statusFilter || frameworkFilter || showNoTreatmentOnly) && (
                <button
                  onClick={() => { setLevelFilter(''); setStatusFilter(''); setFrameworkFilter(''); setShowNoTreatmentOnly(false); }}
                  className="ml-2 text-primary hover:underline"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>
        )
      )}

      {showNew && <NewRiskModal onClose={() => setShowNew(false)} />}
      {editingRisk && <EditRiskModal risk={editingRisk} onClose={() => setEditingRisk(null)} />}
      {treatmentRisk && (
        <RiskTreatmentModal
          risk={treatmentRisk}
          onClose={() => setTreatmentRisk(null)}
        />
      )}
      <HelpButton page="risks" />
    </div>
    </ModuleGuard>
  );
}
