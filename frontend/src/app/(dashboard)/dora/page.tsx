'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doraApi } from '@/lib/api';
import { format } from 'date-fns';
import {
  Activity, AlertTriangle, CheckCircle, Clock, Plus,
  Shield, Zap, AlertCircle, BarChart2, ExternalLink,
  ChevronDown, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────

type Severity = 'MINOR' | 'SIGNIFICANT' | 'MAJOR';
type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
type IncidentCategory = 'AVAILABILITY' | 'AUTHENTICITY' | 'INTEGRITY' | 'CONFIDENTIALITY' | 'CONTINUITY';
type TestType = 'VULNERABILITY_ASSESSMENT' | 'PENETRATION_TEST' | 'TLPT' | 'BUSINESS_CONTINUITY' | 'SCENARIO_BASED' | 'GAP_ANALYSIS';
type TestStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

// ── Constants ─────────────────────────────────────────────────

const SEVERITY_LABELS: Record<Severity, string> = {
  MINOR: 'Menor',
  SIGNIFICANT: 'Significativo',
  MAJOR: 'Major',
};

const SEVERITY_COLORS: Record<Severity, string> = {
  MINOR: 'bg-green-100 text-green-700',
  SIGNIFICANT: 'bg-amber-100 text-amber-700',
  MAJOR: 'bg-red-100 text-red-700',
};

const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  OPEN: 'Aberto',
  INVESTIGATING: 'Em Investigação',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
};

const INCIDENT_STATUS_COLORS: Record<IncidentStatus, string> = {
  OPEN: 'bg-red-100 text-red-700',
  INVESTIGATING: 'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-blue-100 text-blue-700',
  CLOSED: 'bg-gray-100 text-gray-600',
};

const TEST_TYPE_LABELS: Record<TestType, string> = {
  VULNERABILITY_ASSESSMENT: 'Avaliação de Vulnerabilidades',
  PENETRATION_TEST: 'Teste de Penetração',
  TLPT: 'TLPT',
  BUSINESS_CONTINUITY: 'Continuidade de Negócio',
  SCENARIO_BASED: 'Teste por Cenários',
  GAP_ANALYSIS: 'Análise de Lacunas',
};

const TEST_STATUS_LABELS: Record<TestStatus, string> = {
  PLANNED: 'Planeado',
  IN_PROGRESS: 'Em Curso',
  COMPLETED: 'Concluído',
  FAILED: 'Falhou',
};

const TEST_STATUS_COLORS: Record<TestStatus, string> = {
  PLANNED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  AVAILABILITY: 'Disponibilidade',
  AUTHENTICITY: 'Autenticidade',
  INTEGRITY: 'Integridade',
  CONFIDENTIALITY: 'Confidencialidade',
  CONTINUITY: 'Continuidade',
};

// ── Score Ring ────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r}
          fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
        />
        <text x="48" y="53" textAnchor="middle" fontSize="18" fontWeight="bold" fill={color}>
          {score}
        </text>
      </svg>
      <span className="text-xs text-gray-500 mt-1">Pontuação DORA</span>
    </div>
  );
}

// ── Incident Modal ────────────────────────────────────────────

