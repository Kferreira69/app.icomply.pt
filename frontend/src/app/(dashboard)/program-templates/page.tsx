'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { programTemplatesApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  BookTemplate, Play, CheckCircle2, Loader2, Calendar,
  Shield, Lock, FileCheck, Award, Layers, Zap,
} from 'lucide-react';

const FRAMEWORK_META: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  GDPR:      { color: 'text-blue-700',   bg: 'bg-blue-100',   icon: <Shield className="w-4 h-4" /> },
  ISO27001:  { color: 'text-indigo-700', bg: 'bg-indigo-100', icon: <Lock className="w-4 h-4" /> },
  NIS2:      { color: 'text-purple-700', bg: 'bg-purple-100', icon: <Zap className="w-4 h-4" /> },
  ISO9001:   { color: 'text-green-700',  bg: 'bg-green-100',  icon: <Award className="w-4 h-4" /> },
  SOC2:      { color: 'text-orange-700', bg: 'bg-orange-100', icon: <FileCheck className="w-4 h-4" /> },
  DEFAULT:   { color: 'text-gray-700',   bg: 'bg-gray-100',   icon: <Layers className="w-4 h-4" /> },
};

function TemplateCard({ template, onActivate }: { template: any; onActivate: () => void }) {
  const meta = FRAMEWORK_META[template.framework] ?? FRAMEWORK_META.DEFAULT;
  const tasks = template.tasks as any[];
  const totalDays = tasks.reduce((s: number, t: any) => s + (t.durationDays ?? 0), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', meta.bg, meta.color)}>
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">{template.name}</p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{template.description}</p>
        </div>
        {template.isGlobal && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">Built-in</span>
        )}
      </div>

      <div className="flex items-center gap-3 text-[11px] text-gray-400">
        <span className={cn('font-semibold px-2 py-0.5 rounded-full', meta.bg, meta.color)}>{template.framework}</span>
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{totalDays} dias</span>
        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{tasks.length} tarefas</span>
        {template._count?.activations > 0 && (
          <span className="flex items-center gap-1"><Play className="w-3 h-3" />{template._count.activations}× ativado</span>
        )}
      </div>

      {/* Task preview */}
      <div className="space-y-1">
        {tasks.slice(0, 3).map((t: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-[9px] font-bold flex-shrink-0">{i + 1}</span>
            <span className="truncate">{t.title}</span>
            <span className="flex-shrink-0 text-gray-300">{t.durationDays}d</span>
          </div>
        ))}
        {tasks.length > 3 && <p className="text-xs text-gray-400 pl-6">+{tasks.length - 3} tarefas</p>}
      </div>

      <button onClick={onActivate}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:opacity-90 mt-auto">
        <Play className="w-4 h-4" /> Ativar programa
      </button>
    </div>
  );
}

function ActivationModal({ template, onClose }: { template: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const mutation = useMutation({
    mutationFn: () => programTemplatesApi.activate(template.id, { startDate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['program-activations'] });
      qc.invalidateQueries({ queryKey: ['action-plans'] });
      onClose();
    },
  });

  const tasks = template.tasks as any[];
  const totalDays = tasks.reduce((s: number, t: any) => s + (t.durationDays ?? 0), 0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + totalDays);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-base font-bold text-gray-800">Ativar: {template.name}</h2>
        <p className="text-sm text-gray-500">{template.description}</p>

        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Data de início *</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <p className="text-xs text-gray-400 mt-1">
            Duração total: {totalDays} dias → conclusão prevista: {endDate.toLocaleDateString('pt-PT')}
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 max-h-48 overflow-y-auto">
          {tasks.map((t: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
              <span className="flex-1 truncate">{t.title}</span>
              <span className="text-gray-400 flex-shrink-0">{t.durationDays}d</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-500 bg-blue-50 rounded-xl p-3">
          Será criado automaticamente um <strong>Plano de Ação</strong> com todas as tarefas e datas calculadas a partir de {new Date(startDate).toLocaleDateString('pt-PT')}.
        </p>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl disabled:opacity-40 hover:opacity-90 flex items-center gap-1.5">
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Ativar programa
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProgramTemplatesPage() {
  const [activating, setActivating] = useState<any>(null);
  const [tab, setTab] = useState<'templates' | 'activations'>('templates');

  const { data: templates, isLoading } = useQuery({
    queryKey: ['program-templates'],
    queryFn: () => programTemplatesApi.list().then(r => r.data),
  });

  const { data: activations, isLoading: loadingAct } = useQuery({
    queryKey: ['program-activations'],
    queryFn: () => programTemplatesApi.getActivations().then(r => r.data),
    enabled: tab === 'activations',
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <BookTemplate className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates de Programa</h1>
          <p className="text-sm text-gray-500">Ativa programas GRC pré-configurados num clique</p>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'templates',   label: 'Biblioteca' },
          { key: 'activations', label: 'Ativações' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'templates' && (
        isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(templates ?? []).map((t: any) => (
              <TemplateCard key={t.id} template={t} onActivate={() => setActivating(t)} />
            ))}
          </div>
        )
      )}

      {tab === 'activations' && (
        loadingAct ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : (activations ?? []).length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <BookTemplate className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-gray-500">Nenhum programa ativado ainda</p>
            <button onClick={() => setTab('templates')} className="mt-3 text-sm text-primary font-semibold hover:opacity-80">
              Ver biblioteca →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {(activations ?? []).map((a: any) => {
              const meta = FRAMEWORK_META[a.template?.framework] ?? FRAMEWORK_META.DEFAULT;
              const planTasks = a.actionPlan?._count?.tasks ?? 0;
              return (
                <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', meta.bg, meta.color)}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800">{a.template?.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Ativado por {a.activatedBy?.firstName} {a.activatedBy?.lastName} · {new Date(a.createdAt).toLocaleDateString('pt-PT')}
                      {' · '}{planTasks} tarefas
                    </p>
                  </div>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                    a.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                    a.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                    {a.status === 'ACTIVE' ? 'Ativo' : a.status === 'COMPLETED' ? 'Concluído' : a.status}
                  </span>
                </div>
              );
            })}
          </div>
        )
      )}

      {activating && <ActivationModal template={activating} onClose={() => setActivating(null)} />}
    </div>
  );
}
