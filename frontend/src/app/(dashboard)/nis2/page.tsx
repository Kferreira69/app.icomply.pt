'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nis2Api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Network, CheckCircle2, XCircle, AlertCircle,
  Circle, MinusCircle, ChevronDown, ChevronRight, Pencil, X,
} from 'lucide-react';

// ── Status config ─────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  NOT_ASSESSED:   { icon: Circle,        color: 'text-gray-400',   bg: 'bg-gray-50',    label: 'Não Avaliado' },
  NON_COMPLIANT:  { icon: XCircle,       color: 'text-red-600',    bg: 'bg-red-50',     label: 'Não Conforme' },
  PARTIAL:        { icon: AlertCircle,   color: 'text-orange-500', bg: 'bg-orange-50',  label: 'Parcial' },
  COMPLIANT:      { icon: CheckCircle2,  color: 'text-green-600',  bg: 'bg-green-50',   label: 'Conforme' },
  NOT_APPLICABLE: { icon: MinusCircle,   color: 'text-gray-300',   bg: 'bg-gray-50',    label: 'N/A' },
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  RISK_MANAGEMENT:   { label: 'Gestão de Risco',         color: 'bg-blue-100 text-blue-800' },
  INCIDENT_RESPONSE: { label: 'Resposta a Incidentes',   color: 'bg-red-100 text-red-800' },
  SUPPLY_CHAIN:      { label: 'Cadeia de Abastecimento', color: 'bg-purple-100 text-purple-800' },
  BCP:               { label: 'Continuidade de Negócio', color: 'bg-green-100 text-green-800' },
  CRYPTOGRAPHY:      { label: 'Criptografia',            color: 'bg-indigo-100 text-indigo-800' },
  HR_SECURITY:       { label: 'Segurança de RH',         color: 'bg-yellow-100 text-yellow-800' },
  ACCESS_CONTROL:    { label: 'Controlo de Acessos',     color: 'bg-orange-100 text-orange-800' },
  VULNERABILITY:     { label: 'Vulnerabilidades',        color: 'bg-pink-100 text-pink-800' },
};

