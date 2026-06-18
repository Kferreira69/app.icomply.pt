'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bcpApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  ShieldAlert, Plus, Pencil, Trash2, X, ChevronDown, ChevronRight,
  PlayCircle, Server,
  Users, Database, Building,
} from 'lucide-react';
import { format } from 'date-fns';

// ── Helpers ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:    { label: 'Rascunho',  color: 'text-gray-600',  bg: 'bg-gray-100' },
  APPROVED: { label: 'Aprovado',  color: 'text-blue-600',  bg: 'bg-blue-100' },
  ACTIVE:   { label: 'Ativo',     color: 'text-green-600', bg: 'bg-green-100' },
  OBSOLETE: { label: 'Obsoleto',  color: 'text-red-600',   bg: 'bg-red-100' },
};

const TEST_TYPES: Record<string, string> = {
  TABLETOP:        'Mesa Redonda',
  WALKTHROUGH:     'Revisão Guiada',
  SIMULATION:      'Simulação',
  FULL_TEST:       'Teste Completo',
  DR_TEST:         'Teste DR',
};

const TEST_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PLANNED:     { label: 'Planeado',    color: 'text-blue-700',   bg: 'bg-blue-100' },
  IN_PROGRESS: { label: 'Em Curso',    color: 'text-yellow-700', bg: 'bg-yellow-100' },
  COMPLETED:   { label: 'Concluído',   color: 'text-green-700',  bg: 'bg-green-100' },
  FAILED:      { label: 'Falhado',     color: 'text-red-700',    bg: 'bg-red-100' },
};

const RESULT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PASSED:  { label: 'Aprovado', color: 'text-green-700', bg: 'bg-green-100' },
  PARTIAL: { label: 'Parcial',  color: 'text-yellow-700', bg: 'bg-yellow-100' },
  FAILED:  { label: 'Falhou',   color: 'text-red-700',   bg: 'bg-red-100' },
};

const ASSET_TYPES: Record<string, { label: string; icon: React.ElementType }> = {
  SYSTEM:      { label: 'Sistema',      icon: Server },
  APPLICATION: { label: 'Aplicação',   icon: Database },
  DATA:        { label: 'Dados',        icon: Database },
  PERSONNEL:   { label: 'Pessoal',      icon: Users },
  FACILITY:    { label: 'Instalação',   icon: Building },
  SUPPLIER:    { label: 'Fornecedor',   icon: Building },
};

const CRITICALITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  CRITICAL: { label: 'Crítico',  color: 'text-red-700',    bg: 'bg-red-100' },
  HIGH:     { label: 'Alto',     color: 'text-orange-700', bg: 'bg-orange-100' },
  MEDIUM:   { label: 'Médio',    color: 'text-yellow-700', bg: 'bg-yellow-100' },
  LOW:      { label: 'Baixo',    color: 'text-gray-600',   bg: 'bg-gray-100' },
};

function fmtMinutes(mins: number | null | undefined): string {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ── Plan Modal ────────────────────────────────────────────────

function PlanModal({ initial, onClose, onSave }: { initial?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    scope: initial?.scope ?? '',
    version: initial?.version ?? '1.0',
    status: initial?.status ?? 'DRAFT',
    rtoTarget: initial?.rtoTarget ?? '',
    rpoTarget: initial?.rpoTarget ?? '',
    nextTestAt: initial?.nextTestAt ? initial.nextTestAt.slice(0, 10) : '',
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold">{initial ? 'Editar Plano BCP' : 'Novo Plano BCP'}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Plano *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e => set('name', e.target.value)} placeholder="ex: BCP Sede Lisboa" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Âmbito</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.scope} onChange={e => set('scope', e.target.value)} placeholder="Descrição do âmbito e sistemas cobertos..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Versão</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.version} onChange={e => set('version', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => set('status', e.target.value)}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RTO Alvo (horas)</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.rtoTarget} onChange={e => set('rtoTarget', e.target.value)} placeholder="ex: 4" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RPO Alvo (horas)</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.rpoTarget} onChange={e => set('rpoTarget', e.target.value)} placeholder="ex: 1" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Próximo Teste</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.nextTestAt} onChange={e => set('nextTestAt', e.target.value)} />
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!form.name} onClick={() => onSave({
            name: form.name,
            scope: form.scope || undefined,
            version: form.version,
            status: form.status,
            rtoTarget: form.rtoTarget ? parseInt(form.rtoTarget) : undefined,
            rpoTarget: form.rpoTarget ? parseInt(form.rpoTarget) : undefined,
            nextTestAt: form.nextTestAt || undefined,
          })}>Guardar</Button>
        </div>
      </div>
    </div>
  );
}

