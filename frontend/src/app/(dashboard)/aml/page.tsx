'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { amlApi, licensingApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Scale, Plus, Pencil, X, Shield, Search, FileText,
  AlertTriangle, CheckCircle2, Clock, AlertCircle,
  BookOpen, GraduationCap, Globe, ClipboardCheck,
} from 'lucide-react';
import { format } from 'date-fns';

// ─── Lookup maps ──────────────────────────────────────────────

const CASE_TYPES: Record<string, string> = {
  KYC: 'KYC', SAR: 'SAR — Atividade Suspeita', SANCTIONS: 'Sanções',
  TRANSACTION: 'Transação Suspeita', PEP: 'PEP — Pessoa Politicamente Exposta',
};
const RISK_LEVELS: Record<string, { label: string; color: string; bg: string }> = {
  LOW:       { label: 'Baixo',     color: 'text-green-600',  bg: 'bg-green-100' },
  MEDIUM:    { label: 'Médio',     color: 'text-yellow-600', bg: 'bg-yellow-100' },
  HIGH:      { label: 'Alto',      color: 'text-orange-600', bg: 'bg-orange-100' },
  VERY_HIGH: { label: 'Muito Alto', color: 'text-red-700',   bg: 'bg-red-100' },
};
const CASE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  OPEN:         { label: 'Aberto',        color: 'text-blue-600',   bg: 'bg-blue-100' },
  UNDER_REVIEW: { label: 'Em Análise',    color: 'text-yellow-600', bg: 'bg-yellow-100' },
  ESCALATED:    { label: 'Escalado',      color: 'text-red-600',    bg: 'bg-red-100' },
  CLOSED:       { label: 'Fechado',       color: 'text-gray-500',   bg: 'bg-gray-100' },
  REPORTED:     { label: 'Reportado FIU', color: 'text-purple-600', bg: 'bg-purple-100' },
};
const SCREENING_RESULT: Record<string, { label: string; color: string }> = {
  CLEAR:           { label: 'Limpo',          color: 'text-green-600' },
  HIT:             { label: 'Correspondência', color: 'text-red-600' },
  POTENTIAL_MATCH: { label: 'Possível Match',  color: 'text-orange-600' },
  FALSE_POSITIVE:  { label: 'Falso Positivo',  color: 'text-gray-500' },
};
const POLICY_CATEGORIES = ['AML', 'KYC', 'SANCTIONS', 'BRIBERY', 'FRAUD'];
const ENTITY_TYPES = ['CUSTOMER', 'SUPPLIER', 'PARTNER', 'EMPLOYEE', 'COUNTERPARTY'];
const TRAINING_TYPES = ['AML_BASIC', 'AML_ADVANCED', 'KYC_DDC', 'SANCTIONS', 'FRAUD_PREVENTION', 'PEP'];
const TRAINING_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: 'Pendente',   color: 'text-yellow-700', bg: 'bg-yellow-100' },
  COMPLETED:  { label: 'Concluído',  color: 'text-green-700',  bg: 'bg-green-100' },
  EXPIRED:    { label: 'Expirado',   color: 'text-red-700',    bg: 'bg-red-100' },
  IN_PROGRESS:{ label: 'Em curso',   color: 'text-blue-700',   bg: 'bg-blue-100' },
};
const REG_SOURCES = ['FATF', 'EBA', 'BdP', 'CMVM', 'ASF', 'Parlamento', 'Comissão Europeia', 'UIF', 'Outro'];
const REG_CATEGORIES = ['GUIDANCE', 'DIRECTIVE', 'REGULATION', 'CONSULTATION', 'ENFORCEMENT'];
const REG_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  NEW:      { label: 'Novo',       color: 'text-blue-700',   bg: 'bg-blue-100' },
  REVIEWED: { label: 'Analisado',  color: 'text-green-700',  bg: 'bg-green-100' },
  ACTION_REQUIRED: { label: 'Ação Req.', color: 'text-red-700', bg: 'bg-red-100' },
  CLOSED:   { label: 'Arquivado',  color: 'text-gray-500',   bg: 'bg-gray-100' },
};
const AUDIT_CATEGORIES = ['GOVERNANCE', 'POLICIES', 'KYC_DDC', 'TRAINING', 'REPORTING', 'SYSTEMS', 'SANCTIONS', 'RECORDS'];
const AUDIT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:        { label: 'Pendente',       color: 'text-yellow-700', bg: 'bg-yellow-100' },
  COMPLIANT:      { label: 'Conforme',       color: 'text-green-700',  bg: 'bg-green-100' },
  PARTIAL:        { label: 'Parcial',        color: 'text-orange-700', bg: 'bg-orange-100' },
  NON_COMPLIANT:  { label: 'Não Conforme',   color: 'text-red-700',    bg: 'bg-red-100' },
  NOT_APPLICABLE: { label: 'N/A',            color: 'text-gray-500',   bg: 'bg-gray-100' },
};

