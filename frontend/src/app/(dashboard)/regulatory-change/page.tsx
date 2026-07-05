'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { regulatoryChangeApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus, Pencil, X, CalendarDays, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

// ── Config ────────────────────────────────────────────────────

const CHANGE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  DETECTED:               { label: 'Detected',               color: 'text-blue-600',   bg: 'bg-blue-100' },
  UNDER_ANALYSIS:         { label: 'Under Analysis',         color: 'text-yellow-600', bg: 'bg-yellow-100' },
  IMPACT_ASSESSED:        { label: 'Impact Assessed',        color: 'text-orange-600', bg: 'bg-orange-100' },
  IMPLEMENTATION_PLANNED: { label: 'Implementation Planned', color: 'text-purple-600', bg: 'bg-purple-100' },
  IMPLEMENTED:            { label: 'Implemented',            color: 'text-green-600',  bg: 'bg-green-100' },
  VERIFIED:               { label: 'Verified',               color: 'text-teal-600',   bg: 'bg-teal-100' },
  NOT_APPLICABLE:         { label: 'N/A',                    color: 'text-gray-500',   bg: 'bg-gray-100' },
};

const IMPACT_LEVEL: Record<string, { label: string; color: string; bg: string }> = {
  CRITICAL: { label: 'Critical', color: 'text-red-700',    bg: 'bg-red-100' },
  HIGH:     { label: 'High',     color: 'text-orange-600', bg: 'bg-orange-100' },
  MEDIUM:   { label: 'Medium',   color: 'text-yellow-600', bg: 'bg-yellow-100' },
  LOW:      { label: 'Low',      color: 'text-green-600',  bg: 'bg-green-100' },
  NONE:     { label: 'None',     color: 'text-gray-500',   bg: 'bg-gray-100' },
};

const EVENT_TYPE: Record<string, { label: string; color: string; bg: string }> = {
  DEADLINE:  { label: 'Deadline',  color: 'text-red-700',    bg: 'bg-red-100' },
  REPORTING: { label: 'Reporting', color: 'text-blue-600',   bg: 'bg-blue-100' },
  AUDIT:     { label: 'Audit',     color: 'text-purple-600', bg: 'bg-purple-100' },
  REVIEW:    { label: 'Review',    color: 'text-yellow-600', bg: 'bg-yellow-100' },
  TRAINING:  { label: 'Training',  color: 'text-green-600',  bg: 'bg-green-100' },
  RENEWAL:   { label: 'Renewal',   color: 'text-orange-600', bg: 'bg-orange-100' },
};

const EVENT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: 'Pending',    color: 'text-yellow-600', bg: 'bg-yellow-100' },
  COMPLETED:  { label: 'Completed',  color: 'text-green-600',  bg: 'bg-green-100' },
  OVERDUE:    { label: 'Overdue',    color: 'text-red-600',    bg: 'bg-red-100' },
  CANCELLED:  { label: 'Cancelled',  color: 'text-gray-400',   bg: 'bg-gray-50' },
};

const ALL_CHANGE_STATUSES = ['DETECTED', 'UNDER_ANALYSIS', 'IMPACT_ASSESSED', 'IMPLEMENTATION_PLANNED', 'IMPLEMENTED', 'VERIFIED', 'NOT_APPLICABLE'];
const ALL_IMPACTS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const EVENT_TYPES = ['DEADLINE', 'REPORTING', 'AUDIT', 'REVIEW', 'TRAINING', 'RENEWAL'];
const RECURRENCES = ['NONE', 'MONTHLY', 'QUARTERLY', 'ANNUAL'];

// ── Modals ────────────────────────────────────────────────────

