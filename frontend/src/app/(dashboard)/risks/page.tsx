'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { risksApi } from '@/lib/api';
import {
  Plus, AlertTriangle, Loader2, Grid3X3, Pencil, Shield,
  CheckCircle2, History,
  ChevronUp, ChevronDown, ChevronsUpDown, FileQuestion,
} from 'lucide-react';
import { RiskTreatmentModal } from '@/components/risks/risk-treatment-modal';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { cn, getStatusColor, formatDate, cleanFormData } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { HelpButton } from '@/components/help/HelpButton';

// ── Types ──────────────────────────────────────────────────────
type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type RiskSortKey = 'title' | 'score' | 'status' | 'dueDate';
type SortDir = 'asc' | 'desc';

const RISK_LEVELS: RiskLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const LEVEL_STYLES: Record<RiskLevel, string> = {
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH:     'bg-orange-100 text-orange-800',
  MEDIUM:   'bg-yellow-100 text-yellow-800',
  LOW:      'bg-green-100 text-green-800',
};

function scoreToLevel(score: number): RiskLevel {
  if (score >= 20) return 'CRITICAL';
  if (score >= 12) return 'HIGH';
  if (score >= 6)  return 'MEDIUM';
  return 'LOW';
}

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

function RiskHeatmap({ data }: { data: any }) {
  const t = useTranslations('risks');

  if (!data) return null;
  const impacts = ['NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'CATASTROPHIC'];
  const likelihoods = ['ALMOST_CERTAIN', 'LIKELY', 'POSSIBLE', 'UNLIKELY', 'RARE'];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Grid3X3 className="w-5 h-5 text-gray-500" />
        {t('heatmap')}
      </h3>
      <div className="overflow-x-auto">
        <div className="min-w-[400px]">
          <div className="flex items-center mb-1">
            <div className="w-24 text-xs text-gray-400 text-right pr-2">{t('heatmapAxis')}</div>
            {impacts.map(i => (
              <div key={i} className="flex-1 text-center text-xs text-gray-500 font-medium px-1">
                {t(`impact_values.${i}`)?.slice(0, 3)}
              </div>
            ))}
          </div>
          {likelihoods.map((l, li) => (
            <div key={l} className="flex items-center mb-1">
              <div className="w-24 text-xs text-gray-500 text-right pr-2">{t(`likelihood_values.${l}`)?.slice(0, 6)}</div>
              {impacts.map((_, ii) => {
                const score = (5 - li) * (ii + 1);
                const count = data.matrix?.[5 - li]?.[ii + 1] || 0;
                const color = score >= 20 ? 'bg-red-500' : score >= 12 ? 'bg-orange-400' : score >= 6 ? 'bg-yellow-300' : 'bg-green-300';
                return (
                  <div key={ii} className={cn('flex-1 h-10 rounded m-0.5 flex items-center justify-center text-sm font-bold', color, count > 0 ? 'text-white shadow-inner' : 'opacity-30')}>
                    {count > 0 ? count : ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
        {([
          ['bg-green-300', t('level.LOW')],
          ['bg-yellow-300', t('level.MEDIUM')],
          ['bg-orange-400', t('level.HIGH')],
          ['bg-red-500', t('level.CRITICAL')],
        ] as [string, string][]).map(([c, l]) => (
          <div key={l} className="flex items-center gap-1"><div className={cn('w-3 h-3 rounded', c)} />{l}</div>
        ))}
      </div>
    </div>
  );
}

function NewRiskModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations('risks');
  const tCommon = useTranslations('common');
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
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
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('titleField')} *</label>
            <input {...register('title', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Risco de acesso não autorizado..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('category')}</label>
            <input {...register('category')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Segurança de Informação, Operacional..." />
          </div>
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

function EditRiskModal({ risk, onClose }: { risk: any; onClose: () => void }) {
  const t = useTranslations('risks');
  const tCommon = useTranslations('common');
  const qc = useQueryClient();
  const [tab, setTab] = useState<'risk' | 'treatment' | 'history'>('risk');

  const { data: historyData = [] } = useQuery({
    queryKey: ['risk-history', risk?.id],
    queryFn: () => risksApi.history(risk.id).then(r => r.data),
    enabled: !!risk?.id && tab === 'history',
  });

  const { register, handleSubmit } = useForm({
    defaultValues: {
      title: risk.title, category: risk.category || '',
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
            <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('titleField')} *</label>
                <input {...register('title', { required: true })} className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('category')}</label>
                  <input {...register('category')} className={inp} />
                </div>
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

export default function RisksPage() {
  const t = useTranslations('risks');
  const tCommon = useTranslations('common');
  const [showNew, setShowNew] = useState(false);
  const [editingRisk, setEditingRisk] = useState<any | null>(null);
  const [treatmentRisk, setTreatmentRisk] = useState<any | null>(null);
  const [view, setView] = useState<'list' | 'heatmap'>('list');
  const [levelFilter, setLevelFilter] = useState<RiskLevel | ''>('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showNoTreatmentOnly, setShowNoTreatmentOnly] = useState(false);
  const [sortKey, setSortKey] = useState<RiskSortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['risks'],
    queryFn: () => risksApi.list({ limit: 100 }).then(r => r.data),
  });

  const { data: heatmap } = useQuery({
    queryKey: ['risks', 'heatmap'],
    queryFn: () => risksApi.heatmap().then(r => r.data),
  });

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
  }, [allRisks, levelFilter, statusFilter, showNoTreatmentOnly, sortKey, sortDir]);

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

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggles */}
          {[
            { value: 'list', label: t('viewList') },
            { value: 'heatmap', label: t('viewHeatmap') },
          ].map(v => (
            <button
              key={v.value}
              onClick={() => setView(v.value as any)}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                view === v.value ? 'bg-primary text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50')}
            >
              {v.label}
            </button>
          ))}

          {/* Level filter */}
          <select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value as RiskLevel | '')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none bg-white"
          >
            <option value="">Todos os níveis</option>
            {RISK_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="">Todos os estados</option>
            {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* No treatment toggle */}
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
        </div>

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
            onClick={() => setLevelFilter(levelFilter === level ? '' : level)}
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

      {view === 'heatmap' && <RiskHeatmap data={heatmap} />}

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
                    <td className="px-4 py-3 text-xs text-gray-500">{r.category || '—'}</td>
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
              {(levelFilter || statusFilter || showNoTreatmentOnly) && (
                <button
                  onClick={() => { setLevelFilter(''); setStatusFilter(''); setShowNoTreatmentOnly(false); }}
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
  );
}
