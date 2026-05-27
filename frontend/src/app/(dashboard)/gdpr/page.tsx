'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gdprApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Plus, ShieldCheck, Database, AlertOctagon, ClipboardList,
  Pencil, Trash2, Eye, CheckCircle2, Clock, XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';

// ── Dashboard stats panel ─────────────────────────────────────
function GdprDashboard({ stats }: { stats: any }) {
  const t = useTranslations('gdpr');
  if (!stats) return null;
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-blue-50 rounded-xl p-4">
        <div className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2">{t('statsActivities')}</div>
        <div className="text-3xl font-bold text-blue-700">{stats.activities?.total ?? 0}</div>
        <div className="text-sm text-blue-600 mt-1">{t('statsActivitiesActive', { n: stats.activities?.active ?? 0 })}</div>
      </div>
      <div className="bg-purple-50 rounded-xl p-4">
        <div className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-2">{t('statsDpias')}</div>
        <div className="text-3xl font-bold text-purple-700">{stats.dpias?.total ?? 0}</div>
        <div className="text-sm text-purple-600 mt-1">{t('statsDpiasCompleted', { n: stats.dpias?.byStatus?.COMPLETED ?? 0 })}</div>
      </div>
      <div className="bg-red-50 rounded-xl p-4">
        <div className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2">{t('statsBreaches')}</div>
        <div className="text-3xl font-bold text-red-700">{stats.breaches?.total ?? 0}</div>
        <div className="text-sm text-red-600 mt-1">{t('statsBreachesOpen', { n: stats.breaches?.open ?? 0 })}</div>
      </div>
    </div>
  );
}

// ── Modal: Processing Activity ────────────────────────────────
function ActivityModal({ onClose, onSave, initial }: { onClose: () => void; onSave: (d: any) => void; initial?: any }) {
  const t = useTranslations('gdpr');
  const tCommon = useTranslations('common');

  const LEGAL_BASIS_LABELS: Record<string, string> = {
    CONSENT:              t('legalBasisValues.CONSENT'),
    CONTRACT:             t('legalBasisValues.CONTRACT'),
    LEGAL_OBLIGATION:     t('legalBasisValues.LEGAL_OBLIGATION'),
    VITAL_INTERESTS:      t('legalBasisValues.VITAL_INTERESTS'),
    PUBLIC_TASK:          t('legalBasisValues.PUBLIC_TASK'),
    LEGITIMATE_INTERESTS: t('legalBasisValues.LEGITIMATE_INTERESTS'),
  };

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    purpose: initial?.purpose ?? '',
    legalBasis: initial?.legalBasis ?? 'LEGITIMATE_INTERESTS',
    retentionPeriod: initial?.retentionPeriod ?? '',
    dataCategories: (initial?.dataCategories ?? []).join(', '),
    dataSubjects: (initial?.dataSubjects ?? []).join(', '),
    recipients: (initial?.recipients ?? []).join(', '),
    internationalTransfers: initial?.internationalTransfers ?? false,
    transferCountries: (initial?.transferCountries ?? []).join(', '),
    transferSafeguards: initial?.transferSafeguards ?? '',
    processorName: initial?.processorName ?? '',
    dpoConsulted: initial?.dpoConsulted ?? false,
  });

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  function handleSave() {
    if (!form.name || !form.purpose || !form.retentionPeriod) return;
    const splitCsv = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);
    onSave({
      name: form.name,
      purpose: form.purpose,
      legalBasis: form.legalBasis,
      retentionPeriod: form.retentionPeriod,
      dataCategories: splitCsv(form.dataCategories),
      dataSubjects: splitCsv(form.dataSubjects),
      recipients: splitCsv(form.recipients),
      internationalTransfers: form.internationalTransfers,
      transferCountries: splitCsv(form.transferCountries),
      transferSafeguards: form.transferSafeguards || undefined,
      processorName: form.processorName || undefined,
      dpoConsulted: form.dpoConsulted,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initial ? t('editActivity') : t('newActivity')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('activityName')} *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('activityNamePlaceholder') as string} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('purposeLabel')} *</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.purpose} onChange={e => set('purpose', e.target.value)} placeholder={t('purposePlaceholder') as string} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('legalBasisLabel')} *</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.legalBasis} onChange={e => set('legalBasis', e.target.value)}>
                {Object.entries(LEGAL_BASIS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('retentionPeriodLabel')} *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.retentionPeriod} onChange={e => set('retentionPeriod', e.target.value)} placeholder={t('retentionPeriodPlaceholder') as string} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('dataCategoriesLabel')}</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.dataCategories} onChange={e => set('dataCategories', e.target.value)} placeholder={t('dataCategoriesPlaceholder') as string} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('dataSubjectsLabel')}</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.dataSubjects} onChange={e => set('dataSubjects', e.target.value)} placeholder={t('dataSubjectsPlaceholder') as string} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('recipientsLabel')}</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.recipients} onChange={e => set('recipients', e.target.value)} placeholder={t('recipientsPlaceholder') as string} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('processorNameLabel')}</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.processorName} onChange={e => set('processorName', e.target.value)} placeholder={t('processorNamePlaceholder') as string} />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.internationalTransfers} onChange={e => set('internationalTransfers', e.target.checked)} />
              {t('internationalTransfersLabel')}
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.dpoConsulted} onChange={e => set('dpoConsulted', e.target.checked)} />
              {t('dpoConsulted')}
            </label>
          </div>
          {form.internationalTransfers && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('transferCountriesLabel')}</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.transferCountries} onChange={e => set('transferCountries', e.target.value)} placeholder={t('transferCountriesPlaceholder') as string} />
            </div>
          )}
        </div>
        <div className="p-6 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>{tCommon('cancel')}</Button>
          <Button onClick={handleSave}>{initial ? tCommon('save') : t('createActivity')}</Button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: DPIA ───────────────────────────────────────────────
