'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auditsApi } from '@/lib/api';
import { ArrowLeft, Plus, AlertTriangle, CheckCircle, Loader2, ClipboardList } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  MAJOR: 'bg-orange-100 text-orange-700',
  MINOR: 'bg-yellow-100 text-yellow-700',
  OBSERVATION: 'bg-blue-100 text-blue-700',
};

const FINDING_STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-red-50 text-red-600',
  IN_PROGRESS: 'bg-yellow-50 text-yellow-700',
  RESOLVED: 'bg-green-50 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-500',
};

function NewFindingModal({ auditId, onClose }: { auditId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm();

  const createMutation = useMutation({
    mutationFn: (data: any) => auditsApi.createFinding(auditId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['audit', auditId] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Novo Achado</h3>
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input
              {...register('title', { required: true })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              placeholder="Título do achado..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
              placeholder="Descreva o achado em detalhe..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severidade</label>
              <select {...register('severity')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                <option value="OBSERVATION">Observação</option>
                <option value="MINOR">Menor</option>
                <option value="MAJOR">Maior</option>
                <option value="CRITICAL">Crítico</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de Resolução</label>
              <input {...register('dueDate')} type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Evidência / Referência</label>
            <input
              {...register('evidence')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              placeholder="Doc. referenciado, secção, etc."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">Cancelar</button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Registar Achado
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showNewFinding, setShowNewFinding] = useState(false);
  const qc = useQueryClient();

  const { data: audit, isLoading } = useQuery({
    queryKey: ['audit', id],
    queryFn: () => auditsApi.getOne(id).then(r => r.data),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => auditsApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['audit', id] }),
  });

  const updateFindingMutation = useMutation({
    mutationFn: ({ findingId, status }: { findingId: string; status: string }) =>
      auditsApi.updateFinding(id, findingId, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['audit', id] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!audit) return null;

  const findings = audit.findings || [];
  const openFindings = findings.filter((f: any) => f.status === 'OPEN').length;
  const criticalFindings = findings.filter((f: any) => f.severity === 'CRITICAL').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/audits" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{audit.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {audit.type} · {audit.project?.name || 'Sem projeto'}
              {audit.startDate && <> · {formatDate(audit.startDate)}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={audit.status}
            onChange={e => updateStatusMutation.mutate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="PLANNED">Planeado</option>
            <option value="IN_PROGRESS">Em Curso</option>
            <option value="COMPLETED">Concluído</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
          <button
            onClick={() => setShowNewFinding(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> Registar Achado
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total de Achados', value: findings.length, icon: ClipboardList, color: 'text-gray-600', bg: 'bg-gray-50' },
          { label: 'Em Aberto', value: openFindings, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Críticos', value: criticalFindings, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Resolvidos', value: findings.filter((f: any) => f.status === 'RESOLVED').length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', c.bg)}>
                <c.icon className={cn('w-4 h-4', c.color)} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{c.value}</p>
                <p className="text-xs text-gray-500">{c.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Audit Info */}
      {audit.scope && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Âmbito</h3>
          <p className="text-sm text-gray-600">{audit.scope}</p>
        </div>
      )}

      {/* Findings */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Achados e Não-Conformidades</h3>
        </div>
        {findings.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CheckCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Sem achados registados</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Título', 'Severidade', 'Estado', 'Prazo', 'Responsável'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {findings.map((f: any) => (
                <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{f.title}</p>
                    {f.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{f.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium', SEVERITY_COLORS[f.severity])}>
                      {f.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={f.status}
                      onChange={e => updateFindingMutation.mutate({ findingId: f.id, status: e.target.value })}
                      className={cn('text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer', FINDING_STATUS_COLORS[f.status])}
                    >
                      <option value="OPEN">Aberto</option>
                      <option value="IN_PROGRESS">Em Curso</option>
                      <option value="RESOLVED">Resolvido</option>
                      <option value="CLOSED">Fechado</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {f.dueDate ? formatDate(f.dueDate) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {f.assignee ? `${f.assignee.firstName} ${f.assignee.lastName}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showNewFinding && <NewFindingModal auditId={id} onClose={() => setShowNewFinding(false)} />}
    </div>
  );
}
