'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { esgApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Leaf, BarChart2, FileText, Plus, Pencil, X,
  CheckCircle2, Clock, Circle, ShieldCheck,
  TrendingUp, Globe, Users, Building2,
} from 'lucide-react';
import { format } from 'date-fns';

// ── Helpers ───────────────────────────────────────────────────

const PILLAR_CONFIG = {
  ENVIRONMENTAL: { label: 'Ambiental (E)', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: Globe },
  SOCIAL:        { label: 'Social (S)',     color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',    icon: Users },
  GOVERNANCE:    { label: 'Governação (G)', color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200',  icon: Building2 },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  NOT_REPORTED: { label: 'Não Reportado', color: 'text-gray-500', bg: 'bg-gray-100', icon: Circle },
  COLLECTING:   { label: 'A Recolher',   color: 'text-blue-600',  bg: 'bg-blue-100',  icon: Clock },
  REPORTED:     { label: 'Reportado',    color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle2 },
  VERIFIED:     { label: 'Verificado',   color: 'text-purple-600',bg: 'bg-purple-100',icon: ShieldCheck },
};

// ── Metric Edit Modal ─────────────────────────────────────────

function MetricModal({
  metric,
  onClose,
  onSave,
}: { metric: any; onClose: () => void; onSave: (data: any) => void }) {
  const [form, setForm] = useState({
    actualValue: metric.actualValue ?? '',
    targetValue: metric.targetValue ?? '',
    status: metric.status ?? 'NOT_REPORTED',
    dataSource: metric.dataSource ?? '',
    methodology: metric.methodology ?? '',
    notes: metric.notes ?? '',
    period: metric.period ?? String(new Date().getFullYear()),
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-5 border-b flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-mono text-gray-400">{metric.standardCode} · {metric.framework}</span>
            <h2 className="text-base font-semibold text-gray-900 mt-0.5">{metric.indicator}</h2>
            {metric.unit && <span className="text-xs text-gray-500">Unidade: {metric.unit}</span>}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Real</label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.actualValue}
                onChange={e => set('actualValue', e.target.value)}
                placeholder="ex: 1250.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Alvo</label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.targetValue}
                onChange={e => set('targetValue', e.target.value)}
                placeholder="ex: 1000"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.status}
              onChange={e => set('status', e.target.value)}
            >
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fonte de Dados</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.dataSource}
              onChange={e => set('dataSource', e.target.value)}
              placeholder="ex: Sistema ERP, Medidor automático..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Metodologia</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.methodology}
              onChange={e => set('methodology', e.target.value)}
              placeholder="ex: GHG Protocol Scope 1..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={() => onSave({
            actualValue: form.actualValue !== '' ? parseFloat(String(form.actualValue)) : null,
            targetValue: form.targetValue !== '' ? parseFloat(String(form.targetValue)) : null,
            status: form.status,
            dataSource: form.dataSource || null,
            methodology: form.methodology || null,
            notes: form.notes || null,
            period: form.period,
          })}>
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Report Modal ──────────────────────────────────────────────

function ReportModal({ onClose, onSave }: { onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    title: '',
    year: String(new Date().getFullYear()),
    framework: 'CSRD',
    description: '',
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold">Novo Relatório ESG</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Relatório de Sustentabilidade 2024" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.year} onChange={e => set('year', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Framework</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.framework} onChange={e => set('framework', e.target.value)}>
                <option value="CSRD">CSRD</option>
                <option value="GRI">GRI</option>
                <option value="ESRS">ESRS</option>
                <option value="CUSTOM">Personalizado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!form.title} onClick={() => onSave({ ...form, year: parseInt(form.year) })}>Criar Relatório</Button>
        </div>
      </div>
    </div>
  );
}

// ── Metric Row ────────────────────────────────────────────────