function DpiaModal({ onClose, onSave, initial }: { onClose: () => void; onSave: (d: any) => void; initial?: any }) {
  const t = useTranslations('gdpr');
  const tCommon = useTranslations('common');

  const DPIA_STATUS_LABELS: Record<string, string> = {
    DRAFT:       t('dpiaStatus.DRAFT'),
    IN_PROGRESS: t('dpiaStatus.IN_PROGRESS'),
    COMPLETED:   t('dpiaStatus.COMPLETED'),
    APPROVED:    t('dpiaStatus.APPROVED'),
  };

  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    necessityTest: initial?.necessityTest ?? '',
    proportionalityTest: initial?.proportionalityTest ?? '',
    riskAssessment: initial?.riskAssessment ?? '',
    mitigationMeasures: initial?.mitigationMeasures ?? '',
    status: initial?.status ?? 'DRAFT',
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initial ? t('editDpia') : t('newDpia')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('dpiaTitle')} *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e => set('title', e.target.value)} placeholder={t('dpiaTitlePlaceholder') as string} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('dpiaDescription2')} *</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('necessityTest')}</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.necessityTest} onChange={e => set('necessityTest', e.target.value)} placeholder={t('necessityTestPlaceholder') as string} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('proportionalityTest')}</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.proportionalityTest} onChange={e => set('proportionalityTest', e.target.value)} placeholder={t('proportionalityTestPlaceholder') as string} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('riskAssessment')}</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.riskAssessment} onChange={e => set('riskAssessment', e.target.value)} placeholder={t('riskAssessmentPlaceholder') as string} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('mitigationMeasures')}</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.mitigationMeasures} onChange={e => set('mitigationMeasures', e.target.value)} placeholder={t('mitigationMeasuresPlaceholder') as string} />
          </div>
          {initial && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('statusLabel')}</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => set('status', e.target.value)}>
                {Object.entries(DPIA_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="p-6 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>{tCommon('cancel')}</Button>
          <Button onClick={() => { if (!form.title || !form.description) return; onSave(form); }}>
            {initial ? tCommon('save') : t('createDpia')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Breach Notification ────────────────────────────────
function BreachModal({ onClose, onSave, initial }: { onClose: () => void; onSave: (d: any) => void; initial?: any }) {
  const t = useTranslations('gdpr');
  const tCommon = useTranslations('common');

  const BREACH_STATUS_LABELS: Record<string, string> = {
    IDENTIFIED: t('breachStatus.IDENTIFIED'),
    ASSESSING:  t('breachStatus.ASSESSING'),
    NOTIFIED:   t('breachStatus.NOTIFIED'),
    CLOSED:     t('breachStatus.CLOSED'),
  };

  const BREACH_SEVERITY_LABELS: Record<string, string> = {
    LOW:      t('breachSeverity.LOW'),
    MEDIUM:   t('breachSeverity.MEDIUM'),
    HIGH:     t('breachSeverity.HIGH'),
    CRITICAL: t('breachSeverity.CRITICAL'),
  };

  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    discoveredAt: initial?.discoveredAt ? initial.discoveredAt.slice(0, 16) : new Date().toISOString().slice(0, 16),
    severity: initial?.severity ?? 'MEDIUM',
    affectedDataSubjects: initial?.affectedDataSubjects ?? '',
    affectedDataCategories: (initial?.affectedDataCategories ?? []).join(', '),
    containmentMeasures: initial?.containmentMeasures ?? '',
    rootCause: initial?.rootCause ?? '',
    status: initial?.status ?? 'IDENTIFIED',
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  function handleSave() {
    if (!form.title || !form.description) return;
    const splitCsv = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);
    onSave({
      title: form.title,
      description: form.description,
      discoveredAt: new Date(form.discoveredAt).toISOString(),
      severity: form.severity,
      affectedDataSubjects: form.affectedDataSubjects ? Number(form.affectedDataSubjects) : undefined,
      affectedDataCategories: splitCsv(form.affectedDataCategories),
      containmentMeasures: form.containmentMeasures || undefined,
      rootCause: form.rootCause || undefined,
      ...(initial && { status: form.status }),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initial ? t('editBreach') : t('newBreach')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tCommon('title')} *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e => set('title', e.target.value)} placeholder={t('breachTitlePlaceholder') as string} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tCommon('description')} *</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('discoveredAt')} *</label>
              <input type="datetime-local" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.discoveredAt} onChange={e => set('discoveredAt', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('severityLabel')}</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.severity} onChange={e => set('severity', e.target.value)}>
                {Object.entries(BREACH_SEVERITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('affectedSubjectsLabel')}</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.affectedDataSubjects} onChange={e => set('affectedDataSubjects', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('affectedCategoriesLabel')}</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.affectedDataCategories} onChange={e => set('affectedDataCategories', e.target.value)} placeholder={t('affectedCategoriesPlaceholder') as string} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('containmentMeasures')}</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.containmentMeasures} onChange={e => set('containmentMeasures', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('rootCause')}</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.rootCause} onChange={e => set('rootCause', e.target.value)} />
          </div>
          {initial && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('statusLabel')}</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => set('status', e.target.value)}>
                {Object.entries(BREACH_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="p-6 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>{tCommon('cancel')}</Button>
          <Button onClick={handleSave}>{initial ? tCommon('save') : t('registerBreach')}</Button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: ROPA ─────────────────────────────────────────────────
function RopaTab() {
  const t = useTranslations('gdpr');
  const tCommon = useTranslations('common');
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const LEGAL_BASIS_LABELS: Record<string, string> = {
    CONSENT:              t('legalBasisValues.CONSENT'),
    CONTRACT:             t('legalBasisValues.CONTRACT'),
    LEGAL_OBLIGATION:     t('legalBasisValues.LEGAL_OBLIGATION'),
    VITAL_INTERESTS:      t('legalBasisValues.VITAL_INTERESTS'),
    PUBLIC_TASK:          t('legalBasisValues.PUBLIC_TASK'),
    LEGITIMATE_INTERESTS: t('legalBasisValues.LEGITIMATE_INTERESTS'),
  };

  const ACTIVITY_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    ACTIVE:       { bg: 'bg-green-100', text: 'text-green-800', label: t('activityStatus.ACTIVE') },
    INACTIVE:     { bg: 'bg-gray-100',  text: 'text-gray-700',  label: t('activityStatus.INACTIVE') },
    UNDER_REVIEW: { bg: 'bg-yellow-100',text: 'text-yellow-800',label: t('activityStatus.UNDER_REVIEW') },
  };

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['gdpr', 'activities'],
    queryFn: () => gdprApi.activities.list().then(r => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['gdpr', 'activities'] });

  const createMutation = useMutation({
    mutationFn: (data: any) => gdprApi.activities.create(data),
    onSuccess: () => { invalidate(); setShowCreate(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => gdprApi.activities.update(id, data),
    onSuccess: () => { invalidate(); setEditing(null); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => gdprApi.activities.remove(id),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{t('ropaDescription')}</p>
        <Button onClick={() => setShowCreate(true)} className="gap-2" size="sm">
          <Plus className="w-4 h-4" /> {t('addActivity')}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">{t('loading')}</div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12">
          <Database className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{t('noActivities')}</p>
          <p className="text-gray-400 text-sm mt-1">{t('noActivitiesDesc')}</p>
          <Button className="mt-4 gap-2" size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> {t('addActivity')}
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">{t('colName')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('colLegalBasis')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('colSubjects')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('colRetention')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('colStatus')}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activities.map((a: any) => {
                const s = ACTIVITY_STATUS_STYLES[a.status] ?? ACTIVITY_STATUS_STYLES.ACTIVE;
                return (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{a.name}</div>
                      <div className="text-xs text-gray-400 truncate max-w-xs">{a.purpose}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{LEGAL_BASIS_LABELS[a.legalBasis] ?? a.legalBasis}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {a.dataSubjects?.length > 0 ? a.dataSubjects.slice(0, 2).join(', ') + (a.dataSubjects.length > 2 ? '...' : '') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{a.retentionPeriod}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.bg} ${s.text}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditing(a)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { if (confirm(t('deleteActivityConfirm') as string)) removeMutation.mutate(a.id); }}
                          className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <ActivityModal onClose={() => setShowCreate(false)} onSave={(data) => createMutation.mutate(data)} />}
      {editing && <ActivityModal initial={editing} onClose={() => setEditing(null)} onSave={(data) => updateMutation.mutate({ id: editing.id, data })} />}
    </div>
  );
}

// ── Tab: DPIAs ────────────────────────────────────────────────
function DpiasTab() {
  const t = useTranslations('gdpr');
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const DPIA_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    DRAFT:       { bg: 'bg-gray-100',   text: 'text-gray-700',   label: t('dpiaStatus.DRAFT') },
    IN_PROGRESS: { bg: 'bg-blue-100',   text: 'text-blue-800',   label: t('dpiaStatus.IN_PROGRESS') },
    COMPLETED:   { bg: 'bg-green-100',  text: 'text-green-800',  label: t('dpiaStatus.COMPLETED') },
    APPROVED:    { bg: 'bg-purple-100', text: 'text-purple-800', label: t('dpiaStatus.APPROVED') },
  };

  const { data: dpias = [], isLoading } = useQuery({
    queryKey: ['gdpr', 'dpias'],
    queryFn: () => gdprApi.dpias.list().then(r => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['gdpr', 'dpias'] });

  const createMutation = useMutation({
    mutationFn: (data: any) => gdprApi.dpias.create(data),
    onSuccess: () => { invalidate(); setShowCreate(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => gdprApi.dpias.update(id, data),
    onSuccess: () => { invalidate(); setEditing(null); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => gdprApi.dpias.remove(id),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{t('dpiaDescription')}</p>
        <Button onClick={() => setShowCreate(true)} className="gap-2" size="sm">
          <Plus className="w-4 h-4" /> {t('addDpia')}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">{t('loading')}</div>
      ) : dpias.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{t('noDpias')}</p>
          <p className="text-gray-400 text-sm mt-1">{t('noDpiasDesc')}</p>
          <Button className="mt-4 gap-2" size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> {t('addDpia')}
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">{t('colTitle')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('colStatus')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('colOutcome')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('colOwner')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('colDate')}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {dpias.map((d: any) => {
                const s = DPIA_STATUS_STYLES[d.status] ?? DPIA_STATUS_STYLES.DRAFT;
                return (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{d.title}</div>
                      <div className="text-xs text-gray-400 truncate max-w-xs">{d.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.bg} ${s.text}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{d.outcome ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {d.owner ? `${d.owner.firstName} ${d.owner.lastName}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {format(new Date(d.createdAt), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditing(d)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { if (confirm(t('deleteDpiaConfirm') as string)) removeMutation.mutate(d.id); }}
                          className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <DpiaModal onClose={() => setShowCreate(false)} onSave={(data) => createMutation.mutate(data)} />}
      {editing && <DpiaModal initial={editing} onClose={() => setEditing(null)} onSave={(data) => updateMutation.mutate({ id: editing.id, data })} />}
    </div>
  );
}

// ── Tab: Breaches ─────────────────────────────────────────────
function BreachesTab() {
  const t = useTranslations('gdpr');
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const BREACH_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    IDENTIFIED: { bg: 'bg-red-100',    text: 'text-red-800',    label: t('breachStatus.IDENTIFIED') },
    ASSESSING:  { bg: 'bg-orange-100', text: 'text-orange-800', label: t('breachStatus.ASSESSING') },
    NOTIFIED:   { bg: 'bg-blue-100',   text: 'text-blue-800',   label: t('breachStatus.NOTIFIED') },
    CLOSED:     { bg: 'bg-gray-100',   text: 'text-gray-700',   label: t('breachStatus.CLOSED') },
  };

  const BREACH_SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    LOW:      { bg: 'bg-gray-100',   text: 'text-gray-700',   label: t('breachSeverity.LOW') },
    MEDIUM:   { bg: 'bg-yellow-100', text: 'text-yellow-800', label: t('breachSeverity.MEDIUM') },
    HIGH:     { bg: 'bg-orange-100', text: 'text-orange-800', label: t('breachSeverity.HIGH') },
    CRITICAL: { bg: 'bg-red-100',    text: 'text-red-800',    label: t('breachSeverity.CRITICAL') },
  };

  const { data: breaches = [], isLoading } = useQuery({
    queryKey: ['gdpr', 'breaches'],
    queryFn: () => gdprApi.breaches.list().then(r => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['gdpr', 'breaches'] });

  const createMutation = useMutation({
    mutationFn: (data: any) => gdprApi.breaches.create(data),
    onSuccess: () => { invalidate(); setShowCreate(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => gdprApi.breaches.update(id, data),
    onSuccess: () => { invalidate(); setEditing(null); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => gdprApi.breaches.remove(id),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{t('breachesDescription')}</p>
        <Button onClick={() => setShowCreate(true)} className="gap-2" size="sm">
          <Plus className="w-4 h-4" /> {t('addBreach')}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">{t('loading')}</div>
      ) : breaches.length === 0 ? (
        <div className="text-center py-12">
          <AlertOctagon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{t('noBreaches')}</p>
          <p className="text-gray-400 text-sm mt-1">{t('noBreachesDesc')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">{t('colTitle')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('colSeverity')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('colStatus')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('colSubjects')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('colDiscovered')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('colNotifCnpd')}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {breaches.map((b: any) => {
                const sev = BREACH_SEVERITY_STYLES[b.severity] ?? BREACH_SEVERITY_STYLES.MEDIUM;
                const st = BREACH_STATUS_STYLES[b.status] ?? BREACH_STATUS_STYLES.IDENTIFIED;
                const discovered = new Date(b.discoveredAt);
                const notified = b.supervisoryAuthorityNotifiedAt ? new Date(b.supervisoryAuthorityNotifiedAt) : null;
                const hoursElapsed = Math.round((Date.now() - discovered.getTime()) / 3_600_000);
                const over72h = hoursElapsed > 72 && b.status !== 'NOTIFIED' && b.status !== 'CLOSED';
                return (
                  <tr key={b.id} className={`hover:bg-gray-50 transition-colors ${over72h ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{b.title}</div>
                      {over72h && <div className="text-xs text-red-600 font-medium mt-0.5">⚠ {t('over72h', { h: hoursElapsed })}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sev.bg} ${sev.text}`}>{sev.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.bg} ${st.text}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{b.affectedDataSubjects ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{format(discovered, 'dd/MM/yyyy HH:mm')}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {notified ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {format(notified, 'dd/MM HH:mm')}
                        </span>
                      ) : (
                        <span className={over72h ? 'text-red-600 font-medium' : 'text-gray-400'}>
                          {over72h ? t('notified') : t('pending')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditing(b)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { if (confirm(t('deleteBreachConfirm') as string)) removeMutation.mutate(b.id); }}
                          className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <BreachModal onClose={() => setShowCreate(false)} onSave={(data) => createMutation.mutate(data)} />}
      {editing && <BreachModal initial={editing} onClose={() => setEditing(null)} onSave={(data) => updateMutation.mutate({ id: editing.id, data })} />}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function GdprPage() {
  const t = useTranslations('gdpr');
  const [activeTab, setActiveTab] = useState('ropa');

  const TABS = [
    { id: 'ropa',     label: t('tabRopa'),     icon: Database },
    { id: 'dpias',    label: t('tabDpias'),    icon: ClipboardList },
    { id: 'breaches', label: t('tabBreaches'), icon: AlertOctagon },
  ];

  const { data: stats } = useQuery({
    queryKey: ['gdpr', 'dashboard'],
    queryFn: () => gdprApi.dashboard().then(r => r.data),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-600" /> {t('title')}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Dashboard stats */}
      <GdprDashboard stats={stats} />

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="pt-4">
          {activeTab === 'ropa'     && <RopaTab />}
          {activeTab === 'dpias'    && <DpiasTab />}
          {activeTab === 'breaches' && <BreachesTab />}
        </div>
      </div>
    </div>
  );
}
