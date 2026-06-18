'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrComplianceApi } from '@/lib/api';
import {
  Briefcase, Users, AlertTriangle, BookOpen, FileText, Globe,
  Plus, CheckCircle, XCircle, Clock, Loader2, TrendingDown,
  ChevronRight, BarChart2, Shield, Edit, TrendingUp, HardHat,
  Home, GraduationCap, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'dashboard',   label: 'Dashboard',      icon: BarChart2 },
  { key: 'pay',         label: 'Pay Transparency', icon: TrendingDown },
  { key: 'gap',         label: 'Gap Salarial',    icon: TrendingUp },
  { key: 'shst',        label: 'SHST',            icon: HardHat },
  { key: 'remote',      label: 'Teletrabalho',    icon: Home },
  { key: 'training',    label: 'Formação RH',     icon: GraduationCap },
  { key: 'contracts',   label: 'Contratos',       icon: FileText },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30';
const selectCls = inputCls;

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
        <StatCard icon={TrendingDown} label="Bandas salariais activas"  value={data?.salaryBands ?? 0}          color="bg-blue-50 text-blue-600" />
        <StatCard icon={Shield}       label="Incidentes SHST abertos"   value={data?.shstOpenIncidents ?? 0}    color="bg-red-50 text-red-600" />
        <StatCard icon={Users}        label="Contratos activos"          value={data?.activeContracts ?? 0}     color="bg-green-50 text-green-600" />
        <StatCard icon={Globe}        label="Trabalhadores remotos"      value={data?.remoteWorkers ?? 0}       color="bg-purple-50 text-purple-600" />
        <StatCard icon={BookOpen}     label="Formações realizadas"       value={data?.trainingCompletions ?? 0} color="bg-orange-50 text-orange-600" />
        <StatCard icon={BookOpen}     label="Formações planeadas"        value={data?.trainings ?? 0}           color="bg-yellow-50 text-yellow-600" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Sub-módulos HR Compliance</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Pay Transparency / Salary Band Governance', status: 'active' },
            { label: 'Gap Salarial — Análise por Género', status: 'active' },
            { label: 'SHST — Saúde, Higiene e Segurança no Trabalho', status: 'active' },
            { label: 'Canal de Denúncias HR', status: 'nav' },
            { label: 'Formação RH & Sensibilização', status: 'active' },
            { label: 'Gestão de Políticas HR', status: 'nav' },
            { label: 'ESG / Governança Social', status: 'coming' },
            { label: 'RGPD HR', status: 'nav' },
            { label: 'Contratos de Trabalho', status: 'active' },
            { label: 'Teletrabalho (Lei 83/2021)', status: 'active' },
          ].map(m => (
            <div key={m.label} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              <div className={cn('w-2 h-2 rounded-full flex-shrink-0', {
                'bg-green-500': m.status === 'active',
                'bg-blue-400':  m.status === 'nav',
                'bg-gray-300':  m.status === 'coming',
              })} />
              <span className="text-sm text-gray-700">{m.label}</span>
              {m.status === 'coming' && <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Em breve</span>}
              {m.status === 'nav'    && <span className="ml-auto text-xs text-blue-500">→ módulo separado</span>}
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-salary-bands'] });
      setShowForm(false);
      setForm({ jobFamily: '', jobLevel: '', minSalary: '', maxSalary: '', currency: 'EUR' });
    },
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
                className={inputCls}
              />
            </div>
          ))}
          <div className="col-span-3 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
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

// ── Gap Salarial tab ──────────────────────────────────────────────────────────

interface SalaryBandForm {
  role: string;
  level: string;
  minSalary: string;
  maxSalary: string;
  medianSalary: string;
  currency: string;
  genderPayGap: string;
}

const EMPTY_BAND_FORM: SalaryBandForm = { role: '', level: '', minSalary: '', maxSalary: '', medianSalary: '', currency: 'EUR', genderPayGap: '' };