// ── Old Test Modal (used inside PlanCard) ─────────────────────

function TestModal({ planId, onClose, onSave }: { planId: string; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    testType: 'TABLETOP',
    testedAt: new Date().toISOString().slice(0, 10),
    result: 'PASSED',
    rtoActual: '',
    rpoActual: '',
    findings: '',
    correctiveActions: '',
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold">Registar Teste BCP/DR</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Teste</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.testType} onChange={e => set('testType', e.target.value)}>
                {Object.entries(TEST_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data do Teste</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.testedAt} onChange={e => set('testedAt', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resultado</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.result} onChange={e => set('result', e.target.value)}>
              {Object.entries(RESULT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RTO Real (horas)</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.rtoActual} onChange={e => set('rtoActual', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RPO Real (horas)</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.rpoActual} onChange={e => set('rpoActual', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Findings</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.findings} onChange={e => set('findings', e.target.value)} placeholder="Problemas identificados durante o teste..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ações Corretivas</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.correctiveActions} onChange={e => set('correctiveActions', e.target.value)} placeholder="Ações a tomar para melhorar..." />
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={() => onSave({
            testType: form.testType,
            testedAt: new Date(form.testedAt).toISOString(),
            result: form.result,
            rtoActual: form.rtoActual ? parseInt(form.rtoActual) : undefined,
            rpoActual: form.rpoActual ? parseInt(form.rpoActual) : undefined,
            findings: form.findings || undefined,
            correctiveActions: form.correctiveActions || undefined,
          })}>Registar Teste</Button>
        </div>
      </div>
    </div>
  );
}

// ── BCP Test Exercise Modal (create/edit from Exercises tab) ──

function ExerciseModal({
  plans,
  initial,
  onClose,
  onSave,
}: {
  plans: any[];
  initial?: any;
  onClose: () => void;
  onSave: (planId: string, data: any) => void;
}) {
  const [form, setForm] = useState({
    planId: initial?.planId ?? (plans[0]?.id ?? ''),
    testType: initial?.testType ?? 'TABLETOP',
    testedAt: initial?.testedAt ? initial.testedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    rtoActual: initial?.rtoActual != null ? String(initial.rtoActual) : '',
    rpoActual: initial?.rpoActual != null ? String(initial.rpoActual) : '',
    result: initial?.result ?? 'PASSED',
    findings: initial?.findings ?? '',
    correctiveActions: initial?.correctiveActions ?? '',
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const isEdit = !!initial;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold">{isEdit ? 'Editar Exercício BCP' : 'Novo Exercício / Teste BCP'}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plano BCP *</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.planId}
              onChange={e => set('planId', e.target.value)}
              disabled={isEdit}
            >
              {plans.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Teste *</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.testType} onChange={e => set('testType', e.target.value)}>
                {Object.entries(TEST_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data do Teste *</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.testedAt} onChange={e => set('testedAt', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RTO Real (minutos)</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.rtoActual} onChange={e => set('rtoActual', e.target.value)} placeholder="ex: 270" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RPO Real (minutos)</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.rpoActual} onChange={e => set('rpoActual', e.target.value)} placeholder="ex: 60" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resultado</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.result} onChange={e => set('result', e.target.value)}>
              {Object.entries(RESULT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lições Aprendidas</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.findings} onChange={e => set('findings', e.target.value)} placeholder="O que correu bem e o que pode ser melhorado..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ações Corretivas</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.correctiveActions} onChange={e => set('correctiveActions', e.target.value)} placeholder="Medidas a implementar após o exercício..." />
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            disabled={!form.planId || !form.testedAt}
            onClick={() => onSave(form.planId, {
              testType: form.testType,
              testedAt: new Date(form.testedAt).toISOString(),
              result: form.result,
              rtoActual: form.rtoActual ? parseInt(form.rtoActual) : undefined,
              rpoActual: form.rpoActual ? parseInt(form.rpoActual) : undefined,
              findings: form.findings || undefined,
              correctiveActions: form.correctiveActions || undefined,
            })}
          >
            {isEdit ? 'Guardar Alterações' : 'Registar Exercício'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Asset Modal ───────────────────────────────────────────────

function AssetModal({ planId, onClose, onSave }: { planId: string; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    assetName: '',
    assetType: 'SYSTEM',
    criticality: 'HIGH',
    rtoRequired: '',
    rpoRequired: '',
    recoveryOwner: '',
    recoverySteps: '',
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold">Adicionar Ativo Crítico</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Ativo *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.assetName} onChange={e => set('assetName', e.target.value)} placeholder="ex: ERP Principal, Base de Dados Clientes..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.assetType} onChange={e => set('assetType', e.target.value)}>
                {Object.entries(ASSET_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Criticidade</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.criticality} onChange={e => set('criticality', e.target.value)}>
                {Object.entries(CRITICALITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RTO Requerido (h)</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.rtoRequired} onChange={e => set('rtoRequired', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RPO Requerido (h)</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.rpoRequired} onChange={e => set('rpoRequired', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsável pela Recuperação</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.recoveryOwner} onChange={e => set('recoveryOwner', e.target.value)} placeholder="Nome ou equipa responsável" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passos de Recuperação</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={3} value={form.recoverySteps} onChange={e => set('recoverySteps', e.target.value)} placeholder="Procedimentos passo-a-passo para recuperação..." />
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!form.assetName} onClick={() => onSave({
            assetName: form.assetName,
            assetType: form.assetType,
            criticality: form.criticality,
            rtoRequired: form.rtoRequired ? parseInt(form.rtoRequired) : undefined,
            rpoRequired: form.rpoRequired ? parseInt(form.rpoRequired) : undefined,
            recoveryOwner: form.recoveryOwner || undefined,
            recoverySteps: form.recoverySteps || undefined,
          })}>Adicionar</Button>
        </div>
      </div>
    </div>
  );
}

// ── Plan Card ─────────────────────────────────────────────────

function PlanCard({ plan, onEdit }: { plan: any; onEdit: (p: any) => void }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);

  const status = STATUS_CONFIG[plan.status] || STATUS_CONFIG.DRAFT;

  const { data: detail } = useQuery({
    queryKey: ['bcp-plan', plan.id],
    queryFn: () => bcpApi.getPlan(plan.id).then(r => r.data),
    enabled: expanded,
  });

  const addTestMut = useMutation({
    mutationFn: (data: any) => bcpApi.addTest(plan.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bcp-plan', plan.id] }); setShowTestModal(false); },
  });

  const addAssetMut = useMutation({
    mutationFn: (data: any) => bcpApi.addAsset(plan.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bcp-plan', plan.id] }); setShowAssetModal(false); },
  });

  const removeTestMut = useMutation({
    mutationFn: (testId: string) => bcpApi.removeTest(plan.id, testId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bcp-plan', plan.id] }),
  });

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <button onClick={() => setExpanded(e => !e)} className="p-1 hover:bg-gray-100 rounded">
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
            <span className="text-xs text-gray-400">v{plan.version}</span>
          </div>
          {plan.scope && <p className="text-xs text-gray-500 truncate">{plan.scope}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {plan.rtoTarget && (
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">RTO {plan.rtoTarget}h</span>
          )}
          {plan.rpoTarget && (
            <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded">RPO {plan.rpoTarget}h</span>
          )}
          {plan.lastTestedAt && (
            <span className="text-xs text-gray-400">Testado: {format(new Date(plan.lastTestedAt), 'dd/MM/yy')}</span>
          )}
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.bg} ${status.color}`}>
            {status.label}
          </span>
          <button onClick={() => onEdit(plan)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t bg-gray-50/50 p-4 space-y-4">
          {/* Assets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Ativos Críticos</h4>
              <Button size="sm" variant="outline" onClick={() => setShowAssetModal(true)}>
                <Plus className="w-3 h-3 mr-1" /> Adicionar Ativo
              </Button>
            </div>
            {detail?.assets?.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Nenhum ativo crítico registado.</p>
            ) : (
              <div className="space-y-2">
                {(detail?.assets || []).map((asset: any) => {
                  const crit = CRITICALITY_CONFIG[asset.criticality] || CRITICALITY_CONFIG.MEDIUM;
                  const AssetIcon = ASSET_TYPES[asset.assetType]?.icon || Server;
                  return (
                    <div key={asset.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border text-sm">
                      <AssetIcon className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900 flex-1">{asset.assetName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${crit.bg} ${crit.color}`}>{crit.label}</span>
                      {asset.rtoRequired && <span className="text-xs text-gray-400">RTO {asset.rtoRequired}h</span>}
                      {asset.recoveryOwner && <span className="text-xs text-gray-400">{asset.recoveryOwner}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tests */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Histórico de Testes</h4>
              <Button size="sm" variant="outline" onClick={() => setShowTestModal(true)}>
                <PlayCircle className="w-3 h-3 mr-1" /> Registar Teste
              </Button>
            </div>
            {detail?.tests?.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Nenhum teste registado.</p>
            ) : (
              <div className="space-y-2">
                {(detail?.tests || []).map((test: any) => {
                  const result = RESULT_CONFIG[test.result] || { label: test.result, color: 'text-gray-500', bg: 'bg-gray-100' };
                  return (
                    <div key={test.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border text-sm">
                      <span className="text-gray-500">{TEST_TYPES[test.testType] || test.testType}</span>
                      <span className="text-gray-400 text-xs">{format(new Date(test.testedAt), 'dd/MM/yyyy')}</span>
                      <span className="flex-1" />
                      {test.rtoActual && <span className="text-xs text-gray-400">RTO {fmtMinutes(test.rtoActual)}</span>}
                      <span className={`text-xs font-semibold ${result.color}`}>{result.label}</span>
                      <button
                        onClick={() => removeTestMut.mutate(test.id)}
                        className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {showTestModal && (
        <TestModal
          planId={plan.id}
          onClose={() => setShowTestModal(false)}
          onSave={data => addTestMut.mutate(data)}
        />
      )}
      {showAssetModal && (
        <AssetModal
          planId={plan.id}
          onClose={() => setShowAssetModal(false)}
          onSave={data => addAssetMut.mutate(data)}
        />
      )}
    </div>
  );
}

// ── Exercises Tab ─────────────────────────────────────────────

function ExercisesTab({ plans }: { plans: any[] }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editTest, setEditTest] = useState<any>(null);

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['bcp-tests'],
    queryFn: () => bcpApi.listTests().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: any }) => bcpApi.addTest(planId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bcp-tests'] });
      qc.invalidateQueries({ queryKey: ['bcp-dashboard'] });
      setShowModal(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ planId, testId, data }: { planId: string; testId: string; data: any }) =>
      bcpApi.updateTest(planId, testId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bcp-tests'] });
      setEditTest(null);
    },
  });

  const testsArr = tests as any[];
  const thisYear = new Date().getFullYear();
  const testsThisYear = testsArr.filter(t => new Date(t.testedAt).getFullYear() === thisYear).length;
  const completed = testsArr.filter(t => t.result === 'PASSED');
  const successRate = testsArr.length > 0 ? Math.round((completed.length / testsArr.length) * 100) : 0;

  const nextTest = testsArr
    .filter(t => new Date(t.testedAt) >= new Date())
    .sort((a, b) => new Date(a.testedAt).getTime() - new Date(b.testedAt).getTime())[0];

  const plansWithTests = new Set(
    testsArr.filter(t => t.result === 'PASSED').map(t => t.planId)
  );
  const plansWithoutTest = plans.filter(p => !plansWithTests.has(p.id)).length;

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2">Testes Este Ano</div>
          <div className="text-3xl font-bold text-blue-700">{testsThisYear}</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <div className="text-xs font-medium text-green-600 uppercase tracking-wide mb-2">Taxa de Sucesso</div>
          <div className="text-3xl font-bold text-green-700">{successRate}%</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <div className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-2">Próximo Teste</div>
          <div className="text-lg font-bold text-amber-700">
            {nextTest ? format(new Date(nextTest.testedAt), 'dd/MM/yy') : '—'}
          </div>
          {nextTest && (
            <div className="text-xs text-amber-500 mt-0.5 truncate">{nextTest.plan?.name}</div>
          )}
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <div className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2">Planos sem Teste</div>
          <div className="text-3xl font-bold text-red-700">{plansWithoutTest}</div>
        </div>
      </div>

      {/* Table Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Exercícios e Testes BCP Registados</h2>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Novo Exercício
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">A carregar...</div>
      ) : testsArr.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <PlayCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-600 mb-1">Sem exercícios registados</h3>
          <p className="text-sm text-gray-400 mb-4">Registe o primeiro exercício ou teste BCP da sua organização.</p>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Novo Exercício
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plano BCP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">RTO Alvo → Real</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">RPO Alvo → Real</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Resultado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {testsArr.map((test: any) => {
                const testDate = new Date(test.testedAt);
                const now = new Date();
                const derivedStatus = testDate > now ? 'PLANNED' : (test.result === 'FAILED' ? 'FAILED' : 'COMPLETED');
                const statusCfg = TEST_STATUS_CONFIG[derivedStatus] || TEST_STATUS_CONFIG.COMPLETED;
                const resultCfg = RESULT_CONFIG[test.result] || { label: test.result, color: 'text-gray-600', bg: 'bg-gray-100' };
                const rtoTargetMins = test.plan?.rtoTarget ? test.plan.rtoTarget * 60 : null;
                const rpoTargetMins = test.plan?.rpoTarget ? test.plan.rpoTarget * 60 : null;
                return (
                  <tr key={test.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{test.plan?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{TEST_TYPES[test.testType] ?? test.testType}</td>
                    <td className="px-4 py-3 text-gray-600">{format(new Date(test.testedAt), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                      {rtoTargetMins ? (
                        <span>
                          {fmtMinutes(rtoTargetMins)}
                          <span className="text-gray-400 mx-1">→</span>
                          {test.rtoActual ? (
                            <span className={test.rtoActual > rtoTargetMins ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                              {fmtMinutes(test.rtoActual)}
                            </span>
                          ) : <span className="text-gray-400">—</span>}
                        </span>
                      ) : (
                        test.rtoActual ? fmtMinutes(test.rtoActual) : '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                      {rpoTargetMins ? (
                        <span>
                          {fmtMinutes(rpoTargetMins)}
                          <span className="text-gray-400 mx-1">→</span>
                          {test.rpoActual ? (
                            <span className={test.rpoActual > rpoTargetMins ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                              {fmtMinutes(test.rpoActual)}
                            </span>
                          ) : <span className="text-gray-400">—</span>}
                        </span>
                      ) : (
                        test.rpoActual ? fmtMinutes(test.rpoActual) : '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${resultCfg.bg} ${resultCfg.color}`}>
                        {resultCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditTest(test)}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ExerciseModal
          plans={plans}
          onClose={() => setShowModal(false)}
          onSave={(planId, data) => createMut.mutate({ planId, data })}
        />
      )}
      {editTest && (
        <ExerciseModal
          plans={plans}
          initial={editTest}
          onClose={() => setEditTest(null)}
          onSave={(_planId, data) => updateMut.mutate({ planId: editTest.planId, testId: editTest.id, data })}
        />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function BusinessContinuityPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'plans' | 'exercises'>('plans');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editPlan, setEditPlan] = useState<any>(null);

  const { data: dashboard } = useQuery({
    queryKey: ['bcp-dashboard'],
    queryFn: () => bcpApi.dashboard().then(r => r.data),
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['bcp-plans'],
    queryFn: () => bcpApi.listPlans().then(r => r.data),
  });

  const createPlanMut = useMutation({
    mutationFn: (data: any) => bcpApi.createPlan(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bcp-plans'] }); qc.invalidateQueries({ queryKey: ['bcp-dashboard'] }); setShowPlanModal(false); },
  });

  const updatePlanMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => bcpApi.updatePlan(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bcp-plans'] }); setEditPlan(null); },
  });

  const tabs = [
    { id: 'plans' as const,     label: 'Planos BCP',              icon: ShieldAlert },
    { id: 'exercises' as const, label: 'Exercícios / Testes BCP', icon: PlayCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Continuidade de Negócio</h1>
            <p className="text-sm text-gray-500">ISO 22301 · BCP · Recuperação de Desastres</p>
          </div>
        </div>
        {activeTab === 'plans' && (
          <Button onClick={() => setShowPlanModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Novo Plano BCP
          </Button>
        )}
      </div>

      {/* Stats */}
      {dashboard && activeTab === 'plans' && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-amber-50 rounded-xl p-4">
            <div className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-2">Total Planos</div>
            <div className="text-3xl font-bold text-amber-700">{dashboard.totalPlans ?? 0}</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <div className="text-xs font-medium text-green-600 uppercase tracking-wide mb-2">Planos Ativos</div>
            <div className="text-3xl font-bold text-green-700">{dashboard.activePlans ?? 0}</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2">Último Teste</div>
            <div className="text-lg font-bold text-blue-700">
              {dashboard.lastTestDate ? format(new Date(dashboard.lastTestDate), 'dd/MM/yy') : '—'}
            </div>
          </div>
          <div className="bg-red-50 rounded-xl p-4">
            <div className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2">Testes em Atraso</div>
            <div className="text-3xl font-bold text-red-700">{dashboard.overduePlans ?? 0}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-amber-600 text-amber-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'plans' && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Planos de Continuidade de Negócio</h2>
          {isLoading ? (
            <div className="text-center py-12 text-gray-400">A carregar...</div>
          ) : (plans as any[]).length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-600 mb-1">Sem planos BCP</h3>
              <p className="text-sm text-gray-400 mb-4">Crie o primeiro plano de continuidade de negócio da sua organização.</p>
              <Button onClick={() => setShowPlanModal(true)}>
                <Plus className="w-4 h-4 mr-1.5" /> Criar Plano BCP
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {(plans as any[]).map((plan: any) => (
                <PlanCard key={plan.id} plan={plan} onEdit={setEditPlan} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'exercises' && (
        <ExercisesTab plans={plans as any[]} />
      )}

      {/* ISO 22301 requirements reference */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-amber-800 mb-2">Requisitos ISO 22301:2019</h3>
        <div className="grid grid-cols-3 gap-3 text-xs text-amber-700">
          <div><strong>Cláusula 6:</strong> Planeamento — análise de impacto nos negócios (BIA), avaliação de riscos</div>
          <div><strong>Cláusula 8:</strong> Operação — estratégia de continuidade, planos de recuperação</div>
          <div><strong>Cláusula 9:</strong> Avaliação — exercícios, testes, auditorias internas, revisão pela gestão</div>
        </div>
      </div>

      {/* Modals */}
      {showPlanModal && (
        <PlanModal
          onClose={() => setShowPlanModal(false)}
          onSave={data => createPlanMut.mutate(data)}
        />
      )}
      {editPlan && (
        <PlanModal
          initial={editPlan}
          onClose={() => setEditPlan(null)}
          onSave={data => updatePlanMut.mutate({ id: editPlan.id, data })}
        />
      )}
    </div>
  );
}