// ─── Modals ───────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CaseModal({ initial, onClose, onSave }: { initial?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    subjectName: initial?.subjectName ?? '', subjectType: initial?.subjectType ?? 'INDIVIDUAL',
    caseType: initial?.caseType ?? 'KYC', riskLevel: initial?.riskLevel ?? 'MEDIUM',
    status: initial?.status ?? 'OPEN', description: initial?.description ?? '',
    findings: initial?.findings ?? '', reportedToFIU: initial?.reportedToFIU ?? false,
  });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  return (
    <ModalShell title={initial ? 'Editar Caso' : 'Novo Caso AML/KYC'} onClose={onClose}>
      <div className="p-5 space-y-3">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome do Sujeito *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.subjectName} onChange={e => s('subjectName', e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo Sujeito</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.subjectType} onChange={e => s('subjectType', e.target.value)}>
              <option value="INDIVIDUAL">Individual</option><option value="ENTITY">Entidade</option></select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Caso</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.caseType} onChange={e => s('caseType', e.target.value)}>
              {Object.entries(CASE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Nível de Risco</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.riskLevel} onChange={e => s('riskLevel', e.target.value)}>
              {Object.entries(RISK_LEVELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          {initial && <div><label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => s('status', e.target.value)}>
              {Object.entries(CASE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>}
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={3} value={form.description} onChange={e => s('description', e.target.value)} /></div>
        {initial && <div><label className="block text-sm font-medium text-gray-700 mb-1">Findings</label>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.findings} onChange={e => s('findings', e.target.value)} /></div>}
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.reportedToFIU} onChange={e => s('reportedToFIU', e.target.checked)} className="rounded" />
          Reportado à UIF (Unidade de Informação Financeira)
        </label>
      </div>
      <div className="p-5 border-t flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" disabled={!form.subjectName} onClick={() => onSave({ ...form, description: form.description || undefined, findings: form.findings || undefined })}>Guardar</Button>
      </div>
    </ModalShell>
  );
}