function SalaryBandModal({ initial, onClose, onSave, saving }: { initial: SalaryBandForm; onClose: () => void; onSave: (d: SalaryBandForm) => void; saving: boolean }) {
  const [form, setForm] = useState<SalaryBandForm>(initial);
  const set = (k: keyof SalaryBandForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <ModalShell title={initial.role ? 'Editar Banda Salarial' : 'Nova Banda Salarial'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Função / Cargo *"><input value={form.role} onChange={set('role')} className={inputCls} placeholder="ex: Software Engineer" /></Field>
        </div>
        <Field label="Nível"><input value={form.level} onChange={set('level')} className={inputCls} placeholder="ex: Senior" /></Field>
        <Field label="Moeda"><input value={form.currency} onChange={set('currency')} className={inputCls} /></Field>
        <Field label="Salário Mín (€)"><input type="number" value={form.minSalary} onChange={set('minSalary')} className={inputCls} /></Field>
        <Field label="Salário Máx (€)"><input type="number" value={form.maxSalary} onChange={set('maxSalary')} className={inputCls} /></Field>
        <Field label="Mediana (€)"><input type="number" value={form.medianSalary} onChange={set('medianSalary')} className={inputCls} /></Field>
        <Field label="Gap Género (%)"><input type="number" step="0.1" value={form.genderPayGap} onChange={set('genderPayGap')} className={inputCls} placeholder="ex: 3.5" /></Field>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button onClick={onClose} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
        <button onClick={() => onSave(form)} disabled={saving || !form.role} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'A guardar...' : 'Guardar'}
        </button>
      </div>
    </ModalShell>
  );
}