function MetricRow({ metric, onEdit }: { metric: any; onEdit: (m: any) => void }) {
  const status = STATUS_CONFIG[metric.status] || STATUS_CONFIG.NOT_REPORTED;
  const StatusIcon = status.icon;
  const hasValue = metric.actualValue !== null && metric.actualValue !== undefined;

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 group">
      <div className="w-24 flex-shrink-0">
        <span className="text-xs font-mono font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{metric.standardCode}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{metric.indicator}</p>
        {metric.description && <p className="text-xs text-gray-500 truncate">{metric.description}</p>}
      </div>
      <div className="w-28 text-right flex-shrink-0">
        {hasValue ? (
          <span className="text-sm font-semibold text-gray-900">
            {typeof metric.actualValue === 'number' ? metric.actualValue.toLocaleString('pt-PT') : metric.actualValue}
            {metric.unit && <span className="text-xs text-gray-400 ml-1">{metric.unit}</span>}
          </span>
        ) : (
          <span className="text-xs text-gray-400 italic">—</span>
        )}
      </div>
      <div className="w-32 flex-shrink-0">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${status.bg} ${status.color}`}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>
      </div>
      <button
        onClick={() => onEdit(metric)}
        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-all flex-shrink-0"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Pillar Section ────────────────────────────────────────────

function PillarSection({ pillar, metrics, onEdit }: { pillar: string; metrics: any[]; onEdit: (m: any) => void }) {
  const config = PILLAR_CONFIG[pillar as keyof typeof PILLAR_CONFIG];
  if (!config || metrics.length === 0) return null;
  const Icon = config.icon;
  const reported = metrics.filter(m => m.status === 'REPORTED' || m.status === 'VERIFIED').length;
  const pct = Math.round((reported / metrics.length) * 100);

  return (
    <div className={`border rounded-xl overflow-hidden mb-4 ${config.border}`}>
      <div className={`px-4 py-3 flex items-center gap-3 ${config.bg}`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
        <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="w-24 bg-white/60 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-gray-300'}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-xs font-medium ${config.color}`}>{reported}/{metrics.length} ({pct}%)</span>
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {metrics.map(m => <MetricRow key={m.id} metric={m} onEdit={onEdit} />)}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
  { id: 'csrd',      label: 'CSRD',      icon: Leaf },
  { id: 'gri',       label: 'GRI',       icon: Globe },
  { id: 'reports',   label: 'Relatórios',icon: FileText },
];

const YEAR = new Date().getFullYear();

