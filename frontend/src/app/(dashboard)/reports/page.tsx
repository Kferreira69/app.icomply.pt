'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { reportsApi } from '@/lib/api';
import { BarChart2, Download, Loader2, CheckCircle, XCircle, Clock, CalendarClock, Plus, Trash2, Mail, Edit2, X } from 'lucide-react';
import { HelpButton } from '@/components/help/HelpButton';
import { formatDateTime } from '@/lib/utils';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

function StatusIcon({ status }: { status: string }) {
  if (status === 'READY') return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (status === 'FAILED') return <XCircle className="w-4 h-4 text-red-500" />;
  return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />;
}

async function triggerDownload(report: any) {
  try {
    const res = await reportsApi.download(report.id);
    const ext: Record<string, string> = { PDF: 'pdf', EXCEL: 'xlsx', JSON: 'json' };
    const blob = new Blob([res.data], { type: (res.headers['content-type'] as string | undefined) ?? undefined });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.name}.${ext[report.format] ?? 'bin'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e: any) {
    console.error('Download failed', e);
    alert(`Erro ao descarregar relatório: ${e?.response?.data?.message || e?.message || 'Erro desconhecido'}`);
  }
}

function ScheduledReportsPanel() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newSched, setNewSched] = useState({ name: '', type: 'COMPLIANCE_SUMMARY', format: 'PDF', frequency: 'MONTHLY', recipients: '' });
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', type: '', format: 'PDF', frequency: 'MONTHLY', recipients: '' });

  const { data: schedules = [] } = useQuery({
    queryKey: ['report-schedules'],
    queryFn: () => reportsApi.listSchedules().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => reportsApi.createSchedule(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['report-schedules'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => reportsApi.updateSchedule(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['report-schedules'] }); setEditingSchedule(null); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => reportsApi.removeSchedule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['report-schedules'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: any) => reportsApi.updateSchedule(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['report-schedules'] }),
  });

  const openEdit = (s: any) => {
    setEditForm({ name: s.name, type: s.type, format: s.format || 'PDF', frequency: s.frequency, recipients: (s.recipients || []).join(', ') });
    setEditingSchedule(s);
  };

  const FREQ_LABELS: Record<string, string> = { DAILY: 'Diário', WEEKLY: 'Semanal', MONTHLY: 'Mensal', QUARTERLY: 'Trimestral' };
  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none';

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-gray-500" /> Relatórios Automáticos
        </h3>
        <button onClick={() => setShowForm(p => !p)}
          className="flex items-center gap-1.5 text-sm text-primary hover:underline">
          <Plus className="w-4 h-4" /> Novo agendamento
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <input className={inp} value={newSched.name} onChange={e => setNewSched(p => ({ ...p, name: e.target.value }))} placeholder="Nome do agendamento (ex: Relatório Mensal GDPR)" />
            </div>
            <select className={inp} value={newSched.type} onChange={e => setNewSched(p => ({ ...p, type: e.target.value }))}>
              <option value="COMPLIANCE_SUMMARY">Resumo Conformidade</option>
              <option value="RISK_REGISTER">Registo de Riscos</option>
              <option value="TASK_STATUS">Estado de Tarefas</option>
              <option value="EVIDENCE_GAP">Gap de Evidências</option>
            </select>
            <select className={inp} value={newSched.frequency} onChange={e => setNewSched(p => ({ ...p, frequency: e.target.value }))}>
              {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div className="col-span-2">
              <input className={inp} value={newSched.recipients}
                onChange={e => setNewSched(p => ({ ...p, recipients: e.target.value }))}
                placeholder="Emails dos destinatários (separados por vírgula)" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
            <button onClick={() => createMutation.mutate({ ...newSched, recipients: newSched.recipients.split(',').map(e => e.trim()).filter(Boolean) })}
              disabled={!newSched.name || createMutation.isPending}
              className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {createMutation.isPending ? 'A criar...' : 'Criar agendamento'}
            </button>
          </div>
        </div>
      )}

      {editingSchedule && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Editar Agendamento</h2>
              <button onClick={() => setEditingSchedule(null)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <input className={inp} value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome do agendamento" />
              <div className="grid grid-cols-2 gap-3">
                <select className={inp} value={editForm.type} onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))}>
                  <option value="COMPLIANCE_SUMMARY">Resumo Conformidade</option>
                  <option value="RISK_REGISTER">Registo de Riscos</option>
                  <option value="TASK_STATUS">Estado de Tarefas</option>
                  <option value="EVIDENCE_GAP">Gap de Evidências</option>
                </select>
                <select className={inp} value={editForm.format} onChange={e => setEditForm(p => ({ ...p, format: e.target.value }))}>
                  <option value="PDF">PDF</option>
                  <option value="EXCEL">Excel</option>
                  <option value="JSON">JSON</option>
                </select>
              </div>
              <select className={inp} value={editForm.frequency} onChange={e => setEditForm(p => ({ ...p, frequency: e.target.value }))}>
                {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input className={inp} value={editForm.recipients} onChange={e => setEditForm(p => ({ ...p, recipients: e.target.value }))} placeholder="Emails dos destinatários (separados por vírgula)" />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditingSchedule(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
                <button
                  onClick={() => updateMutation.mutate({ id: editingSchedule.id, data: { ...editForm, recipients: editForm.recipients.split(',').map((e: string) => e.trim()).filter(Boolean) } })}
                  disabled={!editForm.name || updateMutation.isPending}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-primary/90">
                  {updateMutation.isPending ? 'A guardar...' : 'Guardar alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(schedules as any[]).length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Sem agendamentos configurados</p>
      ) : (
        <div className="space-y-2">
          {(schedules as any[]).map((s: any) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${s.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.type} · {FREQ_LABELS[s.frequency] || s.frequency}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {s.recipients?.length > 0 && (
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3" />{s.recipients.length}</span>
                )}
                <button onClick={() => toggleMutation.mutate({ id: s.id, isActive: !s.isActive })}
                  className={`text-xs px-2 py-1 rounded-lg font-medium ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {s.isActive ? 'Ativo' : 'Pausado'}
                </button>
                <button onClick={() => openEdit(s)}
                  className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-500 transition-colors" title="Editar">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => removeMutation.mutate(s.id)}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const t = useTranslations('reports');
  const qc = useQueryClient();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => reportsApi.summary().then(r => r.data),
  });

  const { data: reportsList } = useQuery({
    queryKey: ['reports', 'list'],
    queryFn: () => reportsApi.list().then(r => r.data),
    refetchInterval: (query) => {
      const data = query.state.data;
      return Array.isArray(data) && data.some((r: any) => r.status === 'PENDING') ? 3000 : false;
    },
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => reportsApi.generate(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', 'list'] }),
  });

  const tasksData = summary?.tasks
    ? Object.entries(summary.tasks).map(([status, count]) => ({ name: status.replace('_', ' '), value: count as number }))
    : [];

  // risks is an array of risk objects — group by level for the chart
  const risksData = summary?.risks && Array.isArray(summary.risks)
    ? Object.entries(
        (summary.risks as any[]).reduce((acc: Record<string, number>, r: any) => {
          const key = r.level ?? r.status ?? 'UNKNOWN';
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, count]) => ({ name, value: count as number }))
    : [];

  const COLORS = ['#1B4F8A', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  const REPORT_TYPES = [
    { type: 'COMPLIANCE_SUMMARY', label: t('typeComplianceSummary'), format: 'PDF' },
    { type: 'RISK_REGISTER',      label: t('typeRiskRegister'),      format: 'EXCEL' },
    { type: 'TASK_STATUS',        label: t('typeTaskStatus'),        format: 'EXCEL' },
    { type: 'EVIDENCE_GAP',       label: t('typeEvidenceGap'),       format: 'PDF' },
  ];

  return (
    <div className="space-y-6">
      {/* Compliance overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col items-center justify-center">
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 120 120" className="w-full h-full">
              <circle cx="60" cy="60" r="50" stroke="#e5e7eb" strokeWidth="10" fill="none" />
              <circle
                cx="60" cy="60" r="50"
                stroke="#1B4F8A" strokeWidth="10" fill="none"
                strokeDasharray={2 * Math.PI * 50}
                strokeDashoffset={2 * Math.PI * 50 * (1 - (summary?.complianceScore || 0) / 100)}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-gray-900">{summary?.complianceScore ?? 0}%</span>
              <span className="text-xs text-gray-500">Score</span>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-700 mt-2">{t('complianceIndex')}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('tasksStatus')}</h4>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={tasksData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {tasksData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('risksStatus')}</h4>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={risksData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('kpiProjects'), value: summary?.projects?.total ?? 0 },
          { label: t('kpiAudits'), value: summary?.auditsCompleted ?? 0 },
          { label: t('kpiCapa'), value: summary?.openCapas ?? 0 },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
        <div className="bg-primary rounded-xl p-4 text-center text-white">
          <button
            onClick={() => generateMutation.mutate({ type: 'COMPLIANCE_SUMMARY', format: 'PDF' })}
            disabled={generateMutation.isPending}
            className="flex flex-col items-center gap-1 w-full"
          >
            {generateMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
            <span className="text-sm font-medium">{t('exportPdf')}</span>
          </button>
        </div>
      </div>

      {/* Generate report */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{t('generate')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {REPORT_TYPES.map(r => (
            <button
              key={r.type}
              onClick={() => generateMutation.mutate({ type: r.type, format: r.format })}
              disabled={generateMutation.isPending}
              className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-colors text-center"
            >
              <BarChart2 className="w-6 h-6 text-primary" />
              <span className="text-xs font-medium text-gray-700">{r.label}</span>
              <span className="text-xs text-gray-400">{r.format}</span>
            </button>
          ))}
        </div>
        {generateMutation.data && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            ✓ {generateMutation.data.data?.message}
          </div>
        )}
      </div>

      {/* Scheduled reports */}
      <ScheduledReportsPanel />

      {/* Report history */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{t('history')}</h3>
        {!reportsList?.length ? (
          <p className="text-sm text-gray-400 text-center py-8">{t('noReports')}</p>
        ) : (
          <div className="space-y-2">
            {reportsList.slice(0, 10).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <StatusIcon status={r.status} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.name}</p>
                    <p className="text-xs text-gray-500">{r.type} · {r.format}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{formatDateTime(r.createdAt)}</span>
                  {r.status === 'READY' && (
                    <button
                      onClick={() => triggerDownload(r)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <HelpButton page="reports" />
    </div>
  );
}