function GapTab() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; record: any | null }>({ open: false, record: null });

  const { data: bands, isLoading } = useQuery({
    queryKey: ['hr-salary-bands'],
    queryFn: () => hrComplianceApi.listBands().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => hrComplianceApi.createBand({ jobFamily: d.role, jobLevel: d.level, minSalary: d.minSalary, maxSalary: d.maxSalary, currency: d.currency }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-salary-bands'] }); setModal({ open: false, record: null }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => hrComplianceApi.updateBand(id, { jobFamily: data.role, jobLevel: data.level, minSalary: data.minSalary, maxSalary: data.maxSalary, currency: data.currency }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-salary-bands'] }); setModal({ open: false, record: null }); },
  });

  const items: any[] = bands || [];
  const gaps = items.map((b: any) => {
    const latestGap = b.payGapAnalyses?.[0];
    return latestGap ? Number(latestGap.gapPercentage) : 0;
  });
  const avgGap = gaps.length ? (gaps.reduce((a: number, b: number) => a + b, 0) / gaps.length) : 0;
  const highGapCount = gaps.filter((g: number) => g > 5).length;

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={TrendingUp} label="Gap Médio %" value={`${avgGap.toFixed(1)}%`} color="bg-blue-50 text-blue-600" />
        <StatCard icon={AlertTriangle} label="Bandas c/ Gap >5%" value={highGapCount} color="bg-red-50 text-red-600" />
        <StatCard icon={BarChart2} label="Total Bandas" value={items.length} color="bg-green-50 text-green-600" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Gap Salarial por Função</h3>
          <p className="text-sm text-gray-500">Análise de equidade salarial de género (Diretiva 2023/970/UE)</p>
        </div>
        <button onClick={() => setModal({ open: true, record: null })} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nova banda
        </button>
      </div>

      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['Função / Cargo', 'Nível', 'Salário Mín (€)', 'Salário Máx (€)', 'Mediana (€)', 'Gap Género (%)', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((b: any) => {
                const latestGap = b.payGapAnalyses?.[0];
                const gap = latestGap ? Number(latestGap.gapPercentage) : null;
                return (
                  <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{b.jobFamily}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.jobLevel || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">€{Number(b.minSalary).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">€{Number(b.maxSalary).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {b.midSalary ? `€${Number(b.midSalary).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {gap !== null ? (
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', gap > 5 ? 'bg-red-100 text-red-700' : gap > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700')}>
                          {gap > 0 ? `+${gap.toFixed(1)}%` : `${gap.toFixed(1)}%`}
                        </span>
                      ) : <span className="text-xs text-gray-400">N/A</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setModal({ open: true, record: b })} className="text-gray-400 hover:text-blue-600">
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!items.length && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">Sem bandas salariais registadas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <SalaryBandModal
          initial={modal.record ? { role: modal.record.jobFamily, level: modal.record.jobLevel || '', minSalary: String(modal.record.minSalary), maxSalary: String(modal.record.maxSalary), medianSalary: String(modal.record.midSalary || ''), currency: modal.record.currency, genderPayGap: '' } : EMPTY_BAND_FORM}
          onClose={() => setModal({ open: false, record: null })}
          onSave={d => modal.record ? updateMutation.mutate({ id: modal.record.id, data: d }) : createMutation.mutate(d)}
          saving={saving}
        />
      )}
    </div>
  );
}

// ── SHST tab ──────────────────────────────────────────────────────────────────

interface ShstForm {
  incidentDate: string;
  type: string;
  severity: string;
  department: string;
  description: string;
  injuriesCount: string;
  correctiveAction: string;
  status: string;
}

const EMPTY_SHST: ShstForm = { incidentDate: new Date().toISOString().split('T')[0], type: 'ACCIDENT', severity: 'LOW', department: '', description: '', injuriesCount: '0', correctiveAction: '', status: 'OPEN' };

const SHST_TYPE_LABELS: Record<string, string> = { ACCIDENT: 'Acidente', NEAR_MISS: 'Quase-acidente', HAZARD_REPORT: 'Reporte de Perigo' };
const SHST_SEV_COLORS: Record<string, string> = { LOW: 'bg-blue-100 text-blue-700', MEDIUM: 'bg-yellow-100 text-yellow-700', HIGH: 'bg-orange-100 text-orange-700', CRITICAL: 'bg-red-100 text-red-700' };
const SHST_STATUS_LABELS: Record<string, string> = { OPEN: 'Aberto', INVESTIGATING: 'Em investigação', CLOSED: 'Encerrado' };
const SHST_STATUS_COLORS: Record<string, string> = { OPEN: 'bg-red-100 text-red-700', INVESTIGATING: 'bg-yellow-100 text-yellow-700', CLOSED: 'bg-green-100 text-green-700' };

// Map existing DB severity/status values to new ones for display
const SEV_MAP: Record<string, string> = { NEAR_MISS: 'LOW', MINOR: 'LOW', MODERATE: 'MEDIUM', SERIOUS: 'HIGH', FATAL: 'CRITICAL' };
const STATUS_MAP: Record<string, string> = { REPORTED: 'OPEN', INVESTIGATING: 'INVESTIGATING', CORRECTIVE_ACTION: 'INVESTIGATING', CLOSED: 'CLOSED' };

function ShstModal({ initial, isEdit, onClose, onSave, saving }: { initial: ShstForm; isEdit: boolean; onClose: () => void; onSave: (d: ShstForm) => void; saving: boolean }) {
  const [form, setForm] = useState<ShstForm>(initial);
  const set = (k: keyof ShstForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <ModalShell title={isEdit ? 'Editar Incidente SHST' : 'Registar Incidente SHST'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data do Incidente *">
          <input type="date" value={form.incidentDate} onChange={set('incidentDate')} className={inputCls} />
        </Field>
        <Field label="Tipo *">
          <select value={form.type} onChange={set('type')} className={selectCls}>
            <option value="ACCIDENT">Acidente</option>
            <option value="NEAR_MISS">Quase-acidente</option>
            <option value="HAZARD_REPORT">Reporte de Perigo</option>
          </select>
        </Field>
        <Field label="Gravidade">
          <select value={form.severity} onChange={set('severity')} className={selectCls}>
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Média</option>
            <option value="HIGH">Alta</option>
            <option value="CRITICAL">Crítica</option>
          </select>
        </Field>
        <Field label="Departamento">
          <input value={form.department} onChange={set('department')} className={inputCls} placeholder="ex: Produção" />
        </Field>
        <div className="col-span-2">
          <Field label="Descrição">
            <textarea value={form.description} onChange={set('description')} rows={3} className={inputCls + ' resize-none'} />
          </Field>
        </div>
        <Field label="Lesionados">
          <input type="number" value={form.injuriesCount} onChange={set('injuriesCount')} className={inputCls} min="0" />
        </Field>
        {isEdit && (
          <Field label="Estado">
            <select value={form.status} onChange={set('status')} className={selectCls}>
              <option value="OPEN">Aberto</option>
              <option value="INVESTIGATING">Em investigação</option>
              <option value="CLOSED">Encerrado</option>
            </select>
          </Field>
        )}
        <div className="col-span-2">
          <Field label="Ação Corretiva">
            <textarea value={form.correctiveAction} onChange={set('correctiveAction')} rows={2} className={inputCls + ' resize-none'} />
          </Field>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button onClick={onClose} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
        <button onClick={() => onSave(form)} disabled={saving} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50">
          {saving ? 'A guardar...' : 'Guardar'}
        </button>
      </div>
    </ModalShell>
  );
}

function ShstTab() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; record: any | null }>({ open: false, record: null });

  const { data: incidents, isLoading } = useQuery({
    queryKey: ['hr-shst'],
    queryFn: () => hrComplianceApi.listShst().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: ShstForm) => hrComplianceApi.createShst({
      title: `${SHST_TYPE_LABELS[d.type] || d.type} — ${d.department || 'Geral'}`,
      description: d.description,
      incidentDate: d.incidentDate,
      severity: d.severity === 'LOW' ? 'MINOR' : d.severity === 'MEDIUM' ? 'MODERATE' : d.severity === 'HIGH' ? 'SERIOUS' : 'FATAL',
      injuredWorkers: Number(d.injuriesCount),
      correctiveAction: d.correctiveAction,
      location: d.department,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-shst'] }); setModal({ open: false, record: null }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ShstForm }) => hrComplianceApi.updateShst(id, {
      severity: data.severity === 'LOW' ? 'MINOR' : data.severity === 'MEDIUM' ? 'MODERATE' : data.severity === 'HIGH' ? 'SERIOUS' : 'FATAL',
      status: data.status === 'OPEN' ? 'REPORTED' : data.status === 'CLOSED' ? 'CLOSED' : 'INVESTIGATING',
      injuredWorkers: Number(data.injuriesCount),
      correctiveAction: data.correctiveAction,
      location: data.department,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-shst'] }); setModal({ open: false, record: null }); },
  });

  const items: any[] = incidents || [];
  const year = new Date().getFullYear();
  const accidents = items.filter((i: any) => i.severity !== 'NEAR_MISS').length;
  const nearMisses = items.filter((i: any) => i.severity === 'NEAR_MISS').length;
  const open = items.filter((i: any) => i.status === 'REPORTED' || i.status === 'INVESTIGATING').length;
  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={HardHat} label={`Acidentes ${year}`} value={accidents} color="bg-red-50 text-red-600" />
        <StatCard icon={AlertTriangle} label="Near Misses" value={nearMisses} color="bg-yellow-50 text-yellow-600" />
        <StatCard icon={Clock} label="Abertos" value={open} color="bg-orange-50 text-orange-600" />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Incidentes SHST</h3>
          <p className="text-sm text-gray-500">Registo de acidentes e quase-acidentes de trabalho</p>
        </div>
        <button onClick={() => setModal({ open: true, record: null })} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Registar incidente
        </button>
      </div>

      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['Data', 'Tipo', 'Gravidade', 'Departamento', 'Estado', 'Ação Corretiva', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((inc: any) => {
                const mappedSev = SEV_MAP[inc.severity] || inc.severity;
                const mappedStatus = STATUS_MAP[inc.status] || inc.status;
                return (
                  <tr key={inc.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(inc.incidentDate).toLocaleDateString('pt-PT')}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-700">
                        {inc.title?.includes('Acidente') ? 'ACCIDENT' : inc.title?.includes('Quase') ? 'NEAR_MISS' : 'HAZARD_REPORT'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-1 rounded-full font-medium', SHST_SEV_COLORS[mappedSev] || 'bg-gray-100 text-gray-600')}>
                        {mappedSev}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{inc.location || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-1 rounded-full font-medium', SHST_STATUS_COLORS[mappedStatus] || 'bg-gray-100 text-gray-600')}>
                        {SHST_STATUS_LABELS[mappedStatus] || mappedStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] truncate">{inc.correctiveAction || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setModal({ open: true, record: inc })} className="text-gray-400 hover:text-blue-600">
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!items.length && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">Sem incidentes registados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <ShstModal
          initial={modal.record ? {
            incidentDate: new Date(modal.record.incidentDate).toISOString().split('T')[0],
            type: 'ACCIDENT',
            severity: SEV_MAP[modal.record.severity] || 'LOW',
            department: modal.record.location || '',
            description: modal.record.description || '',
            injuriesCount: String(modal.record.injuredWorkers || 0),
            correctiveAction: modal.record.correctiveAction || '',
            status: STATUS_MAP[modal.record.status] || 'OPEN',
          } : EMPTY_SHST}
          isEdit={!!modal.record}
          onClose={() => setModal({ open: false, record: null })}
          onSave={d => modal.record ? updateMutation.mutate({ id: modal.record.id, data: d }) : createMutation.mutate(d)}
          saving={saving}
        />
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
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(c.startDate).toLocaleDateString('pt-PT')}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.endDate ? new Date(c.endDate).toLocaleDateString('pt-PT') : '—'}</td>
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

interface RemoteForm {
  employeeName: string;
  country: string;
  agreementStart: string;
  agreementEnd: string;
  status: string;
  taxCompliance: boolean;
  socialSecurityNotes: string;
}

const EMPTY_REMOTE: RemoteForm = { employeeName: '', country: '', agreementStart: '', agreementEnd: '', status: 'ACTIVE', taxCompliance: false, socialSecurityNotes: '' };

const REMOTE_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-red-100 text-red-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
};

const EU_COUNTRIES = new Set(['AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI','FR','GR','HR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK']);

function RemoteModal({ initial, onClose, onSave, saving }: { initial: RemoteForm; onClose: () => void; onSave: (d: RemoteForm) => void; saving: boolean }) {
  const [form, setForm] = useState<RemoteForm>(initial);
  const set = (k: keyof RemoteForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <ModalShell title={initial.employeeName ? 'Editar Registo Teletrabalho' : 'Novo Registo Teletrabalho'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Colaborador *"><input value={form.employeeName} onChange={set('employeeName')} className={inputCls} placeholder="Nome do colaborador" /></Field>
        </div>
        <Field label="País *"><input value={form.country} onChange={set('country')} className={inputCls} placeholder="ex: PT, ES, DE" /></Field>
        <Field label="Estado">
          <select value={form.status} onChange={set('status')} className={selectCls}>
            <option value="ACTIVE">Ativo</option>
            <option value="PENDING">Pendente</option>
            <option value="EXPIRED">Expirado</option>
          </select>
        </Field>
        <Field label="Início Acordo *"><input type="date" value={form.agreementStart} onChange={set('agreementStart')} className={inputCls} /></Field>
        <Field label="Fim Acordo"><input type="date" value={form.agreementEnd} onChange={set('agreementEnd')} className={inputCls} /></Field>
        <div className="col-span-2 flex items-center gap-3">
          <input type="checkbox" id="taxComp" checked={form.taxCompliance} onChange={e => setForm(p => ({ ...p, taxCompliance: e.target.checked }))} className="w-4 h-4" />
          <label htmlFor="taxComp" className="text-sm text-gray-700">Compliance Fiscal verificada</label>
        </div>
        <div className="col-span-2">
          <Field label="Notas Segurança Social">
            <textarea value={form.socialSecurityNotes} onChange={set('socialSecurityNotes')} rows={2} className={inputCls + ' resize-none'} />
          </Field>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button onClick={onClose} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
        <button onClick={() => onSave(form)} disabled={saving || !form.employeeName || !form.country || !form.agreementStart} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'A guardar...' : 'Guardar'}
        </button>
      </div>
    </ModalShell>
  );
}

function RemoteTab() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; record: any | null }>({ open: false, record: null });

  const { data: workers, isLoading } = useQuery({
    queryKey: ['hr-remote'],
    queryFn: () => hrComplianceApi.listRemote().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: RemoteForm) => hrComplianceApi.createRemote({
      employeeName: d.employeeName,
      country: d.country,
      startDate: d.agreementStart,
      endDate: d.agreementEnd || undefined,
      taxCompliant: d.taxCompliance,
      notes: d.socialSecurityNotes,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-remote'] }); setModal({ open: false, record: null }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: RemoteForm }) => hrComplianceApi.updateRemote(id, {
      country: data.country,
      endDate: data.agreementEnd || undefined,
      taxCompliant: data.taxCompliance,
      notes: data.socialSecurityNotes,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-remote'] }); setModal({ open: false, record: null }); },
  });

  const items: any[] = workers || [];
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const active = items.filter((w: any) => !w.endDate || new Date(w.endDate) > now).length;
  const outsideEU = items.filter((w: any) => !EU_COUNTRIES.has(w.country?.toUpperCase())).length;
  const expiring = items.filter((w: any) => w.endDate && new Date(w.endDate) <= in30 && new Date(w.endDate) > now).length;
  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Home} label="Ativos" value={active} color="bg-purple-50 text-purple-600" />
        <StatCard icon={Globe} label="Fora da UE" value={outsideEU} color="bg-orange-50 text-orange-600" />
        <StatCard icon={Clock} label="A Expirar 30 dias" value={expiring} color="bg-yellow-50 text-yellow-600" />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Teletrabalho</h3>
          <p className="text-sm text-gray-500">Registo de trabalhadores remotos e compliance (Lei 83/2021)</p>
        </div>
        <button onClick={() => setModal({ open: true, record: null })} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Novo registo
        </button>
      </div>

      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['Colaborador', 'País', 'Início Acordo', 'Fim Acordo', 'Estado', 'Compliance Fiscal', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((w: any) => {
                const isExpired = w.endDate && new Date(w.endDate) < now;
                const isExpiring = w.endDate && new Date(w.endDate) <= in30 && !isExpired;
                const statusKey = isExpired ? 'EXPIRED' : (w.taxCompliant === false && !w.startDate) ? 'PENDING' : 'ACTIVE';
                return (
                  <tr key={w.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{w.user ? `${w.user.firstName} ${w.user.lastName}` : w.employeeName}</p>
                      <p className="text-xs text-gray-400">{w.jobTitle}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{w.country}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(w.startDate).toLocaleDateString('pt-PT')}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {w.endDate ? (
                        <span className={isExpiring ? 'text-orange-600 font-medium' : ''}>{new Date(w.endDate).toLocaleDateString('pt-PT')}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-1 rounded-full font-medium', REMOTE_STATUS_COLORS[statusKey])}>
                        {statusKey === 'ACTIVE' ? 'Ativo' : statusKey === 'EXPIRED' ? 'Expirado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {w.taxCompliant
                        ? <CheckCircle className="w-4 h-4 text-green-500" />
                        : <XCircle className="w-4 h-4 text-gray-300" />}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setModal({ open: true, record: w })} className="text-gray-400 hover:text-blue-600">
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!items.length && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">Sem trabalhadores remotos registados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <RemoteModal
          initial={modal.record ? {
            employeeName: modal.record.user ? `${modal.record.user.firstName} ${modal.record.user.lastName}` : modal.record.employeeName,
            country: modal.record.country || '',
            agreementStart: new Date(modal.record.startDate).toISOString().split('T')[0],
            agreementEnd: modal.record.endDate ? new Date(modal.record.endDate).toISOString().split('T')[0] : '',
            status: 'ACTIVE',
            taxCompliance: !!modal.record.taxCompliant,
            socialSecurityNotes: modal.record.notes || '',
          } : EMPTY_REMOTE}
          onClose={() => setModal({ open: false, record: null })}
          onSave={d => modal.record ? updateMutation.mutate({ id: modal.record.id, data: d }) : createMutation.mutate(d)}
          saving={saving}
        />
      )}
    </div>
  );
}

// ── Training tab ──────────────────────────────────────────────────────────────

interface TrainingForm {
  employeeName: string;
  courseTitle: string;
  trainingType: string;
  status: string;
  completedAt: string;
  expiresAt: string;
  provider: string;
  certificationNumber: string;
}

const EMPTY_TRAINING: TrainingForm = { employeeName: '', courseTitle: '', trainingType: 'COMPLIANCE', status: 'PENDING', completedAt: '', expiresAt: '', provider: '', certificationNumber: '' };

const TRAINING_STATUS_COLORS: Record<string, string> = {
  PENDING:     'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED:   'bg-green-100 text-green-700',
  EXPIRED:     'bg-red-100 text-red-700',
};

const TRAINING_TYPE_LABELS: Record<string, string> = {
  COMPLIANCE: 'Compliance', SAFETY: 'Segurança', ONBOARDING: 'Integração',
  LEADERSHIP: 'Liderança', TECHNICAL: 'Técnica', GENERAL: 'Geral',
};

function TrainingModal({ initial, onClose, onSave, saving }: { initial: TrainingForm; onClose: () => void; onSave: (d: TrainingForm) => void; saving: boolean }) {
  const [form, setForm] = useState<TrainingForm>(initial);
  const set = (k: keyof TrainingForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <ModalShell title={initial.courseTitle ? 'Editar Formação RH' : 'Nova Formação RH'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Colaborador *"><input value={form.employeeName} onChange={set('employeeName')} className={inputCls} placeholder="Nome do colaborador" /></Field>
        </div>
        <div className="col-span-2">
          <Field label="Formação *"><input value={form.courseTitle} onChange={set('courseTitle')} className={inputCls} placeholder="Título da formação" /></Field>
        </div>
        <Field label="Tipo">
          <select value={form.trainingType} onChange={set('trainingType')} className={selectCls}>
            {Object.entries(TRAINING_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Estado">
          <select value={form.status} onChange={set('status')} className={selectCls}>
            <option value="PENDING">Pendente</option>
            <option value="IN_PROGRESS">Em curso</option>
            <option value="COMPLETED">Concluída</option>
            <option value="EXPIRED">Expirada</option>
          </select>
        </Field>
        <Field label="Concluído em"><input type="date" value={form.completedAt} onChange={set('completedAt')} className={inputCls} /></Field>
        <Field label="Expira em"><input type="date" value={form.expiresAt} onChange={set('expiresAt')} className={inputCls} /></Field>
        <Field label="Entidade Formadora"><input value={form.provider} onChange={set('provider')} className={inputCls} /></Field>
        <Field label="Nº Certificado"><input value={form.certificationNumber} onChange={set('certificationNumber')} className={inputCls} /></Field>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button onClick={onClose} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
        <button onClick={() => onSave(form)} disabled={saving || !form.employeeName || !form.courseTitle} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'A guardar...' : 'Guardar'}
        </button>
      </div>
    </ModalShell>
  );
}

function TrainingTab() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; record: any | null }>({ open: false, record: null });

  const { data: trainings, isLoading } = useQuery({
    queryKey: ['hr-trainings'],
    queryFn: () => hrComplianceApi.listTrainings().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: TrainingForm) => hrComplianceApi.createTraining({
      title: d.courseTitle,
      category: d.trainingType,
      trainingDate: d.completedAt || new Date().toISOString().split('T')[0],
      instructor: d.provider,
      durationHours: 1,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-trainings'] }); setModal({ open: false, record: null }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TrainingForm }) => hrComplianceApi.updateTraining(id, {
      category: data.trainingType,
      instructor: data.provider,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-trainings'] }); setModal({ open: false, record: null }); },
  });

  const items: any[] = trainings || [];
  const year = new Date().getFullYear();
  const now = new Date();
  const completed = items.filter((t: any) => {
    const enrollments = t.enrollments || [];
    return enrollments.length > 0 && new Date(t.trainingDate).getFullYear() === year;
  }).length;
  const pending = items.filter((t: any) => (t.enrollments?.length ?? 0) === 0).length;
  const expired = items.filter((t: any) => t.expiresAfterMonths && new Date(t.trainingDate).getTime() + t.expiresAfterMonths * 30 * 24 * 60 * 60 * 1000 < now.getTime()).length;
  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={GraduationCap} label={`Concluídas ${year}`} value={completed} color="bg-green-50 text-green-600" />
        <StatCard icon={Clock} label="Pendentes" value={pending} color="bg-yellow-50 text-yellow-600" />
        <StatCard icon={AlertTriangle} label="Expiradas" value={expired} color="bg-red-50 text-red-600" />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Formação RH</h3>
          <p className="text-sm text-gray-500">Registo de formações e plano anual de formação</p>
        </div>
        <button onClick={() => setModal({ open: true, record: null })} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nova formação
        </button>
      </div>

      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['Colaborador', 'Formação', 'Tipo', 'Estado', 'Concluído', 'Expira', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((tr: any) => {
                const hasEnrollments = (tr.enrollments?.length ?? 0) > 0;
                const isExpired = tr.expiresAfterMonths && new Date(tr.trainingDate).getTime() + tr.expiresAfterMonths * 30 * 24 * 60 * 60 * 1000 < now.getTime();
                const statusKey = isExpired ? 'EXPIRED' : hasEnrollments ? 'COMPLETED' : 'PENDING';
                return (
                  <tr key={tr.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">{tr.instructor || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{tr.title}</p>
                      <p className="text-xs text-gray-400">{tr.location || 'Online'}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{TRAINING_TYPE_LABELS[tr.category] || tr.category}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-1 rounded-full font-medium', TRAINING_STATUS_COLORS[statusKey])}>
                        {statusKey === 'PENDING' ? 'Pendente' : statusKey === 'COMPLETED' ? 'Concluída' : 'Expirada'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {hasEnrollments ? new Date(tr.trainingDate).toLocaleDateString('pt-PT') : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {tr.expiresAfterMonths ? new Date(new Date(tr.trainingDate).getTime() + tr.expiresAfterMonths * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-PT') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setModal({ open: true, record: tr })} className="text-gray-400 hover:text-blue-600">
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!items.length && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">Sem formações registadas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <TrainingModal
          initial={modal.record ? {
            employeeName: modal.record.instructor || '',
            courseTitle: modal.record.title || '',
            trainingType: modal.record.category || 'COMPLIANCE',
            status: 'COMPLETED',
            completedAt: new Date(modal.record.trainingDate).toISOString().split('T')[0],
            expiresAt: modal.record.expiresAfterMonths ? new Date(new Date(modal.record.trainingDate).getTime() + modal.record.expiresAfterMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : '',
            provider: modal.record.instructor || '',
            certificationNumber: '',
          } : EMPTY_TRAINING}
          onClose={() => setModal({ open: false, record: null })}
          onSave={d => modal.record ? updateMutation.mutate({ id: modal.record.id, data: d }) : createMutation.mutate(d)}
          saving={saving}
        />
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
              Pay Transparency · Gap Salarial · SHST · Contratos · Teletrabalho · Formação · ESG Social
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
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
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
      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'pay'       && <PayTab />}
      {activeTab === 'gap'       && <GapTab />}
      {activeTab === 'shst'      && <ShstTab />}
      {activeTab === 'remote'    && <RemoteTab />}
      {activeTab === 'training'  && <TrainingTab />}
      {activeTab === 'contracts' && <ContractsTab />}
    </div>
  );
}