function ScreeningModal({ onClose, onSave }: { onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({ subjectName: '', subjectType: 'INDIVIDUAL', screeningType: 'KYC', result: 'CLEAR', notes: '', country: '', automated: false });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const { data: myAddons } = useQuery({
    queryKey: ['my-addons'],
    queryFn: () => licensingApi.myAddons().then(r => r.data),
  });
  const hasIdentityVerification = !!myAddons?.find((a: any) => a.addonKey === 'identity_verification' && a.enabled);

  return (
    <ModalShell title="Novo Screening" onClose={onClose}>
      <div className="p-5 space-y-3">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.subjectName} onChange={e => s('subjectName', e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.subjectType} onChange={e => s('subjectType', e.target.value)}>
              <option value="INDIVIDUAL">Individual</option><option value="ENTITY">Entidade</option></select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo Screening</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.screeningType} onChange={e => s('screeningType', e.target.value)}>
              {['KYC','SANCTIONS','PEP','ADVERSE_MEDIA'].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
        </div>
        {hasIdentityVerification ? (
          <>
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <input type="checkbox" id="automated" checked={form.automated} onChange={e => s('automated', e.target.checked)} />
              <label htmlFor="automated" className="text-sm text-blue-700 font-medium">Verificar automaticamente (KYC/KYB/AML)</label>
            </div>
            {form.automated && (
              <div><label className="block text-sm font-medium text-gray-700 mb-1">País *</label>
                <input placeholder="PT, BR, ES..." maxLength={2} className="w-full border rounded-lg px-3 py-2 text-sm uppercase" value={form.country} onChange={e => s('country', e.target.value.toUpperCase())} /></div>
            )}
          </>
        ) : (
          <p className="text-xs text-gray-400">Verificação automática não disponível — addon &quot;Verificação de Identidade&quot; não está ativo para esta organização.</p>
        )}
        {!form.automated && (
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Resultado</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.result} onChange={e => s('result', e.target.value)}>
              {Object.entries(SCREENING_RESULT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        )}
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.notes} onChange={e => s('notes', e.target.value)} /></div>
      </div>
      <div className="p-5 border-t flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" disabled={!form.subjectName || (form.automated && !form.country)}
          onClick={() => onSave({ ...form, notes: form.notes || undefined, country: form.country || undefined })}>
          {form.automated ? 'Verificar' : 'Registar'}
        </Button>
      </div>
    </ModalShell>
  );
}

function RiskAssessmentModal({ initial, onClose, onSave }: { initial?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    entityName: initial?.entityName ?? '', entityType: initial?.entityType ?? 'CUSTOMER',
    overallRisk: initial?.overallRisk ?? 'MEDIUM', score: initial?.score ?? 50,
    factors: initial?.factors ?? '', notes: initial?.notes ?? '', status: initial?.status ?? 'ACTIVE',
    nextReviewAt: initial?.nextReviewAt ? initial.nextReviewAt.slice(0, 10) : '',
  });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  return (
    <ModalShell title={initial ? 'Editar Avaliação de Risco' : 'Nova Avaliação de Risco'} onClose={onClose}>
      <div className="p-5 space-y-3">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome da Entidade *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.entityName} onChange={e => s('entityName', e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Entidade</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.entityType} onChange={e => s('entityType', e.target.value)}>
              {ENTITY_TYPES.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Risco Global</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.overallRisk} onChange={e => s('overallRisk', e.target.value)}>
              {Object.entries(RISK_LEVELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Score (0–100)</label>
          <input type="number" min={0} max={100} className="w-full border rounded-lg px-3 py-2 text-sm" value={form.score} onChange={e => s('score', Number(e.target.value))} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Fatores de Risco</label>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.factors} onChange={e => s('factors', e.target.value)} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Próxima Revisão</label>
          <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.nextReviewAt} onChange={e => s('nextReviewAt', e.target.value)} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.notes} onChange={e => s('notes', e.target.value)} /></div>
      </div>
      <div className="p-5 border-t flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" disabled={!form.entityName} onClick={() => onSave({
          ...form,
          factors: form.factors || undefined, notes: form.notes || undefined,
          nextReviewAt: form.nextReviewAt ? new Date(form.nextReviewAt).toISOString() : undefined,
        })}>Guardar</Button>
      </div>
    </ModalShell>
  );
}

function TrainingModal({ initial, onClose, onSave }: { initial?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    employeeName: initial?.employeeName ?? '', trainingTitle: initial?.trainingTitle ?? '',
    trainingType: initial?.trainingType ?? 'AML_BASIC', status: initial?.status ?? 'PENDING',
    completedAt: initial?.completedAt ? initial.completedAt.slice(0, 10) : '',
    expiresAt: initial?.expiresAt ? initial.expiresAt.slice(0, 10) : '',
    notes: initial?.notes ?? '',
  });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  return (
    <ModalShell title={initial ? 'Editar Formação' : 'Registar Formação'} onClose={onClose}>
      <div className="p-5 space-y-3">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Colaborador *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.employeeName} onChange={e => s('employeeName', e.target.value)} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Título da Formação *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.trainingTitle} onChange={e => s('trainingTitle', e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.trainingType} onChange={e => s('trainingType', e.target.value)}>
              {TRAINING_TYPES.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => s('status', e.target.value)}>
              {Object.keys(TRAINING_STATUS).map(k => <option key={k} value={k}>{TRAINING_STATUS[k].label}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Data de Conclusão</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.completedAt} onChange={e => s('completedAt', e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Data de Expiração</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.expiresAt} onChange={e => s('expiresAt', e.target.value)} /></div>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.notes} onChange={e => s('notes', e.target.value)} /></div>
      </div>
      <div className="p-5 border-t flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" disabled={!form.employeeName || !form.trainingTitle} onClick={() => onSave({
          ...form,
          completedAt: form.completedAt ? new Date(form.completedAt).toISOString() : undefined,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
          notes: form.notes || undefined,
        })}>Guardar</Button>
      </div>
    </ModalShell>
  );
}