function IncidentModal({
  incident,
  onClose,
  onSave,
}: {
  incident?: any;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [form, setForm] = useState({
    title: incident?.title ?? '',
    description: incident?.description ?? '',
    severity: incident?.severity ?? 'SIGNIFICANT',
    category: incident?.category ?? 'AVAILABILITY',
    status: incident?.status ?? 'OPEN',
    affectedSystems: incident?.affectedSystems?.join(', ') ?? '',
    detectedAt: incident?.detectedAt ? incident.detectedAt.slice(0, 16) : new Date().toISOString().slice(0, 16),
    resolvedAt: incident?.resolvedAt ? incident.resolvedAt.slice(0, 16) : '',
    rootCause: incident?.rootCause ?? '',
    impact: incident?.impact ?? '',
    estimatedLoss: incident?.estimatedLoss ?? '',
    reportedToRegulator: incident?.reportedToRegulator ?? false,
    regulatoryRef: incident?.regulatoryRef ?? '',
  });

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = () => {
    onSave({
      ...form,
      affectedSystems: form.affectedSystems.split(',').map(s => s.trim()).filter(Boolean),
      estimatedLoss: form.estimatedLoss ? Number(form.estimatedLoss) : undefined,
      resolvedAt: form.resolvedAt || undefined,
      rootCause: form.rootCause || undefined,
      regulatoryRef: form.regulatoryRef || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">
            {incident ? 'Editar Incidente TIC' : 'Registar Novo Incidente TIC'}
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Descreva o incidente brevemente"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severidade</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.severity}
                onChange={e => set('severity', e.target.value)}
              >
                {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.category}
                onChange={e => set('category', e.target.value)}
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          {incident && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.status}
                onChange={e => set('status', e.target.value)}
              >
                {Object.entries(INCIDENT_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              rows={3}
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sistemas Afetados (separados por vírgula)
            </label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.affectedSystems}
              onChange={e => set('affectedSystems', e.target.value)}
              placeholder="Core Banking, API Gateway, CRM..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Detetado em *</label>
              <input
                type="datetime-local"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.detectedAt}
                onChange={e => set('detectedAt', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resolvido em</label>
              <input
                type="datetime-local"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.resolvedAt}
                onChange={e => set('resolvedAt', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Impacto</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.impact}
              onChange={e => set('impact', e.target.value)}
              placeholder="Descreva o impacto operacional e financeiro"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Perda Estimada (€)</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.estimatedLoss}
                onChange={e => set('estimatedLoss', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="reported"
                checked={form.reportedToRegulator}
                onChange={e => set('reportedToRegulator', e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="reported" className="text-sm text-gray-700">Reportado ao Regulador</label>
            </div>
          </div>
          {form.reportedToRegulator && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referência Regulatória</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.regulatoryRef}
                onChange={e => set('regulatoryRef', e.target.value)}
                placeholder="Número de referência do regulador"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Causa Raiz</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              rows={2}
              value={form.rootCause}
              onChange={e => set('rootCause', e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.title || !form.detectedAt}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {incident ? 'Guardar' : 'Registar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Test Modal ────────────────────────────────────────────────

function TestModal({
  test,
  onClose,
  onSave,
}: {
  test?: any;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [form, setForm] = useState({
    title: test?.title ?? '',
    testType: test?.testType ?? 'VULNERABILITY_ASSESSMENT',
    status: test?.status ?? 'PLANNED',
    scope: test?.scope ?? '',
    provider: test?.provider ?? '',
    plannedDate: test?.plannedDate ? test.plannedDate.slice(0, 10) : '',
    executedDate: test?.executedDate ? test.executedDate.slice(0, 10) : '',
    nextTestDate: test?.nextTestDate ? test.nextTestDate.slice(0, 10) : '',
    findings: test?.findings ?? '',
    criticalFindings: test?.criticalFindings ?? 0,
    highFindings: test?.highFindings ?? 0,
    remediationStatus: test?.remediationStatus ?? '',
  });

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = () => {
    onSave({
      ...form,
      executedDate: form.executedDate || undefined,
      nextTestDate: form.nextTestDate || undefined,
      scope: form.scope || undefined,
      provider: form.provider || undefined,
      findings: form.findings || undefined,
      criticalFindings: Number(form.criticalFindings),
      highFindings: Number(form.highFindings),
      remediationStatus: form.remediationStatus || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">
            {test ? 'Editar Teste de Resiliência' : 'Registar Teste de Resiliência'}
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.title}
              onChange={e => set('title', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Teste</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.testType}
                onChange={e => set('testType', e.target.value)}
              >
                {Object.entries(TEST_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.status}
                onChange={e => set('status', e.target.value)}
              >
                {Object.entries(TEST_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Planeada *</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.plannedDate}
                onChange={e => set('plannedDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Execução</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.executedDate}
                onChange={e => set('executedDate', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prestador Externo</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.provider}
                onChange={e => set('provider', e.target.value)}
                placeholder="Nome da empresa auditora"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Próximo Teste</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.nextTestDate}
                onChange={e => set('nextTestDate', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Âmbito</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              rows={2}
              value={form.scope}
              onChange={e => set('scope', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descobertas Críticas</label>
              <input
                type="number"
                min={0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.criticalFindings}
                onChange={e => set('criticalFindings', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descobertas Altas</label>
              <input
                type="number"
                min={0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.highFindings}
                onChange={e => set('highFindings', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descobertas / Notas</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              rows={3}
              value={form.findings}
              onChange={e => set('findings', e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.title || !form.plannedDate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {test ? 'Guardar' : 'Registar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

type Tab = 'overview' | 'incidents' | 'testing';

export default function DoraPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [incidentModal, setIncidentModal] = useState<{ open: boolean; incident?: any }>({ open: false });
  const [testModal, setTestModal] = useState<{ open: boolean; test?: any }>({ open: false });
  const [incidentFilters, setIncidentFilters] = useState<{ severity?: string; status?: string }>({});
  const [testFilters, setTestFilters] = useState<{ status?: string; testType?: string }>({});

  const qc = useQueryClient();

  const { data: dashboard } = useQuery({
    queryKey: ['dora-dashboard'],
    queryFn: () => doraApi.dashboard().then(r => r.data),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['dora-incidents', incidentFilters],
    queryFn: () => doraApi.listIncidents(incidentFilters).then(r => r.data),
    enabled: activeTab === 'incidents',
  });

  const { data: tests = [] } = useQuery({
    queryKey: ['dora-tests', testFilters],
    queryFn: () => doraApi.listTests(testFilters).then(r => r.data),
    enabled: activeTab === 'testing',
  });

  const createIncident = useMutation({
    mutationFn: (data: any) => doraApi.createIncident(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dora-incidents'] });
      qc.invalidateQueries({ queryKey: ['dora-dashboard'] });
      setIncidentModal({ open: false });
    },
  });

  const updateIncident = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => doraApi.updateIncident(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dora-incidents'] });
      qc.invalidateQueries({ queryKey: ['dora-dashboard'] });
      setIncidentModal({ open: false });
    },
  });

  const createTest = useMutation({
    mutationFn: (data: any) => doraApi.createTest(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dora-tests'] });
      qc.invalidateQueries({ queryKey: ['dora-dashboard'] });
      setTestModal({ open: false });
    },
  });

  const updateTest = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => doraApi.updateTest(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dora-tests'] });
      qc.invalidateQueries({ queryKey: ['dora-dashboard'] });
      setTestModal({ open: false });
    },
  });

  const handleSaveIncident = (data: any) => {
    if (incidentModal.incident) {
      updateIncident.mutate({ id: incidentModal.incident.id, data });
    } else {
      createIncident.mutate(data);
    }
  };

  const handleSaveTest = (data: any) => {
    if (testModal.test) {
      updateTest.mutate({ id: testModal.test.id, data });
    } else {
      createTest.mutate(data);
    }
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart2 },
    { id: 'incidents', label: 'Incidentes TIC', icon: AlertCircle },
    { id: 'testing', label: 'Testes de Resiliência', icon: Shield },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Activity className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">DORA</h1>
            <p className="text-sm text-gray-500">Digital Operational Resilience Act — EU 2022/2554</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Overview Tab ──────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="md:col-span-1 bg-white rounded-xl border p-4 flex items-center justify-center">
              <ScoreRing score={dashboard?.complianceScore ?? 0} />
            </div>
            {[
              {
                label: 'Incidentes Abertos',
                value: dashboard?.openIncidents ?? 0,
                icon: AlertCircle,
                color: 'text-red-600',
                bg: 'bg-red-50',
              },
              {
                label: 'Incidentes Major',
                value: dashboard?.majorIncidents ?? 0,
                icon: Zap,
                color: 'text-orange-600',
                bg: 'bg-orange-50',
              },
              {
                label: 'Testes Planeados',
                value: dashboard?.upcomingTestsCount ?? 0,
                icon: Shield,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
              },
              {
                label: 'Testes em Atraso',
                value: dashboard?.overdueTests ?? 0,
                icon: Clock,
                color: 'text-amber-600',
                bg: 'bg-amber-50',
              },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-xl border p-4">
                <div className={cn('p-2 rounded-lg w-fit mb-3', bg)}>
                  <Icon className={cn('w-5 h-5', color)} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* DORA Pillars info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-purple-600" />
                Incidentes Recentes (30 dias)
              </h3>
              {dashboard?.recentIncidents?.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum incidente nos últimos 30 dias</p>
              ) : (
                <div className="space-y-2">
                  {dashboard?.recentIncidents?.map((inc: any) => (
                    <div
                      key={inc.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => { setActiveTab('incidents'); }}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">{inc.title}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(inc.detectedAt), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                      <span className={cn('text-xs font-medium px-2 py-1 rounded-full', SEVERITY_COLORS[inc.severity as Severity])}>
                        {SEVERITY_LABELS[inc.severity as Severity]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-600" />
                Próximos Testes
              </h3>
              {dashboard?.upcomingTests?.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum teste nos próximos 30 dias</p>
              ) : (
                <div className="space-y-2">
                  {dashboard?.upcomingTests?.map((test: any) => (
                    <div key={test.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{test.title}</p>
                        <p className="text-xs text-gray-500">
                          {TEST_TYPE_LABELS[test.testType as TestType]} · {format(new Date(test.plannedDate), 'dd/MM/yyyy')}
                        </p>
                      </div>
                      <span className={cn('text-xs font-medium px-2 py-1 rounded-full', TEST_STATUS_COLORS[test.status as TestStatus])}>
                        {TEST_STATUS_LABELS[test.status as TestStatus]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* DORA framework info */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Os 5 Pilares da DORA</h3>
            <div className="grid md:grid-cols-5 gap-3">
              {[
                { label: 'Gestão de Risco TIC', art: 'Art. 5-16', done: true },
                { label: 'Gestão de Incidentes', art: 'Art. 17-23', done: true },
                { label: 'Testes de Resiliência', art: 'Art. 24-27', done: true },
                { label: 'Risco de Terceiros', art: 'Art. 28-44', done: false },
                { label: 'Partilha de Informação', art: 'Art. 45-49', done: false },
              ].map(({ label, art, done }) => (
                <div key={art} className={cn(
                  'rounded-lg p-3 border text-center',
                  done ? 'bg-white border-green-200' : 'bg-white/50 border-gray-200',
                )}>
                  <CheckCircle className={cn('w-5 h-5 mx-auto mb-1', done ? 'text-green-500' : 'text-gray-300')} />
                  <p className="text-xs font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-500">{art}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Incidents Tab ─────────────────────────────────────── */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={incidentFilters.severity ?? ''}
                onChange={e => setIncidentFilters(f => ({ ...f, severity: e.target.value || undefined }))}
              >
                <option value="">Todas as severidades</option>
                {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={incidentFilters.status ?? ''}
                onChange={e => setIncidentFilters(f => ({ ...f, status: e.target.value || undefined }))}
              >
                <option value="">Todos os estados</option>
                {Object.entries(INCIDENT_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setIncidentModal({ open: true })}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
            >
              <Plus className="w-4 h-4" />
              Registar Incidente
            </button>
          </div>

          {incidents.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum incidente registado</p>
              <button
                onClick={() => setIncidentModal({ open: true })}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
              >
                Registar primeiro incidente
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Incidente</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Severidade</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Categoria</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Detetado</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Regulador</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {incidents.map((inc: any) => (
                    <tr key={inc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{inc.title}</p>
                        {inc.affectedSystems?.length > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {inc.affectedSystems.slice(0, 2).join(', ')}
                            {inc.affectedSystems.length > 2 && ` +${inc.affectedSystems.length - 2}`}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-medium px-2 py-1 rounded-full', SEVERITY_COLORS[inc.severity as Severity])}>
                          {SEVERITY_LABELS[inc.severity as Severity]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {CATEGORY_LABELS[inc.category as IncidentCategory]}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-medium px-2 py-1 rounded-full', INCIDENT_STATUS_COLORS[inc.status as IncidentStatus])}>
                          {INCIDENT_STATUS_LABELS[inc.status as IncidentStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {format(new Date(inc.detectedAt), 'dd/MM/yy HH:mm')}
                      </td>
                      <td className="px-4 py-3">
                        {inc.reportedToRegulator ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setIncidentModal({ open: true, incident: inc })}
                          className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 border rounded"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Testing Tab ───────────────────────────────────────── */}
      {activeTab === 'testing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={testFilters.testType ?? ''}
                onChange={e => setTestFilters(f => ({ ...f, testType: e.target.value || undefined }))}
              >
                <option value="">Todos os tipos</option>
                {Object.entries(TEST_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={testFilters.status ?? ''}
                onChange={e => setTestFilters(f => ({ ...f, status: e.target.value || undefined }))}
              >
                <option value="">Todos os estados</option>
                {Object.entries(TEST_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setTestModal({ open: true })}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
            >
              <Plus className="w-4 h-4" />
              Registar Teste
            </button>
          </div>

          {tests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum teste de resiliência registado</p>
              <button
                onClick={() => setTestModal({ open: true })}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
              >
                Registar primeiro teste
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Teste</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Planeado</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Descobertas</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tests.map((test: any) => (
                    <tr key={test.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{test.title}</p>
                        {test.provider && (
                          <p className="text-xs text-gray-500">{test.provider}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {TEST_TYPE_LABELS[test.testType as TestType]}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-medium px-2 py-1 rounded-full', TEST_STATUS_COLORS[test.status as TestStatus])}>
                          {TEST_STATUS_LABELS[test.status as TestStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {format(new Date(test.plannedDate), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        {(test.criticalFindings > 0 || test.highFindings > 0) ? (
                          <div className="flex gap-2">
                            {test.criticalFindings > 0 && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                {test.criticalFindings} críticas
                              </span>
                            )}
                            {test.highFindings > 0 && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                {test.highFindings} altas
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setTestModal({ open: true, test })}
                          className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 border rounded"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {incidentModal.open && (
        <IncidentModal
          incident={incidentModal.incident}
          onClose={() => setIncidentModal({ open: false })}
          onSave={handleSaveIncident}
        />
      )}
      {testModal.open && (
        <TestModal
          test={testModal.test}
          onClose={() => setTestModal({ open: false })}
          onSave={handleSaveTest}
        />
      )}
    </div>
  );
}
