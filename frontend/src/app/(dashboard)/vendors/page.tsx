'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorsApi } from '@/lib/api';
import {
  Building2, Plus, Search, AlertTriangle, CheckCircle,
  Clock, TrendingUp, X, ChevronRight, Star, Shield,
  ExternalLink, Trash2, Edit2,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  LOW:      'bg-green-100 text-green-800',
  MEDIUM:   'bg-yellow-100 text-yellow-800',
  HIGH:     'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:      'bg-green-100 text-green-700',
  INACTIVE:    'bg-gray-100 text-gray-600',
  UNDER_REVIEW:'bg-yellow-100 text-yellow-700',
  TERMINATED:  'bg-red-100 text-red-700',
};

const CATEGORIES = [
  'Technology', 'Cloud Services', 'Security', 'Legal', 'Finance',
  'HR', 'Marketing', 'Logistics', 'Consulting', 'Other',
];

const EMPTY_VENDOR = {
  name: '', website: '', category: 'Technology', contactName: '', contactEmail: '',
  status: 'ACTIVE', contractStart: '', contractEnd: '', dataProcessor: false,
  dataShared: '', countries: '', notes: '',
};

// ── Stat Card ─────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'blue' }: {
  label: string; value: number | string; sub?: string; color?: string;
}) {
  const ring: Record<string, string> = {
    blue: 'border-l-blue-500', red: 'border-l-red-500',
    yellow: 'border-l-yellow-500', green: 'border-l-green-500',
  };
  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 border-l-4 ${ring[color]}`}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Score Ring ────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 36, c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  const col = score >= 75 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle cx="44" cy="44" r={r} fill="none" stroke={col} strokeWidth="8"
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        transform="rotate(-90 44 44)" />
      <text x="44" y="49" textAnchor="middle" fontSize="16" fontWeight="bold" fill={col}>
        {score}%
      </text>
    </svg>
  );
}

// ── Vendor Form Modal ─────────────────────────────────────────────

function VendorModal({ vendor, onClose }: { vendor?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!vendor?.id;
  const [form, setForm] = useState(vendor ? {
    name: vendor.name, website: vendor.website ?? '', category: vendor.category,
    contactName: vendor.contactName ?? '', contactEmail: vendor.contactEmail ?? '',
    status: vendor.status, contractStart: vendor.contractStart?.slice(0, 10) ?? '',
    contractEnd: vendor.contractEnd?.slice(0, 10) ?? '',
    dataProcessor: vendor.dataProcessor, dataShared: vendor.dataShared ?? '',
    countries: vendor.countries ?? '', notes: vendor.notes ?? '',
  } : { ...EMPTY_VENDOR });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit
      ? vendorsApi.update(vendor.id, data)
      : vendorsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      qc.invalidateQueries({ queryKey: ['vendors-dashboard'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...form };
    if (payload.contractStart) payload.contractStart = new Date(payload.contractStart).toISOString();
    else delete payload.contractStart;
    if (payload.contractEnd) payload.contractEnd = new Date(payload.contractEnd).toISOString();
    else delete payload.contractEnd;
    mutation.mutate(payload);
  };

  const field = (label: string, key: string, type = 'text', required = false) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type} value={(form as any)[key]} required={required}
        onChange={e => set(key, e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {field('Nome *', 'name', 'text', true)}
            {field('Website', 'website')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
                <option value="UNDER_REVIEW">Em Revisão</option>
                <option value="TERMINATED">Terminado</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('Nome do Contacto', 'contactName')}
            {field('Email do Contacto', 'contactEmail', 'email')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('Início do Contrato', 'contractStart', 'date')}
            {field('Fim do Contrato', 'contractEnd', 'date')}
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.dataProcessor} onChange={e => set('dataProcessor', e.target.checked)}
                className="w-4 h-4 rounded" />
              Subcontratante de dados (Art. 28 RGPD)
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dados partilhados</label>
            <input value={form.dataShared} onChange={e => set('dataShared', e.target.value)}
              placeholder="ex: nome, email, dados de saúde"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Países de transferência</label>
            <input value={form.countries} onChange={e => set('countries', e.target.value)}
              placeholder="ex: Portugal, Alemanha, EUA"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {mutation.isPending ? 'A guardar...' : isEdit ? 'Guardar' : 'Registar Fornecedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Assessment Modal ──────────────────────────────────────────────

function AssessmentModal({ vendor, onClose }: { vendor: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [score, setScore] = useState(70);
  const [findings, setFindings] = useState('');

  const mutation = useMutation({
    mutationFn: () => vendorsApi.addAssessment(vendor.id, { score, findings: findings || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      qc.invalidateQueries({ queryKey: ['vendors-dashboard'] });
      onClose();
    },
  });

  const riskLevel = score >= 80 ? 'LOW' : score >= 60 ? 'MEDIUM' : score >= 40 ? 'HIGH' : 'CRITICAL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold">Avaliação de Risco — {vendor.name}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Score de Conformidade</label>
              <span className="text-2xl font-bold text-gray-900">{score}</span>
            </div>
            <input type="range" min={0} max={100} value={score} onChange={e => setScore(+e.target.value)}
              className="w-full accent-blue-600" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0 — Crítico</span><span>100 — Baixo risco</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Nível calculado:</span>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${RISK_COLORS[riskLevel]}`}>
              {riskLevel}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conclusões / Findings</label>
            <textarea value={findings} onChange={e => setFindings(e.target.value)} rows={4}
              placeholder="Descreva os principais achados da avaliação..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {mutation.isPending ? 'A guardar...' : 'Registar Avaliação'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Vendor Detail Panel ───────────────────────────────────────────

