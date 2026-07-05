'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workforceApi, hrComplianceApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { cn, formatDate } from '@/lib/utils';
import {
  Users, CheckCircle2, XCircle, AlertCircle, MinusCircle, Circle, Pencil, X,
  BookOpen, Plus, Loader2, CheckCheck, Clock, BarChart2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterFramework = 'ALL' | 'ISO_45001' | 'HR_GDPR' | 'WORKING_TIME' | 'DISCRIMINATION';
type MainTab = 'controlos' | 'formacoes' | 'meus-cursos' | 'relatorio';

interface Training {
  id: string;
  title: string;
  description?: string;
  category?: string;
  instructor?: string;
  location?: string;
  trainingDate: string;
  durationHours?: number;
  _count?: { enrollments: number };
  enrollments?: { id: string; status: string; userId?: string; completedAt?: string }[];
}

// ── Config ────────────────────────────────────────────────────────────────────

const MAIN_TABS: { key: MainTab; label: string; icon: React.ElementType }[] = [
  { key: 'controlos',    label: 'Controlos',     icon: CheckCircle2 },
  { key: 'formacoes',    label: 'Formações',      icon: BookOpen },
  { key: 'meus-cursos',  label: 'Os Meus Cursos', icon: Users },
  { key: 'relatorio',    label: 'Relatório',      icon: BarChart2 },
];

const FRAMEWORK_FILTERS: { key: FilterFramework; label: string }[] = [
  { key: 'ALL',            label: 'Todos' },
  { key: 'ISO_45001',      label: 'ISO 45001' },
  { key: 'HR_GDPR',        label: 'HR GDPR' },
  { key: 'WORKING_TIME',   label: 'Tempo de Trabalho' },
  { key: 'DISCRIMINATION', label: 'Discriminação' },
];

const FRAMEWORK_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ISO_45001:      { label: 'ISO 45001 OHS',  color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  HR_GDPR:        { label: 'HR GDPR',         color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  WORKING_TIME:   { label: 'Tempo de Trabalho', color: 'text-amber-700', bg: 'bg-amber-50',  border: 'border-amber-200' },
  DISCRIMINATION: { label: 'Discriminação',   color: 'text-rose-700',   bg: 'bg-rose-50',   border: 'border-rose-200' },
  HEALTH_SAFETY:  { label: 'Saúde & Segurança', color: 'text-teal-700', bg: 'bg-teal-50',   border: 'border-teal-200' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  NOT_ASSESSED:   { label: 'Não Avaliado', color: 'text-gray-500',  bg: 'bg-gray-100',  icon: Circle },
  NON_COMPLIANT:  { label: 'Não Conforme', color: 'text-red-600',   bg: 'bg-red-100',   icon: XCircle },
  PARTIAL:        { label: 'Parcial',      color: 'text-amber-600', bg: 'bg-amber-100', icon: AlertCircle },
  COMPLIANT:      { label: 'Conforme',     color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle2 },
  NOT_APPLICABLE: { label: 'N/A',          color: 'text-gray-400',  bg: 'bg-gray-50',   icon: MinusCircle },
};

const CATEGORY_OPTIONS = [
  'ISO 45001',
  'HR GDPR',
  'Tempo de Trabalho',
  'Discriminação',
  'Saúde & Segurança',
  'Ética & Conduta',
  'Outro',
];

// ── Shared helpers ─────────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 text-center py-16 px-6">
      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-gray-400" />
      </div>
      <h3 className="text-sm font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 max-w-xs mx-auto mb-4">{description}</p>
      {action}
    </div>
  );
}

// ── Edit Control Modal ─────────────────────────────────────────────────────────

function EditControlModal({
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado de Conformidade</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Evidência</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
              rows={3}
              value={form.evidence}
              onChange={e => set('evidence', e.target.value)}
              placeholder="Descreva a evidência que suporta este controlo..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Notas adicionais ou acções a tomar..."
            />
          </div>
        </div>

        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            onClick={() => onSave({ status: form.status, evidence: form.evidence || null, notes: form.notes || null })}
          >
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Create Training Modal ──────────────────────────────────────────────────────

function CreateTrainingModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'ISO 45001',
    instructor: '',
    location: '',
    trainingDate: '',
    durationHours: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit() {
    if (!form.title.trim() || !form.trainingDate) {
      setError('Título e data são obrigatórios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await hrComplianceApi.createTraining({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        instructor: form.instructor.trim() || undefined,
        location: form.location.trim() || undefined,
        trainingDate: form.trainingDate,
        durationHours: form.durationHours ? Number(form.durationHours) : undefined,
      });
      onCreated();
    } catch {
      setError('Erro ao criar formação. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Nova Formação</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="ex: Sensibilização RGPD para colaboradores"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
              rows={2}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Objectivos e conteúdo da formação..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.category}
                onChange={e => set('category', e.target.value)}
              >
                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duração (horas)</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.durationHours}
                onChange={e => set('durationHours', e.target.value)}
                placeholder="ex: 2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Formador</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.instructor}
                onChange={e => set('instructor', e.target.value)}
                placeholder="Nome do formador"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="Online / Sala A / ..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data da Formação *</label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={form.trainingDate}
              onChange={e => set('trainingDate', e.target.value)}
            />
          </div>
        </div>

        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            Criar Formação
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Controlos ─────────────────────────────────────────────────────────────

function ControlosTab() {
  const qc = useQueryClient();
  const [editControl, setEditControl] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<FilterFramework>('ALL');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

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

  const allControls: any[] = dashboard?.controls ?? (() => {
    // backend returns byFramework structure
    if (!dashboard?.byFramework) return [];
    return Object.values(dashboard.byFramework).flat();
  })();

  // Handle both response shapes: { controls: [] } and { byFramework: {} }
  const flatControls: any[] = (() => {
    if (dashboard?.controls) return dashboard.controls;
    if (dashboard?.byFramework) return Object.values(dashboard.byFramework as Record<string, any[]>).flat();
    return [];
  })();

  const filteredControls = activeFilter === 'ALL'
    ? flatControls
    : flatControls.filter((c: any) => c.framework === activeFilter);

  const grouped: Record<string, any[]> = {};
  for (const c of filteredControls) {
    const fw = c.framework ?? 'OTHER';
    if (!grouped[fw]) grouped[fw] = [];
    grouped[fw].push(c);
  }

  const total        = flatControls.length;
  const compliant    = flatControls.filter((c: any) => c.status === 'COMPLIANT').length;
  const partial      = flatControls.filter((c: any) => c.status === 'PARTIAL').length;
  const nonCompliant = flatControls.filter((c: any) => c.status === 'NON_COMPLIANT').length;
  const score        = dashboard?.overallScore ?? dashboard?.score ?? (total > 0 ? Math.round((compliant / total) * 100) : 0);

  const toggleGroup = (fw: string) => setExpandedGroups(p => ({ ...p, [fw]: !p[fw] }));

  if (isLoading) return <LoadingSpinner />;
  if (!dashboard) return null;

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="md:col-span-1 bg-blue-50 rounded-xl p-4">
          <div className="text-xs font-medium text-blue-600 uppercase mb-2">Pontuação</div>
          <div className="text-3xl font-bold text-blue-700">{score}%</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-xs font-medium text-gray-500 uppercase mb-2">Total</div>
          <div className="text-3xl font-bold text-gray-700">{total}</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <div className="text-xs font-medium text-green-600 uppercase mb-2">Conforme</div>
          <div className="text-3xl font-bold text-green-700">{compliant}</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <div className="text-xs font-medium text-amber-600 uppercase mb-2">Parcial</div>
          <div className="text-3xl font-bold text-amber-700">{partial}</div>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <div className="text-xs font-medium text-red-600 uppercase mb-2">Não Conforme</div>
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
          {filteredControls.length} controlo{filteredControls.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Controls grouped by framework */}
      {Object.keys(grouped).length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Sem controlos"
          description="Não existem controlos para o filtro seleccionado."
        />
      ) : (
        Object.entries(grouped).map(([fw, controls]) => {
          const fwCfg = FRAMEWORK_CONFIG[fw] ?? { label: fw, color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' };
          const isExpanded = expandedGroups[fw] !== false; // default open
          const fwCompliant = controls.filter((c: any) => c.status === 'COMPLIANT').length;
          const fwPct = controls.length > 0 ? Math.round((fwCompliant / controls.length) * 100) : 0;
          return (
            <div key={fw} className="bg-white rounded-xl border overflow-hidden">
              <button
                onClick={() => toggleGroup(fw)}
                className={`w-full px-4 py-3 ${fwCfg.bg} border-b flex items-center gap-2 hover:brightness-95 transition-all`}
              >
                <span className={`text-sm font-semibold ${fwCfg.color}`}>{fwCfg.label}</span>
                <span className={`text-xs ${fwCfg.color}`}>({controls.length})</span>
                <span className={`ml-auto text-xs font-medium ${fwCfg.color}`}>{fwPct}%</span>
                {isExpanded
                  ? <ChevronUp className={`w-4 h-4 ${fwCfg.color}`} />
                  : <ChevronDown className={`w-4 h-4 ${fwCfg.color}`} />
                }
              </button>

              {isExpanded && (
                <div className="divide-y divide-gray-100">
                  {controls.map((c: any) => {
                    const st = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.NOT_ASSESSED;
                    const StatusIcon = st.icon;
                    return (
                      <div key={c.id} className="flex items-start gap-3 px-4 py-4 hover:bg-gray-50 group">
                        <span className="text-xs font-mono text-gray-500 w-20 flex-shrink-0 mt-0.5">
                          {c.controlCode}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{c.clauseTitle ?? c.title}</p>
                          {c.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{c.description}</p>
                          )}
                          {c.evidence && (
                            <p className="text-xs text-green-600 mt-1 truncate">&#10003; {c.evidence}</p>
                          )}
                        </div>
                        <span className={`flex-shrink-0 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium ${st.bg} ${st.color}`}>
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
          );
        })
      )}

      {editControl && (
        <EditControlModal
          control={editControl}
          onClose={() => setEditControl(null)}
          onSave={d => updateMut.mutate({ id: editControl.id, data: d })}
        />
      )}
    </div>
  );
}

// ── Tab: Formações ─────────────────────────────────────────────────────────────

function FormacoesTab() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: trainings, isLoading } = useQuery<Training[]>({
    queryKey: ['hr-trainings'],
    queryFn: () => hrComplianceApi.listTrainings().then(r => r.data),
  });

  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.list().then(r => r.data),
  });

  const enrollMut = useMutation({
    mutationFn: ({ trainingId, userId }: { trainingId: string; userId: string }) =>
      hrComplianceApi.enroll(trainingId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-trainings'] }),
  });

  function completionPct(tr: Training) {
    const total = tr._count?.enrollments ?? 0;
    const done = tr.enrollments?.filter(e => e.status === 'COMPLETED').length ?? 0;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Catálogo de Formações</h3>
          <p className="text-sm text-gray-500">Gerir formações obrigatórias de compliance e SST</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Criar Formação
        </button>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <>
          {!trainings?.length ? (
            <EmptyState
              icon={BookOpen}
              title="Sem formações criadas"
              description="Crie a primeira formação obrigatória para os seus colaboradores. Registe presença, acompanhe conclusões e gere relatórios de compliance."
              action={
                <button
                  onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Criar Formação
                </button>
              }
            />
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              {/* Table header */}
              <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wide">
                <div className="col-span-4">Título</div>
                <div className="col-span-2">Categoria</div>
                <div className="col-span-2">Data</div>
                <div className="col-span-1 text-center">Inscritos</div>
                <div className="col-span-2">Conclusão</div>
                <div className="col-span-1" />
              </div>

              {trainings.map(tr => {
                const pct = completionPct(tr);
                const isExpanded = expandedId === tr.id;
                return (
                  <div key={tr.id} className="border-b last:border-0">
                    {/* Row */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : tr.id)}
                      className="w-full grid grid-cols-12 gap-2 px-4 py-3.5 hover:bg-gray-50 text-left items-center transition-colors"
                    >
                      <div className="col-span-12 md:col-span-4">
                        <p className="text-sm font-medium text-gray-900 truncate">{tr.title}</p>
                        {tr.instructor && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{tr.instructor} · {tr.location || 'Online'}</p>
                        )}
                      </div>
                      <div className="col-span-6 md:col-span-2">
                        <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                          {tr.category ?? '—'}
                        </span>
                      </div>
                      <div className="col-span-6 md:col-span-2 text-xs text-gray-500">
                        {formatDate(tr.trainingDate)}
                        {tr.durationHours && <span className="ml-1 text-gray-400">({tr.durationHours}h)</span>}
                      </div>
                      <div className="col-span-4 md:col-span-1 text-center text-sm font-semibold text-gray-700">
                        {tr._count?.enrollments ?? 0}
                      </div>
                      <div className="col-span-7 md:col-span-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-7 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-gray-400" />
                          : <ChevronDown className="w-4 h-4 text-gray-400" />
                        }
                      </div>
                    </button>

                    {/* Expanded: enrolled users */}
                    {isExpanded && (
                      <div className="px-4 pb-4 bg-gray-50 border-t">
                        {tr.description && (
                          <p className="text-xs text-gray-500 mt-3 mb-3 bg-white rounded p-3 border">{tr.description}</p>
                        )}

                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">Participantes</p>
                            {/* Enroll user button - shows dropdown of unenrolled users */}
                            {users && (
                              <select
                                className="text-xs border rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                                defaultValue=""
                                onChange={e => {
                                  if (e.target.value) {
                                    enrollMut.mutate({ trainingId: tr.id, userId: e.target.value });
                                    e.target.value = '';
                                  }
                                }}
                              >
                                <option value="">+ Inscrever colaborador...</option>
                                {(Array.isArray(users) ? users : users?.data ?? []).map((u: any) => (
                                  <option key={u.id} value={u.id}>
                                    {u.firstName} {u.lastName}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          {!tr.enrollments?.length ? (
                            <p className="text-xs text-gray-400 py-3 text-center">Sem participantes inscritos.</p>
                          ) : (
                            <div className="space-y-1">
                              {tr.enrollments.map(e => (
                                <div key={e.id} className="flex items-center gap-2 text-xs text-gray-700 bg-white rounded px-3 py-2 border">
                                  {e.status === 'COMPLETED'
                                    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                    : <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                  }
                                  <span className="flex-1">{e.userId ?? 'Colaborador'}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    e.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {e.status === 'COMPLETED' ? 'Concluído' : 'Pendente'}
                                  </span>
                                  {e.completedAt && (
                                    <span className="text-gray-400">{formatDate(e.completedAt)}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {showCreate && (
        <CreateTrainingModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            qc.invalidateQueries({ queryKey: ['hr-trainings'] });
          }}
        />
      )}
    </div>
  );
}

// ── Tab: Os Meus Cursos ────────────────────────────────────────────────────────

function MeusCursosTab() {
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);

  const { data: trainings, isLoading } = useQuery<Training[]>({
    queryKey: ['hr-trainings'],
    queryFn: () => hrComplianceApi.listTrainings().then(r => r.data),
  });

  const completeMut = useMutation({
    mutationFn: (enrollmentId: string) =>
      hrComplianceApi.complete(enrollmentId, { completedAt: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-trainings'] }),
  });

  // Filter to trainings where the current user is enrolled
  const myTrainings = (trainings ?? []).filter(tr =>
    tr.enrollments?.some(e => e.userId === user?.id),
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Os Meus Cursos</h3>
        <p className="text-sm text-gray-500">Formações atribuídas a si</p>
      </div>

      {!myTrainings.length ? (
        <EmptyState
          icon={BookOpen}
          title="Sem formações atribuídas"
          description="Não existem formações atribuídas a si neste momento. O seu gestor pode inscrevê-lo em novas formações de compliance."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {myTrainings.map(tr => {
            const myEnrollment = tr.enrollments?.find(e => e.userId === user?.id);
            const done = myEnrollment?.status === 'COMPLETED';
            const overdue = !done && new Date(tr.trainingDate) < new Date();

            return (
              <div
                key={tr.id}
                className={cn(
                  'bg-white rounded-xl border p-5 flex flex-col gap-3 shadow-sm',
                  done ? 'border-green-200' : overdue ? 'border-red-200' : 'border-gray-100',
                )}
              >
                {/* Status badge */}
                <div className="flex items-start justify-between">
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    done ? 'bg-green-100 text-green-700'
                      : overdue ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700',
                  )}>
                    {done ? 'Concluído' : overdue ? 'Em atraso' : 'Pendente'}
                  </span>
                  {tr.category && (
                    <span className="text-xs text-gray-400">{tr.category}</span>
                  )}
                </div>

                {/* Title */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{tr.title}</h4>
                  {tr.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tr.description}</p>
                  )}
                </div>

                {/* Meta */}
                <div className="text-xs text-gray-400 space-y-0.5">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(tr.trainingDate)}</span>
                    {tr.durationHours && <span>· {tr.durationHours}h</span>}
                  </div>
                  {tr.instructor && <p>{tr.instructor} · {tr.location || 'Online'}</p>}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={cn('h-1.5 rounded-full transition-all', done ? 'bg-green-500' : 'bg-gray-300')}
                    style={{ width: done ? '100%' : '0%' }}
                  />
                </div>

                {/* Action */}
                {!done && myEnrollment && (
                  <button
                    onClick={() => completeMut.mutate(myEnrollment.id)}
                    disabled={completeMut.isPending}
                    className="flex items-center justify-center gap-1.5 w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {completeMut.isPending
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <CheckCheck className="w-3.5 h-3.5" />
                    }
                    Marcar como concluído
                  </button>
                )}

                {done && myEnrollment?.completedAt && (
                  <p className="text-xs text-green-600 text-center">
                    &#10003; Concluído em {formatDate(myEnrollment.completedAt)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab: Relatório ─────────────────────────────────────────────────────────────

function RelatorioTab() {
  const { data: trainings, isLoading } = useQuery<Training[]>({
    queryKey: ['hr-trainings'],
    queryFn: () => hrComplianceApi.listTrainings().then(r => r.data),
  });

  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.list().then(r => r.data),
  });

  if (isLoading) return <LoadingSpinner />;

  const trainingList: Training[] = trainings ?? [];

  // Chart data: completion % per training
  const chartData = trainingList.map(tr => {
    const total = tr._count?.enrollments ?? 0;
    const done  = tr.enrollments?.filter(e => e.status === 'COMPLETED').length ?? 0;
    return {
      name: tr.title.length > 22 ? tr.title.slice(0, 22) + '…' : tr.title,
      total,
      concluidos: done,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  // Per-user stats
  const userList = Array.isArray(users) ? users : (users?.data ?? []);
  const userStats = userList.map((u: any) => {
    const assigned = trainingList.filter(tr => tr.enrollments?.some(e => e.userId === u.id));
    const completed = trainingList.filter(tr => tr.enrollments?.some(e => e.userId === u.id && e.status === 'COMPLETED'));
    const pending   = assigned.length - completed.length;
    const pct       = assigned.length > 0 ? Math.round((completed.length / assigned.length) * 100) : null;
    return { id: u.id, name: `${u.firstName} ${u.lastName}`, assigned: assigned.length, completed: completed.length, pending, pct };
  }).filter((u: any) => u.assigned > 0);

  const totalTrainings = trainingList.length;
  const totalEnrollments = trainingList.reduce((s, t) => s + (t._count?.enrollments ?? 0), 0);
  const totalCompleted   = trainingList.reduce((s, t) => s + (t.enrollments?.filter(e => e.status === 'COMPLETED').length ?? 0), 0);
  const overallPct = totalEnrollments > 0 ? Math.round((totalCompleted / totalEnrollments) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Relatório de Conformidade</h3>
        <p className="text-sm text-gray-500">Taxa de conclusão por formação e por colaborador</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Formações',          value: totalTrainings,   color: 'bg-blue-50 text-blue-700' },
          { label: 'Inscrições totais',   value: totalEnrollments, color: 'bg-purple-50 text-purple-700' },
          { label: 'Concluídas',          value: totalCompleted,   color: 'bg-green-50 text-green-700' },
          { label: 'Taxa global',         value: `${overallPct}%`, color: overallPct >= 80 ? 'bg-green-50 text-green-700' : overallPct >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700' },
        ].map(card => (
          <div key={card.label} className={`rounded-xl p-4 ${card.color.split(' ')[0]}`}>
            <div className={`text-xs font-medium uppercase mb-1 ${card.color.split(' ')[1]}`}>{card.label}</div>
            <div className={`text-3xl font-bold ${card.color.split(' ')[1]}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {!trainingList.length ? (
        <EmptyState
          icon={BarChart2}
          title="Sem dados de formação"
          description="Crie formações e inscreva colaboradores para visualizar o relatório de conclusão."
        />
      ) : (
        <>
          {/* Bar chart */}
          <div className="bg-white rounded-xl border p-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">Taxa de Conclusão por Formação</h4>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    formatter={(v: any) => [`${v}%`, 'Conclusão']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.pct >= 80 ? '#22c55e' : entry.pct >= 40 ? '#f59e0b' : '#f87171'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">Sem inscrições registadas.</p>
            )}
          </div>

          {/* Per-training table */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-5 py-3.5 border-b">
              <h4 className="text-sm font-semibold text-gray-700">Detalhe por Formação</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Formação</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Inscritos</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Concluídos</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Pendentes</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Conclusão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {trainingList.map(tr => {
                    const total = tr._count?.enrollments ?? 0;
                    const done  = tr.enrollments?.filter(e => e.status === 'COMPLETED').length ?? 0;
                    const pending = total - done;
                    const pct = total > 0 ? Math.round((done / total) * 100) : null;
                    return (
                      <tr key={tr.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 text-sm">{tr.title}</p>
                          <p className="text-xs text-gray-400">{tr.category} · {formatDate(tr.trainingDate)}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">{total}</td>
                        <td className="px-4 py-3 text-center text-green-700 font-medium">{done}</td>
                        <td className="px-4 py-3 text-center text-amber-700">{pending}</td>
                        <td className="px-4 py-3 text-center">
                          {pct !== null ? (
                            <span className={cn(
                              'text-xs font-semibold px-2 py-0.5 rounded-full',
                              pct >= 80 ? 'bg-green-100 text-green-700'
                                : pct >= 40 ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700',
                            )}>
                              {pct}%
                            </span>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-user table */}
          {userStats.length > 0 && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-5 py-3.5 border-b">
                <h4 className="text-sm font-semibold text-gray-700">Detalhe por Colaborador</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Colaborador</th>
                      <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Atribuídas</th>
                      <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Concluídas</th>
                      <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Pendentes</th>
                      <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {userStats.map((u: any) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{u.assigned}</td>
                        <td className="px-4 py-3 text-center text-green-700 font-medium">{u.completed}</td>
                        <td className="px-4 py-3 text-center text-amber-700">{u.pending}</td>
                        <td className="px-4 py-3 text-center">
                          {u.pct !== null ? (
                            <span className={cn(
                              'text-xs font-semibold px-2 py-0.5 rounded-full',
                              u.pct >= 80 ? 'bg-green-100 text-green-700'
                                : u.pct >= 40 ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700',
                            )}>
                              {u.pct}%
                            </span>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function WorkforcePage() {
  const [activeTab, setActiveTab] = useState<MainTab>('controlos');

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
            ISO 45001 OHS — Conformidade de RH — Tempo de Trabalho &amp; Discriminação
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex overflow-x-auto gap-1 bg-gray-100 p-1 rounded-xl w-full">
        {MAIN_TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center',
                activeTab === tab.key
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'controlos'   && <ControlosTab />}
      {activeTab === 'formacoes'   && <FormacoesTab />}
      {activeTab === 'meus-cursos' && <MeusCursosTab />}
      {activeTab === 'relatorio'   && <RelatorioTab />}
    </div>
  );
}
