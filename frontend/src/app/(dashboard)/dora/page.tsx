'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { doraApi, doraRegisterApi } from '@/lib/api';
import { format } from 'date-fns';
import {
  Activity, AlertTriangle, CheckCircle, Clock, Plus,
  Shield, Zap, AlertCircle, BarChart2, X, Building2, TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModuleGuard } from '@/components/module-guard';

// ── Types ─────────────────────────────────────────────────────

type Severity = 'MINOR' | 'SIGNIFICANT' | 'MAJOR';
type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
type IncidentCategory = 'AVAILABILITY' | 'AUTHENTICITY' | 'INTEGRITY' | 'CONFIDENTIALITY' | 'CONTINUITY';
type TestType = 'VULNERABILITY_ASSESSMENT' | 'PENETRATION_TEST' | 'TLPT' | 'BUSINESS_CONTINUITY' | 'SCENARIO_BASED' | 'GAP_ANALYSIS';
type TestStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

// ── Constants (colors only) ───────────────────────────────────

const SEVERITY_COLORS: Record<Severity, string> = {
  MINOR:       'bg-green-100 text-green-700',
  SIGNIFICANT: 'bg-amber-100 text-amber-700',
  MAJOR:       'bg-red-100 text-red-700',
};

const INCIDENT_STATUS_COLORS: Record<IncidentStatus, string> = {
  OPEN:          'bg-red-100 text-red-700',
  INVESTIGATING: 'bg-amber-100 text-amber-700',
  RESOLVED:      'bg-blue-100 text-blue-700',
  CLOSED:        'bg-gray-100 text-gray-600',
};

const TEST_STATUS_COLORS: Record<TestStatus, string> = {
  PLANNED:     'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETED:   'bg-green-100 text-green-700',
  FAILED:      'bg-red-100 text-red-700',
};

// ── DORA Classification helpers ───────────────────────────────

function getDoraClassification(score: number): { label: string; color: string; bg: string } {
  if (score >= 80) return { label: 'Avançado',    color: 'text-green-700',  bg: 'bg-green-50' };
  if (score >= 60) return { label: 'Intermédio',  color: 'text-amber-700',  bg: 'bg-amber-50' };
  if (score >= 40) return { label: 'Básico',      color: 'text-orange-700', bg: 'bg-orange-50' };
  return             { label: 'Insuficiente', color: 'text-red-700',    bg: 'bg-red-50' };
}

function getIctRiskScore(openIncidents: number, majorIncidents: number, overdueTests: number): number {
  // Higher = worse risk. Normalised 0-100.
  const rawRisk = (majorIncidents * 20) + (openIncidents * 5) + (overdueTests * 10);
  return Math.min(100, rawRisk);
}

function getRiskLabel(riskScore: number): { label: string; color: string; bg: string } {
  if (riskScore === 0)  return { label: 'Baixo',   color: 'text-green-700',  bg: 'bg-green-50' };
  if (riskScore < 20)  return { label: 'Reduzido', color: 'text-blue-700',   bg: 'bg-blue-50' };
  if (riskScore < 40)  return { label: 'Médio',    color: 'text-amber-700',  bg: 'bg-amber-50' };
  if (riskScore < 60)  return { label: 'Elevado',  color: 'text-orange-700', bg: 'bg-orange-50' };
  return                { label: 'Crítico',  color: 'text-red-700',    bg: 'bg-red-50' };
}

// ── Score Ring ────────────────────────────────────────────────

function ScoreRing({ score, label }: { score: number; label: string }) {
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
      <span className="text-xs text-gray-500 mt-1">{label}</span>
    </div>
  );
}

// ── Incident Modal ────────────────────────────────────────────

