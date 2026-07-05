'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { automationApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Zap, Plus, Loader2, Trash2, Play, ToggleRight, ToggleLeft,
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, History, Edit2,
} from 'lucide-react';

const TRIGGERS: Record<string, string> = {
  RISK_SCORE_HIGH:    'Risco com score alto',
  AUDIT_DUE_SOON:     'Auditoria prestes a vencer',
  CONTROL_EXPIRING:   'Controlo a expirar',
  CAPA_OVERDUE:       'CAPA em atraso',
  TASK_OVERDUE:       'Tarefa em atraso',
  FORM_SUBMITTED:     'Formulário submetido',
  APPROVAL_RESOLVED:  'Aprovação resolvida',
  MANUAL:             'Acionamento manual',
};

const ACTIONS: Record<string, string> = {
  CREATE_TASK:        'Criar tarefa',
  SEND_NOTIFICATION:  'Enviar notificação',
  UPDATE_RAG_STATUS:  'Atualizar status RAG',
  ASSIGN_USER:        'Atribuir utilizador',
  CREATE_APPROVAL:    'Criar pedido de aprovação',
};

const PRESET_RULES = [
  {
    name: 'Alerta riscos críticos',
    description: 'Notifica o compliance manager quando um risco tem score ≥ 8',
    trigger: 'RISK_SCORE_HIGH',
    conditions: [{ field: 'score', operator: 'gte', value: 8 }],
    actions: [{ type: 'SEND_NOTIFICATION', params: { message: 'Risco crítico identificado', role: 'COMPLIANCE_MANAGER' } }],
  },
  {
    name: 'CAPA vencida → tarefa automática',
    description: 'Cria uma tarefa de follow-up quando um CAPA passa da data limite sem ser fechado',
    trigger: 'CAPA_OVERDUE',
    conditions: [],
    actions: [{ type: 'CREATE_TASK', params: { title: 'Follow-up CAPA em atraso', assignTo: 'owner' } }],
  },
  {
    name: 'Formulário submetido → aprovação',
    description: 'Cria pedido de aprovação automático quando um intake form é submetido',
    trigger: 'FORM_SUBMITTED',
    conditions: [],
    actions: [{ type: 'CREATE_APPROVAL', params: { title: 'Revisão de submissão', threshold: 1 } }],
  },
];

