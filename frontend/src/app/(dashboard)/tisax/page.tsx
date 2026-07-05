'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tisaxApi } from '@/lib/api';
import { Shield, CheckCircle2, Clock, Circle, Pencil, X, Plus, ChevronDown } from 'lucide-react';

// ── Maturity level config (0-3 scale) ────────────────────────
const MATURITY_CONFIG: Record<number, { label: string; color: string; bg: string; ring: string }> = {
  0: { label: 'Not Assessed', color: 'text-red-600',    bg: 'bg-red-100',    ring: 'ring-red-400' },
  1: { label: 'Performed',    color: 'text-orange-600', bg: 'bg-orange-100', ring: 'ring-orange-400' },
  2: { label: 'Managed',      color: 'text-yellow-600', bg: 'bg-yellow-100', ring: 'ring-yellow-400' },
  3: { label: 'Established',  color: 'text-green-600',  bg: 'bg-green-100',  ring: 'ring-green-400' },
};

// ── TISAX chapter config ──────────────────────────────────────
const CHAPTER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'IS-1':    { label: 'IS-1 — Information Security Policies',           color: 'text-blue-700',   bg: 'bg-blue-50' },
  'IS-2':    { label: 'IS-2 — Organization of Information Security',    color: 'text-indigo-700', bg: 'bg-indigo-50' },
  'IS-3':    { label: 'IS-3 — Human Resource Security',                 color: 'text-violet-700', bg: 'bg-violet-50' },
  'IS-4':    { label: 'IS-4 — Asset Management',                        color: 'text-purple-700', bg: 'bg-purple-50' },
  'IS-5':    { label: 'IS-5 — Access Control',                          color: 'text-fuchsia-700',bg: 'bg-fuchsia-50' },
  'IS-6':    { label: 'IS-6 — Cryptography',                            color: 'text-pink-700',   bg: 'bg-pink-50' },
  'IS-7':    { label: 'IS-7 — Physical & Environmental Security',        color: 'text-rose-700',   bg: 'bg-rose-50' },
  'IS-8':    { label: 'IS-8 — Operations Security',                     color: 'text-red-700',    bg: 'bg-red-50' },
  'IS-9':    { label: 'IS-9 — Communications Security',                 color: 'text-orange-700', bg: 'bg-orange-50' },
  'IS-10':   { label: 'IS-10 — System Acquisition, Development & Maint.',color: 'text-amber-700',  bg: 'bg-amber-50' },
  'IS-11':   { label: 'IS-11 — Supplier Relationships',                 color: 'text-yellow-700', bg: 'bg-yellow-50' },
  'IS-12':   { label: 'IS-12 — Information Security Incident Management',color: 'text-lime-700',   bg: 'bg-lime-50' },
  'IS-13':   { label: 'IS-13 — Business Continuity Management',         color: 'text-green-700',  bg: 'bg-green-50' },
  'IS-14':   { label: 'IS-14 — Compliance',                             color: 'text-teal-700',   bg: 'bg-teal-50' },
  'PROTO':   { label: 'PROTO — Prototype Protection',                   color: 'text-cyan-700',   bg: 'bg-cyan-50' },
};

// ── TISAX label config ────────────────────────────────────────
const LABEL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  INFO:          { label: 'INFO',          color: 'text-blue-700',  bg: 'bg-blue-100' },
  PROTO:         { label: 'PROTO',         color: 'text-purple-700',bg: 'bg-purple-100' },
  DATA_PROVIDER: { label: 'DATA PROVIDER', color: 'text-green-700', bg: 'bg-green-100' },
};

// ── Assessment status config ──────────────────────────────────
const ASSESSMENT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PLANNED:    { label: 'Planned',     color: 'text-blue-600',   bg: 'bg-blue-50' },
  IN_PROGRESS:{ label: 'In Progress', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  COMPLETED:  { label: 'Completed',   color: 'text-green-600',  bg: 'bg-green-50' },
  PASSED:     { label: 'Passed',      color: 'text-emerald-600',bg: 'bg-emerald-50' },
  FAILED:     { label: 'Failed',      color: 'text-red-600',    bg: 'bg-red-50' },
};

