'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiGovernanceApi } from '@/lib/api';
import {
  Brain, Shield, AlertTriangle, CheckCircle, XCircle, Clock,
  Plus, Loader2, BarChart2, FileSearch, Bot, Users,
  List, ChevronRight, Edit, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'dashboard',    label: 'Dashboard',         icon: BarChart2 },
  { key: 'inventory',   label: 'Inventário IA',      icon: Bot },
  { key: 'risks',       label: 'Riscos IA',          icon: AlertTriangle },
  { key: 'assessments', label: 'Impact Assessment',  icon: FileSearch },
  { key: 'iso42001',    label: 'ISO 42001',          icon: Shield },
];

// ── Risk level badge ──────────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  MINIMAL:       'bg-green-100 text-green-700',
  LIMITED:       'bg-yellow-100 text-yellow-700',
  HIGH:          'bg-orange-100 text-orange-700',
  UNACCEPTABLE:  'bg-red-100 text-red-700',
};

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-500',
  PLANNED:     'bg-blue-100 text-blue-600',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  IMPLEMENTED: 'bg-green-100 text-green-700',
  NOT_APPLICABLE: 'bg-gray-50 text-gray-400',
};

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', colorClass)}>{label}</span>;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function DashboardTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['ai-gov-dashboard'],
    queryFn: () => aiGovernanceApi.dashboard().then(r => r.data),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const complianceColor = (data?.compliance ?? 0) >= 70 ? 'text-green-600' : (data?.compliance ?? 0) >= 40 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Sistemas IA inventariados', value: data?.totalSystems ?? 0, icon: Bot,           color: 'bg-blue-50 text-blue-600' },
          { label: 'Sistemas de alto risco (AI Act)', value: data?.highRiskSystems ?? 0, icon: AlertTriangle, color: 'bg-orange-50 text-orange-600' },
          { label: 'Riscos IA abertos',          value: data?.openRisks ?? 0, icon: Shield,        color: 'bg-red-50 text-red-600' },
          { label: 'Impact Assessments',          value: data?.assessments ?? 0, icon: FileSearch,  color: 'bg-purple-50 text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', s.color)}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ISO 42001 compliance score */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Conformidade ISO 42001</h3>
          <span className={cn('text-2xl font-bold', complianceColor)}>{data?.compliance ?? 0}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className={cn('h-3 rounded-full transition-all', (data?.compliance ?? 0) >= 70 ? 'bg-green-500' : (data?.compliance ?? 0) >= 40 ? 'bg-yellow-500' : 'bg-red-500')}
            style={{ width: `${data?.compliance ?? 0}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{data?.doneControls ?? 0} controlos implementados</span>
          <span>{data?.totalControls ?? 0} total</span>
        </div>
      </div>

      {/* Sub-modules overview */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">AI Governance Suite — Sub-módulos</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'ISO 42001 — AI Management System',     status: 'active' },
            { label: 'EU AI Act Compliance & Classification', status: 'active' },
            { label: 'AI Risk Register',                      status: 'active' },
            { label: 'AI System Inventory',                   status: 'active' },
            { label: 'AI Vendor Governance',                  status: 'vendors' },
            { label: 'Human Oversight Framework',             status: 'active' },
            { label: 'AI Impact Assessment (AIIA)',           status: 'active' },
            { label: 'Evidence & Documentation AI',           status: 'evidence' },
          ].map(m => (
            <div key={m.label} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              <div className={cn('w-2 h-2 rounded-full flex-shrink-0', {
                'bg-green-500': m.status === 'active',
                'bg-blue-400': ['vendors', 'evidence'].includes(m.status),
              })} />
              <span className="text-sm text-gray-700">{m.label}</span>
              {['vendors', 'evidence'].includes(m.status) && (
                <span className="ml-auto text-xs text-blue-500">→ módulo separado</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── AI Inventory ──────────────────────────────────────────────────────────────

function InventoryTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({
    name: '', description: '', vendor: '', purpose: '', aiActRiskLevel: 'LIMITED',
    status: 'DEPLOYED', isThirdParty: false, humanOversight: true,
  });

  const { data: systems, isLoading } = useQuery({
    queryKey: ['ai-systems'],
    queryFn: () => aiGovernanceApi.listSystems().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => aiGovernanceApi.createSystem(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-systems'] }); setShowForm(false); },
  });

  const AI_ACT_LABELS: Record<string, string> = {
    MINIMAL: 'Risco mínimo', LIMITED: 'Risco limitado', HIGH: 'Alto risco', UNACCEPTABLE: 'Proibido',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Inventário de Sistemas IA</h3>
          <p className="text-sm text-gray-500">Registo de todos os sistemas de IA usados na organização (requisito EU AI Act)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Adicionar sistema
        </button>
      </div>

      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 grid grid-cols-2 gap-3">
          {[
            { label: 'Nome do sistema', field: 'name', span: 2 },
            { label: 'Fornecedor', field: 'vendor' },
            { label: 'Propósito', field: 'purpose' },
          ].map(f => (
            <div key={f.field} className={f.span === 2 ? 'col-span-2' : ''}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
              <input value={form[f.field]} onChange={e => setForm((p: any) => ({ ...p, [f.field]: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Classificação EU AI Act</label>
            <select value={form.aiActRiskLevel} onChange={e => setForm((p: any) => ({ ...p, aiActRiskLevel: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {['MINIMAL', 'LIMITED', 'HIGH', 'UNACCEPTABLE'].map(l => <option key={l} value={l}>{AI_ACT_LABELS[l]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
            <select value={form.status} onChange={e => setForm((p: any) => ({ ...p, status: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {['PLANNED', 'IN_DEVELOPMENT', 'DEPLOYED', 'DEPRECATED', 'PROHIBITED'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4 col-span-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.isThirdParty} onChange={e => setForm((p: any) => ({ ...p, isThirdParty: e.target.checked }))} />
              Sistema de terceiros
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.humanOversight} onChange={e => setForm((p: any) => ({ ...p, humanOversight: e.target.checked }))} />
              Supervisão humana activa
            </label>
          </div>
          <div className="col-span-2 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {createMutation.isPending ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <div className="grid grid-cols-1 gap-4">
          {(systems || []).map((sys: any) => (
            <div key={sys.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{sys.name}</p>
                    <Badge label={AI_ACT_LABELS[sys.aiActRiskLevel] || sys.aiActRiskLevel} colorClass={RISK_COLORS[sys.aiActRiskLevel]} />
                    {sys.isThirdParty && <Badge label="3rd party" colorClass="bg-gray-100 text-gray-500" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{sys.vendor ? `${sys.vendor} · ` : ''}{sys.purpose}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>{sys._count?.risks ?? 0} riscos</span>
                    <span>·</span>
                    <span>{sys._count?.impactAssessments ?? 0} assessments</span>
                    <span>·</span>
                    {sys.humanOversight ? <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Supervisão humana</span> : <span className="text-orange-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Sem supervisão</span>}
                  </div>
                </div>
                <Badge label={sys.status} colorClass="bg-gray-100 text-gray-600" />
              </div>
            </div>
          ))}
          {!systems?.length && (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
              <Bot className="w-10 h-10 mx-auto mb-3" />
              <p className="text-sm">Sem sistemas IA inventariados</p>
              <p className="text-xs mt-1">Registe todos os sistemas de IA da sua organização conforme requerido pelo EU AI Act</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── AI Risks ──────────────────────────────────────────────────────────────────

function RisksTab() {
  const { data: risks, isLoading } = useQuery({
    queryKey: ['ai-risks'],
    queryFn: () => aiGovernanceApi.listRisks().then(r => r.data),
  });

  const CATEGORY_LABELS: Record<string, string> = {
    BIAS_DISCRIMINATION: 'Viés/Discriminação',
    PRIVACY_VIOLATION: 'Violação de Privacidade',
    SECURITY_VULNERABILITY: 'Vulnerabilidade de Segurança',
    TRANSPARENCY_LACK: 'Falta de Transparência',
    ACCOUNTABILITY_GAP: 'Gap de Responsabilização',
    SAFETY_RISK: 'Risco de Segurança',
    LEGAL_COMPLIANCE: 'Conformidade Legal',
    REPUTATIONAL: 'Reputacional',
    OPERATIONAL: 'Operacional',
    OTHER: 'Outro',
  };

  const scoreColor = (score: number) => score >= 15 ? 'text-red-600' : score >= 9 ? 'text-orange-600' : score >= 4 ? 'text-yellow-600' : 'text-green-600';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Registo de Riscos IA</h3>
          <p className="text-sm text-gray-500">Identificação e mitigação de riscos associados a sistemas de IA</p>
        </div>
        <button className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Novo risco
        </button>
      </div>

      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['Risco', 'Sistema IA', 'Categoria', 'Pontuação', 'Estado'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(risks || []).map((r: any) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{r.title}</p>
                    <p className="text-xs text-gray-400">{r.description?.substring(0, 60)}...</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{r.aiSystem?.name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{CATEGORY_LABELS[r.category] || r.category}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-lg font-bold', scoreColor(r.riskScore))}>{r.riskScore}</span>
                    <span className="text-xs text-gray-400 ml-1">({r.likelihood}×{r.impact})</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={r.status} colorClass={r.status === 'MITIGATED' ? 'bg-green-100 text-green-700' : r.status === 'IDENTIFIED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'} />
                  </td>
                </tr>
              ))}
              {!risks?.length && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">Sem riscos IA identificados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── ISO 42001 Controls ────────────────────────────────────────────────────────

function Iso42001Tab() {
  const qc = useQueryClient();
  const { data: controls, isLoading } = useQuery({
    queryKey: ['ai-42001'],
    queryFn: () => aiGovernanceApi.getControls().then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => aiGovernanceApi.updateControl(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-42001'] }),
  });

  const clauses = [...new Set((controls || []).map((c: any) => c.clause as string))];
  const implemented = (controls || []).filter((c: any) => c.status === 'IMPLEMENTED').length;
  const total = (controls || []).filter((c: any) => c.applicable).length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900">ISO 42001 — AI Management System</h3>
        <p className="text-sm text-gray-500">Controlos e requisitos do sistema de gestão de IA</p>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Conformidade geral</span>
          <span className="text-lg font-bold text-blue-600">{total > 0 ? Math.round((implemented / total) * 100) : 0}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div className="h-2.5 rounded-full bg-blue-600" style={{ width: `${total > 0 ? (implemented / total) * 100 : 0}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1">{implemented} de {total} controlos implementados</p>
      </div>

      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
        <div className="space-y-4">
          {clauses.map(clause => {
            const clauseControls = (controls || []).filter((c: any) => c.clause === clause);
            return (
              <div key={clause} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700">{clause}</h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {clauseControls.map((ctrl: any) => (
                    <div key={ctrl.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-xs font-mono text-gray-400">{ctrl.controlCode}</p>
                        <p className="text-sm text-gray-900">{ctrl.title}</p>
                        {ctrl.implementationNotes && (
                          <p className="text-xs text-gray-500 mt-0.5">{ctrl.implementationNotes}</p>
                        )}
                      </div>
                      <select
                        value={ctrl.status}
                        onChange={e => updateMutation.mutate({ id: ctrl.id, data: { status: e.target.value } })}
                        className={cn(
                          'border rounded-lg px-2 py-1 text-xs font-medium',
                          STATUS_COLORS[ctrl.status],
                        )}
                      >
                        {['NOT_STARTED', 'PLANNED', 'IN_PROGRESS', 'IMPLEMENTED', 'NOT_APPLICABLE'].map(s => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Impact Assessments ────────────────────────────────────────────────────────

function AssessmentsTab() {
  const { data: assessments, isLoading } = useQuery({
    queryKey: ['ai-assessments'],
    queryFn: () => aiGovernanceApi.listAssessments().then(r => r.data),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">AI Impact Assessments (AIIA)</h3>
          <p className="text-sm text-gray-500">Avaliações de impacto de sistemas de alto risco (EU AI Act Art. 9)</p>
        </div>
        <button className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nova avaliação
        </button>
      </div>

      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <div className="grid grid-cols-1 gap-4">
          {(assessments || []).map((a: any) => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {a.aiSystem?.name || 'Sistema não especificado'} ·
                    {a.owner ? ` ${a.owner.firstName} ${a.owner.lastName} · ` : ' '}
                    {new Date(a.createdAt).toLocaleDateString()}
                  </p>
                  {a.aiActClassification && (
                    <Badge label={`AI Act: ${a.aiActClassification}`} colorClass={RISK_COLORS[a.aiActClassification] || 'bg-gray-100 text-gray-600'} />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge label={a.status} colorClass={a.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : a.status === 'IN_REVIEW' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'} />
                </div>
              </div>
            </div>
          ))}
          {!assessments?.length && (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
              <FileSearch className="w-10 h-10 mx-auto mb-3" />
              <p className="text-sm">Sem avaliações de impacto registadas</p>
              <p className="text-xs mt-1">Sistemas de alto risco requerem avaliação de impacto obrigatória</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AiGovernancePage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">AI Governance Suite</h1>
            <p className="text-sm text-white/80 mt-1">
              ISO 42001 · EU AI Act · AI Risk Management · AI Inventory · Human Oversight · AI Impact Assessment
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {['ISO 42001:2023', 'EU AI Act 2024', 'Regulamento (UE) 2024/1689', 'ALTAI'].map(tag => (
                <span key={tag} className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'dashboard'    && <DashboardTab />}
      {activeTab === 'inventory'    && <InventoryTab />}
      {activeTab === 'risks'        && <RisksTab />}
      {activeTab === 'assessments'  && <AssessmentsTab />}
      {activeTab === 'iso42001'     && <Iso42001Tab />}
    </div>
  );
}