export default function EsgPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('dashboard');
  const [editMetric, setEditMetric] = useState<any>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(YEAR);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['esg-dashboard', selectedYear],
    queryFn: () => esgApi.dashboard(selectedYear).then(r => r.data),
  });

  const { data: reportsData } = useQuery({
    queryKey: ['esg-reports'],
    queryFn: () => esgApi.listReports().then(r => r.data),
    enabled: tab === 'reports',
  });

  const seedMut = useMutation({
    mutationFn: () => esgApi.seed(selectedYear),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['esg-dashboard'] }),
  });

  const updateMetricMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => esgApi.updateMetric(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['esg-dashboard'] });
      setEditMetric(null);
    },
  });

  const createReportMut = useMutation({
    mutationFn: (data: any) => esgApi.createReport(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['esg-reports'] });
      setShowReportModal(false);
    },
  });

  const allMetrics = [
    ...(dashboard?.csrdMetrics || []),
    ...(dashboard?.griMetrics || []),
  ];
  const csrdMetrics = dashboard?.csrdMetrics || [];
  const griMetrics = dashboard?.griMetrics || [];

  const csrdByPillar: Record<string, any[]> = {};
  for (const m of csrdMetrics) {
    if (!csrdByPillar[m.pillar]) csrdByPillar[m.pillar] = [];
    csrdByPillar[m.pillar].push(m);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ESG & Sustentabilidade</h1>
            <p className="text-sm text-gray-500">CSRD · GRI · Reporting de Sustentabilidade</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="border rounded-lg px-3 py-2 text-sm text-gray-700"
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
          >
            {[YEAR - 1, YEAR, YEAR + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {(!dashboard || (dashboard.totalMetrics === 0)) && (
            <Button size="sm" variant="outline" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
              {seedMut.isPending ? 'A inicializar...' : 'Inicializar Métricas CSRD'}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Dashboard Tab */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-16 text-gray-400">A carregar...</div>
          ) : !dashboard || dashboard.totalMetrics === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <Leaf className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-600 mb-1">Sem métricas ESG</h3>
              <p className="text-sm text-gray-400 mb-4">Inicialize as métricas CSRD/GRI para começar o reporting de sustentabilidade.</p>
              <Button onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
                Inicializar Métricas {selectedYear}
              </Button>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4">
                  <div className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-2">Score Geral</div>
                  <div className="text-3xl font-bold text-emerald-700">{dashboard.overallScore}%</div>
                  <div className="text-xs text-emerald-600 mt-1">métricas reportadas</div>
                </div>
                {Object.entries(PILLAR_CONFIG).map(([pillar, cfg]) => {
                  const pData = dashboard.byPillar?.[pillar];
                  const Icon = cfg.icon;
                  return (
                    <div key={pillar} className={`${cfg.bg} rounded-xl p-4`}>
                      <div className={`text-xs font-medium ${cfg.color} uppercase tracking-wide mb-2 flex items-center gap-1`}>
                        <Icon className="w-3 h-3" />{cfg.label}
                      </div>
                      <div className={`text-3xl font-bold ${cfg.color}`}>{pData?.score ?? 0}%</div>
                      <div className={`text-xs ${cfg.color} mt-1`}>{pData?.reported ?? 0}/{pData?.total ?? 0} reportadas</div>
                    </div>
                  );
                })}
              </div>

              {/* Progress by pillar */}
              <div className="bg-white rounded-xl border p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Progresso por Pilar CSRD</h3>
                <div className="space-y-3">
                  {Object.entries(PILLAR_CONFIG).map(([pillar, cfg]) => {
                    const pData = dashboard.byPillar?.[pillar];
                    const score = pData?.score ?? 0;
                    const Icon = cfg.icon;
                    return (
                      <div key={pillar} className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                          <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                        </div>
                        <div className="w-32 text-sm font-medium text-gray-700">{cfg.label}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${score >= 80 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-gray-300'}`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <div className="text-sm text-gray-600 w-12 text-right">{score}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status breakdown */}
              <div className="bg-white rounded-xl border p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Estado das Métricas</h3>
                <div className="grid grid-cols-4 gap-3">
                  {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <div key={status} className={`${cfg.bg} rounded-lg p-3 text-center`}>
                        <Icon className={`w-5 h-5 mx-auto mb-1 ${cfg.color}`} />
                        <div className={`text-xl font-bold ${cfg.color}`}>{dashboard.byStatus?.[status] ?? 0}</div>
                        <div className={`text-xs ${cfg.color}`}>{cfg.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* CSRD Tab */}
      {tab === 'csrd' && (
        <div>
          {csrdMetrics.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>Sem métricas CSRD. Clique em "Inicializar Métricas CSRD" no topo.</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Norma Europeia de Relato de Sustentabilidade (ESRS). Clique em qualquer métrica para inserir dados.
              </p>
              {['ENVIRONMENTAL', 'SOCIAL', 'GOVERNANCE'].map(pillar => (
                <PillarSection
                  key={pillar}
                  pillar={pillar}
                  metrics={csrdByPillar[pillar] || []}
                  onEdit={setEditMetric}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* GRI Tab */}
      {tab === 'gri' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">Global Reporting Initiative (GRI) — indicadores universais de sustentabilidade.</p>
          </div>
          {griMetrics.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>Sem métricas GRI inicializadas.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-gray-700">GRI Standards</span>
                <span className="text-xs text-gray-400">({griMetrics.length} indicadores)</span>
              </div>
              <div>
                {griMetrics.map((m: any) => <MetricRow key={m.id} metric={m} onEdit={setEditMetric} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {tab === 'reports' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">Relatórios de sustentabilidade anuais.</p>
            <Button size="sm" onClick={() => setShowReportModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Novo Relatório
            </Button>
          </div>
          {!reportsData || reportsData.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Nenhum relatório criado ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reportsData.map((r: any) => (
                <div key={r.id} className="bg-white rounded-xl border p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                    <p className="text-xs text-gray-500">{r.framework} · {r.year}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    r.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                    r.status === 'IN_REVIEW' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {r.status === 'PUBLISHED' ? 'Publicado' : r.status === 'IN_REVIEW' ? 'Em Revisão' : 'Rascunho'}
                  </span>
                  <span className="text-xs text-gray-400">{r.createdAt ? format(new Date(r.createdAt), 'dd/MM/yyyy') : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {editMetric && (
        <MetricModal
          metric={editMetric}
          onClose={() => setEditMetric(null)}
          onSave={data => updateMetricMut.mutate({ id: editMetric.id, data })}
        />
      )}
      {showReportModal && (
        <ReportModal
          onClose={() => setShowReportModal(false)}
          onSave={data => createReportMut.mutate(data)}
        />
      )}
    </div>
  );
}
