'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { whistleblowApi } from '@/lib/api';
import {
  Shield, AlertTriangle, Clock, CheckCircle, Search, Filter,
  Eye, ChevronRight, Users, BookOpen, FileBarChart2, GraduationCap,
  XCircle, Copy, Check, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: 'Recebida', color: 'bg-amber-100 text-amber-700' },
  ACKNOWLEDGED: { label: 'Confirmada', color: 'bg-blue-100 text-blue-700' },
  UNDER_INVESTIGATION: { label: 'Em investigação', color: 'bg-purple-100 text-purple-700' },
  CONCLUDED: { label: 'Concluída', color: 'bg-green-100 text-green-700' },
  UNFOUNDED: { label: 'Sem fundamento', color: 'bg-gray-100 text-gray-600' },
  ARCHIVED: { label: 'Arquivada', color: 'bg-gray-100 text-gray-500' },
};

const CATEGORY_LABELS: Record<string, string> = {
  CORRUPTION: 'Corrupção', FRAUD: 'Fraude', BRIBERY: 'Suborno',
  CONFLICT_OF_INTEREST: 'Conflito de interesses', ABUSE_OF_POWER: 'Abuso de poder',
  EMBEZZLEMENT: 'Desvio de fundos', MISUSE_OF_INFORMATION: 'Info. indevida',
  DATA_BREACH: 'Violação dados', WORKPLACE_HARASSMENT: 'Assédio',
  SAFETY_VIOLATION: 'Segurança', ENVIRONMENTAL_VIOLATION: 'Ambiental', OTHER: 'Outro',
};

type TabKey = 'dashboard' | 'reports' | 'conduct' | 'training' | 'menac';

