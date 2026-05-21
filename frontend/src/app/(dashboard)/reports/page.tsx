'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api';
import { BarChart2, Download, Plus, Loader2, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn, formatDateTime, getStatusColor } from '@/lib/utils';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

function StatusIcon({ status }: { status: string }) {
  if (status === 'READY') return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (status === 'FAILED') return <XCircle className="w-4 h-4 text-red-500" />;
  return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />;
}

export default function ReportsPage() {
  const [generating, setGenerating] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => reportsApi.summary().then(r => r.data),
  });

  const { data: reportsList } = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportsApi.list().then(r => r.data),
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => reportsApi.generate(data),
  });

  const tasksData = summary?.tasks
    ? Object.entries(summary.tasks).map(([status, count]) => ({ name: status.replace('_', ' '), value: count as number }))
    : [];

  const risksData = summary?.risks
    ? Object.entries(summary.risks).map(([status, count]) => ({ name: status, value: count as number }))
    : [];

  const COLORS = ['#1B4F8A', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

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
          <p className="text-sm font-medium text-gray-700 mt-2">Índice de Conformidade</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Estado das Tarefas</h4>
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
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Estado dos Riscos</h4>
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
          { label: 'Projetos Total', value: summary?.projects?.total ?? 0 },
          { label: 'Auditorias Concluídas', value: summary?.auditsCompleted ?? 0 },
          { label: 'CAPA em Aberto', value: summary?.openCapas ?? 0 },
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
            <span className="text-sm font-medium">Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Generate report */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Gerar Relatório</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { type: 'COMPLIANCE_SUMMARY', label: 'Resumo de Conformidade', format: 'PDF' },
            { type: 'RISK_REGISTER', label: 'Registo de Riscos', format: 'EXCEL' },
            { type: 'TASK_STATUS', label: 'Estado das Tarefas', format: 'EXCEL' },
            { type: 'EVIDENCE_GAP', label: 'Lacunas de Evidência', format: 'PDF' },
          ].map(r => (
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

      {/* Report history */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Histórico de Relatórios</h3>
        {!reportsList?.length ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhum relatório gerado ainda</p>
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
                  {r.s3Url && (
                    <a href={r.s3Url} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-gray-100 rounded-lg">
                      <Download className="w-4 h-4 text-gray-500" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