function ChangeModal({ initial, onClose, onSave }: { initial?: any; onClose: () => void; onSave: (d: any) => void }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    title:              initial?.title              ?? '',
    description:        initial?.description        ?? '',
    source:             initial?.source             ?? '',
    jurisdiction:       initial?.jurisdiction       ?? '',
    frameworks:         Array.isArray(initial?.frameworks) ? initial.frameworks.join(', ') : (initial?.frameworks ?? ''),
    impact:             initial?.impact             ?? 'MEDIUM',
    effectiveDate:      initial?.effectiveDate      ? initial.effectiveDate.slice(0, 10)  : '',
    deadlineDate:       initial?.deadlineDate       ? initial.deadlineDate.slice(0, 10)   : '',
    status:             initial?.status             ?? 'DETECTED',
    impactAnalysis:     initial?.impactAnalysis     ?? '',
    implementationPlan: initial?.implementationPlan ?? '',
  });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    const frameworks = form.frameworks
      ? form.frameworks.split(',').map((f: string) => f.trim()).filter(Boolean)
      : [];
    onSave({
      ...(isEdit
        ? {
            status:             form.status,
            impact:             form.impact,
            impactAnalysis:     form.impactAnalysis     || undefined,
            implementationPlan: form.implementationPlan || undefined,
            deadlineDate:       form.deadlineDate       || undefined,
            effectiveDate:      form.effectiveDate      || undefined,
          }
        : {
            title:        form.title,
            description:  form.description || undefined,
            source:       form.source      || undefined,
            jurisdiction: form.jurisdiction || undefined,
            frameworks:   frameworks.length ? frameworks : undefined,
            impact:       form.impact,
            effectiveDate: form.effectiveDate || undefined,
            deadlineDate:  form.deadlineDate  || undefined,
          }
      ),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-base font-semibold">{isEdit ? 'Edit Regulatory Change' : 'New Regulatory Change'}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          {!isEdit && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e => s('title', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={3} value={form.description} onChange={e => s('description', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.source} onChange={e => s('source', e.target.value)} placeholder="e.g. EU Official Journal" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jurisdiction</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.jurisdiction} onChange={e => s('jurisdiction', e.target.value)} placeholder="e.g. EU, UK, US" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frameworks <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.frameworks} onChange={e => s('frameworks', e.target.value)} placeholder="e.g. GDPR, ISO 27001, NIS2" />
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            {isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => s('status', e.target.value)}>
                  {ALL_CHANGE_STATUSES.map(v => <option key={v} value={v}>{CHANGE_STATUS[v]?.label ?? v}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Impact</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.impact} onChange={e => s('impact', e.target.value)}>
                {ALL_IMPACTS.map(v => <option key={v} value={v}>{IMPACT_LEVEL[v]?.label ?? v}</option>)}
              </select>
            </div>
          </div>
          {isEdit && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Impact Analysis</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={3} value={form.impactAnalysis} onChange={e => s('impactAnalysis', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Implementation Plan</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={3} value={form.implementationPlan} onChange={e => s('implementationPlan', e.target.value)} />
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.effectiveDate} onChange={e => s('effectiveDate', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline Date</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.deadlineDate} onChange={e => s('deadlineDate', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!isEdit && !form.title} onClick={handleSave}>Save</Button>
        </div>
      </div>
    </div>
  );
}

function CalendarModal({ initial, onClose, onSave }: { initial?: any; onClose: () => void; onSave: (d: any) => void }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    title:      initial?.title      ?? '',
    description: initial?.description ?? '',
    frameworks: Array.isArray(initial?.frameworks) ? initial.frameworks.join(', ') : (initial?.frameworks ?? ''),
    eventType:  initial?.eventType  ?? 'DEADLINE',
    eventDate:  initial?.eventDate  ? initial.eventDate.slice(0, 10) : '',
    recurrence: initial?.recurrence ?? 'NONE',
    status:     initial?.status     ?? 'PENDING',
  });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    const frameworks = form.frameworks
      ? form.frameworks.split(',').map((f: string) => f.trim()).filter(Boolean)
      : [];
    onSave({
      title:       form.title,
      description: form.description || undefined,
      frameworks:  frameworks.length ? frameworks : undefined,
      eventType:   form.eventType,
      eventDate:   form.eventDate   || undefined,
      recurrence:  form.recurrence,
      ...(isEdit ? { status: form.status } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-base font-semibold">{isEdit ? 'Edit Calendar Event' : 'New Calendar Event'}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e => s('title', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.description} onChange={e => s('description', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frameworks <span className="text-gray-400 font-normal">(comma-separated)</span></label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.frameworks} onChange={e => s('frameworks', e.target.value)} placeholder="e.g. GDPR, ISO 27001" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.eventType} onChange={e => s('eventType', e.target.value)}>
                {EVENT_TYPES.map(v => <option key={v} value={v}>{EVENT_TYPE[v]?.label ?? v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.eventDate} onChange={e => s('eventDate', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.recurrence} onChange={e => s('recurrence', e.target.value)}>
                {RECURRENCES.map(v => <option key={v} value={v}>{v.charAt(0) + v.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            {isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => s('status', e.target.value)}>
                  {Object.entries(EVENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!form.title} onClick={handleSave}>Save</Button>
        </div>
      </div>
    </div>
  );
}

// ── Tabs config ───────────────────────────────────────────────

const TABS = [
  { id: 'changes',  label: 'Regulatory Changes',   icon: BookOpen },
  { id: 'calendar', label: 'Compliance Calendar',  icon: CalendarDays },
];

// ── Helpers ───────────────────────────────────────────────────

const FRAMEWORK_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
  'bg-pink-100 text-pink-700',
  'bg-emerald-100 text-emerald-700',
];

function frameworkColor(fw: string) {
  let hash = 0;
  for (let i = 0; i < fw.length; i++) hash = fw.charCodeAt(i) + ((hash << 5) - hash);
  return FRAMEWORK_COLORS[Math.abs(hash) % FRAMEWORK_COLORS.length];
}

function groupByMonth(items: any[]) {
  const map: Record<string, any[]> = {};
  for (const item of items) {
    const key = item.eventDate
      ? format(new Date(item.eventDate), 'MMMM yyyy')
      : 'No Date';
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return map;
}

// ── Main Page ─────────────────────────────────────────────────

export default function RegulatoryChangePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('changes');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [impactFilter, setImpactFilter] = useState('ALL');
  const [editChange, setEditChange] = useState<any>(null);
  const [showNewChange, setShowNewChange] = useState(false);
  const [editEvent, setEditEvent] = useState<any>(null);
  const [showNewEvent, setShowNewEvent] = useState(false);

  const { data: dashboard } = useQuery({
    queryKey: ['regulatory-change-dashboard'],
    queryFn: () => regulatoryChangeApi.dashboard().then((r: any) => r.data),
  });

  const createChangeMut = useMutation({
    mutationFn: (d: any) => regulatoryChangeApi.createChange(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['regulatory-change-dashboard'] }); setShowNewChange(false); },
  });

  const updateChangeMut = useMutation({
    mutationFn: ({ id, data }: any) => regulatoryChangeApi.updateChange(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['regulatory-change-dashboard'] }); setEditChange(null); },
  });

  const removeChangeMut = useMutation({
    mutationFn: (id: string) => regulatoryChangeApi.removeChange(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['regulatory-change-dashboard'] }); setEditChange(null); },
  });

  const createEventMut = useMutation({
    mutationFn: (d: any) => regulatoryChangeApi.createCalendarItem(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['regulatory-change-dashboard'] }); setShowNewEvent(false); },
  });

  const updateEventMut = useMutation({
    mutationFn: ({ id, data }: any) => regulatoryChangeApi.updateCalendarItem(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['regulatory-change-dashboard'] }); setEditEvent(null); },
  });

  const removeEventMut = useMutation({
    mutationFn: (id: string) => regulatoryChangeApi.removeCalendarItem(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['regulatory-change-dashboard'] }); setEditEvent(null); },
  });

  const changes: any[] = dashboard?.changes ?? [];
  const calendarItems: any[] = dashboard?.calendarItems ?? [];

  const now = new Date();
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const stats = {
    total:           changes.length,
    open:            changes.filter(c => !['IMPLEMENTED', 'VERIFIED', 'NOT_APPLICABLE'].includes(c.status)).length,
    upcomingDeadlines: changes.filter(c => c.deadlineDate && new Date(c.deadlineDate) > now && new Date(c.deadlineDate) <= thirtyDaysOut).length,
    overdue:         changes.filter(c => c.deadlineDate && new Date(c.deadlineDate) < now && !['IMPLEMENTED', 'VERIFIED', 'NOT_APPLICABLE'].includes(c.status)).length,
    critical:        changes.filter(c => c.impact === 'CRITICAL').length,
  };

  const filteredChanges = changes.filter(c => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (impactFilter !== 'ALL' && c.impact !== impactFilter) return false;
    return true;
  });

  const sortedEvents = [...calendarItems].sort((a, b) => {
    if (!a.eventDate) return 1;
    if (!b.eventDate) return -1;
    return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
  });

  const eventsByMonth = groupByMonth(sortedEvents);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Regulatory Change Governance</h1>
            <p className="text-sm text-gray-500">Monitor regulatory changes and manage compliance calendar</p>
          </div>
        </div>
        {tab === 'changes' && (
          <Button onClick={() => setShowNewChange(true)}>
            <Plus className="w-4 h-4 mr-1.5" />New Change
          </Button>
        )}
        {tab === 'calendar' && (
          <Button onClick={() => setShowNewEvent(true)}>
            <Plus className="w-4 h-4 mr-1.5" />New Event
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <div className="text-xs text-blue-600 font-medium mb-1">Total Changes</div>
          <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
        </div>
        <div className="bg-yellow-50 rounded-xl p-3 text-center">
          <div className="text-xs text-yellow-600 font-medium mb-1">Open Changes</div>
          <div className="text-2xl font-bold text-yellow-700">{stats.open}</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-3 text-center">
          <div className="text-xs text-purple-600 font-medium mb-1">Upcoming (30d)</div>
          <div className="text-2xl font-bold text-purple-700">{stats.upcomingDeadlines}</div>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <div className="text-xs text-red-600 font-medium mb-1">Overdue</div>
          <div className="text-2xl font-bold text-red-700">{stats.overdue}</div>
        </div>
        <div className="bg-orange-50 rounded-xl p-3 text-center">
          <div className="text-xs text-orange-600 font-medium mb-1">Critical</div>
          <div className="text-2xl font-bold text-orange-700">{stats.critical}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>

      {/* Regulatory Changes Tab */}
      {tab === 'changes' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1">
              {['ALL', ...ALL_CHANGE_STATUSES].map(f => {
                const st = CHANGE_STATUS[f];
                return (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${statusFilter === f ? (st ? `${st.bg} ${st.color} ring-1 ring-inset ring-current` : 'bg-gray-900 text-white') : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {f === 'ALL' ? 'All Statuses' : (st?.label ?? f)}
                  </button>
                );
              })}
            </div>
            <div className="w-px h-5 bg-gray-200" />
            <div className="flex gap-1">
              {['ALL', ...ALL_IMPACTS].map(f => {
                const imp = IMPACT_LEVEL[f];
                return (
                  <button
                    key={f}
                    onClick={() => setImpactFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${impactFilter === f ? (imp ? `${imp.bg} ${imp.color} ring-1 ring-inset ring-current` : 'bg-gray-900 text-white') : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {f === 'ALL' ? 'All Impacts' : (imp?.label ?? f)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Changes list */}
          <div className="bg-white rounded-xl border overflow-hidden">
            {filteredChanges.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No regulatory changes match the selected filters.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Ref', 'Title', 'Source / Jurisdiction', 'Frameworks', 'Impact', 'Status', 'Deadline', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredChanges.map((item: any) => {
                    const st = CHANGE_STATUS[item.status] ?? CHANGE_STATUS.DETECTED;
                    const imp = IMPACT_LEVEL[item.impact] ?? IMPACT_LEVEL.MEDIUM;
                    const isOverdue = item.deadlineDate && new Date(item.deadlineDate) < now && !['IMPLEMENTED', 'VERIFIED', 'NOT_APPLICABLE'].includes(item.status);
                    const fws: string[] = Array.isArray(item.frameworks) ? item.frameworks : [];
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 group">
                        <td className="px-4 py-3 text-xs font-mono text-indigo-600 whitespace-nowrap">{item.referenceId}</td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-sm font-medium text-gray-900">{item.title}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {item.source && <p>{item.source}</p>}
                          {item.jurisdiction && <p className="text-gray-400">{item.jurisdiction}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {fws.map(fw => (
                              <span key={fw} className={`text-xs px-1.5 py-0.5 rounded font-medium ${frameworkColor(fw)}`}>{fw}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${imp.bg} ${imp.color}`}>{imp.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.bg} ${st.color}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {item.deadlineDate ? (
                            <span className={isOverdue ? 'text-red-600 font-semibold flex items-center gap-1' : 'text-gray-500'}>
                              {isOverdue && <AlertTriangle className="w-3 h-3 inline" />}
                              {format(new Date(item.deadlineDate), 'dd/MM/yyyy')}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setEditChange(item)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded text-gray-400"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Compliance Calendar Tab */}
      {tab === 'calendar' && (
        <div className="space-y-6">
          {sortedEvents.length === 0 ? (
            <div className="bg-white rounded-xl border text-center py-12 text-gray-400">
              <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No calendar events. Click "New Event" to add one.</p>
            </div>
          ) : (
            Object.entries(eventsByMonth).map(([month, events]) => (
              <div key={month}>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">{month}</h3>
                <div className="space-y-2">
                  {(events as any[]).map((ev: any) => {
                    const et = EVENT_TYPE[ev.eventType] ?? { label: ev.eventType, color: 'text-gray-600', bg: 'bg-gray-100' };
                    const est = EVENT_STATUS[ev.status] ?? EVENT_STATUS.PENDING;
                    const isOverdue = ev.eventDate && new Date(ev.eventDate) < now && ev.status !== 'COMPLETED' && ev.status !== 'CANCELLED';
                    const fws: string[] = Array.isArray(ev.frameworks) ? ev.frameworks : [];
                    return (
                      <div
                        key={ev.id}
                        onClick={() => setEditEvent(ev)}
                        className={`bg-white rounded-xl border px-4 py-3 flex items-center justify-between gap-4 hover:border-indigo-300 cursor-pointer group transition-colors ${isOverdue ? 'border-red-200 bg-red-50' : ''}`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${et.bg.replace('bg-', 'bg-').replace('100', '400')}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className={`text-sm font-medium ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>{ev.title}</span>
                              {fws.map(fw => (
                                <span key={fw} className={`text-xs px-1.5 py-0.5 rounded font-medium ${frameworkColor(fw)}`}>{fw}</span>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${et.bg} ${et.color}`}>{et.label}</span>
                              {ev.recurrence && ev.recurrence !== 'NONE' && (
                                <span className="text-xs text-gray-400">{ev.recurrence.charAt(0) + ev.recurrence.slice(1).toLowerCase()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${est.bg} ${est.color}`}>{est.label}</span>
                          {ev.eventDate && (
                            <span className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                              {format(new Date(ev.eventDate), 'dd/MM/yyyy')}
                            </span>
                          )}
                          <button className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded text-gray-400 transition-opacity">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      {showNewChange && (
        <ChangeModal
          onClose={() => setShowNewChange(false)}
          onSave={d => createChangeMut.mutate(d)}
        />
      )}
      {editChange && (
        <ChangeModal
          initial={editChange}
          onClose={() => setEditChange(null)}
          onSave={d => updateChangeMut.mutate({ id: editChange.id, data: d })}
        />
      )}
      {showNewEvent && (
        <CalendarModal
          onClose={() => setShowNewEvent(false)}
          onSave={d => createEventMut.mutate(d)}
        />
      )}
      {editEvent && (
        <CalendarModal
          initial={editEvent}
          onClose={() => setEditEvent(null)}
          onSave={d => updateEventMut.mutate({ id: editEvent.id, data: d })}
        />
      )}
    </div>
  );
}