function RuleCard({ rule, onEdit }: { rule: any; onEdit: (r: any) => void }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const toggleMutation = useMutation({
    mutationFn: () => automationApi.update(rule.id, { isActive: !rule.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-rules'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => automationApi.remove(rule.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-rules'] }),
  });

  const triggerMutation = useMutation({
    mutationFn: () => automationApi.trigger(rule.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-rules'] });
      qc.invalidateQueries({ queryKey: ['automation-logs', rule.id] });
    },
  });

  const { data: logs } = useQuery({
    queryKey: ['automation-logs', rule.id],
    queryFn: () => automationApi.getLogs(rule.id).then(r => r.data),
    enabled: expanded,
  });

  const actions = rule.actions as any[];
  const conditions = rule.conditions as any[];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
            rule.isActive ? 'bg-amber-100' : 'bg-gray-100')}>
            <Zap className={cn('w-4 h-4', rule.isActive ? 'text-amber-600' : 'text-gray-400')} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm text-gray-800">{rule.name}</p>
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                {rule.isActive ? 'Ativa' : 'Inativa'}
              </span>
            </div>
            {rule.description && <p className="text-xs text-gray-500 mt-0.5">{rule.description}</p>}
            <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
              <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{TRIGGERS[rule.trigger] ?? rule.trigger}</span>
              <span className="flex items-center gap-1"><Play className="w-3 h-3" />{rule.runCount ?? 0}× executada</span>
              {rule._count?.logs > 0 && <span className="flex items-center gap-1"><History className="w-3 h-3" />{rule._count.logs} logs</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {rule.trigger === 'MANUAL' && (
              <button onClick={() => triggerMutation.mutate()} disabled={triggerMutation.isPending}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 px-2.5 py-1 rounded-lg">
                {triggerMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Executar
              </button>
            )}
            <button onClick={() => onEdit(rule)}
              className="p-1.5 hover:bg-gray-100 rounded-lg" title="Editar regra">
              <Edit2 className="w-3.5 h-3.5 text-gray-400" />
            </button>
            <button onClick={() => toggleMutation.mutate()} disabled={toggleMutation.isPending}
              className="p-1.5 hover:bg-gray-100 rounded-lg" title={rule.isActive ? 'Desativar' : 'Ativar'}>
              {rule.isActive ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
            </button>
            <button onClick={() => { if (confirm('Eliminar regra?')) deleteMutation.mutate(); }}
              className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => setExpanded(e => !e)} className="p-1.5 hover:bg-gray-100 rounded-lg">
              {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-50 bg-gray-50/30 p-4 space-y-3">
          {conditions.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Condições</p>
              <div className="space-y-1">
                {conditions.map((c: any, i: number) => (
                  <div key={i} className="text-xs text-gray-600 bg-white rounded-lg px-3 py-1.5 border border-gray-100">
                    <code>{c.field} {c.operator} {JSON.stringify(c.value)}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Ações ({actions.length})</p>
            <div className="space-y-1">
              {actions.map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-white rounded-lg px-3 py-1.5 border border-gray-100">
                  <Zap className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  <span className="font-medium">{ACTIONS[a.type] ?? a.type}</span>
                  {a.params?.message && <span className="text-gray-400 truncate">— "{a.params.message}"</span>}
                </div>
              ))}
            </div>
          </div>

          {logs && logs.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Histórico recente</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {logs.slice(0, 10).map((log: any) => (
                  <div key={log.id} className="flex items-center gap-2 text-xs">
                    {log.success ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                    <span className="text-gray-500">{new Date(log.triggeredAt).toLocaleString('pt-PT')}</span>
                    {log.errorMessage && <span className="text-red-500 truncate">{log.errorMessage}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RuleModal({ existing, onClose }: { existing?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!existing;
  const [name, setName]       = useState(existing?.name ?? '');
  const [desc, setDesc]       = useState(existing?.description ?? '');
  const [trigger, setTrigger] = useState(existing?.trigger ?? 'MANUAL');
  const [actions, setActions] = useState(
    existing?.actions?.length ? [{ type: existing.actions[0].type, params: existing.actions[0].params ?? { message: '' } }]
    : [{ type: 'SEND_NOTIFICATION', params: { message: '' } }]
  );

  const createMutation = useMutation({
    mutationFn: () => automationApi.create({ name, description: desc || undefined, trigger: trigger as any, conditions: [], actions }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automation-rules'] }); onClose(); },
  });

  const updateMutation = useMutation({
    mutationFn: () => automationApi.update(existing!.id, { name, description: desc || undefined, trigger, actions }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automation-rules'] }); onClose(); },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const submit = () => isEdit ? updateMutation.mutate() : createMutation.mutate();

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-base font-bold text-gray-800">
          {isEdit ? 'Editar Regra de Automação' : 'Nova Regra de Automação'}
        </h2>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Nome *</label>
          <input value={name} onChange={e => setName(e.target.value)} autoFocus
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Ex: Alerta risco crítico" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Descrição</label>
          <input value={desc} onChange={e => setDesc(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Descreve o comportamento desta regra" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Trigger</label>
          <select value={trigger} onChange={e => setTrigger(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none bg-white">
            {Object.entries(TRIGGERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Ação principal</label>
          <select value={actions[0].type} onChange={e => setActions([{ type: e.target.value, params: { message: '' } }])}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none bg-white">
            {Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {(actions[0].type === 'SEND_NOTIFICATION' || actions[0].type === 'CREATE_TASK') && (
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">
              {actions[0].type === 'SEND_NOTIFICATION' ? 'Mensagem da notificação' : 'Título da tarefa'}
            </label>
            <input value={actions[0].params?.message ?? ''} onChange={e => setActions([{ ...actions[0], params: { ...actions[0].params, message: e.target.value } }])}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={actions[0].type === 'SEND_NOTIFICATION' ? 'Ex: Risco crítico detetado' : 'Ex: Follow-up urgente'} />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          <button onClick={submit} disabled={!name.trim() || isPending}
            className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl disabled:opacity-40 hover:opacity-90 flex items-center gap-1.5">
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? 'Guardar alterações' : 'Criar regra'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AutomationPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);

  const { data: summary } = useQuery({
    queryKey: ['automation-summary'],
    queryFn: () => automationApi.getSummary().then(r => r.data),
  });

  const { data: rules, isLoading } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: () => automationApi.list().then(r => r.data),
  });

  const createPreset = useMutation({
    mutationFn: (preset: any) => automationApi.create(preset),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-rules'] }),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Zap className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Motor de Automações</h1>
            <p className="text-sm text-gray-500">Regras de trigger automático para processos GRC</p>
          </div>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:opacity-90">
          <Plus className="w-4 h-4" /> Nova regra
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total regras',       value: summary?.total ?? 0,              color: 'text-gray-600',  bg: 'bg-gray-50' },
          { label: 'Ativas',             value: summary?.active ?? 0,             color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Execuções (7 dias)', value: summary?.triggersLast7Days ?? 0,  color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl p-4 border border-transparent', s.bg)}>
            <p className={cn('text-xs font-medium mb-1', s.color)}>{s.label}</p>
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Presets banner */}
      {(rules ?? []).length === 0 && !isLoading && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-6">
          <p className="text-sm font-semibold text-amber-800 mb-3">Regras pré-configuradas — começa em segundos:</p>
          <div className="space-y-2">
            {PRESET_RULES.map(p => (
              <div key={p.name} className="flex items-center justify-between gap-3 bg-white rounded-xl px-4 py-3 border border-amber-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.description}</p>
                </div>
                <button onClick={() => createPreset.mutate(p)} disabled={createPreset.isPending}
                  className="flex-shrink-0 text-xs font-semibold text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg">
                  Usar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : (rules ?? []).length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Zap className="w-12 h-12 text-gray-200 mb-3" />
          <p className="text-gray-500">Nenhuma regra de automação</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(rules ?? []).map((r: any) => (
            <RuleCard key={r.id} rule={r} onEdit={setEditingRule} />
          ))}
        </div>
      )}

      {(showNew || editingRule) && (
        <RuleModal
          existing={editingRule ?? undefined}
          onClose={() => { setShowNew(false); setEditingRule(null); }}
        />
      )}
    </div>
  );
}
