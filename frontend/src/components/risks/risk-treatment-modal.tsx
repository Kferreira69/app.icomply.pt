'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { risksApi } from '@/lib/api';
import { X, Shield, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type TreatmentType = 'MITIGATE' | 'ACCEPT' | 'TRANSFER' | 'AVOID';
type ResidualLevel  = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NEGLIGIBLE';

interface Props {
  risk: {
    id: string;
    title: string;
    riskLevel?: string;
    inherentScore?: number;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

const TREATMENT_TYPES: { value: TreatmentType; label: string; desc: string }[] = [
  { value: 'MITIGATE',  label: 'Mitigar',    desc: 'Implementar controlos para reduzir a probabilidade ou impacto' },
  { value: 'ACCEPT',   label: 'Aceitar',     desc: 'Aceitar o risco dentro do apetite de risco da organização' },
  { value: 'TRANSFER', label: 'Transferir',  desc: 'Transferir o risco para terceiros (seguros, outsourcing)' },
  { value: 'AVOID',    label: 'Evitar',      desc: 'Eliminar a actividade que origina o risco' },
];

const RESIDUAL_LEVELS: { value: ResidualLevel; label: string; color: string }[] = [
  { value: 'CRITICAL',   label: 'Crítico',    color: 'text-red-600' },
  { value: 'HIGH',       label: 'Alto',       color: 'text-orange-600' },
  { value: 'MEDIUM',     label: 'Médio',      color: 'text-yellow-600' },
  { value: 'LOW',        label: 'Baixo',      color: 'text-green-600' },
  { value: 'NEGLIGIBLE', label: 'Negligível', color: 'text-gray-500' },
];

const INP = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-colors';

export function RiskTreatmentModal({ risk, onClose, onSuccess }: Props) {
  const qc = useQueryClient();
  const [type, setType]               = useState<TreatmentType>('MITIGATE');
  const [description, setDescription] = useState('');
  const [responsible, setResponsible] = useState('');
  const [dueDate, setDueDate]         = useState('');
  const [residualLevel, setResidualLevel] = useState<ResidualLevel | ''>('');
  const [errors, setErrors]           = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => risksApi.updateTreatment(risk.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['risks'] });
      onSuccess?.();
      onClose();
    },
  });

  function validate(): boolean {
    const e: Record<string, string> = {};
    if ((type === 'MITIGATE' || type === 'TRANSFER') && !description.trim()) {
      e.description = 'Descrição obrigatória para este tipo de tratamento.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(evt: React.FormEvent) {
    evt.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      treatmentType:   type,
      treatmentPlan:   description.trim() || undefined,
      treatmentStatus: 'PLANNED',
      treatmentDueDate: dueDate || undefined,
      riskOwner:       responsible.trim() || undefined,
      residualLevel:   residualLevel || undefined,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-blue-600" />
              <h3 className="text-base font-bold text-gray-900">Plano de Tratamento</h3>
            </div>
            <p className="text-sm text-gray-500 line-clamp-2 max-w-sm">{risk.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Treatment type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Tipo de Tratamento *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TREATMENT_TYPES.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={cn(
                    'text-left p-3 rounded-xl border-2 transition-all text-sm',
                    type === opt.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-100 hover:border-gray-200 bg-white',
                  )}
                >
                  <p className={cn('font-semibold', type === opt.value ? 'text-blue-700' : 'text-gray-800')}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-tight">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
              Descrição do plano
              {(type === 'MITIGATE' || type === 'TRANSFER') && ' *'}
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descrição do plano de tratamento..."
              className={cn(INP, 'resize-none', errors.description && 'border-red-400 focus:border-red-500')}
            />
            {errors.description && (
              <p className="text-xs text-red-600 mt-1">{errors.description}</p>
            )}
          </div>

          {/* Responsible + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                Responsável
              </label>
              <input
                type="text"
                value={responsible}
                onChange={e => setResponsible(e.target.value)}
                placeholder="Nome ou email..."
                className={INP}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                Prazo
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className={INP}
              />
            </div>
          </div>

          {/* Expected residual level */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
              Nível Residual Esperado
            </label>
            <select
              value={residualLevel}
              onChange={e => setResidualLevel(e.target.value as ResidualLevel | '')}
              className={INP}
            >
              <option value="">Selecionar nível residual esperado...</option>
              {RESIDUAL_LEVELS.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {mutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <CheckCircle2 className="w-4 h-4" />
              }
              Guardar Plano
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