// ── Maturity dot ─────────────────────────────────────────────
function MaturityDot({ level }: { level: number }) {
  const cfg = MATURITY_CONFIG[level] ?? MATURITY_CONFIG[0];
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ring-2 ${cfg.ring} ${cfg.bg} ${cfg.color}`}
      title={cfg.label}
    >
      {level}
    </span>
  );
}

// ── Control Edit Modal ────────────────────────────────────────
function ControlEditModal({
  control,
  onClose,
  onSave,
}: {
  control: any;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [form, setForm] = useState({
    maturityLevel: control.maturityLevel ?? 0,
    evidence: control.evidence ?? '',
    notes: control.notes ?? '',
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-5 border-b flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-mono text-gray-400">{control.requirementId}</span>
            <h2 className="text-sm font-semibold text-gray-900 mt-0.5">{control.title}</h2>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {control.description && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded p-3 leading-relaxed">
              {control.description}
            </p>
          )}

          {/* Maturity Level selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maturity Level
            </label>
            <div className="grid grid-cols-4 gap-2">
              {([0, 1, 2, 3] as const).map(lvl => {
                const cfg = MATURITY_CONFIG[lvl];
                return (
                  <button
                    key={lvl}
                    onClick={() => set('maturityLevel', lvl)}
                    className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg border transition-all text-xs font-medium ${
                      form.maturityLevel === lvl
                        ? `${cfg.bg} border-current ${cfg.color} ring-2 ${cfg.ring}`
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        form.maturityLevel === lvl ? `${cfg.bg} ${cfg.color}` : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {lvl}
                    </span>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-500">Target:</span>
              <MaturityDot level={control.targetLevel ?? 3} />
              <span className="text-xs text-gray-400">Level {control.targetLevel ?? 3}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Evidence</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Describe evidence or link to artifacts..."
              value={form.evidence}
              onChange={e => set('evidence', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Internal notes..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
        </div>

        <div className="p-5 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                maturityLevel: form.maturityLevel,
                evidence: form.evidence || null,
                notes: form.notes || null,
              })
            }
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── New Assessment Modal ──────────────────────────────────────
function NewAssessmentModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [form, setForm] = useState({
    assessmentScope: '',
    label: 'INFO',
    targetLevel: 2,
    auditBody: '',
    assessmentDate: '',
    notes: '',
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const isValid = form.assessmentScope.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">New TISAX Assessment</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assessment Scope <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. IT Infrastructure, Connected Vehicles Platform..."
              value={form.assessmentScope}
              onChange={e => set('assessmentScope', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.label}
                onChange={e => set('label', e.target.value)}
              >
                <option value="INFO">INFO</option>
                <option value="PROTO">PROTO</option>
                <option value="DATA_PROVIDER">DATA PROVIDER</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Level</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.targetLevel}
                onChange={e => set('targetLevel', Number(e.target.value))}
              >
                <option value={1}>1 — Performed</option>
                <option value={2}>2 — Managed</option>
                <option value={3}>3 — Established</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Audit Body</label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. TÜV Rheinland, DNV..."
                value={form.auditBody}
                onChange={e => set('auditBody', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Date</label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.assessmentDate}
                onChange={e => set('assessmentDate', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Additional context or notes..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
        </div>

        <div className="p-5 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            disabled={!isValid}
            onClick={() =>
              onSave({
                assessmentScope: form.assessmentScope.trim(),
                label: form.label,
                targetLevel: form.targetLevel,
                auditBody: form.auditBody || null,
                assessmentDate: form.assessmentDate || null,
                notes: form.notes || null,
              })
            }
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create Assessment
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function TisaxPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'requirements' | 'assessments'>('requirements');
  const [editControl, setEditControl] = useState<any>(null);
  const [showNewAssessment, setShowNewAssessment] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  // ── Queries ─────────────────────────────────────────────────
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['tisax-dashboard'],
    queryFn: () => tisaxApi.dashboard().then(r => r.data),
  });

  // ── Mutations ────────────────────────────────────────────────
  const updateControlMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => tisaxApi.updateControl(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tisax-dashboard'] });
      setEditControl(null);
    },
  });

  const createAssessmentMut = useMutation({
    mutationFn: (data: any) => tisaxApi.createAssessment(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tisax-dashboard'] });
      setShowNewAssessment(false);
    },
  });

  // ── Derived data ─────────────────────────────────────────────
  const controls: any[] = dashboard?.controls ?? [];
  const assessments: any[] = dashboard?.assessments ?? [];
  const stats = dashboard?.stats ?? {};

  // Group controls by chapter
  const byChapter: Record<string, any[]> = {};
  for (const c of controls) {
    const chapter = c.chapter ?? 'OTHER';
    if (!byChapter[chapter]) byChapter[chapter] = [];
    byChapter[chapter].push(c);
  }

  const avgMaturity: number = dashboard?.averageMaturity ?? 0;

  // Toggle chapter expansion
  const toggleChapter = (ch: string) =>
    setExpandedChapters(p => ({ ...p, [ch]: !p[ch] }));

  // Chapter order: IS-1 through IS-14 then PROTO
  const chapterOrder = [
    'IS-1', 'IS-2', 'IS-3', 'IS-4', 'IS-5', 'IS-6', 'IS-7',
    'IS-8', 'IS-9', 'IS-10', 'IS-11', 'IS-12', 'IS-13', 'IS-14', 'PROTO',
  ];
  const sortedChapters = [
    ...chapterOrder.filter(ch => byChapter[ch]),
    ...Object.keys(byChapter).filter(ch => !chapterOrder.includes(ch)),
  ];

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">TISAX</h1>
          <p className="text-sm text-gray-500">VDA ISA 6.0 — Automotive Information Security Assessment</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : !dashboard ? null : (
        <>
          {/* Stat cards + average maturity */}
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs font-medium text-gray-500 uppercase mb-2">Total Requirements</div>
              <div className="text-3xl font-bold text-gray-800">{stats.total ?? controls.length}</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-xs font-medium text-green-600 uppercase mb-2">Met Target</div>
              <div className="text-3xl font-bold text-green-700">{stats.metTarget ?? 0}</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4">
              <div className="text-xs font-medium text-yellow-600 uppercase mb-2">In Progress</div>
              <div className="text-3xl font-bold text-yellow-700">{stats.inProgress ?? 0}</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <div className="text-xs font-medium text-red-500 uppercase mb-2">Not Assessed</div>
              <div className="text-3xl font-bold text-red-600">{stats.notAssessed ?? 0}</div>
            </div>

            {/* Average maturity — prominent */}
            <div className="bg-blue-700 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <div className="text-xs font-medium text-blue-200 uppercase mb-1">Avg Maturity</div>
              <div className="text-4xl font-extrabold text-white leading-none">
                {typeof avgMaturity === 'number' ? avgMaturity.toFixed(1) : '—'}
              </div>
              <div className="text-xs text-blue-200 mt-1">out of 3</div>
              {/* Simple maturity bar */}
              <div className="mt-2 w-full bg-blue-900 rounded-full h-1.5">
                <div
                  className="bg-white rounded-full h-1.5 transition-all"
                  style={{ width: `${Math.min(100, (avgMaturity / 3) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-6">
              {(['requirements', 'assessments'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-blue-700 text-blue-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'requirements' ? `Requirements (${controls.length})` : `Assessments (${assessments.length})`}
                </button>
              ))}
            </nav>
          </div>

          {/* Requirements Tab */}
          {activeTab === 'requirements' && (
            <div className="space-y-3">
              {sortedChapters.length === 0 && (
                <div className="text-center py-12 text-gray-400">No requirements found.</div>
              )}
              {sortedChapters.map(chapter => {
                const items = byChapter[chapter] ?? [];
                const cfg = CHAPTER_CONFIG[chapter] ?? { label: chapter, color: 'text-gray-700', bg: 'bg-gray-50' };
                const metCount = items.filter((c: any) => (c.maturityLevel ?? 0) >= (c.targetLevel ?? 3)).length;
                const isExpanded = expandedChapters[chapter] !== false; // default expanded

                return (
                  <div key={chapter} className="bg-white rounded-xl border overflow-hidden">
                    {/* Chapter header */}
                    <button
                      className={`w-full flex items-center justify-between px-4 py-3 ${cfg.bg} border-b hover:opacity-90 transition-opacity`}
                      onClick={() => toggleChapter(chapter)}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                        <span className={`text-xs ${cfg.color} opacity-70`}>({items.length} requirements)</span>
                        <span className={`text-xs font-medium ml-1 ${cfg.color} opacity-80`}>
                          {metCount}/{items.length} at target
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 ${cfg.color} transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {/* Controls list */}
                    {isExpanded && (
                      <div className="divide-y divide-gray-100">
                        {items.map((ctrl: any) => {
                          const matLvl = ctrl.maturityLevel ?? 0;
                          const tgtLvl = ctrl.targetLevel ?? 3;
                          const atTarget = matLvl >= tgtLvl;
                          return (
                            <div
                              key={ctrl.id}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group"
                            >
                              {/* Requirement ID */}
                              <span className="text-xs font-mono text-gray-500 w-20 flex-shrink-0">
                                {ctrl.requirementId}
                              </span>

                              {/* Title + evidence */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{ctrl.title}</p>
                                {ctrl.evidence && (
                                  <p className="text-xs text-gray-500 truncate">
                                    <CheckCircle2 className="inline w-3 h-3 mr-0.5 text-green-500" />
                                    {ctrl.evidence}
                                  </p>
                                )}
                              </div>

                              {/* Target level indicator */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-xs text-gray-400">Target</span>
                                <MaturityDot level={tgtLvl} />
                              </div>

                              {/* Current maturity dot */}
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <MaturityDot level={matLvl} />
                                {atTarget && (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                )}
                                {!atTarget && matLvl > 0 && (
                                  <Clock className="w-4 h-4 text-yellow-500" />
                                )}
                                {!atTarget && matLvl === 0 && (
                                  <Circle className="w-4 h-4 text-gray-300" />
                                )}
                              </div>

                              {/* Edit button */}
                              <button
                                onClick={() => setEditControl(ctrl)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded text-gray-400 flex-shrink-0 transition-opacity"
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
              })}
            </div>
          )}

          {/* Assessments Tab */}
          {activeTab === 'assessments' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowNewAssessment(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Assessment
                </button>
              </div>

              {assessments.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  No assessments yet. Click &ldquo;New Assessment&rdquo; to create one.
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {assessments.map((a: any) => {
                  const labelCfg = LABEL_CONFIG[a.label] ?? { label: a.label, color: 'text-gray-700', bg: 'bg-gray-100' };
                  const statusCfg = ASSESSMENT_STATUS_CONFIG[a.status] ?? { label: a.status, color: 'text-gray-600', bg: 'bg-gray-50' };
                  const tgtCfg = MATURITY_CONFIG[a.targetLevel] ?? MATURITY_CONFIG[2];
                  return (
                    <div key={a.id} className="bg-white rounded-xl border p-4 space-y-3 hover:shadow-sm transition-shadow">
                      {/* Top row: label + status */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${labelCfg.bg} ${labelCfg.color}`}>
                          {labelCfg.label}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </div>

                      {/* Scope */}
                      <div>
                        <p className="text-sm font-semibold text-gray-900 truncate">{a.assessmentScope}</p>
                        {a.auditBody && (
                          <p className="text-xs text-gray-500 mt-0.5">Audit body: {a.auditBody}</p>
                        )}
                      </div>

                      {/* Target maturity + date */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <span>Target:</span>
                          <MaturityDot level={a.targetLevel ?? 2} />
                          <span className={tgtCfg.color}>{tgtCfg.label}</span>
                        </div>
                        {a.assessmentDate && (
                          <span>{new Date(a.assessmentDate).toLocaleDateString()}</span>
                        )}
                      </div>

                      {/* Notes */}
                      {a.notes && (
                        <p className="text-xs text-gray-400 italic truncate">{a.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Control Edit Modal */}
      {editControl && (
        <ControlEditModal
          control={editControl}
          onClose={() => setEditControl(null)}
          onSave={data => updateControlMut.mutate({ id: editControl.id, data })}
        />
      )}

      {/* New Assessment Modal */}
      {showNewAssessment && (
        <NewAssessmentModal
          onClose={() => setShowNewAssessment(false)}
          onSave={data => createAssessmentMut.mutate(data)}
        />
      )}
    </div>
  );
}
