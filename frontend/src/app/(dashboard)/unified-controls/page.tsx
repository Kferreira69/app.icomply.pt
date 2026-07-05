'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unifiedControlsApi } from '@/lib/api';
import {
  Shield, BookOpen, Grid, AlertTriangle, Plus, Pencil, X,
  CheckCircle2, Clock, XCircle, MinusCircle, Circle, Zap,
  User, Calendar,
} from 'lucide-react';

// ── Constantes ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'biblioteca', label: 'Biblioteca de Controlos', icon: BookOpen },
  { key: 'matriz',     label: 'Matriz de Cobertura',     icon: Grid },
  { key: 'gaps',       label: 'Gaps de Controlo',        icon: AlertTriangle },
] as const;

type TabKey = typeof TABS[number]['key'];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  NOT_STARTED:    { label: 'Por Iniciar',     color: 'text-gray-600',   bg: 'bg-gray-100',   icon: Circle },
  PLANNED:        { label: 'Planeado',        color: 'text-blue-600',   bg: 'bg-blue-100',   icon: Clock },
  IN_PROGRESS:    { label: 'Em Progresso',    color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Clock },
  IMPLEMENTED:    { label: 'Implementado',    color: 'text-green-600',  bg: 'bg-green-100',  icon: CheckCircle2 },
  VERIFIED:       { label: 'Verificado',      color: 'text-emerald-600',bg: 'bg-emerald-100',icon: CheckCircle2 },
  NOT_APPLICABLE: { label: 'N/A',             color: 'text-gray-400',   bg: 'bg-gray-50',    icon: MinusCircle },
};

const AUTO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  MANUAL:    { label: 'Manual',    color: 'text-orange-700', bg: 'bg-orange-100' },
  PARTIAL:   { label: 'Parcial',   color: 'text-blue-700',   bg: 'bg-blue-100' },
  AUTOMATED: { label: 'Automático',color: 'text-green-700',  bg: 'bg-green-100' },
};

// Framework badge colours (light theme)
const FW_COLORS: Record<string, string> = {
  ISO27001: 'bg-blue-100 text-blue-700',
  ISO27701: 'bg-purple-100 text-purple-700',
  NIS2:     'bg-cyan-100 text-cyan-700',
  DORA:     'bg-indigo-100 text-indigo-700',
  SOC2:     'bg-sky-100 text-sky-700',
  CIS:      'bg-gray-100 text-gray-700',
  GDPR:     'bg-pink-100 text-pink-700',
  AI_Act:   'bg-violet-100 text-violet-700',
};

const FRAMEWORKS_OPTIONS = [
  { value: 'ISO_27001', label: 'ISO 27001' },
  { value: 'NIS2',      label: 'NIS2' },
  { value: 'DORA',      label: 'DORA' },
  { value: 'SOC2',      label: 'SOC 2' },
  { value: 'CIS',       label: 'CIS' },
  { value: 'ISO27701',  label: 'ISO 27701' },
  { value: 'GDPR',      label: 'GDPR' },
];

const DOMAIN_CATEGORIES = ['SECURITY', 'PRIVACY', 'AI_GOVERNANCE', 'ETHICS_SPEAKUP', 'WORKFORCE', 'THIRD_PARTY', 'OTHER'];
const DOMAIN_LABELS: Record<string, string> = {
  SECURITY:       'Segurança',
  PRIVACY:        'Privacidade',
  AI_GOVERNANCE:  'Governança IA',
  ETHICS_SPEAKUP: 'Ética e Denúncias',
  WORKFORCE:      'Gestão de Pessoas',
  THIRD_PARTY:    'Terceiros',
  OTHER:          'Outro',
};

function fwBadge(mapping: string) {
  const fw = mapping.split(':')[0];
  const cls = FW_COLORS[fw] ?? 'bg-gray-100 text-gray-600';
  return (
    <span key={mapping} className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {fw}
    </span>
  );
}

// ── Modal de Controlo ─────────────────────────────────────────────────────────

