'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { auditsApi, projectsApi } from '@/lib/api';
import { Plus, Search, ClipboardList, Loader2, Calendar, ChevronRight, Pencil, Download } from 'lucide-react';
import { usePdfExport } from '@/hooks/usePdfExport';
import { cn, formatDate, getStatusColor, cleanFormData } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { ModuleGuard } from '@/components/module-guard';

const STATUS_COLORS: Record<string, string> = {
  PLANNED: 'bg-blue-50 text-blue-700',
  IN_PROGRESS: 'bg-yellow-50 text-yellow-700',
  COMPLETED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const FINDING_SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  MAJOR: 'bg-orange-100 text-orange-700',
  MINOR: 'bg-yellow-100 text-yellow-700',
  OBSERVATION: 'bg-gray-100 text-gray-600',
};

const FINDING_STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-green-100 text-green-700',
  ACCEPTED: 'bg-purple-100 text-purple-700',
  CLOSED: 'bg-gray-100 text-gray-500',
};

const FINDING_SEVERITY_LABELS: Record<string, string> = {
  CRITICAL: 'Crítico',
  MAJOR: 'Major',
  MINOR: 'Minor',
  OBSERVATION: 'Observação',
};

const FINDING_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em curso',
  RESOLVED: 'Resolvido',
  ACCEPTED: 'Aceite',
  CLOSED: 'Fechado',
};

function NewAuditModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations('audits');
  const tCommon = useTranslations('common');
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const AUDIT_TYPE_LABELS: Record<string, string> = {
    INTERNAL: t('type.INTERNAL'),
    EXTERNAL: t('type.EXTERNAL'),
    CERTIFICATION: t('type.CERTIFICATION'),
    SURVEILLANCE: t('type.SURVEILLANCE'),
  };

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list({ limit: 100 }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => auditsApi.create(cleanFormData(data)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['audits'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{t('newAudit')}</h3>
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tCommon('name')} *</label>
            <input
              {...register('title', { required: true })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              placeholder="Ex: Auditoria ISO 27001 Q1 2025"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('colType')}</label>
              <select {...register('type')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                {Object.entries(AUDIT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tCommon('name')}</label>
              <select {...register('projectId')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                <option value="">{t('noneProject')}</option>
                {projects?.data?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('startDate')}</label>
              <input {...register('startDate')} type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('endDate')}</label>
              <input {...register('endDate')} type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('colLeadAuditor')}</label>
            <input
              {...register('leadAuditor')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              placeholder={t('leadAuditorPlaceholder') as string}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('scope')}</label>
            <textarea
              {...register('scope')}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
              placeholder={t('scopePlaceholder') as string}
            />
          </div>
          {createMutation.isError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {t('createError')}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">{tCommon('cancel')}</button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('newAudit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface FindingModalProps {
  audits: any[];
  finding?: any;
  onClose: () => void;
}

function FindingModal({ audits, finding, onClose }: FindingModalProps) {
  const qc = useQueryClient();
  const isEdit = !!finding;

  const { register, handleSubmit } = useForm({
    defaultValues: isEdit ? {
      auditId: finding.auditId,
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      status: finding.status,
      requirement: finding.requirement ?? '',
      dueDate: finding.dueDate ? finding.dueDate.slice(0, 10) : '',
    } : {
      auditId: audits[0]?.id ?? '',
      severity: 'MINOR',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      const { auditId, ...rest } = data;
      return auditsApi.createFinding(auditId, cleanFormData(rest));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['findings'] }); onClose(); },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => {
      const { auditId, ...rest } = data;
      return auditsApi.updateFinding(finding.id, cleanFormData(rest));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['findings'] }); onClose(); },
  });

  const mutation = isEdit ? updateMutation : createMutation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {isEdit ? 'Editar Finding' : 'Novo Finding'}
          </h3>
          <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auditoria *</label>
              <select
                {...register('auditId', { required: true })}
                disabled={isEdit}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none disabled:bg-gray-50"
              >
                <option value="">Selecionar auditoria...</option>
                {audits.map((a: any) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <input
                {...register('title', { required: true })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder="Ex: Ausência de política de controlo de acesso"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                placeholder="Descrição detalhada do finding..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severidade</label>
                <select
                  {...register('severity')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                >
                  {Object.entries(FINDING_SEVERITY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              {isEdit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    {...register('status')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    {Object.entries(FINDING_STATUS_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recomendação</label>
              <textarea
                {...register('requirement')}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                placeholder="Ação recomendada para resolução..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data limite</label>
              <input
                {...register('dueDate')}
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            {mutation.isError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                Erro ao guardar finding. Tente novamente.
              </p>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEdit ? 'Guardar' : 'Criar Finding'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AuditsPage() {
  const t = useTranslations('audits');
  const tCommon = useTranslations('common');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [tab, setTab] = useState<'audits' | 'findings'>('audits');
  const [showFindingModal, setShowFindingModal] = useState(false);
  const [editFinding, setEditFinding] = useState<any>(null);
  const { exportAudits } = usePdfExport();

  const AUDIT_TYPE_LABELS: Record<string, string> = {
    INTERNAL: t('type.INTERNAL'),
    EXTERNAL: t('type.EXTERNAL'),
    CERTIFICATION: t('type.CERTIFICATION'),
    SURVEILLANCE: t('type.SURVEILLANCE'),
  };

  const STATUS_LABELS: Record<string, string> = {
    PLANNED: t('status.PLANNED'),
    IN_PROGRESS: t('status.IN_PROGRESS'),
    COMPLETED: t('status.COMPLETED'),
    CANCELLED: t('status.CANCELLED'),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['audits', statusFilter],
    queryFn: () => auditsApi.list({ status: statusFilter || undefined, limit: 50 }).then(r => r.data),
  });

  const { data: findingsData, isLoading: findingsLoading } = useQuery({
    queryKey: ['findings'],
    queryFn: () => auditsApi.listFindings().then(r => r.data),
  });

  const audits = (data?.data || []).filter((a: any) =>
    !search || a.title.toLowerCase().includes(search.toLowerCase()),
  );

  const findings: any[] = Array.isArray(findingsData) ? findingsData : [];

  const summary = {
    planned: audits.filter((a: any) => a.status === 'PLANNED').length,
    inProgress: audits.filter((a: any) => a.status === 'IN_PROGRESS').length,
    completed: audits.filter((a: any) => a.status === 'COMPLETED').length,
  };

  const findingsSummary = {
    total: findings.length,
    criticalOpen: findings.filter((f: any) => f.severity === 'CRITICAL' && f.status === 'OPEN').length,
    majorOpen: findings.filter((f: any) => f.severity === 'MAJOR' && f.status === 'OPEN').length,
    resolved: findings.filter((f: any) => f.status === 'RESOLVED').length,
  };

  const allAudits: any[] = data?.data ?? [];

  return (
    <ModuleGuard moduleKey="audits">
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className={cn('grid gap-4', tab === 'findings' ? 'grid-cols-4' : 'grid-cols-3')}>
        {tab === 'audits' && [
          { label: t('summaryPlanned'), value: summary.planned, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: t('summaryInProgress'), value: summary.inProgress, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: t('summaryCompleted'), value: summary.completed, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', c.bg)}>
              <ClipboardList className={cn('w-5 h-5', c.color)} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{c.value}</p>
              <p className="text-xs text-gray-500">{c.label}</p>
            </div>
          </div>
        ))}

        {tab === 'findings' && [
          { label: 'Total Findings', value: findingsSummary.total, color: 'text-gray-600', bg: 'bg-gray-100' },
          { label: 'Críticos em Aberto', value: findingsSummary.criticalOpen, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Major em Aberto', value: findingsSummary.majorOpen, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Resolvidos', value: findingsSummary.resolved, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', c.bg)}>
              <ClipboardList className={cn('w-5 h-5', c.color)} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{c.value}</p>
              <p className="text-xs text-gray-500">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setTab('audits')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              tab === 'audits' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <ClipboardList className="w-4 h-4" />
            Auditorias
          </button>
          <button
            onClick={() => setTab('findings')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              tab === 'findings' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <ClipboardList className="w-4 h-4" />
            Findings
          </button>
        </div>

        <div className="flex items-center gap-3 flex-1 justify-end">
          {tab === 'audits' && (
            <>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('searchPlaceholder') as string}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">{t('allStatuses')}</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button
                onClick={() => exportAudits(audits)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 bg-white transition-colors"
              >
                <Download className="w-4 h-4" />PDF
              </button>
              <button
                onClick={() => setShowNew(true)}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> {t('newAudit')}
              </button>
            </>
          )}
          {tab === 'findings' && (
            <button
              onClick={() => { setEditFinding(null); setShowFindingModal(true); }}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Novo Finding
            </button>
          )}
        </div>
      </div>

      {/* Audits Tab */}
      {tab === 'audits' && (
        <>
          {/* Audit Timeline — upcoming 90 days */}
          {(() => {
            const upcoming = audits.filter((a: any) => {
              const end = a.endDate ? new Date(a.endDate) : a.startDate ? new Date(a.startDate) : null;
              const start = a.startDate ? new Date(a.startDate) : null;
              const now = new Date();
              const in90 = new Date(now.getTime() + 90 * 86400000);
              return (start && start <= in90) || (end && end >= now && end <= in90);
            }).slice(0, 5);
            if (!upcoming.length) return null;
            return (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" /> Próximas Auditorias (90 dias)
                </h3>
                <div className="space-y-2">
                  {upcoming.map((a: any) => {
                    const now = new Date();
                    const start = a.startDate ? new Date(a.startDate) : null;
                    const end = a.endDate ? new Date(a.endDate) : null;
                    const daysUntil = start ? Math.ceil((start.getTime() - now.getTime()) / 86400000) : null;
                    return (
                      <div key={a.id} className="flex items-center gap-3">
                        <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', STATUS_COLORS[a.status]?.includes('blue') ? 'bg-blue-500' : STATUS_COLORS[a.status]?.includes('yellow') ? 'bg-yellow-500' : 'bg-green-500')} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
                            <span className={cn('text-xs px-1.5 py-0.5 rounded-full flex-shrink-0', STATUS_COLORS[a.status])}>
                              {STATUS_LABELS[a.status] || a.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">
                            {start ? formatDate(start.toISOString()) : '—'}{end ? ` → ${formatDate(end.toISOString())}` : ''}
                            {a.leadAuditor && <> · {a.leadAuditor}</>}
                          </p>
                        </div>
                        {daysUntil !== null && daysUntil >= 0 && (
                          <span className={cn('text-xs font-medium px-2 py-1 rounded-lg flex-shrink-0', daysUntil <= 7 ? 'bg-red-50 text-red-600' : daysUntil <= 14 ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-600')}>
                            {daysUntil === 0 ? 'Hoje' : `${daysUntil}d`}
                          </span>
                        )}
                        <Link href={`/audits/${a.id}`} className="text-gray-300 hover:text-primary flex-shrink-0">
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Audits Table */}
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {[t('colAudit'), t('colType'), t('colStatus'), t('colPeriod'), t('colLeadAuditor'), t('colFindings'), ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {audits.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400">
                        <ClipboardList className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">{t('noAudits')}</p>
                      </td>
                    </tr>
                  ) : audits.map((a: any) => (
                    <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{a.title}</p>
                          {a.project && <p className="text-xs text-gray-400">{a.project.name}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600">{AUDIT_TYPE_LABELS[a.type] || a.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-1 rounded-full font-medium', STATUS_COLORS[a.status])}>
                          {STATUS_LABELS[a.status] || a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3.5 h-3.5" />
                          {a.startDate ? formatDate(a.startDate) : '—'}
                          {a.endDate && <> → {formatDate(a.endDate)}</>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {a.leadAuditor || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {a._count?.findings > 0 ? (
                          <span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-medium">
                            {a._count.findings === 1 ? t('findingCount', { n: a._count.findings }) : t('findingCountPlural', { n: a._count.findings })}
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/audits/${a.id}`} className="text-primary hover:text-primary/80">
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
                {audits.length === 1 ? t('auditCount', { n: audits.length, total: data?.total ?? 0 }) : t('auditCountPlural', { n: audits.length, total: data?.total ?? 0 })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Findings Tab */}
      {tab === 'findings' && (
        <>
          {findingsLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Auditoria', 'Título', 'Severidade', 'Estado', 'Data Limite', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {findings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400">
                        <ClipboardList className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Nenhum finding registado.</p>
                      </td>
                    </tr>
                  ) : findings.map((f: any) => (
                    <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-500 truncate max-w-[160px]">{f.audit?.title ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{f.title}</p>
                        {f.description && (
                          <p className="text-xs text-gray-400 truncate max-w-[220px]">{f.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-1 rounded-full font-medium', FINDING_SEVERITY_COLORS[f.severity] ?? 'bg-gray-100 text-gray-600')}>
                          {FINDING_SEVERITY_LABELS[f.severity] ?? f.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-1 rounded-full font-medium', FINDING_STATUS_COLORS[f.status] ?? 'bg-gray-100 text-gray-600')}>
                          {FINDING_STATUS_LABELS[f.status] ?? f.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {f.dueDate ? (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(f.dueDate)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setEditFinding(f); setShowFindingModal(true); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
                {findings.length} finding{findings.length !== 1 ? 's' : ''} no total
              </div>
            </div>
          )}
        </>
      )}

      {showNew && <NewAuditModal onClose={() => setShowNew(false)} />}

      {showFindingModal && (
        <FindingModal
          audits={allAudits}
          finding={editFinding}
          onClose={() => { setShowFindingModal(false); setEditFinding(null); }}
        />
      )}
    </div>
    </ModuleGuard>
  );
}
