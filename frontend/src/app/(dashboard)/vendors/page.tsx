'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { vendorsApi, vendorQuestionnaireApi } from '@/lib/api';
import {
  Building2, Plus, Search, X, ChevronRight, Star,
  ExternalLink, Trash2, Edit2, Download, ShieldCheck, AlertCircle, Send, Copy, CheckCircle2,
  ClipboardCheck,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/table-skeleton';

// ── Helpers ──────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  LOW:      'bg-green-100 text-green-800',
  MEDIUM:   'bg-yellow-100 text-yellow-800',
  HIGH:     'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:       'bg-green-100 text-green-700',
  INACTIVE:     'bg-gray-100 text-gray-600',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
  TERMINATED:   'bg-red-100 text-red-700',
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

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-700 bg-green-50';
  if (score >= 60) return 'text-yellow-700 bg-yellow-50';
  if (score >= 40) return 'text-orange-700 bg-orange-50';
  return 'text-red-700 bg-red-50';
}

// ── Stat Card ─────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'blue' }: {
  label: string; value: number | string; sub?: string; color?: string;
}) {
  const ring: Record<string, string> = {
    blue: 'border-l-blue-500', red: 'border-l-red-500',
    yellow: 'border-l-yellow-500', green: 'border-l-green-500',
    orange: 'border-l-orange-500',
  };
  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 border-l-4 ${ring[color] ?? ring.blue}`}>
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
  const t = useTranslations('vendors');
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
            {isEdit ? t('editVendor') : t('addVendor')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {field(`${t('vendorName')} *`, 'name', 'text', true)}
            {field(t('website'), 'website')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('category')}</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('statusLabel')}</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="ACTIVE">{t('status.ACTIVE')}</option>
                <option value="INACTIVE">{t('status.INACTIVE')}</option>
                <option value="UNDER_REVIEW">{t('status.UNDER_REVIEW')}</option>
                <option value="TERMINATED">{t('status.TERMINATED')}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field(t('contactName'), 'contactName')}
            {field(t('contactEmail'), 'contactEmail', 'email')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field(t('contractStart'), 'contractStart', 'date')}
            {field(t('contractEnd'), 'contractEnd', 'date')}
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.dataProcessor} onChange={e => set('dataProcessor', e.target.checked)}
                className="w-4 h-4 rounded" />
              {t('dataProcessorLabel')}
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('dataShared')}</label>
            <input value={form.dataShared} onChange={e => set('dataShared', e.target.value)}
              placeholder={t('dataSharedPlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('transferCountries')}</label>
            <input value={form.countries} onChange={e => set('countries', e.target.value)}
              placeholder={t('transferCountriesPlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('notes')}</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              {t('cancel')}
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {mutation.isPending ? t('saving') : isEdit ? t('save') : t('register')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Quick Assessment Modal (legacy — from vendor row) ─────────────

function AssessmentModal({ vendor, onClose }: { vendor: any; onClose: () => void }) {
  const t = useTranslations('vendors');
  const qc = useQueryClient();
  const [score, setScore] = useState(70);
  const [findings, setFindings] = useState('');

  const mutation = useMutation({
    mutationFn: () => vendorsApi.addAssessment(vendor.id, { score, findings: findings || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      qc.invalidateQueries({ queryKey: ['vendors-dashboard'] });
      qc.invalidateQueries({ queryKey: ['vendor-assessments'] });
      onClose();
    },
  });

  const riskLevel = score >= 80 ? 'LOW' : score >= 60 ? 'MEDIUM' : score >= 40 ? 'HIGH' : 'CRITICAL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold">{t('assessmentTitle')} — {vendor.name}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">{t('assessmentScore')}</label>
              <span className="text-2xl font-bold text-gray-900">{score}</span>
            </div>
            <input type="range" min={0} max={100} value={score} onChange={e => setScore(+e.target.value)}
              className="w-full accent-blue-600" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0 — {t('riskLevels.CRITICAL')}</span>
              <span>100 — {t('riskLevels.LOW')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{t('calculatedLevel')}:</span>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${RISK_COLORS[riskLevel]}`}>
              {t(`riskLevels.${riskLevel}`)}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('findings')}</label>
            <textarea value={findings} onChange={e => setFindings(e.target.value)} rows={4}
              placeholder={t('findingsPlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              {t('cancel')}
            </button>
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {mutation.isPending ? t('saving') : t('addAssessment')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── VendorAssessment Create/Edit Modal ────────────────────────────

const EMPTY_ASSESSMENT = {
  vendorId: '', score: 70, riskLevel: '', findings: '',
};

function VendorAssessmentModal({
  assessment, vendors, onClose,
}: {
  assessment?: any; vendors: any[]; onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!assessment?.id;

  const [form, setForm] = useState(assessment ? {
    vendorId: assessment.vendor?.id ?? assessment.vendorId ?? '',
    score: assessment.score ?? 70,
    riskLevel: assessment.riskLevel ?? '',
    findings: assessment.findings ?? '',
  } : { ...EMPTY_ASSESSMENT });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const derivedRisk = form.score >= 80 ? 'LOW' : form.score >= 60 ? 'MEDIUM' : form.score >= 40 ? 'HIGH' : 'CRITICAL';
  const displayRisk = form.riskLevel || derivedRisk;

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit
      ? vendorsApi.updateAssessment(assessment.id, data)
      : vendorsApi.createAssessment(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-assessments'] });
      qc.invalidateQueries({ queryKey: ['vendors'] });
      qc.invalidateQueries({ queryKey: ['vendors-dashboard'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      ...form,
      score: Number(form.score),
      riskLevel: form.riskLevel || undefined,
    };
    if (!payload.findings) delete payload.findings;
    mutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? 'Editar Avaliação' : 'Nova Avaliação'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor *</label>
              <select
                value={form.vendorId} required
                onChange={e => set('vendorId', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecionar fornecedor...</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Score (0–100) *</label>
              <span className={`text-sm font-bold px-2 py-0.5 rounded ${scoreColor(Number(form.score))}`}>
                {form.score}
              </span>
            </div>
            <input
              type="range" min={0} max={100} value={form.score}
              onChange={e => set('score', Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0 — Crítico</span>
              <span>100 — Baixo Risco</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Risco</label>
              <select
                value={form.riskLevel}
                onChange={e => set('riskLevel', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Auto ({derivedRisk})</option>
                <option value="LOW">Baixo</option>
                <option value="MEDIUM">Médio</option>
                <option value="HIGH">Alto</option>
                <option value="CRITICAL">Crítico</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="w-full flex items-center justify-center p-2 rounded-lg bg-gray-50">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${RISK_COLORS[displayRisk]}`}>
                  {displayRisk === 'LOW' ? 'Baixo' : displayRisk === 'MEDIUM' ? 'Médio' : displayRisk === 'HIGH' ? 'Alto' : 'Crítico'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas / Conclusões</label>
            <textarea
              value={form.findings} rows={4}
              onChange={e => set('findings', e.target.value)}
              placeholder="Descreva as conclusões da avaliação..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {mutation.isPending ? 'A guardar...' : isEdit ? 'Guardar' : 'Criar Avaliação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Assessments Tab ───────────────────────────────────────────────

function AssessmentsTab({ vendors }: { vendors: any[] }) {
  const [showModal, setShowModal] = useState(false);
  const [editAssessment, setEditAssessment] = useState<any>(null);
  const [searchA, setSearchA] = useState('');
  const [filterRisk, setFilterRisk] = useState('');

  const { data: assessments = [], isLoading } = useQuery<any[]>({
    queryKey: ['vendor-assessments'],
    queryFn: () => vendorsApi.listAssessments().then(r => r.data),
  });

  const filtered = assessments.filter((a: any) => {
    const name = a.vendor?.name?.toLowerCase() ?? '';
    const matchSearch = !searchA || name.includes(searchA.toLowerCase());
    const matchRisk = !filterRisk || a.riskLevel === filterRisk;
    return matchSearch && matchRisk;
  });

  const total = assessments.length;
  const highRisk = assessments.filter((a: any) => a.riskLevel === 'HIGH' || a.riskLevel === 'CRITICAL').length;
  const avgScore = assessments.length
    ? Math.round(assessments.reduce((s: number, a: any) => s + (a.score ?? 0), 0) / assessments.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Avaliações" value={total} color="blue" />
        <StatCard label="Alto Risco" value={highRisk} color="red" sub="HIGH + CRITICAL" />
        <StatCard label="Score Médio" value={avgScore} color="green" sub="média global" />
        <StatCard label="Fornecedores" value={vendors.length} color="blue" sub="avaliáveis" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          <div className="relative min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={searchA} onChange={e => setSearchA(e.target.value)}
              placeholder="Pesquisar fornecedor..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos os Riscos</option>
            <option value="CRITICAL">Crítico</option>
            <option value="HIGH">Alto</option>
            <option value="MEDIUM">Médio</option>
            <option value="LOW">Baixo</option>
          </select>
        </div>
        <button
          onClick={() => { setEditAssessment(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Nova Avaliação
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">A carregar...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <ClipboardCheck className="w-10 h-10 mb-2 opacity-30" />
            <p>Nenhuma avaliação encontrada</p>
            <button onClick={() => setShowModal(true)}
              className="mt-3 text-sm text-blue-600 hover:underline">Criar primeira avaliação</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Fornecedor</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Data Avaliação</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Score</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Risco</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Avaliador</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Notas</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((a: any) => {
                const score = a.score ?? 0;
                const scoreBar = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500';
                const assessorName = a.assessedBy
                  ? `${a.assessedBy.firstName ?? ''} ${a.assessedBy.lastName ?? ''}`.trim()
                  : '—';
                return (
                  <tr key={a.id} className="hover:bg-gray-50 group">
                    <td className="px-5 py-3">
                      <span className="font-medium text-gray-900">{a.vendor?.name ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {a.createdAt ? new Date(a.createdAt).toLocaleDateString('pt-PT') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-2">
                          <div className={`h-2 rounded-full ${scoreBar}`} style={{ width: `${score}%` }} />
                        </div>
                        <span className="text-xs font-medium">{score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${RISK_COLORS[a.riskLevel] ?? ''}`}>
                        {a.riskLevel === 'LOW' ? 'Baixo' : a.riskLevel === 'MEDIUM' ? 'Médio' : a.riskLevel === 'HIGH' ? 'Alto' : a.riskLevel === 'CRITICAL' ? 'Crítico' : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{assessorName}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{a.findings ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditAssessment(a); setShowModal(true); }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <VendorAssessmentModal
          assessment={editAssessment}
          vendors={vendors}
          onClose={() => { setShowModal(false); setEditAssessment(null); }}
        />
      )}
    </div>
  );
}

// ── Vendor Detail Panel ───────────────────────────────────────────

function SendQuestionnaireButton({ vendorId, vendorEmail }: { vendorId: string; vendorEmail?: string }) {
  const [link, setLink]     = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      const result: any = await vendorQuestionnaireApi.create(vendorId, { sendEmail: !!vendorEmail });
      const token = result?.data?.token || result?.token;
      if (token) {
        const url = `${window.location.origin}/vendor-assessment/${token}`;
        setLink(url);
      }
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  const copy = () => {
    if (link) { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  if (link) return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
      <p className="text-xs font-medium text-green-700 flex items-center gap-1">
        <CheckCircle2 className="w-3.5 h-3.5" /> Link do questionário criado!
      </p>
      <div className="flex gap-1.5">
        <input readOnly value={link} className="flex-1 text-xs bg-white border border-green-200 rounded px-2 py-1.5 text-gray-600 truncate" />
        <button onClick={copy} className="flex-shrink-0 p-1.5 bg-green-600 text-white rounded hover:bg-green-700">
          {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      {vendorEmail && <p className="text-xs text-green-600">Email enviado para {vendorEmail}</p>}
    </div>
  );

  return (
    <button onClick={send} disabled={sending}
      className="w-full py-2 border border-blue-200 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
      {sending ? <><span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> A criar...</>
               : <><Send className="w-3.5 h-3.5" /> Enviar Questionário de Segurança</>}
    </button>
  );
}

function VendorPanel({ vendor, onClose, onEdit, onAssess }: {
  vendor: any; onClose: () => void; onEdit: () => void; onAssess: () => void;
}) {
  const t = useTranslations('vendors');
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
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <ScoreRing score={v.riskScore ?? 0} />
            <div>
              <p className="text-sm text-gray-500">{t('riskScore')}</p>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${RISK_COLORS[v.riskLevel]}`}>
                {v.riskLevel && t(`riskLevels.${v.riskLevel}`)}
              </span>
              {v.lastAssessedAt && (
                <p className="text-xs text-gray-400 mt-1">
                  {t('lastAssessment')}: {new Date(v.lastAssessedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[v.status]}`}>
              {v.status && t(`status.${v.status}`)}
            </span>
            {v.dataProcessor && (
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                {t('subcontractorGdpr')}
              </span>
            )}
          </div>

          {(v.contractStart || v.contractEnd) && (
            <div className="border border-gray-100 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('contract')}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {v.contractStart && (
                  <div>
                    <span className="text-gray-500">{t('contractStart')}: </span>
                    {new Date(v.contractStart).toLocaleDateString()}
                  </div>
                )}
                {v.contractEnd && (
                  <div>
                    <span className="text-gray-500">{t('contractEnd')}: </span>
                    {new Date(v.contractEnd).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          )}

          {(v.contactName || v.contactEmail) && (
            <div className="border border-gray-100 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('contact')}</h3>
              {v.contactName && <p className="text-sm">{v.contactName}</p>}
              {v.contactEmail && <a href={`mailto:${v.contactEmail}`} className="text-sm text-blue-600 hover:underline">{v.contactEmail}</a>}
            </div>
          )}

          {(v.dataShared || v.countries) && (
            <div className="border border-gray-100 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('personalData')}</h3>
              {v.dataShared && <p className="text-sm text-gray-600"><span className="font-medium">{t('dataShared')}: </span>{v.dataShared}</p>}
              {v.countries && <p className="text-sm text-gray-600 mt-1"><span className="font-medium">{t('countries')}: </span>{v.countries}</p>}
            </div>
          )}

          {v.assessments?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('assessmentHistory')}</h3>
              <div className="space-y-2">
                {v.assessments.map((a: any) => (
                  <div key={a.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{a.score}/100</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${RISK_COLORS[a.riskLevel ?? 'LOW']}`}>
                          {a.riskLevel && t(`riskLevels.${a.riskLevel}`)}
                        </span>
                      </div>
                      {a.findings && <p className="text-gray-500 mt-1">{a.findings}</p>}
                      {a.assessedBy && (
                        <p className="text-xs text-gray-400 mt-1">
                          {t('by')} {a.assessedBy.firstName} {a.assessedBy.lastName}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {v.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">{t('notes')}</h3>
              <p className="text-sm text-gray-600">{v.notes}</p>
            </div>
          )}
        </div>
        <div className="p-4 border-t space-y-2">
          <button onClick={onAssess}
            className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            + {t('addAssessment')}
          </button>
          <SendQuestionnaireButton vendorId={v.id} vendorEmail={v.contactEmail} />
        </div>
      </div>
    </div>
  );
}

// ── CSV Export ────────────────────────────────────────────────────

function exportCsv(vendors: any[]) {
  const headers = ['Name', 'Category', 'Status', 'Risk Level', 'Risk Score', 'Contact Name', 'Contact Email', 'Website', 'Data Processor', 'Contract Start', 'Contract End', 'Countries', 'Notes'];
  const rows = vendors.map(v => [
    v.name ?? '',
    v.category ?? '',
    v.status ?? '',
    v.riskLevel ?? '',
    v.riskScore ?? '',
    v.contactName ?? '',
    v.contactEmail ?? '',
    v.website ?? '',
    v.dataProcessor ? 'Yes' : 'No',
    v.contractStart ? new Date(v.contractStart).toLocaleDateString('pt-PT') : '',
    v.contractEnd ? new Date(v.contractEnd).toLocaleDateString('pt-PT') : '',
    v.countries ?? '',
    v.notes ?? '',
  ].map(cell => `"${String(cell).replace(/"/g, '""')}"`));

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vendors_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Page ─────────────────────────────────────────────────────

type Tab = 'vendors' | 'assessments';

export default function VendorsPage() {
  const t = useTranslations('vendors');
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('vendors');
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDataProcessor, setFilterDataProcessor] = useState(false);
  const [filterUnassessed, setFilterUnassessed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editVendor, setEditVendor] = useState<any>(null);
  const [panelVendor, setPanelVendor] = useState<any>(null);
  const [assessVendor, setAssessVendor] = useState<any>(null);

  const { data: dashboard } = useQuery({
    queryKey: ['vendors-dashboard'],
    queryFn: () => vendorsApi.dashboard().then(r => r.data),
  });

  const { data: vendorsResponse, isLoading } = useQuery({
    queryKey: ['vendors', filterRisk, filterStatus, filterCategory, filterDataProcessor, filterUnassessed],
    queryFn: () => vendorsApi.list({
      riskLevel:      filterRisk || undefined,
      status:         filterStatus || undefined,
      category:       filterCategory || undefined,
      dataProcessor:  filterDataProcessor ? 'true' : undefined,
      unassessed:     filterUnassessed    ? 'true' : undefined,
    }).then(r => r.data),
  });

  const vendors: any[] = vendorsResponse?.items ?? [];
  const vendorsTotal: number = vendorsResponse?.total ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vendorsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      qc.invalidateQueries({ queryKey: ['vendors-dashboard'] });
    },
  });

  const filtered = vendors.filter((v: any) =>
    !search ||
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.category?.toLowerCase().includes(search.toLowerCase())
  );

  const d = dashboard ?? { total: 0, active: 0, highRisk: 0, expiring: 0, dataProcessors: 0 };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'vendors', label: 'Fornecedores', icon: <Building2 className="w-4 h-4" /> },
    { id: 'assessments', label: 'Avaliações', icon: <ClipboardCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600" />
            {t('title')}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'vendors' && (
            <>
              <button onClick={() => exportCsv(filtered)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
              <button onClick={() => { setEditVendor(null); setShowModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                <Plus className="w-4 h-4" /> {t('addVendor')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Fornecedores */}
      {activeTab === 'vendors' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label={t('statTotal')} value={d.total} color="blue" />
            <StatCard label={t('statActive')} value={d.active} color="green" />
            <StatCard label={t('statHighRisk')} value={d.highRisk} color="red" sub="HIGH + CRITICAL" />
            <StatCard label={t('statExpiring')} value={d.expiring} color="yellow" sub={t('statExpiringNote')} />
            <StatCard label={t('statDataProcessors')} value={d.dataProcessors} color="blue" sub="Art. 28 RGPD" />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{t('allRisks')}</option>
              <option value="CRITICAL">{t('riskLevels.CRITICAL')}</option>
              <option value="HIGH">{t('riskLevels.HIGH')}</option>
              <option value="MEDIUM">{t('riskLevels.MEDIUM')}</option>
              <option value="LOW">{t('riskLevels.LOW')}</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{t('allStatuses')}</option>
              <option value="ACTIVE">{t('status.ACTIVE')}</option>
              <option value="INACTIVE">{t('status.INACTIVE')}</option>
              <option value="UNDER_REVIEW">{t('status.UNDER_REVIEW')}</option>
              <option value="TERMINATED">{t('status.TERMINATED')}</option>
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{t('allCategories')}</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>

            <button
              onClick={() => setFilterDataProcessor(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
                filterDataProcessor
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {t('filterDataProcessor')}
            </button>

            <button
              onClick={() => setFilterUnassessed(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
                filterUnassessed
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {t('filterUnassessed')}
            </button>
          </div>

          {/* Table */}
          {isLoading ? (
            <TableSkeleton rows={6} cols={8} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Nenhum fornecedor registado"
              description="Adicione o primeiro fornecedor para iniciar a gestão de terceiros."
              actionLabel="Adicionar Fornecedor"
              onAction={() => { setEditVendor(null); setShowModal(true); }}
            />
          ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">{t('colVendor')}</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('category')}</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('statusLabel')}</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('riskLevel')}</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('colScore')}</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('colAssessments')}</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">GDPR</th>
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
                          {v.status && t(`status.${v.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${RISK_COLORS[v.riskLevel]}`}>
                          {v.riskLevel && t(`riskLevels.${v.riskLevel}`)}
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
                        ) : <span className="text-xs text-gray-400">{t('noAssessment')}</span>}
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
                            title={t('addAssessment')}>
                            <Star className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { if (confirm(t('deleteConfirm'))) deleteMutation.mutate(v.id); }}
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
          </div>
          )}
        </>
      )}

      {/* Tab: Avaliações */}
      {activeTab === 'assessments' && (
        <AssessmentsTab vendors={vendors} />
      )}

      {/* Modals */}
      {showModal && activeTab === 'vendors' && (
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
