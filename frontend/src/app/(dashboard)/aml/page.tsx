'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { amlApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Scale, Plus, Pencil, X, Shield, Search, FileText,
  AlertTriangle, CheckCircle2, Clock, AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

const CASE_TYPES: Record<string, string> = { KYC: 'KYC', SAR: 'SAR — Atividade Suspeita', SANCTIONS: 'Sanções', TRANSACTION: 'Transação Suspeita', PEP: 'PEP — Pessoa Politicamente Exposta' };
const RISK_LEVELS: Record<string, { label: string; color: string; bg: string }> = {
  LOW:       { label: 'Baixo',    color: 'text-green-600',  bg: 'bg-green-100' },
  MEDIUM:    { label: 'Médio',    color: 'text-yellow-600', bg: 'bg-yellow-100' },
  HIGH:      { label: 'Alto',     color: 'text-orange-600', bg: 'bg-orange-100' },
  VERY_HIGH: { label: 'Muito Alto', color: 'text-red-700', bg: 'bg-red-100' },
};
const CASE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  OPEN:        { label: 'Aberto',      color: 'text-blue-600',   bg: 'bg-blue-100' },
  UNDER_REVIEW:{ label: 'Em Análise',  color: 'text-yellow-600', bg: 'bg-yellow-100' },
  ESCALATED:   { label: 'Escalado',    color: 'text-red-600',    bg: 'bg-red-100' },
  CLOSED:      { label: 'Fechado',     color: 'text-gray-500',   bg: 'bg-gray-100' },
  REPORTED:    { label: 'Reportado FIU', color: 'text-purple-600', bg: 'bg-purple-100' },
};
const SCREENING_RESULT: Record<string, { label: string; color: string }> = {
  CLEAR:           { label: 'Limpo',         color: 'text-green-600' },
  HIT:             { label: 'Correspondência', color: 'text-red-600' },
  POTENTIAL_MATCH: { label: 'Possível Match', color: 'text-orange-600' },
  FALSE_POSITIVE:  { label: 'Falso Positivo', color: 'text-gray-500' },
};
const POLICY_CATEGORIES = ['AML', 'KYC', 'SANCTIONS', 'BRIBERY', 'FRAUD'];

function CaseModal({ initial, onClose, onSave }: { initial?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({ subjectName: initial?.subjectName ?? '', subjectType: initial?.subjectType ?? 'INDIVIDUAL', caseType: initial?.caseType ?? 'KYC', riskLevel: initial?.riskLevel ?? 'MEDIUM', status: initial?.status ?? 'OPEN', description: initial?.description ?? '', findings: initial?.findings ?? '', reportedToFIU: initial?.reportedToFIU ?? false });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-base font-semibold">{initial ? 'Editar Caso' : 'Novo Caso AML/KYC'}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
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
      </div>
    </div>
  );
}

function ScreeningModal({ onClose, onSave }: { onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({ subjectName: '', subjectType: 'INDIVIDUAL', screeningType: 'KYC', result: 'CLEAR', notes: '' });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold">Novo Screening</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
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
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Resultado</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.result} onChange={e => s('result', e.target.value)}>
              {Object.entries(SCREENING_RESULT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.notes} onChange={e => s('notes', e.target.value)} /></div>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!form.subjectName} onClick={() => onSave({ ...form, notes: form.notes || undefined })}>Registar</Button>
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { id: 'cases',     label: 'Casos AML/KYC', icon: AlertTriangle },
  { id: 'screening', label: 'Screenings',    icon: Search },
  { id: 'policies',  label: 'Políticas',     icon: FileText },
];