function ControlModal({
  initial,
  onClose,
  onSave,
  saving,
}: {
  initial?: any;
  onClose: () => void;
  onSave: (data: any) => void;
  saving: boolean;
}) {
  const editing = !!initial;
  const [form, setForm] = useState({
    controlId:        initial?.controlId        ?? '',
    title:            initial?.title            ?? '',
    description:      initial?.description      ?? '',
    frameworkMappings:initial?.frameworkMappings ?? [] as string[],
    automationLevel:  initial?.automationLevel  ?? '',
    status:           initial?.status           ?? 'NOT_STARTED',
    owner:            initial?.owner            ?? '',
    testingFrequency: initial?.testingFrequency ?? '',
    implementationNotes: initial?.implementationNotes ?? '',
  });

  const s = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }));

  const toggleFramework = (fw: string) => {
    setForm(p => ({
      ...p,
      frameworkMappings: p.frameworkMappings.includes(fw)
        ? p.frameworkMappings.filter((f: string) => f !== fw)
        : [...p.frameworkMappings, fw],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            {editing ? 'Editar Controlo' : 'Novo Controlo'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Código + Título */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
              <input
                value={form.controlId}
                onChange={e => s('controlId', e.target.value)}
                placeholder="UC-001"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <input
                value={form.title}
                onChange={e => s('title', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              value={form.description}
              onChange={e => s('description', e.target.value)}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Frameworks mapeados */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Frameworks Mapeados</label>
            <div className="flex flex-wrap gap-2">
              {FRAMEWORKS_OPTIONS.map(fw => {
                const active = form.frameworkMappings.includes(fw.value);
                return (
                  <button
                    key={fw.value}
                    type="button"
                    onClick={() => toggleFramework(fw.value)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    {fw.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Automation + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nível de Automação</label>
              <select
                value={form.automationLevel}
                onChange={e => s('automationLevel', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">— Seleccionar —</option>
                <option value="MANUAL">Manual</option>
                <option value="PARTIAL">Parcial</option>
                <option value="AUTOMATED">Automático</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={form.status}
                onChange={e => s('status', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Owner + Frequência de teste */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
              <input
                value={form.owner}
                onChange={e => s('owner', e.target.value)}
                placeholder="nome@empresa.com"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequência de Teste</label>
              <select
                value={form.testingFrequency}
                onChange={e => s('testingFrequency', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">— Seleccionar —</option>
                <option value="CONTINUOUS">Contínuo</option>
                <option value="MONTHLY">Mensal</option>
                <option value="QUARTERLY">Trimestral</option>
                <option value="ANNUAL">Anual</option>
              </select>
            </div>
          </div>

          {/* Notas de implementação */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={form.implementationNotes}
              onChange={e => s('implementationNotes', e.target.value)}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            disabled={!form.title || saving}
            onClick={() => onSave(form)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de Atribuição (Gaps) ────────────────────────────────────────────────

function AssignModal({
  control,
  onClose,
  onSave,
  saving,
}: {
  control: any;
  onClose: () => void;
  onSave: (data: { owner: string; targetDate: string }) => void;
  saving: boolean;
}) {
  const [owner, setOwner] = useState(control.owner ?? '');
  const [targetDate, setTargetDate] = useState(
    control.targetDate ? control.targetDate.slice(0, 10) : '',
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Atribuir Controlo</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600 font-medium">{control.title}</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="inline w-3.5 h-3.5 mr-1" />Responsável
            </label>
            <input
              value={owner}
              onChange={e => setOwner(e.target.value)}
              placeholder="nome@empresa.com"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="inline w-3.5 h-3.5 mr-1" />Data Alvo
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            disabled={saving}
            onClick={() => onSave({ owner, targetDate })}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'A guardar…' : 'Atribuir'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Biblioteca de Controlos ──────────────────────────────────────────────

function BibliotecaTab() {
  const qc = useQueryClient();
  const [showModal, setShowModal]     = useState(false);
  const [editControl, setEditControl] = useState<any>(null);
  const [fwFilter, setFwFilter]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: controls = [], isLoading } = useQuery({
    queryKey: ['unified-controls-list'],
    queryFn: () => unifiedControlsApi.list({ limit: 200 }).then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => unifiedControlsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unified-controls-list'] });
      setShowModal(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => unifiedControlsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unified-controls-list'] });
      setEditControl(null);
    },
  });

  const seedMut = useMutation({
    mutationFn: () => unifiedControlsApi.seed(['SECURITY', 'PRIVACY', 'AI_GOVERNANCE']),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['unified-controls-list'] }),
  });

  const filtered = (controls as any[]).filter(c => {
    if (fwFilter && !c.frameworkMappings?.some((m: string) => m.startsWith(fwFilter))) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });

  return (
    <>
      {/* Filtros + acções */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-2 flex-wrap flex-1">
          <select
            value={fwFilter}
            onChange={e => setFwFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Todos os Frameworks</option>
            {FRAMEWORKS_OPTIONS.map(fw => (
              <option key={fw.value} value={fw.value}>{fw.label}</option>
            ))}
          </select>

          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setStatusFilter('')}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                statusFilter === '' ? 'bg-gray-800 text-white border-gray-800' : 'text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              Todos
            </button>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setStatusFilter(statusFilter === k ? '' : k)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  statusFilter === k
                    ? `${v.bg} ${v.color} border-current`
                    : 'text-gray-600 border-gray-300 hover:border-gray-400'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 ml-auto">
          {(controls as any[]).length === 0 && (
            <button
              onClick={() => seedMut.mutate()}
              disabled={seedMut.isPending}
              className="flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
            >
              <Zap className="w-4 h-4" />
              {seedMut.isPending ? 'A importar…' : 'Importar Catálogo'}
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo Controlo
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Código</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Título</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Frameworks Mapeados</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Automação</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Responsável</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">A carregar…</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <Shield className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">
                    {(controls as any[]).length === 0
                      ? 'Sem controlos. Clique em "Importar Catálogo" para começar.'
                      : 'Nenhum controlo corresponde aos filtros.'}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((c: any) => {
                const st = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.NOT_STARTED;
                const StIcon = st.icon;
                const auto = c.automationLevel ? AUTO_CONFIG[c.automationLevel] : null;
                return (
                  <tr key={c.id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-500">{c.controlId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-xs">{c.title}</p>
                      {c.description && (
                        <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">{c.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(c.frameworkMappings ?? []).slice(0, 5).map((m: string) => fwBadge(m))}
                        {(c.frameworkMappings ?? []).length > 5 && (
                          <span className="text-xs text-gray-400">+{c.frameworkMappings.length - 5}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {auto ? (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${auto.bg} ${auto.color}`}>
                          {auto.label}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${st.bg} ${st.color}`}>
                        <StIcon className="w-3 h-3" />{st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-500 truncate max-w-[120px] block">{c.owner || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditControl(c)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded text-gray-400"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modais */}
      {showModal && (
        <ControlModal
          onClose={() => setShowModal(false)}
          onSave={data => createMut.mutate(data)}
          saving={createMut.isPending}
        />
      )}
      {editControl && (
        <ControlModal
          initial={editControl}
          onClose={() => setEditControl(null)}
          onSave={data => updateMut.mutate({ id: editControl.id, data })}
          saving={updateMut.isPending}
        />
      )}
    </>
  );
}

// ── Tab: Matriz de Cobertura ──────────────────────────────────────────────────

function coverageColor(pct: number) {
  if (pct >= 100) return 'bg-green-100 text-green-700';
  if (pct >= 75)  return 'bg-yellow-100 text-yellow-700';
  if (pct >= 50)  return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
}

function MatrizTab() {
  const { data: controls = [], isLoading } = useQuery({
    queryKey: ['unified-controls-list'],
    queryFn: () => unifiedControlsApi.list({ limit: 200 }).then(r => r.data),
  });

  if (isLoading) return <div className="text-center py-16 text-gray-400">A carregar…</div>;

  const list = controls as any[];

  // Determine frameworks present
  const fwSet = new Set<string>();
  for (const c of list) {
    for (const m of (c.frameworkMappings ?? [])) {
      fwSet.add(m.split(':')[0]);
    }
  }
  const frameworks = Array.from(fwSet).sort();

  if (list.length === 0 || frameworks.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Grid className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p>Sem dados suficientes para apresentar a matriz.</p>
      </div>
    );
  }

  // Build coverage per domain × framework
  type Cell = { total: number; implemented: number };
  const matrix: Record<string, Record<string, Cell>> = {};

  for (const domain of DOMAIN_CATEGORIES) {
    matrix[domain] = {};
    for (const fw of frameworks) {
      matrix[domain][fw] = { total: 0, implemented: 0 };
    }
  }

  for (const c of list) {
    const domain = c.domain ?? 'OTHER';
    for (const m of (c.frameworkMappings ?? [])) {
      const fw = m.split(':')[0];
      if (!matrix[domain]) matrix[domain] = {};
      if (!matrix[domain][fw]) matrix[domain][fw] = { total: 0, implemented: 0 };
      matrix[domain][fw].total++;
      if (c.status === 'IMPLEMENTED' || c.status === 'VERIFIED') {
        matrix[domain][fw].implemented++;
      }
    }
  }

  // Summary row per framework
  const summaryRow: Record<string, Cell> = {};
  for (const fw of frameworks) {
    summaryRow[fw] = { total: 0, implemented: 0 };
    for (const domain of DOMAIN_CATEGORIES) {
      summaryRow[fw].total      += matrix[domain]?.[fw]?.total ?? 0;
      summaryRow[fw].implemented += matrix[domain]?.[fw]?.implemented ?? 0;
    }
  }

  const domainsWithData = DOMAIN_CATEGORIES.filter(d =>
    frameworks.some(fw => (matrix[d]?.[fw]?.total ?? 0) > 0),
  );

  return (
    <div className="bg-white rounded-xl border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[160px]">
              Categoria
            </th>
            {frameworks.map(fw => (
              <th key={fw} className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center min-w-[90px]">
                {fw}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {domainsWithData.map(domain => (
            <tr key={domain} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-700">
                {DOMAIN_LABELS[domain] ?? domain}
              </td>
              {frameworks.map(fw => {
                const cell = matrix[domain]?.[fw] ?? { total: 0, implemented: 0 };
                if (cell.total === 0) {
                  return <td key={fw} className="px-3 py-3 text-center text-gray-300">—</td>;
                }
                const pct = Math.round((cell.implemented / cell.total) * 100);
                return (
                  <td key={fw} className="px-3 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${coverageColor(pct)}`}>
                      {pct}%
                    </span>
                    <div className="text-[10px] text-gray-400 mt-0.5">{cell.implemented}/{cell.total}</div>
                  </td>
                );
              })}
            </tr>
          ))}

          {/* Linha de totais */}
          <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
            <td className="px-4 py-3 text-xs font-bold text-gray-700 uppercase">Total</td>
            {frameworks.map(fw => {
              const cell = summaryRow[fw];
              const pct = cell.total > 0 ? Math.round((cell.implemented / cell.total) * 100) : 0;
              return (
                <td key={fw} className="px-3 py-3 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${coverageColor(pct)}`}>
                    {pct}%
                  </span>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>

      {/* Legenda */}
      <div className="px-4 py-3 border-t flex flex-wrap gap-3 bg-gray-50">
        <span className="text-xs text-gray-500 font-medium">Legenda:</span>
        {[
          { label: '100%', cls: 'bg-green-100 text-green-700' },
          { label: '75–99%', cls: 'bg-yellow-100 text-yellow-700' },
          { label: '50–74%', cls: 'bg-orange-100 text-orange-700' },
          { label: '<50%', cls: 'bg-red-100 text-red-700' },
        ].map(({ label, cls }) => (
          <span key={label} className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Gaps de Controlo ─────────────────────────────────────────────────────

function GapsTab() {
  const qc = useQueryClient();
  const [assignControl, setAssignControl] = useState<any>(null);

  const { data: gapData, isLoading } = useQuery({
    queryKey: ['unified-controls-gaps'],
    queryFn: () => unifiedControlsApi.gapImpact().then(r => r.data),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => unifiedControlsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unified-controls-gaps'] });
      setAssignControl(null);
    },
  });

  if (isLoading) return <div className="text-center py-16 text-gray-400">A carregar…</div>;

  const gaps: any[] = gapData?.gaps ?? [];
  const frameworkImpact: any[] = gapData?.frameworkImpact ?? [];

  if (gaps.length === 0) {
    return (
      <div className="text-center py-16">
        <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
        <p className="text-gray-700 font-semibold text-lg">Sem gaps identificados!</p>
        <p className="text-gray-400 text-sm mt-1">Todos os controlos aplicáveis estão implementados.</p>
      </div>
    );
  }

  // Group by framework impact
  const gapsByDomain: Record<string, any[]> = {};
  for (const gap of gaps) {
    const domain = gap.domain ?? 'OTHER';
    if (!gapsByDomain[domain]) gapsByDomain[domain] = [];
    gapsByDomain[domain].push(gap);
  }

  return (
    <>
      {/* Impact summary */}
      {frameworkImpact.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-amber-800 mb-3">
            <AlertTriangle className="inline w-4 h-4 mr-1.5" />
            {gapData?.totalGaps} gap(s) com impacto em {frameworkImpact.length} framework(s)
          </p>
          <div className="flex flex-wrap gap-2">
            {frameworkImpact.map((fi: any) => (
              <span key={fi.framework} className="inline-flex items-center gap-1.5 text-xs px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-medium border border-amber-200">
                <span className="font-bold">{fi.framework}</span>
                <span className="text-amber-600">{fi.gapCount} gap(s)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Gaps grouped by domain */}
      {Object.entries(gapsByDomain).map(([domain, domainGaps]) => (
        <div key={domain} className="mb-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 px-1">
            {DOMAIN_LABELS[domain] ?? domain} ({domainGaps.length})
          </h3>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Código</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Controlo</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Frameworks Afectados</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="w-24 px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {domainGaps.map((gap: any) => {
                  const st = STATUS_CONFIG[gap.status] ?? STATUS_CONFIG.NOT_STARTED;
                  const StIcon = st.icon;
                  return (
                    <tr key={gap.controlId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-500">{gap.controlId}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{gap.title}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {(gap.frameworkMappings ?? []).slice(0, 5).map((m: string) => fwBadge(m))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${st.bg} ${st.color}`}>
                          <StIcon className="w-3 h-3" />{st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setAssignControl(gap)}
                          className="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors"
                        >
                          Atribuir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Assign modal */}
      {assignControl && (
        <AssignModal
          control={assignControl}
          onClose={() => setAssignControl(null)}
          onSave={({ owner, targetDate }) =>
            updateMut.mutate({ id: assignControl.id, data: { owner, targetDate: targetDate || null } })
          }
          saving={updateMut.isPending}
        />
      )}
    </>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function UnifiedControlsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('biblioteca');

  // KPIs globais
  const { data: dashboard } = useQuery({
    queryKey: ['unified-controls-dashboard'],
    queryFn: () => unifiedControlsApi.dashboard().then(r => r.data),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Controlos Unificados</h1>
          <p className="text-sm text-gray-500">
            Biblioteca cross-framework — ISO 27001 · NIS2 · DORA · SOC2 · CIS
          </p>
        </div>
      </div>

      {/* KPI strip */}
      {dashboard && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="text-xs font-medium text-blue-600 uppercase mb-1">Conformidade Global</div>
            <div className="text-3xl font-bold text-blue-700">{dashboard.overallCompliance ?? 0}%</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs font-medium text-gray-500 uppercase mb-1">Total de Controlos</div>
            <div className="text-3xl font-bold text-gray-800">{dashboard.totalControls ?? 0}</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <div className="text-xs font-medium text-green-600 uppercase mb-1">Implementados</div>
            <div className="text-3xl font-bold text-green-700">{dashboard.implementedControls ?? 0}</div>
          </div>
          <div className="bg-red-50 rounded-xl p-4">
            <div className="text-xs font-medium text-red-600 uppercase mb-1">Obrigações em Atraso</div>
            <div className="text-3xl font-bold text-red-700">{dashboard.overdueObligations ?? 0}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'biblioteca' && <BibliotecaTab />}
      {activeTab === 'matriz'     && <MatrizTab />}
      {activeTab === 'gaps'       && <GapsTab />}
    </div>
  );
}