function RegulatoryModal({ initial, onClose, onSave }: { initial?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    title: initial?.title ?? '', source: initial?.source ?? 'FATF',
    category: initial?.category ?? 'GUIDANCE', impactLevel: initial?.impactLevel ?? 'MEDIUM',
    status: initial?.status ?? 'NEW', summary: initial?.summary ?? '', url: initial?.url ?? '',
    publishedAt: initial?.publishedAt ? initial.publishedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    actionNotes: initial?.actionNotes ?? '',
  });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  return (
    <ModalShell title={initial ? 'Editar Atualização Regulatória' : 'Nova Atualização Regulatória'} onClose={onClose}>
      <div className="p-5 space-y-3">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e => s('title', e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Fonte</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.source} onChange={e => s('source', e.target.value)}>
              {REG_SOURCES.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.category} onChange={e => s('category', e.target.value)}>
              {REG_CATEGORIES.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Impacto</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.impactLevel} onChange={e => s('impactLevel', e.target.value)}>
              {Object.entries(RISK_LEVELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => s('status', e.target.value)}>
              {Object.keys(REG_STATUS).map(k => <option key={k} value={k}>{REG_STATUS[k].label}</option>)}</select></div>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Data de Publicação</label>
          <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.publishedAt} onChange={e => s('publishedAt', e.target.value)} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
          <input type="url" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.url} onChange={e => s('url', e.target.value)} placeholder="https://..." /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Resumo</label>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.summary} onChange={e => s('summary', e.target.value)} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Ações a Tomar</label>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.actionNotes} onChange={e => s('actionNotes', e.target.value)} /></div>
      </div>
      <div className="p-5 border-t flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" disabled={!form.title} onClick={() => onSave({
          ...form,
          publishedAt: new Date(form.publishedAt).toISOString(),
          url: form.url || undefined, summary: form.summary || undefined,
          actionNotes: form.actionNotes || undefined,
        })}>Guardar</Button>
      </div>
    </ModalShell>
  );
}

function AuditItemModal({ initial, onClose, onSave }: { initial?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    category: initial?.category ?? 'GOVERNANCE', requirement: initial?.requirement ?? '',
    reference: initial?.reference ?? '', status: initial?.status ?? 'PENDING',
    evidence: initial?.evidence ?? '', notes: initial?.notes ?? '',
    dueDate: initial?.dueDate ? initial.dueDate.slice(0, 10) : '',
  });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  return (
    <ModalShell title={initial ? 'Editar Item de Auditoria' : 'Novo Requisito de Auditoria'} onClose={onClose}>
      <div className="p-5 space-y-3">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Requisito *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.requirement} onChange={e => s('requirement', e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.category} onChange={e => s('category', e.target.value)}>
              {AUDIT_CATEGORIES.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => s('status', e.target.value)}>
              {Object.keys(AUDIT_STATUS).map(k => <option key={k} value={k}>{AUDIT_STATUS[k].label}</option>)}</select></div>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Referência Legal (ex: Art. 35.º Lei 83/2017)</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.reference} onChange={e => s('reference', e.target.value)} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Evidência / Documento</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.evidence} onChange={e => s('evidence', e.target.value)} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Data Limite</label>
          <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.dueDate} onChange={e => s('dueDate', e.target.value)} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.notes} onChange={e => s('notes', e.target.value)} /></div>
      </div>
      <div className="p-5 border-t flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" disabled={!form.requirement} onClick={() => onSave({
          ...form,
          reference: form.reference || undefined, evidence: form.evidence || undefined,
          notes: form.notes || undefined,
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        })}>Guardar</Button>
      </div>
    </ModalShell>
  );
}

// ─── Tabs config ──────────────────────────────────────────────

const TABS = [
  { id: 'cases',      label: 'Casos AML/KYC',  icon: AlertTriangle },
  { id: 'screening',  label: 'Screenings',      icon: Search },
  { id: 'policies',   label: 'Políticas',       icon: FileText },
  { id: 'risk',       label: 'Risco',           icon: Shield },
  { id: 'training',   label: 'Formação',        icon: GraduationCap },
  { id: 'regulatory', label: 'Regulatório',     icon: Globe },
  { id: 'audit',      label: 'Auditoria',       icon: ClipboardCheck },
];

// ─── Page ─────────────────────────────────────────────────────