function VendorPanel({ vendor, onClose, onEdit, onAssess }: {
  vendor: any; onClose: () => void; onEdit: () => void; onAssess: () => void;
}) {
  const { data } = useQuery({
    queryKey: ['vendor', vendor.id],
    queryFn: () => vendorsApi.get(vendor.id).then(r => r.data),
  });
  const v = data ?? vendor;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-[480px] bg-white shadow-2xl overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{v.name}</h2>
            <p className="text-sm text-gray-500">{v.category}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-5 space-y-5 flex-1">
          {/* Risk score */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <ScoreRing score={v.riskScore ?? 0} />
            <div>
              <p className="text-sm text-gray-500">Score de Risco</p>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${RISK_COLORS[v.riskLevel]}`}>
                {v.riskLevel}
              </span>
              {v.lastAssessedAt && (
                <p className="text-xs text-gray-400 mt-1">
                  Última avaliação: {new Date(v.lastAssessedAt).toLocaleDateString('pt-PT')}
                </p>
              )}
            </div>
          </div>

          {/* Status + GDPR flags */}
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[v.status]}`}>
              {v.status}
            </span>
            {v.dataProcessor && (
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                Subcontratante RGPD
              </span>
            )}
          </div>

          {/* Contract */}
          {(v.contractStart || v.contractEnd) && (
            <div className="border border-gray-100 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Contrato</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {v.contractStart && (
                  <div>
                    <span className="text-gray-500">Início: </span>
                    {new Date(v.contractStart).toLocaleDateString('pt-PT')}
                  </div>
                )}
                {v.contractEnd && (
                  <div>
                    <span className="text-gray-500">Fim: </span>
                    {new Date(v.contractEnd).toLocaleDateString('pt-PT')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact */}
          {(v.contactName || v.contactEmail) && (
            <div className="border border-gray-100 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Contacto</h3>
              {v.contactName && <p className="text-sm">{v.contactName}</p>}
              {v.contactEmail && <a href={`mailto:${v.contactEmail}`} className="text-sm text-blue-600 hover:underline">{v.contactEmail}</a>}
            </div>
          )}

          {/* Data */}
          {(v.dataShared || v.countries) && (
            <div className="border border-gray-100 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Dados Pessoais</h3>
              {v.dataShared && <p className="text-sm text-gray-600"><span className="font-medium">Dados: </span>{v.dataShared}</p>}
              {v.countries && <p className="text-sm text-gray-600 mt-1"><span className="font-medium">Países: </span>{v.countries}</p>}
            </div>
          )}

          {/* Assessments history */}
          {v.assessments?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Histórico de Avaliações</h3>
              <div className="space-y-2">
                {v.assessments.map((a: any) => (
                  <div key={a.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{a.score}/100</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${RISK_COLORS[a.riskLevel ?? 'LOW']}`}>
                          {a.riskLevel}
                        </span>
                      </div>
                      {a.findings && <p className="text-gray-500 mt-1">{a.findings}</p>}
                      {a.assessedBy && (
                        <p className="text-xs text-gray-400 mt-1">
                          Por {a.assessedBy.firstName} {a.assessedBy.lastName}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(a.createdAt).toLocaleDateString('pt-PT')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {v.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Notas</h3>
              <p className="text-sm text-gray-600">{v.notes}</p>
            </div>
          )}
        </div>
        <div className="p-4 border-t">
          <button onClick={onAssess}
            className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            + Nova Avaliação de Risco
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────

export default function VendorsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editVendor, setEditVendor] = useState<any>(null);
  const [panelVendor, setPanelVendor] = useState<any>(null);
  const [assessVendor, setAssessVendor] = useState<any>(null);

  const { data: dashboard } = useQuery({
    queryKey: ['vendors-dashboard'],
    queryFn: () => vendorsApi.dashboard().then(r => r.data),
  });

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['vendors', filterRisk, filterStatus, filterCategory],
    queryFn: () => vendorsApi.list({
      riskLevel: filterRisk || undefined,
      status: filterStatus || undefined,
      category: filterCategory || undefined,
    }).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vendorsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      qc.invalidateQueries({ queryKey: ['vendors-dashboard'] });
    },
  });

  const filtered = vendors.filter((v: any) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.category?.toLowerCase().includes(search.toLowerCase())
  );

  const d = dashboard ?? { total: 0, active: 0, highRisk: 0, expiring: 0, dataProcessors: 0 };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600" />
            Gestão de Fornecedores
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Controlo de risco de terceiros e subcontratantes RGPD</p>
        </div>
        <button onClick={() => { setEditVendor(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> Novo Fornecedor
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total" value={d.total} color="blue" />
        <StatCard label="Ativos" value={d.active} color="green" />
        <StatCard label="Alto Risco" value={d.highRisk} color="red" sub="HIGH + CRITICAL" />
        <StatCard label="Contratos a Expirar" value={d.expiring} color="yellow" sub="próximos 60 dias" />
        <StatCard label="Subcontratantes RGPD" value={d.dataProcessors} color="blue" sub="Art. 28 RGPD" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar fornecedores..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os riscos</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os estados</option>
          <option value="ACTIVE">Ativo</option>
          <option value="INACTIVE">Inativo</option>
          <option value="UNDER_REVIEW">Em Revisão</option>
          <option value="TERMINATED">Terminado</option>
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todas as categorias</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">A carregar...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Building2 className="w-10 h-10 mb-2 opacity-30" />
            <p>Nenhum fornecedor encontrado</p>
            <button onClick={() => setShowModal(true)}
              className="mt-3 text-sm text-blue-600 hover:underline">Registar primeiro fornecedor</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Fornecedor</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Categoria</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Risco</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Score</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Avaliações</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">RGPD</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((v: any) => (
                <tr key={v.id} className="hover:bg-gray-50 cursor-pointer group"
                  onClick={() => setPanelVendor(v)}>
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900">{v.name}</div>
                    {v.website && (
                      <a href={v.website} target="_blank" rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />{v.website}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{v.category}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[v.status]}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${RISK_COLORS[v.riskLevel]}`}>
                      {v.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {v.riskScore !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${v.riskScore >= 80 ? 'bg-green-500' : v.riskScore >= 60 ? 'bg-yellow-500' : v.riskScore >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                            style={{ width: `${v.riskScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{v.riskScore}</span>
                      </div>
                    ) : <span className="text-xs text-gray-400">Sem avaliação</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-gray-600">{v._count?.assessments ?? 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    {v.dataProcessor && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                        Art. 28
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditVendor(v); setShowModal(true); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setAssessVendor(v)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                        title="Nova avaliação">
                        <Star className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { if (confirm('Remover fornecedor?')) deleteMutation.mutate(v.id); }}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <VendorModal
          vendor={editVendor}
          onClose={() => { setShowModal(false); setEditVendor(null); }}
        />
      )}
      {assessVendor && (
        <AssessmentModal vendor={assessVendor} onClose={() => setAssessVendor(null)} />
      )}
      {panelVendor && (
        <VendorPanel
          vendor={panelVendor}
          onClose={() => setPanelVendor(null)}
          onEdit={() => { setEditVendor(panelVendor); setShowModal(true); setPanelVendor(null); }}
          onAssess={() => { setAssessVendor(panelVendor); setPanelVendor(null); }}
        />
      )}
    </div>
  );
}
