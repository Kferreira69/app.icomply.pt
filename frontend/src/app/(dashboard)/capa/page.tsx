'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { capaApi } from '@/lib/api';
import { Plus, AlertCircle, Loader2, Calendar } from 'lucide-react';
import { cn, formatDate, getStatusColor, isOverdue } from '@/lib/utils';
import { useForm } from 'react-hook-form';

const CAPA_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberto', IN_PROGRESS: 'Em Curso', PENDING_VERIFICATION: 'A Verificar', CLOSED: 'Fechado', OVERDUE: 'Em Atraso',
};

function NewCapaModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const createMutation = useMutation({
    mutationFn: (data: any) => capaApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['capa'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Nova Ação Corretiva (CAPA)</h3>
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input {...register('title', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
            <textarea {...register('description', { required: true })} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Causa Raiz</label>
            <textarea {...register('rootCause')} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ação Corretiva</label>
            <textarea {...register('correctiveAction')} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prazo</label>
            <input {...register('dueDate')} type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={createMutation.isPending} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar CAPA
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CapaPage() {
  const [showNew, setShowNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['capa', statusFilter],
    queryFn: () => capaApi.list({ status: statusFilter || undefined }).then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      capaApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['capa'] }),
  });

  const capas = data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none"
        >
          <option value="">Todos os estados</option>
          {Object.entries(CAPA_STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Nova CAPA
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-5 gap-3">
        {Object.entries(CAPA_STATUS_LABELS).map(([status, label]) => (
          <div key={status} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {capas.filter((c: any) => c.status === status).length}
            </p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Título', 'Finding', 'Responsável', 'Estado', 'Prazo', 'Ação'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {capas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Nenhuma CAPA registada</p>
                  </td>
                </tr>
              ) : capas.map((c: any) => (
                <tr key={c.id} className={cn('border-b border-gray-100 hover:bg-gray-50', isOverdue(c.dueDate) && c.status !== 'CLOSED' && 'bg-red-50/30')}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{c.title}</p>
                    <p className="text-xs text-gray-400 line-clamp-1">{c.description}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {c.finding?.title ? <span className={cn('px-1.5 py-0.5 rounded', getStatusColor(c.finding.severity))}>{c.finding.title}</span> : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {c.assignee ? `${c.assignee.firstName} ${c.assignee.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium', getStatusColor(c.status))}>
                      {CAPA_STATUS_LABELS[c.status] || c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className={cn('flex items-center gap-1 text-xs', isOverdue(c.dueDate) && c.status !== 'CLOSED' ? 'text-red-600 font-medium' : 'text-gray-500')}>
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(c.dueDate)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.status !== 'CLOSED' && (
                      <select
                        value={c.status}
                        onChange={e => updateMutation.mutate({ id: c.id, status: e.target.value })}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-primary outline-none"
                      >
                        {Object.entries(CAPA_STATUS_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <NewCapaModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
