'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrComplianceApi } from '@/lib/api';
import {
  Briefcase, Users, AlertTriangle, BookOpen, FileText, Globe,
  Plus, CheckCircle, XCircle, Clock, Loader2, TrendingDown,
  ChevronRight, BarChart2, Shield, Edit,
} from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'dashboard',     label: 'Dashboard',         icon: BarChart2 },
  { key: 'pay',           label: 'Pay Transparency',  icon: TrendingDown },
  { key: 'shst',          label: 'SHST',              icon: Shield },
  { key: 'training',      label: 'Formação',          icon: BookOpen },
  { key: 'contracts',     label: 'Contratos',         icon: FileText },
  { key: 'remote',        label: 'Teletrabalho',      icon: Globe },
];

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, sub }: { icon: any; label: string; value: any; color: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start gap-4">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard tab ─────────────────────────────────────────────────────────────

function DashboardTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['hr-dashboard'],
    queryFn: () => hrComplianceApi.dashboard().then(r => r.data),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={TrendingDown} label="Bandas salariais activas" value={data?.salaryBands ?? 0}     color="bg-blue-50 text-blue-600" />
        <StatCard icon={Shield}       label="Incidentes SHST abertos"  value={data?.shstOpenIncidents ?? 0} color="bg-red-50 text-red-600" />
        <StatCard icon={Users}        label="Contratos activos"         value={data?.activeContracts ?? 0} color="bg-green-50 text-green-600" />
        <StatCard icon={Globe}        label="Trabalhadores remotos"     value={data?.remoteWorkers ?? 0}  color="bg-purple-50 text-purple-600" />
        <StatCard icon={BookOpen}     label="Formações realizadas"      value={data?.trainingCompletions ?? 0} color="bg-orange-50 text-orange-600" />
        <StatCard icon={BookOpen}     label="Formações planeadas"       value={data?.trainings ?? 0}      color="bg-yellow-50 text-yellow-600" />
      </div>

      {/* Sub-modules overview */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Sub-módulos HR Compliance</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Pay Transparency / Salary Band Governance', status: 'active', tab: 'pay' },
            { label: 'SHST — Saúde, Higiene e Segurança no Trabalho', status: 'active', tab: 'shst' },
            { label: 'Canal de Denúncias HR', status: 'nav', tab: 'denuncias' },
            { label: 'Formação & Sensibilização', status: 'active', tab: 'training' },
            { label: 'Gestão de Políticas HR', status: 'nav', tab: 'policies' },
            { label: 'ESG / Governança Social', status: 'coming' },
            { label: 'RGPD HR', status: 'nav', tab: 'gdpr' },
            { label: 'Contratos de Trabalho', status: 'active', tab: 'contracts' },
            { label: 'Teletrabalho', status: 'active', tab: 'remote' },
            { label: 'Auditoria HR & Avaliação de Desempenho', status: 'coming' },
          ].map(m => (
            <div key={m.label} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              <div className={cn('w-2 h-2 rounded-full flex-shrink-0', {
                'bg-green-500': m.status === 'active',
                'bg-blue-400': m.status === 'nav',
                'bg-gray-300': m.status === 'coming',
              })} />
              <span className="text-sm text-gray-700">{m.label}</span>
              {m.status === 'coming' && (
                <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Em breve</span>
              )}
              {m.status === 'nav' && (
                <span className="ml-auto text-xs text-blue-500">→ módulo separado</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Pay Transparency tab ──────────────────────────────────────────────────────

function PayTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ jobFamily: '', jobLevel: '', minSalary: '', maxSalary: '', currency: 'EUR' });

  const { data: bands, isLoading } = useQuery({
    queryKey: ['hr-salary-bands'],
    queryFn: () => hrComplianceApi.listBands().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => hrComplianceApi.createBand(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-salary-bands'] }); setShowForm(false); setForm({ jobFamily: '', jobLevel: '', minSalary: '', maxSalary: '', currency: 'EUR' }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Bandas Salariais</h3>
          <p className="text-sm text-gray-500">Transparência salarial conforme Diretiva 2023/970/UE</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nova banda
        </button>
      </div>

      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 grid grid-cols-3 gap-3">
          {[
            { label: 'Família profissional', field: 'jobFamily', placeholder: 'ex: Engineering' },
            { label: 'Nível', field: 'jobLevel', placeholder: 'ex: Senior' },
            { label: 'Salário mínimo (€)', field: 'minSalary', type: 'number' },
            { label: 'Salário máximo (€)', field: 'maxSalary', type: 'number' },
            { label: 'Moeda', field: 'currency', placeholder: 'EUR' },
          ].map(f => (
            <div key={f.field}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
              <input
                type={f.type || 'text'}
                value={form[f.field]}
                onChange={e => setForm((p: any) => ({ ...p, [f.field]: e.target.value }))}
                placeholder={f.placeholder || ''}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          ))}
          <div className="col-span-3 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['Família', 'Nível', 'Mínimo', 'Máximo', 'Moeda', 'Gap de género', 'Activo'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(bands || []).map((b: any) => {
                const latestGap = b.payGapAnalyses?.[0];
                const gap = latestGap ? Number(latestGap.gapPercentage) : null;
                return (
                  <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{b.jobFamily}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.jobLevel}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">€{Number(b.minSalary).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">€{Number(b.maxSalary).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{b.currency}</td>
                    <td className="px-4 py-3">
                      {gap !== null ? (
                        <span className={cn('text-xs font-medium', gap > 5 ? 'text-red-600' : gap > 0 ? 'text-yellow-600' : 'text-green-600')}>
                          {gap > 0 ? `+${gap.toFixed(1)}%` : `${gap.toFixed(1)}%`}
                        </span>
                      ) : <span className="text-xs text-gray-400">N/A</span>}
                    </td>
                    <td className="px-4 py-3">
                      {b.isActive ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                    </td>
                  </tr>
                );
              })}
              {!bands?.length && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">Sem bandas salariais registadas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── SHST tab ──────────────────────────────────────────────────────────────────

function ShstTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ title: '', description: '', incidentDate: new Date().toISOString().split('T')[0], severity: 'MINOR', injuredWorkers: 0 });

  const { data: incidents, isLoading } = useQuery({
    queryKey: ['hr-shst'],
    queryFn: () => hrComplianceApi.listShst().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => hrComplianceApi.createShst(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-shst'] }); setShowForm(false); },
  });

  const SEVERITY_COLORS: Record<string, string> = {
    NEAR_MISS: 'bg-blue-100 text-blue-700',
    MINOR:     'bg-yellow-100 text-yellow-700',
    MODERATE:  'bg-orange-100 text-orange-700',
    SERIOUS:   'bg-red-100 text-red-700',
    FATAL:     'bg-red-900 text-white',
  };

  const STATUS_LABELS: Record<string, string> = {
    REPORTED: 'Reportado', INVESTIGATING: 'Em investigação',
    CORRECTIVE_ACTION: 'Acção corretiva', CLOSED: 'Encerrado',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Incidentes SHST</h3>
          <p className="text-sm text-gray-500">Registo de acidentes e quase-acidentes de trabalho</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Registar incidente
        </button>
      </div>

      {showForm && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Título</label>
            <input value={form.title} onChange={e => setForm((p: any) => ({ ...p, title: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
            <textarea value={form.description} onChange={e => setForm((p: any) => ({ ...p, description: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data do incidente</label>
            <input type="date" value={form.incidentDate} onChange={e => setForm((p: any) => ({ ...p, incidentDate: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Gravidade</label>
            <select value={form.severity} onChange={e => setForm((p: any) => ({ ...p, severity: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {['NEAR_MISS', 'MINOR', 'MODERATE', 'SERIOUS', 'FATAL'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Trabalhadores lesionados</label>
            <input type="number" value={form.injuredWorkers} onChange={e => setForm((p: any) => ({ ...p, injuredWorkers: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="col-span-2 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50">
              {createMutation.isPending ? 'A guardar...' : 'Registar'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['Incidente', 'Data', 'Gravidade', 'Estado', 'Lesionados', 'ACT reportado'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(incidents || []).map((inc: any) => (
                <tr key={inc.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{inc.title}</p>
                    <p className="text-xs text-gray-400">{inc.location}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(inc.incidentDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', SEVERITY_COLORS[inc.severity])}>
                      {inc.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{STATUS_LABELS[inc.status] || inc.status}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{inc.injuredWorkers}</td>
                  <td className="px-4 py-3">
                    {inc.reportedToACT ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                  </td>
                </tr>
              ))}
              {!incidents?.length && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">Sem incidentes registados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Contracts tab ─────────────────────────────────────────────────────────────

function ContractsTab() {
  const { data: contracts, isLoading } = useQuery({
    queryKey: ['hr-contracts'],
    queryFn: () => hrComplianceApi.listContracts().then(r => r.data),
  });

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE:     'bg-green-100 text-green-700',
    DRAFT:      'bg-gray-100 text-gray-600',
    EXPIRED:    'bg-red-100 text-red-700',
    TERMINATED: 'bg-gray-100 text-gray-500',
    SUSPENDED:  'bg-yellow-100 text-yellow-700',
  };

  const TYPE_LABELS: Record<string, string> = {
    PERMANENT: 'Sem termo', FIXED_TERM: 'A termo certo', TEMPORARY: 'A termo incerto',
    INTERNSHIP: 'Estágio', SERVICE_AGREEMENT: 'Prest. Serviços', PART_TIME: 'Part-time', REMOTE: 'Remoto',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Contratos de Trabalho</h3>
          <p className="text-sm text-gray-500">Registo e gestão de contratos de trabalho</p>
        </div>
        <button className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Novo contrato
        </button>
      </div>

      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['Colaborador', 'Função', 'Tipo', 'Estado', 'Início', 'Fim', 'Salário'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(contracts || []).map((c: any) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">
                      {c.user ? `${c.user.firstName} ${c.user.lastName}` : c.employeeName}
                    </p>
                    <p className="text-xs text-gray-400">{c.user?.email || c.employeeEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.jobTitle}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{TYPE_LABELS[c.contractType] || c.contractType}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[c.status])}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(c.startDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.endDate ? new Date(c.endDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.salary ? `€${Number(c.salary).toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
              {!contracts?.length && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">Sem contratos registados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Remote Workers tab ────────────────────────────────────────────────────────

function RemoteTab() {
  const { data: workers, isLoading } = useQuery({
    queryKey: ['hr-remote'],
    queryFn: () => hrComplianceApi.listRemote().then(r => r.data),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Teletrabalho</h3>
          <p className="text-sm text-gray-500">Registo de trabalhadores remotos e compliance (Lei 83/2021)</p>
        </div>
        <button className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Novo registo
        </button>
      </div>

      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> : (
        <div className="grid grid-cols-1 gap-4">
          {(workers || []).map((w: any) => (
            <div key={w.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 font-bold flex-shrink-0">
                {w.employeeName.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{w.employeeName}</p>
                <p className="text-xs text-gray-400">{w.jobTitle} · {w.country} {w.city ? `· ${w.city}` : ''}</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{w.remoteType}</span>
                <span title={w.workspaceAssessed ? 'Local de trabalho avaliado' : 'Avaliação pendente'}>
                  {w.workspaceAssessed ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                </span>
                <span title={w.equipmentProvided ? 'Equipamento fornecido' : 'Sem equipamento'}>
                  {w.equipmentProvided ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                </span>
              </div>
            </div>
          ))}
          {!workers?.length && (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
              <Globe className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Sem trabalhadores remotos registados</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Training tab ──────────────────────────────────────────────────────────────

function TrainingTab() {
  const { data: trainings, isLoading } = useQuery({
    queryKey: ['hr-trainings'],
    queryFn: () => hrComplianceApi.listTrainings().then(r => r.data),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Formação & Sensibilização</h3>
          <p className="text-sm text-gray-500">Registo de formações e plano anual de formação</p>
        </div>
        <button className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nova formação
        </button>
      </div>

      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> : (
        <div className="grid grid-cols-1 gap-4">
          {(trainings || []).map((tr: any) => (
            <div key={tr.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{tr.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{tr.category} · {tr.instructor || 'Sem instrutor'} · {tr.location || 'Online'}</p>
                  <p className="text-xs text-gray-400">{new Date(tr.trainingDate).toLocaleDateString()} · {tr.durationHours}h</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-green-600">{tr.enrollments?.length ?? 0}</div>
                  <div className="text-xs text-gray-400">concluíram</div>
                  <div className="text-xs text-gray-400">de {tr._count?.enrollments ?? 0} inscritos</div>
                </div>
              </div>
            </div>
          ))}
          {!trainings?.length && (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
              <BookOpen className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Sem formações registadas</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function HrCompliancePage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">HR Compliance & Workforce Governance</h1>
            <p className="text-sm text-gray-500 mt-1">
              Pay Transparency · SHST · Contratos · Teletrabalho · Formação · ESG Social
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {['Lei 60/2018', 'Diretiva 2023/970/UE', 'Lei 83/2021', 'ACT', 'DL 146/2006'].map(tag => (
                <span key={tag} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{tag}</span>
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
      {activeTab === 'dashboard'  && <DashboardTab />}
      {activeTab === 'pay'        && <PayTab />}
      {activeTab === 'shst'       && <ShstTab />}
      {activeTab === 'training'   && <TrainingTab />}
      {activeTab === 'contracts'  && <ContractsTab />}
      {activeTab === 'remote'     && <RemoteTab />}
    </div>
  );
}
