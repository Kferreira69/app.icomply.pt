'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { diagnosticsApi, projectsApi, tasksApi } from '@/lib/api';
import {
  ClipboardList,
  MessageSquare,
  BarChart2,
  Stethoscope,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ListChecks,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type DiagnosticStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
type AnswerValue = 'YES' | 'NO' | 'PARTIAL' | 'N_A';

interface DiagnosticRun {
  id: string;
  status: DiagnosticStatus;
  sector?: string;
  country?: string;
  createdAt: string;
  completedAt?: string;
  recommendations?: RecommendationEntry[];
  _count?: { answers: number; projects: number };
  answers?: AnswerWithQuestion[];
}

interface DiagnosticQuestion {
  id: string;
  code: string;
  question: string;
  description?: string;
  category: string;
  type: string;
  options?: { value: string; label: string; weight: number }[];
  weight: number;
  sortOrder: number;
  framework?: { name: string; code: string };
}

interface AnswerWithQuestion {
  id: string;
  questionId: string;
  value: any;
  score?: number;
  question: DiagnosticQuestion;
}

interface RecommendationEntry {
  frameworkId?: string;
  frameworkCode: string;
  frameworkName?: string;
  score: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
  suggestedProjectId?: string | null;
}

interface ProjectOption {
  id: string;
  name: string;
  frameworkId?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FRAMEWORK_OPTIONS = [
  { value: 'ISO_27001', label: 'ISO 27001:2022 — Segurança da Informação' },
  { value: 'NIS2', label: 'NIS2 — Segurança de Redes e Sistemas' },
  { value: 'DORA', label: 'DORA — Resiliência Operacional Digital' },
  { value: 'SOC2', label: 'SOC 2 Type II — Service Organization Controls' },
  { value: 'GDPR', label: 'RGPD / GDPR — Proteção de Dados Pessoais' },
];

const SECTOR_OPTIONS = [
  { value: 'FINANCE', label: 'Setor Financeiro' },
  { value: 'HEALTH', label: 'Saúde' },
  { value: 'ENERGY', label: 'Energia' },
  { value: 'TRANSPORT', label: 'Transportes' },
  { value: 'PUBLIC', label: 'Administração Pública' },
  { value: 'TECH', label: 'Tecnologia' },
  { value: 'OTHER', label: 'Outro' },
];

const STATUS_CONFIG: Record<DiagnosticStatus, { label: string; badge: string; icon: React.ReactNode }> = {
  IN_PROGRESS: {
    label: 'Em curso',
    badge: 'bg-blue-100 text-blue-700',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  COMPLETED: {
    label: 'Concluído',
    badge: 'bg-green-100 text-green-700',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  ABANDONED: {
    label: 'Abandonado',
    badge: 'bg-gray-100 text-gray-500',
    icon: <X className="w-3.5 h-3.5" />,
  },
};

const PRIORITY_CONFIG: Record<string, { label: string; badge: string }> = {
  HIGH: { label: 'Alta', badge: 'bg-red-100 text-red-700' },
  MEDIUM: { label: 'Média', badge: 'bg-yellow-100 text-yellow-700' },
  LOW: { label: 'Baixa', badge: 'bg-gray-100 text-gray-600' },
};

const BOOLEAN_ANSWER_LABELS: Record<string, string> = {
  'true': 'Sim',
  'false': 'Não',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAnswerValue(value: any): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  const str = String(value);
  return BOOLEAN_ANSWER_LABELS[str] ?? str;
}

function groupQuestionsByCategory(questions: DiagnosticQuestion[]) {
  const map = new Map<string, DiagnosticQuestion[]>();
  for (const q of questions) {
    if (!map.has(q.category)) map.set(q.category, []);
    map.get(q.category)!.push(q);
  }
  return map;
}

// ─── Start Diagnostic Modal ───────────────────────────────────────────────────

function StartDiagnosticModal({
  onClose,
  onStart,
  isLoading,
}: {
  onClose: () => void;
  onStart: (sector?: string) => void;
  isLoading: boolean;
}) {
  const [sector, setSector] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Novo Diagnóstico</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-500">
            Inicie um novo diagnóstico de conformidade. O questionário será gerado automaticamente
            com base no perfil da sua organização.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Setor de Atividade <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <div className="relative">
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary pr-9"
              >
                <option value="">Selecionar setor...</option>
                {SECTOR_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onStart(sector || undefined)}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Iniciar Diagnóstico
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Diagnósticos (Run List) ─────────────────────────────────────────────

function RunsTab({
  onViewResults,
  onStartQuestionnaire,
}: {
  onViewResults: (run: DiagnosticRun) => void;
  onStartQuestionnaire: (run: DiagnosticRun) => void;
}) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: runs = [], isLoading } = useQuery<DiagnosticRun[]>({
    queryKey: ['diagnostic-runs'],
    queryFn: async () => {
      const res = await diagnosticsApi.listRuns();
      return res.data;
    },
  });

  const startRunMutation = useMutation({
    mutationFn: (data: { sector?: string }) => diagnosticsApi.startRun(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostic-runs'] });
      setShowModal(false);
    },
  });

  const inProgressRun = runs.find((r) => r.status === 'IN_PROGRESS');

  return (
    <>
      {showModal && (
        <StartDiagnosticModal
          onClose={() => setShowModal(false)}
          onStart={(sector) => startRunMutation.mutate({ sector })}
          isLoading={startRunMutation.isPending}
        />
      )}

      <div className="space-y-5">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              {runs.length} diagnóstico{runs.length !== 1 ? 's' : ''} registado{runs.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Novo Diagnóstico
          </button>
        </div>

        {/* In-progress banner */}
        {inProgressRun && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900">
                Diagnóstico em curso
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                Iniciado em {formatDate(inProgressRun.createdAt)}.
                Retome o questionário para concluir.
              </p>
            </div>
            <button
              onClick={() => onStartQuestionnaire(inProgressRun)}
              className="text-xs font-medium text-blue-700 hover:text-blue-900 border border-blue-300 rounded-lg px-3 py-1.5 whitespace-nowrap hover:bg-blue-100 transition-colors"
            >
              Continuar
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3">Data Início</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Setor</th>
                <th className="text-center px-4 py-3">Estado</th>
                <th className="text-center px-4 py-3 hidden md:table-cell">Data Conclusão</th>
                <th className="text-center px-4 py-3 hidden lg:table-cell">Respostas</th>
                <th className="text-right px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                  </td>
                </tr>
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <Stethoscope className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Nenhum diagnóstico realizado</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Inicie o primeiro diagnóstico de conformidade da sua organização.
                    </p>
                  </td>
                </tr>
              ) : (
                runs.map((run) => {
                  const statusCfg = STATUS_CONFIG[run.status];
                  return (
                    <tr key={run.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-900 font-medium">
                        {formatDate(run.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-gray-500 hidden md:table-cell">
                        {run.sector
                          ? (SECTOR_OPTIONS.find((s) => s.value === run.sector)?.label ?? run.sector)
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium', statusCfg.badge)}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-gray-500 hidden md:table-cell">
                        {run.completedAt ? formatDate(run.completedAt) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-4 text-center text-gray-500 hidden lg:table-cell">
                        {run._count?.answers ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {run.status === 'IN_PROGRESS' ? (
                          <button
                            onClick={() => onStartQuestionnaire(run)}
                            className="text-xs font-medium text-primary hover:text-primary/80 border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors"
                          >
                            Continuar
                          </button>
                        ) : run.status === 'COMPLETED' ? (
                          <button
                            onClick={() => onViewResults(run)}
                            className="text-xs font-medium text-emerald-700 hover:text-emerald-900 border border-emerald-200 rounded-lg px-3 py-1.5 hover:bg-emerald-50 transition-colors"
                          >
                            Ver Resultados
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Tab: Questionário Ativo ──────────────────────────────────────────────────

function QuestionnaireTab({
  activeRun,
  onCompleted,
}: {
  activeRun: DiagnosticRun | null;
  onCompleted: (completedRunId: string) => void;
}) {
  const queryClient = useQueryClient();

  // Local answer state: questionId -> value
  const [localAnswers, setLocalAnswers] = useState<Record<string, any>>({});
  const [evidenceText, setEvidenceText] = useState<Record<string, string>>({});

  const { data: questions = [], isLoading: questionsLoading } = useQuery<DiagnosticQuestion[]>({
    queryKey: ['diagnostic-questions', activeRun?.id],
    queryFn: async () => {
      const res = await diagnosticsApi.questions();
      return res.data;
    },
    enabled: !!activeRun,
  });

  // Pre-fill from run.answers if available
  const { data: runDetail } = useQuery<DiagnosticRun>({
    queryKey: ['diagnostic-run', activeRun?.id],
    queryFn: async () => {
      const res = await diagnosticsApi.getRun(activeRun!.id);
      return res.data;
    },
    enabled: !!activeRun,
  });

  // Merge server answers into local state on first load
  const effectiveAnswers = useMemo(() => {
    const merged: Record<string, any> = {};
    if (runDetail?.answers) {
      for (const a of runDetail.answers) {
        merged[a.questionId] = a.value;
      }
    }
    return { ...merged, ...localAnswers };
  }, [runDetail, localAnswers]);

  const submitMutation = useMutation({
    mutationFn: (data: { answers: { questionId: string; value: any }[]; complete: boolean }) =>
      diagnosticsApi.submitAnswers(activeRun!.id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['diagnostic-runs'] });
      queryClient.invalidateQueries({ queryKey: ['diagnostic-run', activeRun?.id] });
      if (variables.complete && activeRun) {
        onCompleted(activeRun.id);
      }
    },
  });

  function handleAnswer(questionId: string, value: any) {
    const next = { ...localAnswers, [questionId]: value };
    setLocalAnswers(next);
    // Auto-save partial answer
    const payload = [{ questionId, value }];
    submitMutation.mutate({ answers: payload, complete: false });
  }

  function handleConclude() {
    const payload = questions.map((q) => ({
      questionId: q.id,
      value: effectiveAnswers[q.id] ?? null,
    })).filter((a) => a.value !== null);
    submitMutation.mutate({ answers: payload, complete: true });
  }

  if (!activeRun) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
        <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Nenhum diagnóstico em curso</p>
        <p className="text-sm text-gray-400 mt-1">
          Inicie um novo diagnóstico no separador "Diagnósticos".
        </p>
      </div>
    );
  }

  if (questionsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  const answeredCount = questions.filter((q) => effectiveAnswers[q.id] != null).length;
  const total = questions.length;
  const progress = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
  const allAnswered = answeredCount === total && total > 0;

  const grouped = groupQuestionsByCategory(questions);

  const ANSWER_OPTIONS: { value: string; label: string; style: string; activeStyle: string }[] = [
    {
      value: 'true',
      label: 'Sim',
      style: 'border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-700',
      activeStyle: 'bg-green-500 text-white border-green-500',
    },
    {
      value: 'PARTIAL',
      label: 'Parcial',
      style: 'border-gray-200 text-gray-600 hover:border-yellow-300 hover:text-yellow-700',
      activeStyle: 'bg-yellow-400 text-white border-yellow-400',
    },
    {
      value: 'false',
      label: 'Não',
      style: 'border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600',
      activeStyle: 'bg-red-500 text-white border-red-500',
    },
    {
      value: 'N_A',
      label: 'N/A',
      style: 'border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700',
      activeStyle: 'bg-gray-500 text-white border-gray-500',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Progress header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progresso do questionário</span>
          <span className="text-sm font-bold text-primary">
            {answeredCount}/{total} questões ({progress}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Questions by category */}
      {Array.from(grouped.entries()).map(([category, qs]) => (
        <div key={category} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/60">
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
              {category.replace(/_/g, ' ')}
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {qs.map((q) => {
              const currentVal = String(effectiveAnswers[q.id] ?? '');
              return (
                <div key={q.id} className="p-5">
                  <p className="text-sm font-medium text-gray-800 mb-1">{q.question}</p>
                  {q.description && (
                    <p className="text-xs text-gray-400 mb-3">{q.description}</p>
                  )}
                  {q.framework && (
                    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium mb-3">
                      {q.framework.name}
                    </span>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {ANSWER_OPTIONS.map((opt) => {
                      const isActive = currentVal === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleAnswer(q.id, opt.value === 'true' ? true : opt.value === 'false' ? false : opt.value)}
                          className={cn(
                            'px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all',
                            isActive ? opt.activeStyle : opt.style,
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  {/* Evidence text field */}
                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="Evidência / notas (opcional)"
                      value={evidenceText[q.id] ?? ''}
                      onChange={(e) => setEvidenceText((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary text-gray-600 placeholder-gray-300"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Conclude button */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4">
        <div className="text-sm text-gray-500">
          {allAnswered ? (
            <span className="flex items-center gap-1.5 text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              Todas as questões respondidas. Pronto para concluir.
            </span>
          ) : (
            <span>
              Respondeu <strong>{answeredCount}</strong> de <strong>{total}</strong> questões.
            </span>
          )}
        </div>
        <button
          onClick={handleConclude}
          disabled={!allAnswered || submitMutation.isPending}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all',
            allAnswered
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          )}
        >
          {submitMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          Concluir Diagnóstico
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Resultados ──────────────────────────────────────────────────────────

function ResultsTab({ preselectedRunId }: { preselectedRunId?: string }) {
  const [selectedRunId, setSelectedRunId] = useState<string>(preselectedRunId ?? '');
  const queryClient = useQueryClient();

  // projectId chosen per recommendation row (keyed by frameworkCode); pre-filled
  // with the backend's suggestion once recommendations load (see effect below).
  const [selectedProjectByRec, setSelectedProjectByRec] = useState<Record<string, string>>({});
  const [createdRecKeys, setCreatedRecKeys] = useState<Set<string>>(new Set());

  const { data: projects } = useQuery<ProjectOption[]>({
    queryKey: ['projects', 'for-diagnostic-recommendations'],
    queryFn: async () => {
      const res = await projectsApi.list({ limit: 100 });
      return res.data?.data ?? res.data ?? [];
    },
  });

  const createTaskFromRecMutation = useMutation({
    mutationFn: ({ rec, projectId }: { rec: RecommendationEntry; projectId: string }) =>
      tasksApi.create({
        title: `Plano de ação — ${rec.frameworkName ?? rec.frameworkCode}`,
        description: rec.reasons?.length
          ? `Recomendação gerada pelo diagnóstico:\n- ${rec.reasons.join('\n- ')}`
          : `Recomendação gerada pelo diagnóstico de conformidade para ${rec.frameworkName ?? rec.frameworkCode}.`,
        priority: rec.priority,
        projectId,
      }),
    onSuccess: (_data, variables) => {
      setCreatedRecKeys((prev) => new Set(prev).add(variables.rec.frameworkCode));
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const { data: runs = [] } = useQuery<DiagnosticRun[]>({
    queryKey: ['diagnostic-runs'],
    queryFn: async () => {
      const res = await diagnosticsApi.listRuns();
      return res.data;
    },
  });

  const completedRuns = runs.filter((r) => r.status === 'COMPLETED');

  useEffect(() => {
    if (preselectedRunId) {
      setSelectedRunId(preselectedRunId);
    } else if (!selectedRunId && completedRuns.length > 0) {
      setSelectedRunId(completedRuns[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedRunId, completedRuns.length]);

  const { data: runDetail, isLoading: detailLoading } = useQuery<DiagnosticRun>({
    queryKey: ['diagnostic-run', selectedRunId],
    queryFn: async () => {
      const res = await diagnosticsApi.getRun(selectedRunId);
      return res.data;
    },
    enabled: !!selectedRunId,
  });

  // Pre-fill each recommendation's project select with the backend suggestion
  // (editable/override-able) whenever a new run's recommendations load.
  useEffect(() => {
    if (!Array.isArray(runDetail?.recommendations)) return;
    setSelectedProjectByRec((prev) => {
      const next = { ...prev };
      for (const rec of runDetail!.recommendations as RecommendationEntry[]) {
        if (next[rec.frameworkCode] === undefined) {
          next[rec.frameworkCode] = rec.suggestedProjectId ?? '';
        }
      }
      return next;
    });
    setCreatedRecKeys(new Set());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runDetail?.recommendations]);

  // Compute category breakdown from answers
  const categoryBreakdown = useMemo(() => {
    if (!runDetail?.answers) return [];
    const map = new Map<string, { yes: number; no: number; partial: number; na: number; total: number }>();
    for (const a of runDetail.answers) {
      const cat = a.question.category;
      if (!map.has(cat)) map.set(cat, { yes: 0, no: 0, partial: 0, na: 0, total: 0 });
      const entry = map.get(cat)!;
      entry.total++;
      const v = String(a.value);
      if (v === 'true') entry.yes++;
      else if (v === 'false') entry.no++;
      else if (v === 'PARTIAL') entry.partial++;
      else if (v === 'N_A') entry.na++;
    }
    return Array.from(map.entries())
      .map(([cat, counts]) => {
        const effective = counts.total - counts.na;
        const score = effective > 0
          ? Math.round(((counts.yes + counts.partial * 0.5) / effective) * 100)
          : 0;
        return { cat, ...counts, score };
      })
      .sort((a, b) => a.score - b.score);
  }, [runDetail]);

  // Weak areas: answers that are false or PARTIAL
  const weakAreas = useMemo(() => {
    if (!runDetail?.answers) return [];
    return runDetail.answers.filter((a) => {
      const v = String(a.value);
      return v === 'false' || v === 'PARTIAL';
    });
  }, [runDetail]);

  // Overall score
  const overallScore = useMemo(() => {
    if (!categoryBreakdown.length) return null;
    return Math.round(categoryBreakdown.reduce((s, c) => s + c.score, 0) / categoryBreakdown.length);
  }, [categoryBreakdown]);

  const scoreColor = overallScore == null ? 'text-gray-400'
    : overallScore >= 80 ? 'text-green-600'
    : overallScore >= 60 ? 'text-yellow-600'
    : 'text-red-600';

  return (
    <div className="space-y-5">
      {/* Run selector */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Selecionar diagnóstico concluído
        </label>
        <div className="relative max-w-sm">
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary pr-9"
          >
            <option value="">Selecionar diagnóstico...</option>
            {completedRuns.map((r) => (
              <option key={r.id} value={r.id}>
                {formatDate(r.completedAt ?? r.createdAt)}
                {r.sector ? ` — ${SECTOR_OPTIONS.find((s) => s.value === r.sector)?.label ?? r.sector}` : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        {completedRuns.length === 0 && (
          <p className="text-xs text-gray-400 mt-2">Nenhum diagnóstico concluído ainda.</p>
        )}
      </div>

      {!selectedRunId && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
          <BarChart2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">Selecione um diagnóstico concluído para ver os resultados.</p>
        </div>
      )}

      {selectedRunId && detailLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      )}

      {selectedRunId && !detailLoading && runDetail && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
              <div className={cn('text-4xl font-bold mb-1', scoreColor)}>
                {overallScore ?? '—'}
                {overallScore != null && <span className="text-xl text-gray-400">%</span>}
              </div>
              <div className="text-sm text-gray-500">Score Global</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
              <div className="text-3xl font-bold text-red-600 mb-1">{weakAreas.length}</div>
              <div className="text-sm text-gray-500">Áreas a Melhorar</div>
              <div className="text-xs text-gray-400">Não / Parcial</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {runDetail.answers?.length ?? 0}
              </div>
              <div className="text-sm text-gray-500">Questões Respondidas</div>
            </div>
          </div>

          {/* Score breakdown by category */}
          {categoryBreakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Score por Categoria</h3>
              </div>
              <div className="p-5 space-y-3">
                {categoryBreakdown.map(({ cat, score, yes, partial, no, total }) => {
                  const barColor = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-400' : 'bg-red-500';
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{cat.replace(/_/g, ' ')}</span>
                        <span className={cn('font-bold', score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600')}>
                          {score}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={cn('h-2.5 rounded-full transition-all', barColor)}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-gray-400">
                        <span className="text-green-600">{yes} sim</span>
                        <span className="text-yellow-600">{partial} parcial</span>
                        <span className="text-red-600">{no} não</span>
                        <span className="text-gray-400">de {total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Framework recommendations */}
          {Array.isArray(runDetail.recommendations) && runDetail.recommendations.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Frameworks Recomendados</h3>
                <p className="text-xs text-gray-400 mt-0.5">Prioridade calculada com base nas respostas.</p>
              </div>
              <div className="divide-y divide-gray-50">
                {(runDetail.recommendations as RecommendationEntry[]).map((rec, i) => {
                  const priorityCfg = PRIORITY_CONFIG[rec.priority] ?? PRIORITY_CONFIG.LOW;
                  const selectedProjectId = selectedProjectByRec[rec.frameworkCode] ?? '';
                  const alreadyCreated = createdRecKeys.has(rec.frameworkCode);
                  const isCreating =
                    createTaskFromRecMutation.isPending &&
                    createTaskFromRecMutation.variables?.rec.frameworkCode === rec.frameworkCode;
                  return (
                    <div key={i} className="px-6 py-4 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">#{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">
                            {rec.frameworkName ?? rec.frameworkCode}
                          </span>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', priorityCfg.badge)}>
                            {priorityCfg.label}
                          </span>
                          <span className="text-xs text-gray-400">Score de relevância: {rec.score}</span>
                        </div>
                        {rec.reasons?.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5">
                            {rec.reasons.map((r, j) => (
                              <li key={j} className="text-xs text-gray-500 flex items-start gap-1.5">
                                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                                {r}
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Convert recommendation into a real task, with a project
                            pre-filled from the backend suggestion (frameworkId match)
                            but always editable by the user. */}
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          <div className="relative">
                            <select
                              value={selectedProjectId}
                              onChange={(e) =>
                                setSelectedProjectByRec((prev) => ({
                                  ...prev,
                                  [rec.frameworkCode]: e.target.value,
                                }))
                              }
                              disabled={alreadyCreated}
                              className="border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400 min-w-[220px]"
                            >
                              <option value="">Selecionar projeto...</option>
                              {projects?.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                  {p.frameworkId && p.frameworkId === rec.frameworkId ? ' (sugerido)' : ''}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                          </div>
                          <button
                            type="button"
                            disabled={!selectedProjectId || alreadyCreated || isCreating}
                            onClick={() =>
                              createTaskFromRecMutation.mutate({ rec, projectId: selectedProjectId })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                          >
                            {isCreating ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : alreadyCreated ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <ListChecks className="w-3.5 h-3.5" />
                            )}
                            {alreadyCreated ? 'Tarefa criada' : 'Criar tarefa'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Weak areas list */}
          {weakAreas.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Áreas com Lacunas</h3>
                <p className="text-xs text-gray-400 mt-0.5">Questões com resposta Não ou Parcial que requerem atenção.</p>
              </div>
              <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                {weakAreas.map((a) => {
                  const isNo = String(a.value) === 'false';
                  return (
                    <div key={a.id} className="px-6 py-4 flex items-start gap-3">
                      <span className={cn(
                        'inline-flex text-xs px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5',
                        isNo ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700',
                      )}>
                        {isNo ? 'Não' : 'Parcial'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">{a.question.question}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Categoria: {a.question.category.replace(/_/g, ' ')}
                          {a.question.framework && ` · ${a.question.framework.name}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabKey = 'runs' | 'questionnaire' | 'results';

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { key: 'runs', label: 'Diagnósticos', icon: <ClipboardList className="w-4 h-4" /> },
  { key: 'questionnaire', label: 'Questionário Ativo', icon: <MessageSquare className="w-4 h-4" /> },
  { key: 'results', label: 'Resultados', icon: <BarChart2 className="w-4 h-4" /> },
];

export default function DiagnosticsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('runs');
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>();

  // Fetch runs to find any IN_PROGRESS run
  const { data: runs = [] } = useQuery<DiagnosticRun[]>({
    queryKey: ['diagnostic-runs'],
    queryFn: async () => {
      const res = await diagnosticsApi.listRuns();
      return res.data;
    },
  });

  const inProgressRun = runs.find((r) => r.status === 'IN_PROGRESS') ?? null;

  function handleViewResults(run: DiagnosticRun) {
    setSelectedRunId(run.id);
    setActiveTab('results');
  }

  function handleStartQuestionnaire(_run: DiagnosticRun) {
    setActiveTab('questionnaire');
  }

  function handleQuestionnaireDone(completedRunId: string) {
    setSelectedRunId(completedRunId);
    setActiveTab('results');
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Stethoscope className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diagnóstico de Conformidade</h1>
          <p className="text-sm text-gray-500 mt-0.5">Avaliação de maturidade por framework</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'runs' && (
        <RunsTab
          onViewResults={handleViewResults}
          onStartQuestionnaire={handleStartQuestionnaire}
        />
      )}
      {activeTab === 'questionnaire' && (
        <QuestionnaireTab
          activeRun={inProgressRun}
          onCompleted={handleQuestionnaireDone}
        />
      )}
      {activeTab === 'results' && (
        <ResultsTab preselectedRunId={selectedRunId} />
      )}
    </div>
  );
}
