'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nis2Api, nis2IncidentsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Network, CheckCircle2, XCircle, AlertCircle,
  Circle, MinusCircle, ChevronDown, ChevronRight, Pencil, X,
  Timer, Clock, CheckCheck, Hourglass, ChevronUp, AlertTriangle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ModuleGuard } from '@/components/module-guard';

// ── Edit Measure Modal ────────────────────────────────────────
function EditMeasureModal({
  measure,
  onClose,
  onSave,
}: { measure: any; onClose: () => void; onSave: (data: any) => void }) {
  const t = useTranslations('nis2');
  const tCommon = useTranslations('common');

  const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
    NOT_ASSESSED:   { icon: Circle,       color: 'text-gray-400',   bg: 'bg-gray-50',   label: t('status.NOT_ASSESSED') },
    NON_COMPLIANT:  { icon: XCircle,      color: 'text-red-600',    bg: 'bg-red-50',    label: t('status.NON_COMPLIANT') },
    PARTIAL:        { icon: AlertCircle,  color: 'text-orange-500', bg: 'bg-orange-50', label: t('status.PARTIAL') },
    COMPLIANT:      { icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50',  label: t('status.COMPLIANT') },
    NOT_APPLICABLE: { icon: MinusCircle,  color: 'text-gray-300',   bg: 'bg-gray-50',   label: t('status.NOT_APPLICABLE') },
  };

  const [form, setForm] = useState({
    status: measure.status,
    evidence: measure.evidence ?? '',
    notes: measure.notes ?? '',
    targetDate: measure.targetDate ? measure.targetDate.slice(0, 10) : '',
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-5 border-b flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-mono text-gray-400">{measure.measureCode}</span>
            <h2 className="text-base font-semibold text-gray-900 mt-0.5">{measure.title}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {measure.description && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">{measure.description}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('conformityStatus')}</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => {
                const Icon = v.icon;
                return (
                  <button
                    key={k}
                    onClick={() => set('status', k)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                      form.status === k
                        ? `${v.bg} border-current font-medium ${v.color}`
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${form.status === k ? v.color : 'text-gray-400'}`} />
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('evidenceLabel')}</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              rows={3}
              value={form.evidence}
              onChange={e => set('evidence', e.target.value)}
              placeholder={t('evidencePlaceholder') as string}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('notesLabel')}</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder={t('notesPlaceholder') as string}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('targetDateLabel')}</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2 text-sm"
              value={form.targetDate}
              onChange={e => set('targetDate', e.target.value)}
            />
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>{tCommon('cancel')}</Button>
          <Button onClick={() => {
            const d: any = { status: form.status };
            if (form.evidence) d.evidence = form.evidence;
            if (form.notes) d.notes = form.notes;
            if (form.targetDate) d.targetDate = form.targetDate;
            onSave(d);
          }}>
            {tCommon('save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Score Ring ────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';

  return (
    <svg width="110" height="110" viewBox="0 0 110 110">
      <circle cx="55" cy="55" r={r} stroke="#e5e7eb" strokeWidth="10" fill="none" />
      <circle
        cx="55" cy="55" r={r}
        stroke={color} strokeWidth="10" fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
      />
      <text x="55" y="55" textAnchor="middle" dominantBaseline="middle">
        <tspan x="55" dy="-5" fontSize="22" fontWeight="bold" fill={color}>{score}%</tspan>
        <tspan x="55" dy="17" fontSize="9" fill="#6b7280">NIS2</tspan>
      </text>
    </svg>
  );
}

// ── Category Group ────────────────────────────────────────────
function CategoryGroup({
  category,
  measures,
  onEdit,
  categoryLabel,
  categoryColor,
  statusConfig,
  measureCountLabel,
  compliantCountLabel,
  targetPrefix,
  evidencePrefix,
}: {
  category: string;
  measures: any[];
  onEdit: (m: any) => void;
  categoryLabel: string;
  categoryColor: string;
  statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }>;
  measureCountLabel: string;
  compliantCountLabel: string;
  targetPrefix: string;
  evidencePrefix: string;
}) {
  const [open, setOpen] = useState(true);
  const compliant = measures.filter(m => m.status === 'COMPLIANT').length;
  const total = measures.filter(m => m.status !== 'NOT_APPLICABLE').length;

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColor}`}>{categoryLabel}</span>
        <span className="text-sm text-gray-600 flex-1 text-left">{measureCountLabel}</span>
        <span className="text-xs text-gray-500">{compliantCountLabel}</span>
        {/* Mini progress */}
        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden ml-2">
          <div
            className="h-full bg-green-500 rounded-full"
            style={{ width: total > 0 ? `${(compliant / total) * 100}%` : '0%' }}
          />
        </div>
      </button>

      {open && (
        <div className="divide-y">
          {measures.map(m => {
            const s = statusConfig[m.status] ?? statusConfig.NOT_ASSESSED;
            const Icon = s.icon;
            return (
              <div key={m.measureCode} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${s.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-gray-400">{m.measureCode}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${s.bg} ${s.color}`}>{s.label}</span>
                    {m.targetDate && (
                      <span className="text-xs text-gray-400">
                        {targetPrefix} {new Date(m.targetDate).toLocaleDateString('pt-PT')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 mt-0.5">{m.title}</p>
                  {m.evidence && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{evidencePrefix} {m.evidence}</p>
                  )}
                  {m.notes && (
                    <p className="text-xs text-gray-400 mt-0.5 italic truncate">{m.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => onEdit(m)}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition-colors shrink-0"
                  title="Avaliar"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  RISK_MANAGEMENT:   'bg-blue-100 text-blue-800',
  INCIDENT_RESPONSE: 'bg-red-100 text-red-800',
  SUPPLY_CHAIN:      'bg-purple-100 text-purple-800',
  BCP:               'bg-green-100 text-green-800',
  CRYPTOGRAPHY:      'bg-indigo-100 text-indigo-800',
  HR_SECURITY:       'bg-yellow-100 text-yellow-800',
  ACCESS_CONTROL:    'bg-orange-100 text-orange-800',
  VULNERABILITY:     'bg-pink-100 text-pink-800',
};

// ── Deadline Countdown helpers ────────────────────────────────
function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function DeadlineBadge({ detectionDate, now }: { detectionDate: string; now: number }) {
  const deadline72h = new Date(detectionDate).getTime() + 72 * 3600000;
  const msLeft = deadline72h - now;
  const hLeft = Math.floor(msLeft / 3600000);
  const mLeft = Math.floor((msLeft % 3600000) / 60000);

  if (msLeft <= 0) {
    return (
      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700">
        Prazo excedido
      </span>
    );
  }

  const color = hLeft < 24
    ? 'bg-red-100 text-red-700'
    : hLeft < 48
    ? 'bg-orange-100 text-orange-700'
    : 'bg-green-100 text-green-700';

  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${color}`}>
      Prazo: {hLeft}h {mLeft}m restantes
    </span>
  );
}

const SEVERITY_COLORS: Record<string, string> = {
  SIGNIFICANT: 'bg-yellow-100 text-yellow-700',
  MAJOR:       'bg-orange-100 text-orange-700',
  CRITICAL:    'bg-red-100 text-red-700',
};

const SEVERITY_LABELS: Record<string, string> = {
  SIGNIFICANT: 'Significativo',
  MAJOR:       'Major',
  CRITICAL:    'Crítico',
};

// ── Notification Pipeline Stage ───────────────────────────────
function PipelineStage({
  label,
  doneAt,
  stageKey,
  incidentId,
  onRegister,
  isLast,
  loading,
}: {
  label: string;
  doneAt: string | null;
  stageKey: string;
  incidentId: string;
  onRegister: (id: string, key: string) => void;
  isLast: boolean;
  loading: boolean;
}) {
  const done = !!doneAt;
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          done ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
        }`}>
          {done ? <CheckCheck className="w-4 h-4" /> : <Hourglass className="w-4 h-4" />}
        </div>
        {!isLast && (
          <div className={`w-0.5 h-4 mt-1 ${done ? 'bg-green-300' : 'bg-gray-200'}`} />
        )}
      </div>
      <div className="min-w-0">
        <p className={`text-xs font-medium ${done ? 'text-green-700' : 'text-gray-600'}`}>{label}</p>
        {done ? (
          <p className="text-xs text-gray-400">{new Date(doneAt!).toLocaleString('pt-PT')}</p>
        ) : (
          <button
            onClick={() => onRegister(incidentId, stageKey)}
            disabled={loading}
            className="mt-0.5 text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            {loading ? 'A registar…' : 'Registar'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Incident Notification Card ────────────────────────────────
function IncidentCard({
  incident,
  now,
  onRegister,
  submittingKey,
}: {
  incident: any;
  now: number;
  onRegister: (id: string, key: string) => void;
  submittingKey: string | null;
}) {
  const stages = [
    { key: 'EARLY_WARNING',  label: 'Alerta Precoce (24h)',   field: 'earlyWarningAt' },
    { key: 'INITIAL_REPORT', label: 'Relatório Inicial (72h)', field: 'initialReportAt' },
    { key: 'FINAL_REPORT',   label: 'Relatório Final (1 mês)', field: 'finalReportAt' },
  ];

  return (
    <div className="bg-white border rounded-xl p-5 space-y-4 shadow-sm">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono text-gray-400">{incident.incidentRef}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[incident.severity] ?? 'bg-gray-100 text-gray-600'}`}>
              {SEVERITY_LABELS[incident.severity] ?? incident.severity}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">{incident.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Detetado em: {new Date(incident.detectionDate).toLocaleString('pt-PT')}
          </p>
        </div>
        <DeadlineBadge detectionDate={incident.detectionDate} now={now} />
      </div>

      {/* Three-stage pipeline */}
      <div className="flex gap-3 flex-wrap">
        {stages.map((s, i) => (
          <PipelineStage
            key={s.key}
            label={s.label}
            doneAt={incident[s.field] ?? null}
            stageKey={s.key}
            incidentId={incident.id}
            onRegister={onRegister}
            isLast={i === stages.length - 1}
            loading={submittingKey === `${incident.id}:${s.key}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Prazos Tab ────────────────────────────────────────────────
function PrazosTab() {
  const qc = useQueryClient();
  const now = useNow(30000);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['nis2-incidents'],
    queryFn: () => nis2IncidentsApi.list().then(r => r.data),
  });

  const submitMutation = useMutation({
    mutationFn: ({ id, type }: { id: string; type: string }) =>
      nis2IncidentsApi.submit(id, type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nis2-incidents'] });
      setSubmittingKey(null);
    },
    onError: () => setSubmittingKey(null),
  });

  const handleRegister = (id: string, type: string) => {
    setSubmittingKey(`${id}:${type}`);
    submitMutation.mutate({ id, type });
  };

  const openIncidents = (incidents as any[]).filter(
    i => i.status !== 'CLOSED' && i.status !== 'FINAL_REPORT_SENT'
  );
  const closedIncidents = (incidents as any[]).filter(
    i => i.status === 'CLOSED' || i.status === 'FINAL_REPORT_SENT'
  );

  // Extra KPI calculations
  const overdueCount = openIncidents.filter(i => {
    const deadline = new Date(i.detectionDate).getTime() + 72 * 3600000;
    return now > deadline;
  }).length;

  const earlyWarningPendingCount = openIncidents.filter(i => {
    if (i.earlyWarningAt) return false;
    const deadline24h = new Date(i.detectionDate).getTime() + 24 * 3600000;
    return now < deadline24h;
  }).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPI row — extra cards */}
      <div className="flex gap-3 flex-wrap">
        <div className="bg-red-50 rounded-xl p-4 min-w-[160px]">
          <p className="text-xs font-semibold uppercase text-red-500 tracking-wide">Notificações Atrasadas</p>
          <p className="text-3xl font-bold text-red-700 mt-1">{overdueCount}</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 min-w-[160px]">
          <p className="text-xs font-semibold uppercase text-orange-500 tracking-wide">Alertas Precoces Pendentes</p>
          <p className="text-3xl font-bold text-orange-700 mt-1">{earlyWarningPendingCount}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 min-w-[160px]">
          <p className="text-xs font-semibold uppercase text-blue-500 tracking-wide">Incidentes Ativos</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">{openIncidents.length}</p>
        </div>
      </div>

      {/* Active incidents */}
      {openIncidents.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
          <Timer className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">Sem incidentes ativos com prazos a decorrer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {openIncidents.map((inc: any) => (
            <IncidentCard
              key={inc.id}
              incident={inc}
              now={now}
              onRegister={handleRegister}
              submittingKey={submittingKey}
            />
          ))}
        </div>
      )}

      {/* Archive section */}
      {closedIncidents.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <button
            onClick={() => setArchiveOpen(o => !o)}
            className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-600"
          >
            {archiveOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            Arquivo — {closedIncidents.length} incidente{closedIncidents.length !== 1 ? 's' : ''} encerrado{closedIncidents.length !== 1 ? 's' : ''}
          </button>
          {archiveOpen && (
            <div className="p-4 space-y-3 bg-white">
              {closedIncidents.map((inc: any) => (
                <div key={inc.id} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                  <div className="min-w-0">
                    <span className="text-xs font-mono text-gray-400 mr-2">{inc.incidentRef}</span>
                    <span className="text-sm text-gray-700">{inc.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[inc.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                      {SEVERITY_LABELS[inc.severity] ?? inc.severity}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                      {inc.status === 'CLOSED' ? 'Encerrado' : 'Relatório Final Enviado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function Nis2Page() {
  const t = useTranslations('nis2');
  const tCommon = useTranslations('common');
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'conformidade' | 'prazos'>('conformidade');
  const [editingMeasure, setEditingMeasure] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
    NOT_ASSESSED:   { icon: Circle,       color: 'text-gray-400',   bg: 'bg-gray-50',   label: t('status.NOT_ASSESSED') },
    NON_COMPLIANT:  { icon: XCircle,      color: 'text-red-600',    bg: 'bg-red-50',    label: t('status.NON_COMPLIANT') },
    PARTIAL:        { icon: AlertCircle,  color: 'text-orange-500', bg: 'bg-orange-50', label: t('status.PARTIAL') },
    COMPLIANT:      { icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50',  label: t('status.COMPLIANT') },
    NOT_APPLICABLE: { icon: MinusCircle,  color: 'text-gray-300',   bg: 'bg-gray-50',   label: t('status.NOT_APPLICABLE') },
  };

  const CATEGORY_LABELS: Record<string, string> = {
    RISK_MANAGEMENT:   t('category.RISK_MANAGEMENT'),
    INCIDENT_RESPONSE: t('category.INCIDENT_RESPONSE'),
    SUPPLY_CHAIN:      t('category.SUPPLY_CHAIN'),
    BCP:               t('category.BCP'),
    CRYPTOGRAPHY:      t('category.CRYPTOGRAPHY'),
    HR_SECURITY:       t('category.HR_SECURITY'),
    ACCESS_CONTROL:    t('category.ACCESS_CONTROL'),
    VULNERABILITY:     t('category.VULNERABILITY'),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['nis2', 'dashboard'],
    queryFn: () => nis2Api.dashboard().then(r => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['nis2'] });

  const updateMutation = useMutation({
    mutationFn: ({ measureCode, data }: any) => nis2Api.updateMeasure(measureCode, data),
    onSuccess: () => { invalidate(); setEditingMeasure(null); },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const assessments: any[] = data?.assessments ?? [];

  // Filter
  const filtered = assessments.filter(m => {
    if (categoryFilter && m.category !== categoryFilter) return false;
    if (statusFilter && m.status !== statusFilter) return false;
    return true;
  });

  // Group by category
  const byCategory = filtered.reduce((acc: Record<string, any[]>, m) => {
    if (!acc[m.category]) acc[m.category] = [];
    acc[m.category].push(m);
    return acc;
  }, {});

  const statCards = [
    { label: t('statCompliant'),    value: data?.compliant ?? 0,    color: 'bg-green-50 text-green-700',   status: 'COMPLIANT' },
    { label: t('statPartial'),      value: data?.partial ?? 0,      color: 'bg-orange-50 text-orange-700', status: 'PARTIAL' },
    { label: t('statNonCompliant'), value: data?.nonCompliant ?? 0, color: 'bg-red-50 text-red-700',       status: 'NON_COMPLIANT' },
    { label: t('statNotAssessed'),  value: data?.notAssessed ?? 0,  color: 'bg-gray-50 text-gray-700',     status: 'NOT_ASSESSED' },
  ];

  const tabs = [
    { key: 'conformidade', label: 'Conformidade', icon: Network },
    { key: 'prazos',       label: 'Prazos / Notificações', icon: Timer },
  ] as const;

  return (
    <ModuleGuard moduleKey="nis2">
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Network className="w-6 h-6 text-blue-600" /> {t('title')}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Conformidade tab ── */}
      {activeTab === 'conformidade' && (
        <>
          {/* Score + stats */}
          <div className="flex gap-4 flex-wrap items-center">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <ScoreRing score={data?.score ?? 0} />
              <div>
                <p className="text-sm font-semibold text-gray-800">{t('scoreNis2')}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('scoreDesc', { compliant: data?.compliant ?? 0, partial: data?.partial ?? 0 })}<br />
                  {t('scoreDescOf', { total: (data?.total ?? 0) - (data?.notApplicable ?? 0) })}
                </p>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              {statCards.map(c => (
                <button
                  key={c.status}
                  onClick={() => setStatusFilter(statusFilter === c.status ? '' : c.status)}
                  className={`rounded-xl p-4 min-w-[110px] text-left transition-all border-2 ${c.color} ${
                    statusFilter === c.status ? 'border-current opacity-100' : 'border-transparent opacity-90 hover:opacity-100'
                  }`}
                >
                  <div className="text-2xl font-bold">{c.value}</div>
                  <div className="text-xs font-medium mt-0.5">{c.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="">{t('allCategories')}</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">{t('allStatuses')}</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {(categoryFilter || statusFilter) && (
              <button
                onClick={() => { setCategoryFilter(''); setStatusFilter(''); }}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('clearFilters')}
              </button>
            )}
          </div>

          {/* Category groups */}
          <div className="space-y-3">
            {Object.keys(byCategory).length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Network className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p>{t('noMeasures')}</p>
              </div>
            ) : (
              Object.entries(byCategory).map(([cat, measures]) => {
                const compliant = measures.filter((m: any) => m.status === 'COMPLIANT').length;
                const total = measures.filter((m: any) => m.status !== 'NOT_APPLICABLE').length;
                const measureCountLabel = measures.length === 1 ? t('measureCount', { n: measures.length }) : t('measureCountPlural', { n: measures.length });
                const compliantCountLabel = compliant === 1 ? t('compliantCount', { n: compliant }) + `/${total}` : t('compliantCountPlural', { n: compliant }) + `/${total}`;
                return (
                  <CategoryGroup
                    key={cat}
                    category={cat}
                    measures={measures}
                    onEdit={setEditingMeasure}
                    categoryLabel={CATEGORY_LABELS[cat] ?? cat}
                    categoryColor={CATEGORY_COLORS[cat] ?? 'bg-gray-100 text-gray-800'}
                    statusConfig={STATUS_CONFIG}
                    measureCountLabel={measureCountLabel}
                    compliantCountLabel={compliantCountLabel}
                    targetPrefix={t('targetPrefix') as string}
                    evidencePrefix={t('evidencePrefix') as string}
                  />
                );
              })
            )}
          </div>

          {/* Legal notice */}
          <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700 border border-blue-100">
            {t.rich('legalNotice', { strong: (c) => <strong>{c}</strong> })}
          </div>
        </>
      )}

      {/* ── Prazos / Notificações tab ── */}
      {activeTab === 'prazos' && <PrazosTab />}

      {/* Edit modal */}
      {editingMeasure && (
        <EditMeasureModal
          measure={editingMeasure}
          onClose={() => setEditingMeasure(null)}
          onSave={(d) => updateMutation.mutate({ measureCode: editingMeasure.measureCode, data: d })}
        />
      )}
    </div>
    </ModuleGuard>
  );
}