// ── Edit Measure Modal ────────────────────────────────────────
function EditMeasureModal({
  measure,
  onClose,
  onSave,
}: { measure: any; onClose: () => void; onSave: (data: any) => void }) {
  const [form, setForm] = useState({
    status: measure.status,
    evidence: measure.evidence ?? '',
    notes: measure.notes ?? '',
    targetDate: measure.targetDate ? measure.targetDate.slice(0, 10) : '',
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-5 border-b flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-mono text-gray-400">{measure.measureCode}</span>
            <h2 className="text-base font-semibold text-gray-900 mt-0.5">{measure.title}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {measure.description && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">{measure.description}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado de Conformidade</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => {
                const Icon = v.icon;
                return (
                  <button
                    key={k}
                    onClick={() => set('status', k)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                      form.status === k
                        ? `${v.bg} border-current font-medium ${v.color}`
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${form.status === k ? v.color : 'text-gray-400'}`} />
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Evidências</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              rows={3}
              value={form.evidence}
              onChange={e => set('evidence', e.target.value)}
              placeholder="Descreva as evidências que suportam a conformidade..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas / Plano de Ação</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Notas adicionais ou plano de ação para atingir conformidade..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Alvo</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2 text-sm"
              value={form.targetDate}
              onChange={e => set('targetDate', e.target.value)}
            />
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => {
            const d: any = { status: form.status };
            if (form.evidence) d.evidence = form.evidence;
            if (form.notes) d.notes = form.notes;
            if (form.targetDate) d.targetDate = form.targetDate;
            onSave(d);
          }}>
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Score Ring ────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';

  return (
    <svg width="110" height="110" viewBox="0 0 110 110">
      <circle cx="55" cy="55" r={r} stroke="#e5e7eb" strokeWidth="10" fill="none" />
      <circle
        cx="55" cy="55" r={r}
        stroke={color} strokeWidth="10" fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
      />
      <text x="55" y="55" textAnchor="middle" dominantBaseline="middle">
        <tspan x="55" dy="-5" fontSize="22" fontWeight="bold" fill={color}>{score}%</tspan>
        <tspan x="55" dy="17" fontSize="9" fill="#6b7280">NIS2</tspan>
      </text>
    </svg>
  );
}

// ── Category Group ────────────────────────────────────────────
function CategoryGroup({
  category,
  measures,
  onEdit,
}: { category: string; measures: any[]; onEdit: (m: any) => void }) {
  const [open, setOpen] = useState(true);
  const cat = CATEGORY_LABELS[category] ?? { label: category, color: 'bg-gray-100 text-gray-800' };
  const compliant = measures.filter(m => m.status === 'COMPLIANT').length;
  const total = measures.filter(m => m.status !== 'NOT_APPLICABLE').length;

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cat.color}`}>{cat.label}</span>
        <span className="text-sm text-gray-600 flex-1 text-left">{measures.length} medida{measures.length !== 1 ? 's' : ''}</span>
        <span className="text-xs text-gray-500">{compliant}/{total} conforme{compliant !== 1 ? 's' : ''}</span>
        {/* Mini progress */}
        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden ml-2">
          <div
            className="h-full bg-green-500 rounded-full"
            style={{ width: total > 0 ? `${(compliant / total) * 100}%` : '0%' }}
          />
        </div>
      </button>

      {open && (
        <div className="divide-y">
          {measures.map(m => {
            const s = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.NOT_ASSESSED;
            const Icon = s.icon;
            return (
              <div key={m.measureCode} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${s.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-gray-400">{m.measureCode}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${s.bg} ${s.color}`}>{s.label}</span>
                    {m.targetDate && (
                      <span className="text-xs text-gray-400">
                        Alvo: {new Date(m.targetDate).toLocaleDateString('pt-PT')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 mt-0.5">{m.title}</p>
                  {m.evidence && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">Evidência: {m.evidence}</p>
                  )}
                  {m.notes && (
                    <p className="text-xs text-gray-400 mt-0.5 italic truncate">{m.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => onEdit(m)}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition-colors shrink-0"
                  title="Avaliar"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function Nis2Page() {
  const qc = useQueryClient();
  const [editingMeasure, setEditingMeasure] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['nis2', 'dashboard'],
    queryFn: () => nis2Api.dashboard().then(r => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['nis2'] });

  const updateMutation = useMutation({
    mutationFn: ({ measureCode, data }: any) => nis2Api.updateMeasure(measureCode, data),
    onSuccess: () => { invalidate(); setEditingMeasure(null); },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const assessments: any[] = data?.assessments ?? [];

  // Filter
  const filtered = assessments.filter(m => {
    if (categoryFilter && m.category !== categoryFilter) return false;
    if (statusFilter && m.status !== statusFilter) return false;
    return true;
  });

  // Group by category
  const byCategory = filtered.reduce((acc: Record<string, any[]>, m) => {
    if (!acc[m.category]) acc[m.category] = [];
    acc[m.category].push(m);
    return acc;
  }, {});

  const statCards = [
    { label: 'Conformes', value: data?.compliant ?? 0, color: 'bg-green-50 text-green-700', status: 'COMPLIANT' },
    { label: 'Parciais', value: data?.partial ?? 0, color: 'bg-orange-50 text-orange-700', status: 'PARTIAL' },
    { label: 'Não Conformes', value: data?.nonCompliant ?? 0, color: 'bg-red-50 text-red-700', status: 'NON_COMPLIANT' },
    { label: 'Por Avaliar', value: data?.notAssessed ?? 0, color: 'bg-gray-50 text-gray-700', status: 'NOT_ASSESSED' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Network className="w-6 h-6 text-blue-600" /> NIS2 — Conformidade
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Diretiva (UE) 2022/2555 — Avaliação das 15 medidas do Artigo 21.º e obrigações de notificação
        </p>
      </div>

      {/* Score + stats */}
      <div className="flex gap-4 flex-wrap items-center">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <ScoreRing score={data?.score ?? 0} />
          <div>
            <p className="text-sm font-semibold text-gray-800">Score NIS2</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {data?.compliant ?? 0} conformes + {data?.partial ?? 0} parciais<br />
              de {(data?.total ?? 0) - (data?.notApplicable ?? 0)} aplicáveis
            </p>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          {statCards.map(c => (
            <button
              key={c.status}
              onClick={() => setStatusFilter(statusFilter === c.status ? '' : c.status)}
              className={`rounded-xl p-4 min-w-[110px] text-left transition-all border-2 ${c.color} ${
                statusFilter === c.status ? 'border-current opacity-100' : 'border-transparent opacity-90 hover:opacity-100'
              }`}
            >
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs font-medium mt-0.5">{c.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">Todos os estados</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {(categoryFilter || statusFilter) && (
          <button
            onClick={() => { setCategoryFilter(''); setStatusFilter(''); }}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Category groups */}
      <div className="space-y-3">
        {Object.keys(byCategory).length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Network className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p>Sem medidas a apresentar</p>
          </div>
        ) : (
          Object.entries(byCategory).map(([cat, measures]) => (
            <CategoryGroup
              key={cat}
              category={cat}
              measures={measures}
              onEdit={setEditingMeasure}
            />
          ))
        )}
      </div>

      {/* Legal notice */}
      <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700 border border-blue-100">
        <strong>Âmbito NIS2:</strong> A Diretiva NIS2 aplica-se a entidades essenciais e importantes nos setores de energia, transportes, banca, infraestrutura de mercados financeiros, saúde, água, infraestrutura digital, serviços TIC, administração pública e espaço. Em Portugal, a transposição é feita pelo Decreto-Lei n.º 65/2021 (Lei da Cibersegurança) e regulamentação complementar da CNCS.
      </div>

      {/* Edit modal */}
      {editingMeasure && (
        <EditMeasureModal
          measure={editingMeasure}
          onClose={() => setEditingMeasure(null)}
          onSave={(d) => updateMutation.mutate({ measureCode: editingMeasure.measureCode, data: d })}
        />
      )}
    </div>
  );
}