export default function DenunciasPage() {
  const [tab, setTab] = useState<TabKey>('dashboard');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const qc = useQueryClient();

  const { data: dash } = useQuery({
    queryKey: ['whistleblow-dashboard'],
    queryFn: () => whistleblowApi.dashboard().then(r => r.data),
    enabled: tab === 'dashboard',
  });

  const { data: reportsData } = useQuery({
    queryKey: ['whistleblow-reports', statusFilter],
    queryFn: () =>
      whistleblowApi.listReports(statusFilter ? { status: statusFilter } : {}).then(r => r.data),
    enabled: tab === 'reports',
  });

  const { data: selectedReport } = useQuery({
    queryKey: ['whistleblow-report', selectedId],
    queryFn: () => whistleblowApi.getReport(selectedId!).then(r => r.data),
    enabled: !!selectedId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      whistleblowApi.updateReport(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whistleblow-reports'] });
      qc.invalidateQueries({ queryKey: ['whistleblow-report', selectedId] });
      qc.invalidateQueries({ queryKey: ['whistleblow-dashboard'] });
    },
  });

  const copyLink = () => {
    const slug = (window as any).__orgSlug || 'demo';
    navigator.clipboard.writeText(`${window.location.origin}/denuncias/submeter?org=${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const TABS = [
    { key: 'dashboard', label: 'Painel', icon: Shield },
    { key: 'reports', label: 'Denúncias', icon: Eye },
    { key: 'conduct', label: 'Código de Conduta', icon: BookOpen },
    { key: 'training', label: 'Formação', icon: GraduationCap },
    { key: 'menac', label: 'Relatório MENAC', icon: FileBarChart2 },
  ] as const;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Canal de Denúncias</h1>
              <p className="text-sm text-gray-500">
                RGPC · Lei 93/2021 · Directiva UE 2019/1937
              </p>
            </div>
          </div>
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado!' : 'Copiar link público'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelectedId(null); }}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                tab === t.key
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-600 hover:text-gray-800',
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Dashboard Tab ── */}
      {tab === 'dashboard' && dash && (
        <div className="space-y-6">
          {/* Compliance health score */}
          <div className="bg-white border rounded-xl p-6 flex items-center gap-6">
            <div className="flex-shrink-0">
              <div className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white',
                dash.complianceHealth >= 80 ? 'bg-green-500' :
                dash.complianceHealth >= 60 ? 'bg-amber-500' : 'bg-red-500',
              )}>
                {dash.complianceHealth}%
              </div>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">Saúde do Canal de Denúncias</p>
              <p className="text-sm text-gray-500">
                Conformidade com prazos legais obrigatórios (Lei 93/2021)
              </p>
              {(dash.ackOverdue > 0 || dash.resolutionOverdue > 0) && (
                <div className="flex gap-3 mt-2">
                  {dash.ackOverdue > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {dash.ackOverdue} acuses em atraso
                    </span>
                  )}
                  {dash.resolutionOverdue > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {dash.resolutionOverdue} resoluções em atraso
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="ml-auto grid grid-cols-3 gap-4 text-center">
              {[
                { label: 'Total', value: dash.total, color: 'text-gray-900' },
                { label: 'Em aberto', value: dash.open, color: 'text-amber-600' },
                { label: 'Concluídas', value: dash.byStatus?.find((s: any) => s.status === 'CONCLUDED')?.count ?? 0, color: 'text-green-600' },
              ].map(s => (
                <div key={s.label}>
                  <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Two columns */}
          <div className="grid grid-cols-2 gap-6">
            {/* Recent reports */}
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4 text-gray-400" /> Denúncias Recentes
              </h3>
              {dash.recentReports?.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Sem denúncias registadas</p>
              ) : (
                <div className="space-y-2">
                  {dash.recentReports?.map((r: any) => (
                    <div
                      key={r.id}
                      onClick={() => { setTab('reports'); setSelectedId(r.id); }}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-mono text-blue-700">{r.referenceCode}</p>
                        <p className="text-xs text-gray-500">
                          {CATEGORY_LABELS[r.category]} · {r.isAnonymous ? 'Anónimo' : 'Identificado'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          STATUS_LABELS[r.status]?.color,
                        )}>
                          {STATUS_LABELS[r.status]?.label}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming deadlines */}
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" /> Prazos a Expirar (30 dias)
              </h3>
              {dash.upcomingDeadlines?.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Sem prazos a expirar</p>
              ) : (
                <div className="space-y-2">
                  {dash.upcomingDeadlines?.map((r: any) => {
                    const days = Math.ceil(
                      (new Date(r.resolutionDeadline).getTime() - Date.now()) / 86400000,
                    );
                    return (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-mono text-blue-700">{r.referenceCode}</p>
                          <p className="text-xs text-gray-500">{STATUS_LABELS[r.status]?.label}</p>
                        </div>
                        <span className={cn(
                          'text-xs font-semibold px-2 py-1 rounded-lg',
                          days <= 7 ? 'bg-red-100 text-red-700' :
                          days <= 14 ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600',
                        )}>
                          {days}d restantes
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* By category */}
          {dash.byCategory?.length > 0 && (
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Denúncias por Categoria</h3>
              <div className="grid grid-cols-4 gap-3">
                {dash.byCategory.map((c: any) => (
                  <div key={c.category} className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-xl font-bold text-gray-900">{c.count}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{CATEGORY_LABELS[c.category]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legal compliance info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm">
            <h3 className="font-semibold text-blue-900 mb-2">Obrigações Legais (Lei 93/2021)</h3>
            <div className="grid grid-cols-3 gap-4 text-blue-800">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs">Acuse de recepção em <strong>7 dias úteis</strong></p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs">Resolução em <strong>3 meses</strong> (prorrogável até 6)</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs">Relatório anual ao <strong>MENAC</strong></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reports Tab ── */}
      {tab === 'reports' && !selectedId && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Pesquisar denúncias..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todos os estados</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l.label}</option>
              ))}
            </select>
          </div>

          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Referência</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Categoria</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Canal</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Acuse</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Resolução</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportsData?.reports
                  ?.filter((r: any) =>
                    !search ||
                    r.referenceCode.toLowerCase().includes(search.toLowerCase()) ||
                    CATEGORY_LABELS[r.category]?.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((r: any) => {
                    const ackOverdue = r.ackOverdue;
                    const resOverdue = r.resolutionOverdue;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedId(r.id)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-4 py-3 font-mono text-blue-700">{r.referenceCode}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {CATEGORY_LABELS[r.category] || r.category}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {r.isAnonymous ? '🕵️ Anónimo' : '👤 Identificado'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            STATUS_LABELS[r.status]?.color,
                          )}>
                            {STATUS_LABELS[r.status]?.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {r.acknowledgedAt ? (
                            <span className="text-green-600">✓ {new Date(r.acknowledgedAt).toLocaleDateString('pt-PT')}</span>
                          ) : ackOverdue ? (
                            <span className="text-red-600 font-semibold">⚠ Em atraso</span>
                          ) : (
                            <span className="text-gray-400">{new Date(r.ackDeadline).toLocaleDateString('pt-PT')}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {resOverdue ? (
                            <span className="text-red-600 font-semibold">⚠ Em atraso</span>
                          ) : (
                            <span className="text-gray-400">{new Date(r.resolutionDeadline).toLocaleDateString('pt-PT')}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(r.createdAt).toLocaleDateString('pt-PT')}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {(!reportsData?.reports || reportsData.reports.length === 0) && (
              <p className="text-center py-12 text-gray-400">Sem denúncias registadas</p>
            )}
          </div>
        </div>
      )}

      {/* ── Report Detail ── */}
      {tab === 'reports' && selectedId && selectedReport && (
        <div>
          <button
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            ← Voltar à lista
          </button>

          <div className="grid grid-cols-3 gap-6">
            {/* Main info */}
            <div className="col-span-2 space-y-4">
              <div className="bg-white border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900 font-mono">
                    {selectedReport.referenceCode}
                  </h2>
                  <span className={cn(
                    'text-sm px-3 py-1 rounded-full',
                    STATUS_LABELS[selectedReport.status]?.color,
                  )}>
                    {STATUS_LABELS[selectedReport.status]?.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Categoria</p>
                    <p className="font-medium">{CATEGORY_LABELS[selectedReport.category]}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Canal</p>
                    <p className="font-medium">
                      {selectedReport.isAnonymous ? 'Anónimo' : 'Identificado'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Data de submissão</p>
                    <p className="font-medium">
                      {new Date(selectedReport.createdAt).toLocaleDateString('pt-PT')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Prazo de resolução</p>
                    <p className="font-medium">
                      {new Date(selectedReport.resolutionDeadline).toLocaleDateString('pt-PT')}
                      {selectedReport.deadlineExtended && ' (prorrogado)'}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">Assunto</p>
                  <p className="font-semibold text-gray-800">{selectedReport.subject}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Descrição</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {selectedReport.description}
                  </p>
                </div>

                {selectedReport.incidentDate && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1">Data do incidente</p>
                    <p className="text-sm">
                      {new Date(selectedReport.incidentDate).toLocaleDateString('pt-PT')}
                      {selectedReport.incidentLocation && ` — ${selectedReport.incidentLocation}`}
                    </p>
                  </div>
                )}

                {selectedReport.repeatOffense && (
                  <p className="mt-2 text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg inline-block">
                    ⚠ Situação recorrente / repetida
                  </p>
                )}
              </div>

              {/* Persons */}
              {selectedReport.persons?.length > 0 && (
                <div className="bg-white border rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" /> Pessoas Envolvidas
                  </h3>
                  <div className="space-y-2">
                    {selectedReport.persons.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-semibold',
                          p.role === 'ACCUSED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600',
                        )}>
                          {p.role === 'ACCUSED' ? 'Visado' : 'Testemunha'}
                        </span>
                        <span className="text-sm font-medium">{p.name || '(sem nome)'}</span>
                        {p.jobTitle && <span className="text-xs text-gray-500">{p.jobTitle}</span>}
                        {p.department && <span className="text-xs text-gray-400">— {p.department}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="bg-white border rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Histórico (Auditoria Imutável)</h3>
                <div className="space-y-3">
                  {selectedReport.timeline?.map((t: any, i: number) => (
                    <div key={t.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                        {i < selectedReport.timeline.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 mt-1" />
                        )}
                      </div>
                      <div className="pb-3">
                        <p className="text-sm text-gray-800">{t.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(t.createdAt).toLocaleString('pt-PT')}
                          {t.actor && ` — ${t.actor.firstName} ${t.actor.lastName}`}
                          {t.actorRole && ` (${t.actorRole})`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions panel */}
            <div className="space-y-4">
              {/* Status update */}
              <div className="bg-white border rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Actualizar Estado</h3>
                <select
                  value={selectedReport.status}
                  onChange={e =>
                    updateMutation.mutate({ id: selectedId, data: { status: e.target.value } })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
                >
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l.label}</option>
                  ))}
                </select>

                {!selectedReport.acknowledgedAt && (
                  <button
                    onClick={() =>
                      updateMutation.mutate({
                        id: selectedId,
                        data: { status: 'ACKNOWLEDGED' },
                      })
                    }
                    className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    Enviar Acuse de Recepção
                  </button>
                )}
              </div>

              {/* Conclusion */}
              <ConclusionPanel
                report={selectedReport}
                onSave={data =>
                  updateMutation.mutate({ id: selectedId, data })
                }
              />

              {/* Internal note */}
              <NotePanel
                reportId={selectedId}
                onAdded={() =>
                  qc.invalidateQueries({ queryKey: ['whistleblow-report', selectedId] })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Code of Conduct Tab ── */}
      {tab === 'conduct' && <ConductTab />}

      {/* ── Training Tab ── */}
      {tab === 'training' && <TrainingTab />}

      {/* ── MENAC Tab ── */}
      {tab === 'menac' && <MenacTab />}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function ConclusionPanel({ report, onSave }: any) {
  const [open, setOpen] = useState(false);
  const [conclusion, setConclusion] = useState(report.conclusionSummary || '');
  const [type, setType] = useState(report.conclusionType || '');

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-600 hover:bg-gray-50 text-left"
      >
        {report.conclusionSummary ? '✏️ Editar conclusão' : '+ Registar conclusão'}
      </button>
    );
  }

  return (
    <div className="bg-white border rounded-xl p-5">
      <h3 className="font-semibold text-gray-900 mb-3">Conclusão</h3>
      <select
        value={type}
        onChange={e => setType(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
      >
        <option value="">Tipo de conclusão...</option>
        <option value="SUBSTANTIATED">Fundada — acções tomadas</option>
        <option value="UNSUBSTANTIATED">Sem fundamento apurado</option>
        <option value="INSUFFICIENT_EVIDENCE">Prova insuficiente</option>
      </select>
      <textarea
        rows={4}
        value={conclusion}
        onChange={e => setConclusion(e.target.value)}
        placeholder="Resumo da conclusão (visível ao denunciante)..."
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none mb-3"
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            onSave({
              status: 'CONCLUDED',
              conclusionSummary: conclusion,
              conclusionType: type,
            });
            setOpen(false);
          }}
          className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
        >
          Guardar conclusão
        </button>
        <button onClick={() => setOpen(false)} className="px-3 border border-gray-300 rounded-lg text-sm">
          ✕
        </button>
      </div>
    </div>
  );
}

function NotePanel({ reportId, onAdded }: { reportId: string; onAdded: () => void }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await whistleblowApi.addNote(reportId, note);
      setNote('');
      onAdded();
    } catch {}
    setSaving(false);
  };

  return (
    <div className="bg-white border rounded-xl p-5">
      <h3 className="font-semibold text-gray-900 mb-3">Nota Interna</h3>
      <textarea
        rows={3}
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Nota interna (não visível ao denunciante)..."
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none mb-2"
      />
      <button
        onClick={save}
        disabled={saving || !note.trim()}
        className="w-full py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-40"
      >
        {saving ? 'A guardar...' : 'Adicionar nota'}
      </button>
    </div>
  );
}

function ConductTab() {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', version: '1.0', requiresAck: true });
  const qc = useQueryClient();

  const { data: docs } = useQuery({
    queryKey: ['whistleblow-conduct'],
    queryFn: () => whistleblowApi.listConduct().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => whistleblowApi.createConduct(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whistleblow-conduct'] });
      setCreating(false);
      setForm({ title: '', content: '', version: '1.0', requiresAck: true });
    },
  });

  const ackMutation = useMutation({
    mutationFn: (id: string) => whistleblowApi.acknowledgeConduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whistleblow-conduct'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Código de Conduta</h2>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Nova versão
        </button>
      </div>

      {creating && (
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Título do Código de Conduta"
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              value={form.version}
              onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
              placeholder="Versão (ex: 1.0)"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.requiresAck}
                onChange={e => setForm(f => ({ ...f, requiresAck: e.target.checked }))}
              />
              Requer acuse dos colaboradores
            </label>
          </div>
          <textarea
            rows={10}
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="Conteúdo do Código de Conduta (Markdown suportado)..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none font-mono"
          />
          <div className="flex gap-3">
            <button
              onClick={() => createMutation.mutate({ ...form, isActive: true, publish: true })}
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
            >
              Publicar
            </button>
            <button onClick={() => setCreating(false)} className="px-4 py-2 border rounded-lg text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {docs?.map((doc: any) => (
        <div key={doc.id} className="bg-white border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-900">{doc.title}</h3>
              <p className="text-xs text-gray-500">
                v{doc.version} ·{' '}
                {doc.publishedAt
                  ? `Publicado em ${new Date(doc.publishedAt).toLocaleDateString('pt-PT')}`
                  : 'Rascunho'}{' '}
                · {doc._count?.acknowledgments ?? 0} acuses
              </p>
            </div>
            <div className="flex items-center gap-2">
              {doc.isActive && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Activo
                </span>
              )}
              <button
                onClick={() => ackMutation.mutate(doc.id)}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Acusar leitura
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 whitespace-pre-line line-clamp-3">{doc.content}</p>
        </div>
      ))}
    </div>
  );
}

function TrainingTab() {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', trainingDate: '', durationMinutes: 60,
    instructor: '', location: '', mandatory: true,
  });
  const qc = useQueryClient();

  const { data: trainings } = useQuery({
    queryKey: ['whistleblow-trainings'],
    queryFn: () => whistleblowApi.listTrainings().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => whistleblowApi.createTraining(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whistleblow-trainings'] });
      setCreating(false);
    },
  });

  const markAttMutation = useMutation({
    mutationFn: ({ trainingId, userId, attended }: any) =>
      whistleblowApi.markAttendance(trainingId, userId, { attended }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whistleblow-trainings'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Plano de Formação</h2>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Nova formação
        </button>
      </div>

      {creating && (
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Título *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Ex: Formação Canal de Denúncias 2025"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Data *</label>
              <input
                type="datetime-local"
                value={form.trainingDate}
                onChange={e => setForm(f => ({ ...f, trainingDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Duração (min)</label>
              <input
                type="number"
                value={form.durationMinutes}
                onChange={e => setForm(f => ({ ...f, durationMinutes: +e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Formador</label>
              <input
                value={form.instructor}
                onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Nome do formador"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Local / URL</label>
              <input
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Sala de reuniões / https://meet..."
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Descrição</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.mandatory}
                onChange={e => setForm(f => ({ ...f, mandatory: e.target.checked }))}
              />
              Formação obrigatória
            </label>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
            >
              Criar formação
            </button>
            <button onClick={() => setCreating(false)} className="px-4 py-2 border rounded-lg text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {trainings?.map((t: any) => {
        const attended = t.attendees?.filter((a: any) => a.attended).length ?? 0;
        const total = t.attendees?.length ?? t._count?.attendees ?? 0;
        return (
          <div key={t.id} className="bg-white border rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{t.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(t.trainingDate).toLocaleString('pt-PT', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                  {t.instructor && ` · ${t.instructor}`}
                  {t.location && ` · ${t.location}`}
                  {' · '}{t.durationMinutes}min
                </p>
              </div>
              <div className="flex items-center gap-2">
                {t.mandatory && (
                  <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
                    Obrigatório
                  </span>
                )}
                <span className="text-sm font-semibold text-gray-700">
                  {attended}/{total} presentes
                </span>
              </div>
            </div>

            {t.attendees?.length > 0 && (
              <div className="mt-3 space-y-1">
                {t.attendees.map((a: any) => (
                  <div key={a.userId} className="flex items-center gap-3 py-1.5">
                    <span className="text-sm text-gray-700 flex-1">
                      {a.user?.firstName} {a.user?.lastName}
                    </span>
                    <button
                      onClick={() => markAttMutation.mutate({
                        trainingId: t.id, userId: a.userId, attended: !a.attended,
                      })}
                      className={cn(
                        'text-xs px-3 py-1 rounded-full transition-colors',
                        a.attended
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                      )}
                    >
                      {a.attended ? '✓ Presente' : 'Ausente'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MenacTab() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data, isLoading } = useQuery({
    queryKey: ['whistleblow-menac', year],
    queryFn: () => whistleblowApi.menacReport(year).then(r => r.data),
  });

  const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                   'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Relatório MENAC</h2>
          <p className="text-sm text-gray-500">
            Mecanismo Nacional Anti-Corrupção — Relatório Anual Obrigatório
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={e => setYear(+e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => {
              // Export as JSON for now
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `menac-${year}.json`;
              a.click();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Exportar JSON
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">A carregar...</p>
      ) : data ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total de denúncias', value: data.totalReports, color: 'text-gray-900' },
              { label: 'Concluídas', value: data.concluded, color: 'text-green-600' },
              { label: 'Sem fundamento', value: data.unfounded, color: 'text-gray-500' },
              { label: 'Em aberto', value: data.open, color: 'text-amber-600' },
            ].map(s => (
              <div key={s.label} className="bg-white border rounded-xl p-5 text-center">
                <p className={cn('text-3xl font-bold', s.color)}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* By month */}
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Denúncias por Mês — {year}</h3>
            <div className="grid grid-cols-12 gap-1 items-end" style={{ height: 100 }}>
              {MONTHS.map((m, i) => {
                const count = data.byMonth?.find((bm: any) => bm.month === i + 1)?.count ?? 0;
                const maxCount = Math.max(...(data.byMonth?.map((bm: any) => bm.count) ?? [1]), 1);
                const height = Math.max((count / maxCount) * 80, count > 0 ? 8 : 0);
                return (
                  <div key={m} className="flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-600 font-semibold">{count || ''}</span>
                    <div
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height }}
                      title={`${m}: ${count}`}
                    />
                    <span className="text-[10px] text-gray-400">{m}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By category */}
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Por Categoria</h3>
            <div className="space-y-2">
              {data.byCategory?.map((c: any) => {
                const pct = data.totalReports > 0
                  ? Math.round((c.count / data.totalReports) * 100)
                  : 0;
                return (
                  <div key={c.category} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-40 flex-shrink-0">
                      {CATEGORY_LABELS[c.category] || c.category}
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                      {c.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Training */}
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Formações Realizadas</h3>
            <div className="flex items-center gap-6 mb-4">
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.trainings?.length ?? 0}</p>
                <p className="text-xs text-gray-500">Formações</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.totalTrainingAttendees}</p>
                <p className="text-xs text-gray-500">Participantes totais</p>
              </div>
            </div>
            {data.trainings?.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b">
                    <th className="py-2 text-left">Formação</th>
                    <th className="py-2 text-left">Data</th>
                    <th className="py-2 text-right">Participantes</th>
                    <th className="py-2 text-right">Obrigatório</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trainings.map((t: any) => (
                    <tr key={t.id} className="border-b border-gray-50">
                      <td className="py-2">{t.title}</td>
                      <td className="py-2 text-gray-500">
                        {new Date(t.date).toLocaleDateString('pt-PT')}
                      </td>
                      <td className="py-2 text-right">{t.attendees}</td>
                      <td className="py-2 text-right">{t.mandatory ? '✓' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-400">Sem formações em {year}</p>
            )}
          </div>

          {/* Legal notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">⚠️ Obrigação legal de reporte ao MENAC</p>
            <p className="text-xs">
              Nos termos do artigo 22.º da Lei 93/2021, as entidades obrigadas devem
              enviar o relatório anual ao MENAC até 31 de Março de cada ano, referente
              ao ano anterior. Este relatório deve ser enviado via{' '}
              <a
                href="https://www.menac.pt"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 underline"
              >
                portal do MENAC
              </a>.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  CORRUPTION: 'Corrupção', FRAUD: 'Fraude', BRIBERY: 'Suborno',
  CONFLICT_OF_INTEREST: 'Conflito de interesses', ABUSE_OF_POWER: 'Abuso de poder',
  EMBEZZLEMENT: 'Desvio de fundos', MISUSE_OF_INFORMATION: 'Info. indevida',
  DATA_BREACH: 'Violação dados', WORKPLACE_HARASSMENT: 'Assédio',
  SAFETY_VIOLATION: 'Segurança', ENVIRONMENTAL_VIOLATION: 'Ambiental', OTHER: 'Outro',
};