export default function AmlPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('cases');
  const [showModal, setShowModal] = useState<string | null>(null);
  const [editCase, setEditCase] = useState<any>(null);

  const { data: dashboard } = useQuery({ queryKey: ['aml-dashboard'], queryFn: () => amlApi.dashboard().then(r => r.data) });
  const { data: cases = [] } = useQuery({ queryKey: ['aml-cases'], queryFn: () => amlApi.listCases().then(r => r.data), enabled: tab === 'cases' });
  const { data: screenings = [] } = useQuery({ queryKey: ['aml-screenings'], queryFn: () => amlApi.listScreenings().then(r => r.data), enabled: tab === 'screening' });
  const { data: policies = [] } = useQuery({ queryKey: ['aml-policies'], queryFn: () => amlApi.listPolicies().then(r => r.data), enabled: tab === 'policies' });

  const createCaseMut = useMutation({ mutationFn: (d: any) => amlApi.createCase(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['aml-cases'] }); qc.invalidateQueries({ queryKey: ['aml-dashboard'] }); setShowModal(null); } });
  const updateCaseMut = useMutation({ mutationFn: ({ id, data }: any) => amlApi.updateCase(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['aml-cases'] }); setEditCase(null); } });
  const createScreeningMut = useMutation({ mutationFn: (d: any) => amlApi.createScreening(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['aml-screenings'] }); setShowModal(null); } });
  const createPolicyMut = useMutation({ mutationFn: (d: any) => amlApi.createPolicy(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['aml-policies'] }); setShowModal(null); } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center"><Scale className="w-5 h-5 text-white" /></div>
          <div><h1 className="text-2xl font-bold text-gray-900">AML / KYC / Compliance Financeiro</h1><p className="text-sm text-gray-500">Anti-Branqueamento · KYC · Sanções · PEP · Fraude</p></div>
        </div>
        <Button onClick={() => setShowModal(tab)}>
          <Plus className="w-4 h-4 mr-1.5" />
          {tab === 'cases' ? 'Novo Caso' : tab === 'screening' ? 'Novo Screening' : 'Nova Política'}
        </Button>
      </div>

      {dashboard && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-rose-50 rounded-xl p-4"><div className="text-xs font-medium text-rose-600 uppercase mb-2">Casos Abertos</div><div className="text-3xl font-bold text-rose-700">{dashboard.openCases ?? 0}</div></div>
          <div className="bg-red-50 rounded-xl p-4"><div className="text-xs font-medium text-red-600 uppercase mb-2">Alto Risco</div><div className="text-3xl font-bold text-red-700">{dashboard.highRiskCases ?? 0}</div></div>
          <div className="bg-purple-50 rounded-xl p-4"><div className="text-xs font-medium text-purple-600 uppercase mb-2">Reportados UIF</div><div className="text-3xl font-bold text-purple-700">{dashboard.reportedToFiu ?? 0}</div></div>
          <div className="bg-gray-50 rounded-xl p-4"><div className="text-xs font-medium text-gray-600 uppercase mb-2">Total Casos</div><div className="text-3xl font-bold text-gray-700">{dashboard.totalCases ?? 0}</div></div>
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => { const Icon = t.icon; return (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-rose-600 text-rose-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Icon className="w-4 h-4" />{t.label}
          </button>); })}
      </div>

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
                    <td className="px-4 py-3 text-right"><button onClick={() => setEditCase(c)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded text-gray-400"><Pencil className="w-3.5 h-3.5" /></button></td>
                  </tr>); })}
            </tbody></table>
          )}
        </div>
      )}

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

      {/* Create modals */}
      {showModal === 'cases' && <CaseModal onClose={() => setShowModal(null)} onSave={d => createCaseMut.mutate(d)} />}
      {showModal === 'screening' && <ScreeningModal onClose={() => setShowModal(null)} onSave={d => createScreeningMut.mutate(d)} />}
      {showModal === 'policies' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-base font-semibold mb-4">Nova Política AML</h2>
            <PolicyForm onClose={() => setShowModal(null)} onSave={d => createPolicyMut.mutate(d)} />
          </div>
        </div>
      )}
      {editCase && <CaseModal initial={editCase} onClose={() => setEditCase(null)} onSave={d => updateCaseMut.mutate({ id: editCase.id, data: d })} />}
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