export default function AmlPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('cases');
  const [showModal, setShowModal] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any>(null);

  const { data: dashboard } = useQuery({ queryKey: ['aml-dashboard'], queryFn: () => amlApi.dashboard().then(r => r.data) });
  const { data: cases = [] } = useQuery({ queryKey: ['aml-cases'], queryFn: () => amlApi.listCases().then(r => r.data), enabled: tab === 'cases' });
  const { data: screenings = [] } = useQuery({ queryKey: ['aml-screenings'], queryFn: () => amlApi.listScreenings().then(r => r.data), enabled: tab === 'screening' });
  const { data: policies = [] } = useQuery({ queryKey: ['aml-policies'], queryFn: () => amlApi.listPolicies().then(r => r.data), enabled: tab === 'policies' });
  const { data: riskAssessments = [] } = useQuery({ queryKey: ['aml-risk'], queryFn: () => amlApi.listRiskAssessments().then(r => r.data), enabled: tab === 'risk' });
  const { data: training = [] } = useQuery({ queryKey: ['aml-training'], queryFn: () => amlApi.listTraining().then(r => r.data), enabled: tab === 'training' });
  const { data: regulatory = [] } = useQuery({ queryKey: ['aml-regulatory'], queryFn: () => amlApi.listRegulatoryUpdates().then(r => r.data), enabled: tab === 'regulatory' });
  const { data: auditItems = [] } = useQuery({ queryKey: ['aml-audit'], queryFn: () => amlApi.listAuditItems().then(r => r.data), enabled: tab === 'audit' });

  const inv = (keys: string[]) => keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));

  const createCaseMut = useMutation({ mutationFn: (d: any) => amlApi.createCase(d), onSuccess: () => { inv(['aml-cases', 'aml-dashboard']); setShowModal(null); } });
  const updateCaseMut = useMutation({ mutationFn: ({ id, data }: any) => amlApi.updateCase(id, data), onSuccess: () => { inv(['aml-cases']); setEditItem(null); } });
  const createScreeningMut = useMutation({ mutationFn: (d: any) => amlApi.createScreening(d), onSuccess: () => { inv(['aml-screenings']); setShowModal(null); } });
  const createPolicyMut = useMutation({ mutationFn: (d: any) => amlApi.createPolicy(d), onSuccess: () => { inv(['aml-policies']); setShowModal(null); } });
  const createRiskMut = useMutation({ mutationFn: (d: any) => amlApi.createRiskAssessment(d), onSuccess: () => { inv(['aml-risk', 'aml-dashboard']); setShowModal(null); } });
  const updateRiskMut = useMutation({ mutationFn: ({ id, data }: any) => amlApi.updateRiskAssessment(id, data), onSuccess: () => { inv(['aml-risk']); setEditItem(null); } });
  const createTrainingMut = useMutation({ mutationFn: (d: any) => amlApi.createTraining(d), onSuccess: () => { inv(['aml-training', 'aml-dashboard']); setShowModal(null); } });
  const updateTrainingMut = useMutation({ mutationFn: ({ id, data }: any) => amlApi.updateTraining(id, data), onSuccess: () => { inv(['aml-training']); setEditItem(null); } });
  const createRegMut = useMutation({ mutationFn: (d: any) => amlApi.createRegulatoryUpdate(d), onSuccess: () => { inv(['aml-regulatory', 'aml-dashboard']); setShowModal(null); } });
  const updateRegMut = useMutation({ mutationFn: ({ id, data }: any) => amlApi.updateRegulatoryUpdate(id, data), onSuccess: () => { inv(['aml-regulatory']); setEditItem(null); } });
  const createAuditMut = useMutation({ mutationFn: (d: any) => amlApi.createAuditItem(d), onSuccess: () => { inv(['aml-audit', 'aml-dashboard']); setShowModal(null); } });
  const updateAuditMut = useMutation({ mutationFn: ({ id, data }: any) => amlApi.updateAuditItem(id, data), onSuccess: () => { inv(['aml-audit']); setEditItem(null); } });

  const newLabel: Record<string, string> = {
    cases: 'Novo Caso', screening: 'Novo Screening', policies: 'Nova Política',
    risk: 'Nova Avaliação', training: 'Registar Formação', regulatory: 'Nova Atualização', audit: 'Novo Requisito',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center"><Scale className="w-5 h-5 text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AML / KYC / Compliance Financeiro</h1>
            <p className="text-sm text-gray-500">Anti-Branqueamento · Avaliação de Risco · Formação · Regulatório · Auditoria</p>
          </div>
        </div>
        <Button onClick={() => setShowModal(tab)}>
          <Plus className="w-4 h-4 mr-1.5" />{newLabel[tab] ?? 'Novo'}
        </Button>
      </div>

      {/* KPI row */}
      {dashboard && (
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="bg-rose-50 rounded-xl p-3"><div className="text-xs font-medium text-rose-600 uppercase mb-1">Casos Abertos</div><div className="text-2xl font-bold text-rose-700">{dashboard.openCases ?? 0}</div></div>
          <div className="bg-red-50 rounded-xl p-3"><div className="text-xs font-medium text-red-600 uppercase mb-1">Alto Risco</div><div className="text-2xl font-bold text-red-700">{dashboard.highRiskCases ?? 0}</div></div>
          <div className="bg-purple-50 rounded-xl p-3"><div className="text-xs font-medium text-purple-600 uppercase mb-1">Reportados UIF</div><div className="text-2xl font-bold text-purple-700">{dashboard.reportedToFiu ?? 0}</div></div>
          <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs font-medium text-gray-600 uppercase mb-1">Total Casos</div><div className="text-2xl font-bold text-gray-700">{dashboard.totalCases ?? 0}</div></div>
          <div className="bg-orange-50 rounded-xl p-3"><div className="text-xs font-medium text-orange-600 uppercase mb-1">Entidades Alto Risco</div><div className="text-2xl font-bold text-orange-700">{dashboard.highRiskEntities ?? 0}</div></div>
          <div className="bg-yellow-50 rounded-xl p-3"><div className="text-xs font-medium text-yellow-600 uppercase mb-1">Formações Pendentes</div><div className="text-2xl font-bold text-yellow-700">{dashboard.pendingTraining ?? 0}</div></div>
          <div className="bg-blue-50 rounded-xl p-3"><div className="text-xs font-medium text-blue-600 uppercase mb-1">Novidades Reg.</div><div className="text-2xl font-bold text-blue-700">{dashboard.newRegulatoryUpdates ?? 0}</div></div>
          <div className="bg-indigo-50 rounded-xl p-3"><div className="text-xs font-medium text-indigo-600 uppercase mb-1">Itens Não Conf.</div><div className="text-2xl font-bold text-indigo-700">{dashboard.nonCompliantAuditItems ?? 0}</div></div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-gray-200 overflow-x-auto">
        {TABS.map(t => { const Icon = t.icon; return (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === t.id ? 'border-rose-600 text-rose-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Icon className="w-3.5 h-3.5" />{t.label}
          </button>); })}
      </div>

      {/* ── Cases tab ── */}
      {tab === 'cases' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          {(cases as any[]).length === 0 ? (
            <div className="text-center py-12 text-gray-400"><AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Nenhum caso registado.</p></div>
          ) : (
            <table className="w-full"><thead className="bg-gray-50 border-b"><tr>
              {['ID','Sujeito','Tipo','Risco','Estado','Data',''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
            </tr></thead><tbody className="divide-y divide-gray-100">
              {(cases as any[]).map((c: any) => {
                const risk = RISK_LEVELS[c.riskLevel] || RISK_LEVELS.MEDIUM;
                const st = CASE_STATUS[c.status] || CASE_STATUS.OPEN;
                return (
                  <tr key={c.id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{c.caseId}</td>
                    <td className="px-4 py-3"><p className="text-sm font-medium text-gray-900">{c.subjectName}</p><p className="text-xs text-gray-500">{c.subjectType}</p></td>
                    <td className="px-4 py-3 text-xs text-gray-600">{CASE_TYPES[c.caseType] || c.caseType}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${risk.bg} ${risk.color}`}>{risk.label}</span></td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${st.bg} ${st.color}`}>{st.label}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(c.createdAt), 'dd/MM/yy')}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => setEditItem({ type: 'case', data: c })} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded text-gray-400"><Pencil className="w-3.5 h-3.5" /></button></td>
                  </tr>); })}
            </tbody></table>
          )}
        </div>
      )}

      {/* ── Screenings tab ── */}
      {tab === 'screening' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          {(screenings as any[]).length === 0 ? (
            <div className="text-center py-12 text-gray-400"><Search className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Nenhum screening registado.</p></div>
          ) : (
            <table className="w-full"><thead className="bg-gray-50 border-b"><tr>
              {['Nome','Tipo Sujeito','Tipo Screening','Resultado','Data'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
            </tr></thead><tbody className="divide-y divide-gray-100">
              {(screenings as any[]).map((s: any) => {
                const res = SCREENING_RESULT[s.result] || { label: s.result, color: 'text-gray-500' };
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.subjectName}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{s.subjectType}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{s.screeningType}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-semibold ${res.color}`}>{res.label}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(s.screenedAt), 'dd/MM/yy HH:mm')}</td>
                  </tr>); })}
            </tbody></table>
          )}
        </div>
      )}

      {/* ── Policies tab ── */}
      {tab === 'policies' && (
        <div className="space-y-3">
          {(policies as any[]).length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400"><FileText className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Nenhuma política AML. Clique em "Nova Política" para criar.</p></div>
          ) : (
            (policies as any[]).map((p: any) => (
              <div key={p.id} className="bg-white rounded-xl border p-4 flex items-center gap-4">
                <FileText className="w-5 h-5 text-rose-400 flex-shrink-0" />
                <div className="flex-1"><p className="text-sm font-semibold text-gray-900">{p.title}</p><p className="text-xs text-gray-500">{p.category} · v{p.version}</p></div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : p.status === 'DRAFT' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-600'}`}>
                  {p.status === 'ACTIVE' ? 'Ativo' : p.status === 'DRAFT' ? 'Rascunho' : 'Arquivado'}
                </span>
              </div>))
          )}
        </div>
      )}

      {/* ── Risk Assessment tab ── */}
      {tab === 'risk' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          {(riskAssessments as any[]).length === 0 ? (
            <div className="text-center py-12 text-gray-400"><Shield className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Nenhuma avaliação de risco registada.</p></div>
          ) : (
            <table className="w-full"><thead className="bg-gray-50 border-b"><tr>
              {['Entidade','Tipo','Risco','Score','Próx. Revisão','Estado',''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
            </tr></thead><tbody className="divide-y divide-gray-100">
              {(riskAssessments as any[]).map((r: any) => {
                const risk = RISK_LEVELS[r.overallRisk] || RISK_LEVELS.MEDIUM;
                return (
                  <tr key={r.id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.entityName}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.entityType}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${risk.bg} ${risk.color}`}>{risk.label}</span></td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-700">{r.score}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.nextReviewAt ? format(new Date(r.nextReviewAt), 'dd/MM/yyyy') : '—'}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${r.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{r.status === 'ACTIVE' ? 'Ativo' : r.status}</span></td>
                    <td className="px-4 py-3 text-right"><button onClick={() => setEditItem({ type: 'risk', data: r })} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded text-gray-400"><Pencil className="w-3.5 h-3.5" /></button></td>
                  </tr>); })}
            </tbody></table>
          )}
        </div>
      )}

      {/* ── Training tab ── */}
      {tab === 'training' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          {(training as any[]).length === 0 ? (
            <div className="text-center py-12 text-gray-400"><GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Nenhum registo de formação.</p></div>
          ) : (
            <table className="w-full"><thead className="bg-gray-50 border-b"><tr>
              {['Colaborador','Formação','Tipo','Estado','Conclusão','Expiração',''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
            </tr></thead><tbody className="divide-y divide-gray-100">
              {(training as any[]).map((t: any) => {
                const st = TRAINING_STATUS[t.status] || TRAINING_STATUS.PENDING;
                return (
                  <tr key={t.id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.employeeName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{t.trainingTitle}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{t.trainingType}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${st.bg} ${st.color}`}>{st.label}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{t.completedAt ? format(new Date(t.completedAt), 'dd/MM/yyyy') : '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{t.expiresAt ? format(new Date(t.expiresAt), 'dd/MM/yyyy') : '—'}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => setEditItem({ type: 'training', data: t })} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded text-gray-400"><Pencil className="w-3.5 h-3.5" /></button></td>
                  </tr>); })}
            </tbody></table>
          )}
        </div>
      )}

      {/* ── Regulatory tab ── */}
      {tab === 'regulatory' && (
        <div className="space-y-3">
          {(regulatory as any[]).length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400"><Globe className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Nenhuma atualização regulatória registada.</p></div>
          ) : (
            (regulatory as any[]).map((r: any) => {
              const st = REG_STATUS[r.status] || REG_STATUS.NEW;
              const impact = RISK_LEVELS[r.impactLevel] || RISK_LEVELS.MEDIUM;
              return (
                <div key={r.id} className="bg-white rounded-xl border p-4 group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-500 uppercase">{r.source}</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-500">{r.category}</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-500">{format(new Date(r.publishedAt), 'dd/MM/yyyy')}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                      {r.summary && <p className="text-xs text-gray-500 mt-1">{r.summary}</p>}
                      {r.actionNotes && <p className="text-xs text-indigo-600 mt-1 font-medium">Ação: {r.actionNotes}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${impact.bg} ${impact.color}`}>{impact.label}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.bg} ${st.color}`}>{st.label}</span>
                      <button onClick={() => setEditItem({ type: 'regulatory', data: r })} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>); })
          )}
        </div>
      )}

      {/* ── Audit tab ── */}
      {tab === 'audit' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          {(auditItems as any[]).length === 0 ? (
            <div className="text-center py-12 text-gray-400"><ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Nenhum requisito de auditoria registado.</p></div>
          ) : (
            <table className="w-full"><thead className="bg-gray-50 border-b"><tr>
              {['Categoria','Requisito','Referência Legal','Estado','Data Limite',''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
            </tr></thead><tbody className="divide-y divide-gray-100">
              {(auditItems as any[]).map((a: any) => {
                const st = AUDIT_STATUS[a.status] || AUDIT_STATUS.PENDING;
                return (
                  <tr key={a.id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-3 text-xs font-semibold text-gray-500">{a.category}</td>
                    <td className="px-4 py-3"><p className="text-sm text-gray-900">{a.requirement}</p>{a.evidence && <p className="text-xs text-gray-400 mt-0.5">Evidência: {a.evidence}</p>}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{a.reference || '—'}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${st.bg} ${st.color}`}>{st.label}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{a.dueDate ? format(new Date(a.dueDate), 'dd/MM/yyyy') : '—'}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => setEditItem({ type: 'audit', data: a })} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded text-gray-400"><Pencil className="w-3.5 h-3.5" /></button></td>
                  </tr>); })}
            </tbody></table>
          )}
        </div>
      )}

      {/* ── Create modals ── */}
      {showModal === 'cases' && <CaseModal onClose={() => setShowModal(null)} onSave={d => createCaseMut.mutate(d)} />}
      {showModal === 'screening' && <ScreeningModal onClose={() => setShowModal(null)} onSave={d => createScreeningMut.mutate(d)} />}
      {showModal === 'policies' && (
        <ModalShell title="Nova Política AML" onClose={() => setShowModal(null)}>
          <div className="p-5"><PolicyForm onClose={() => setShowModal(null)} onSave={d => createPolicyMut.mutate(d)} /></div>
        </ModalShell>
      )}
      {showModal === 'risk' && <RiskAssessmentModal onClose={() => setShowModal(null)} onSave={d => createRiskMut.mutate(d)} />}
      {showModal === 'training' && <TrainingModal onClose={() => setShowModal(null)} onSave={d => createTrainingMut.mutate(d)} />}
      {showModal === 'regulatory' && <RegulatoryModal onClose={() => setShowModal(null)} onSave={d => createRegMut.mutate(d)} />}
      {showModal === 'audit' && <AuditItemModal onClose={() => setShowModal(null)} onSave={d => createAuditMut.mutate(d)} />}

      {/* ── Edit modals ── */}
      {editItem?.type === 'case' && <CaseModal initial={editItem.data} onClose={() => setEditItem(null)} onSave={d => updateCaseMut.mutate({ id: editItem.data.id, data: d })} />}
      {editItem?.type === 'risk' && <RiskAssessmentModal initial={editItem.data} onClose={() => setEditItem(null)} onSave={d => updateRiskMut.mutate({ id: editItem.data.id, data: d })} />}
      {editItem?.type === 'training' && <TrainingModal initial={editItem.data} onClose={() => setEditItem(null)} onSave={d => updateTrainingMut.mutate({ id: editItem.data.id, data: d })} />}
      {editItem?.type === 'regulatory' && <RegulatoryModal initial={editItem.data} onClose={() => setEditItem(null)} onSave={d => updateRegMut.mutate({ id: editItem.data.id, data: d })} />}
      {editItem?.type === 'audit' && <AuditItemModal initial={editItem.data} onClose={() => setEditItem(null)} onSave={d => updateAuditMut.mutate({ id: editItem.data.id, data: d })} />}
    </div>
  );
}

function PolicyForm({ onClose, onSave }: { onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({ title: '', category: 'AML', version: '1.0', status: 'ACTIVE' });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="space-y-3">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
        <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e => s('title', e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
          <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.category} onChange={e => s('category', e.target.value)}>
            {POLICY_CATEGORIES.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Versão</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.version} onChange={e => s('version', e.target.value)} /></div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" disabled={!form.title} onClick={() => onSave(form)}>Criar</Button>
      </div>
    </div>
  );
}