function IncidentModal({ incident, onClose, onSave }: {
  incident?: any; onClose: () => void; onSave: (data: any) => void;
}) {
  const t = useTranslations('dora');
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
      affectedSystems: form.affectedSystems.split(',').map((s: string) => s.trim()).filter(Boolean),
      estimatedLoss: form.estimatedLoss ? Number(form.estimatedLoss) : undefined,
      resolvedAt: form.resolvedAt || undefined,
      rootCause: form.rootCause || undefined,
      regulatoryRef: form.regulatoryRef || undefined,
    });
  };

  const SEVERITIES: Severity[] = ['MINOR', 'SIGNIFICANT', 'MAJOR'];
  const INCIDENT_STATUSES: IncidentStatus[] = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];
  const CATEGORIES: IncidentCategory[] = ['AVAILABILITY', 'AUTHENTICITY', 'INTEGRITY', 'CONFIDENTIALITY', 'CONTINUITY'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">
            {incident ? t('editIncident') : t('addIncident')}
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('incidentTitle')} *</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder={t('incidentTitlePlaceholder')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('severity')}</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.severity} onChange={e => set('severity', e.target.value)}>
                {SEVERITIES.map(k => <option key={k} value={k}>{t(`severity.${k}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('category')}</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(k => <option key={k} value={k}>{t(`incidentCategory.${k}`)}</option>)}
              </select>
            </div>
          </div>
          {incident && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('statusLabel')}</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.status} onChange={e => set('status', e.target.value)}>
                {INCIDENT_STATUSES.map(k => <option key={k} value={k}>{t(`incidentStatus.${k}`)}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('incidentDescription')}</label>
            <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={3}
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('affectedSystemsLabel')}</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.affectedSystems} onChange={e => set('affectedSystems', e.target.value)}
              placeholder="Core Banking, API Gateway, CRM..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('detectedAt')} *</label>
              <input type="datetime-local" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.detectedAt} onChange={e => set('detectedAt', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('resolvedAt')}</label>
              <input type="datetime-local" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.resolvedAt} onChange={e => set('resolvedAt', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('impact')}</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.impact} onChange={e => set('impact', e.target.value)}
              placeholder={t('impactPlaceholder')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('estimatedLoss')}</label>
              <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.estimatedLoss} onChange={e => set('estimatedLoss', e.target.value)} placeholder="0" />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="reported" checked={form.reportedToRegulator}
                onChange={e => set('reportedToRegulator', e.target.checked)} className="w-4 h-4" />
              <label htmlFor="reported" className="text-sm text-gray-700">{t('reportedToRegulator')}</label>
            </div>
          </div>
          {form.reportedToRegulator && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('regulatoryRef')}</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.regulatoryRef} onChange={e => set('regulatoryRef', e.target.value)}
                placeholder={t('regulatoryRefPlaceholder')} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('rootCause')}</label>
            <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2}
              value={form.rootCause} onChange={e => set('rootCause', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            {t('cancel')}
          </button>
          <button onClick={handleSubmit} disabled={!form.title || !form.detectedAt}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {incident ? t('save') : t('register')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Test Modal ────────────────────────────────────────────────

function TestModal({ test, onClose, onSave }: {
  test?: any; onClose: () => void; onSave: (data: any) => void;
}) {
  const t = useTranslations('dora');
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

  const TEST_TYPES: TestType[] = ['VULNERABILITY_ASSESSMENT', 'PENETRATION_TEST', 'TLPT', 'BUSINESS_CONTINUITY', 'SCENARIO_BASED', 'GAP_ANALYSIS'];
  const TEST_STATUSES: TestStatus[] = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">
            {test ? t('editTest') : t('addTest')}
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('testTitle')} *</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('testTypeLabel')}</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.testType} onChange={e => set('testType', e.target.value)}>
                {TEST_TYPES.map(k => <option key={k} value={k}>{t(`testType.${k}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('statusLabel')}</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.status} onChange={e => set('status', e.target.value)}>
                {TEST_STATUSES.map(k => <option key={k} value={k}>{t(`testStatus.${k}`)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('plannedDate')} *</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.plannedDate} onChange={e => set('plannedDate', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('executedDate')}</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.executedDate} onChange={e => set('executedDate', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('testProvider')}</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.provider} onChange={e => set('provider', e.target.value)}
                placeholder={t('testProviderPlaceholder')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('nextTestDate')}</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.nextTestDate} onChange={e => set('nextTestDate', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('testScope')}</label>
            <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2}
              value={form.scope} onChange={e => set('scope', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('criticalFindings')}</label>
              <input type="number" min={0} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.criticalFindings} onChange={e => set('criticalFindings', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('highFindings')}</label>
              <input type="number" min={0} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.highFindings} onChange={e => set('highFindings', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('testFindings')}</label>
            <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={3}
              value={form.findings} onChange={e => set('findings', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            {t('cancel')}
          </button>
          <button onClick={handleSubmit} disabled={!form.title || !form.plannedDate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {test ? t('save') : t('register')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

type Tab = 'overview' | 'incidents' | 'testing';

export default function DoraPage() {
  const t = useTranslations('dora');
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

  const { data: registerDashboard } = useQuery({
    queryKey: ['dora-register-dashboard'],
    queryFn: () => doraRegisterApi.dashboard().then((r: any) => r.data),
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dora-incidents'] }); qc.invalidateQueries({ queryKey: ['dora-dashboard'] }); setIncidentModal({ open: false }); },
  });
  const updateIncident = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => doraApi.updateIncident(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dora-incidents'] }); qc.invalidateQueries({ queryKey: ['dora-dashboard'] }); setIncidentModal({ open: false }); },
  });
  const createTest = useMutation({
    mutationFn: (data: any) => doraApi.createTest(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dora-tests'] }); qc.invalidateQueries({ queryKey: ['dora-dashboard'] }); setTestModal({ open: false }); },
  });
  const updateTest = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => doraApi.updateTest(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dora-tests'] }); qc.invalidateQueries({ queryKey: ['dora-dashboard'] }); setTestModal({ open: false }); },
  });

  const handleSaveIncident = (data: any) => {
    if (incidentModal.incident) updateIncident.mutate({ id: incidentModal.incident.id, data });
    else createIncident.mutate(data);
  };
  const handleSaveTest = (data: any) => {
    if (testModal.test) updateTest.mutate({ id: testModal.test.id, data });
    else createTest.mutate(data);
  };

  const SEVERITIES: Severity[] = ['MINOR', 'SIGNIFICANT', 'MAJOR'];
  const INCIDENT_STATUSES: IncidentStatus[] = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];
  const TEST_TYPES: TestType[] = ['VULNERABILITY_ASSESSMENT', 'PENETRATION_TEST', 'TLPT', 'BUSINESS_CONTINUITY', 'SCENARIO_BASED', 'GAP_ANALYSIS'];
  const TEST_STATUSES: TestStatus[] = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'];

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview',   label: t('overview'),      icon: BarChart2 },
    { id: 'incidents',  label: t('incidents'),     icon: AlertCircle },
    { id: 'testing',    label: t('testing'),       icon: Shield },
  ];

  return (
    <ModuleGuard moduleKey="dora">
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Activity className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-sm text-gray-500">{t('subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === id ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              )}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Overview Tab ──────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="md:col-span-1 bg-white rounded-xl border p-4 flex items-center justify-center">
              <ScoreRing score={dashboard?.complianceScore ?? 0} label={t('complianceScore')} />
            </div>
            {[
              { label: t('openIncidents'),   value: dashboard?.openIncidents ?? 0,       icon: AlertCircle, color: 'text-red-600',   bg: 'bg-red-50' },
              { label: t('majorIncidents'),  value: dashboard?.majorIncidents ?? 0,      icon: Zap,         color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: t('upcomingTests'),   value: dashboard?.upcomingTestsCount ?? 0,  icon: Shield,      color: 'text-blue-600',   bg: 'bg-blue-50' },
              { label: t('overdueTests'),    value: dashboard?.overdueTests ?? 0,        icon: Clock,       color: 'text-amber-600',  bg: 'bg-amber-50' },
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

          {/* ── Extra KPI row: Classification / ICT Risk / Critical Providers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* DORA Classification level */}
            {(() => {
              const score = dashboard?.complianceScore ?? 0;
              const cls = getDoraClassification(score);
              return (
                <div className={`rounded-xl p-4 border flex items-center gap-4 ${cls.bg}`}>
                  <div className="p-2 bg-white/60 rounded-lg">
                    <TrendingUp className={`w-5 h-5 ${cls.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Nível DORA</p>
                    <p className={`text-lg font-bold ${cls.color}`}>{cls.label}</p>
                    <p className="text-xs text-gray-500">Score {score}/100</p>
                  </div>
                </div>
              );
            })()}

            {/* ICT Risk Score */}
            {(() => {
              const riskScore = getIctRiskScore(
                dashboard?.openIncidents ?? 0,
                dashboard?.majorIncidents ?? 0,
                dashboard?.overdueTests ?? 0,
              );
              const risk = getRiskLabel(riskScore);
              return (
                <div className={`rounded-xl p-4 border flex items-center gap-4 ${risk.bg}`}>
                  <div className="p-2 bg-white/60 rounded-lg">
                    <AlertTriangle className={`w-5 h-5 ${risk.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Risco TIC</p>
                    <p className={`text-lg font-bold ${risk.color}`}>{risk.label}</p>
                    <p className="text-xs text-gray-500">Índice {riskScore}/100</p>
                  </div>
                </div>
              );
            })()}

            {/* Critical providers count */}
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 flex items-center gap-4">
              <div className="p-2 bg-white/60 rounded-lg">
                <Building2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Prestadores Críticos</p>
                <p className="text-lg font-bold text-purple-700">
                  {registerDashboard?.critical ?? '—'}
                  {registerDashboard?.total != null && (
                    <span className="text-sm font-normal text-gray-500"> / {registerDashboard.total}</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">Art. 28 DORA</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-purple-600" />
                {t('recentIncidents')}
              </h3>
              {dashboard?.recentIncidents?.length === 0 ? (
                <p className="text-sm text-gray-500">{t('noRecentIncidents')}</p>
              ) : (
                <div className="space-y-2">
                  {dashboard?.recentIncidents?.map((inc: any) => (
                    <div key={inc.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => setActiveTab('incidents')}>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{inc.title}</p>
                        <p className="text-xs text-gray-500">{format(new Date(inc.detectedAt), 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                      <span className={cn('text-xs font-medium px-2 py-1 rounded-full', SEVERITY_COLORS[inc.severity as Severity])}>
                        {t(`severity.${inc.severity}`)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-600" />
                {t('upcomingTests')}
              </h3>
              {dashboard?.upcomingTests?.length === 0 ? (
                <p className="text-sm text-gray-500">{t('noUpcomingTests')}</p>
              ) : (
                <div className="space-y-2">
                  {dashboard?.upcomingTests?.map((test: any) => (
                    <div key={test.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{test.title}</p>
                        <p className="text-xs text-gray-500">
                          {t(`testType.${test.testType}`)} · {format(new Date(test.plannedDate), 'dd/MM/yyyy')}
                        </p>
                      </div>
                      <span className={cn('text-xs font-medium px-2 py-1 rounded-full', TEST_STATUS_COLORS[test.status as TestStatus])}>
                        {t(`testStatus.${test.status}`)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* DORA Pillars */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">{t('pillarsTitle')}</h3>
            <div className="grid md:grid-cols-5 gap-3">
              {[
                { label: t('pillar1'), art: 'Art. 5-16', done: true },
                { label: t('pillar2'), art: 'Art. 17-23', done: true },
                { label: t('pillar3'), art: 'Art. 24-27', done: true },
                { label: t('pillar4'), art: 'Art. 28-44', done: false },
                { label: t('pillar5'), art: 'Art. 45-49', done: false },
              ].map(({ label, art, done }) => (
                <div key={art} className={cn('rounded-lg p-3 border text-center', done ? 'bg-white border-green-200' : 'bg-white/50 border-gray-200')}>
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
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={incidentFilters.severity ?? ''}
                onChange={e => setIncidentFilters(f => ({ ...f, severity: e.target.value || undefined }))}>
                <option value="">{t('allSeverities')}</option>
                {SEVERITIES.map(k => <option key={k} value={k}>{t(`severity.${k}`)}</option>)}
              </select>
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={incidentFilters.status ?? ''}
                onChange={e => setIncidentFilters(f => ({ ...f, status: e.target.value || undefined }))}>
                <option value="">{t('allStatuses')}</option>
                {INCIDENT_STATUSES.map(k => <option key={k} value={k}>{t(`incidentStatus.${k}`)}</option>)}
              </select>
            </div>
            <button onClick={() => setIncidentModal({ open: true })}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
              <Plus className="w-4 h-4" /> {t('addIncident')}
            </button>
          </div>

          {incidents.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{t('noIncidents')}</p>
              <button onClick={() => setIncidentModal({ open: true })}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                {t('registerFirstIncident')}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colIncident')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('severity')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('category')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colStatus')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('detectedAt')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('regulator')}</th>
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
                          {t(`severity.${inc.severity}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{t(`incidentCategory.${inc.category}`)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-medium px-2 py-1 rounded-full', INCIDENT_STATUS_COLORS[inc.status as IncidentStatus])}>
                          {t(`incidentStatus.${inc.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {format(new Date(inc.detectedAt), 'dd/MM/yy HH:mm')}
                      </td>
                      <td className="px-4 py-3">
                        {inc.reportedToRegulator ? <CheckCircle className="w-4 h-4 text-green-500" /> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setIncidentModal({ open: true, incident: inc })}
                          className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 border rounded">
                          {t('edit')}
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
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={testFilters.testType ?? ''}
                onChange={e => setTestFilters(f => ({ ...f, testType: e.target.value || undefined }))}>
                <option value="">{t('allTypes')}</option>
                {TEST_TYPES.map(k => <option key={k} value={k}>{t(`testType.${k}`)}</option>)}
              </select>
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={testFilters.status ?? ''}
                onChange={e => setTestFilters(f => ({ ...f, status: e.target.value || undefined }))}>
                <option value="">{t('allStatuses')}</option>
                {TEST_STATUSES.map(k => <option key={k} value={k}>{t(`testStatus.${k}`)}</option>)}
              </select>
            </div>
            <button onClick={() => setTestModal({ open: true })}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
              <Plus className="w-4 h-4" /> {t('addTest')}
            </button>
          </div>

          {tests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{t('noTests')}</p>
              <button onClick={() => setTestModal({ open: true })}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                {t('registerFirstTest')}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colTest')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colType')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colStatus')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('plannedDate')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colFindings')}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tests.map((test: any) => (
                    <tr key={test.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{test.title}</p>
                        {test.provider && <p className="text-xs text-gray-500">{test.provider}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{t(`testType.${test.testType}`)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-medium px-2 py-1 rounded-full', TEST_STATUS_COLORS[test.status as TestStatus])}>
                          {t(`testStatus.${test.status}`)}
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
                                {test.criticalFindings} {t('critical')}
                              </span>
                            )}
                            {test.highFindings > 0 && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                {test.highFindings} {t('high')}
                              </span>
                            )}
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setTestModal({ open: true, test })}
                          className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 border rounded">
                          {t('edit')}
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
        <IncidentModal incident={incidentModal.incident} onClose={() => setIncidentModal({ open: false })} onSave={handleSaveIncident} />
      )}
      {testModal.open && (
        <TestModal test={testModal.test} onClose={() => setTestModal({ open: false })} onSave={handleSaveTest} />
      )}
    </div>
    </ModuleGuard>
  );
}
