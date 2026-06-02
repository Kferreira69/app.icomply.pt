'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { auditsApi, projectsApi } from '@/lib/api';
import { Plus, Search, ClipboardList, Loader2, Calendar, ChevronRight } from 'lucide-react';
import { cn, formatDate, getStatusColor, cleanFormData } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  PLANNED: 'bg-blue-50 text-blue-700',
  IN_PROGRESS: 'bg-yellow-50 text-yellow-700',
  COMPLETED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
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

export default function AuditsPage() {
  const t = useTranslations('audits');
  const tCommon = useTranslations('common');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showNew, setShowNew] = useState(false);

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

  const audits = (data?.data || []).filter((a: any) =>
    !search || a.title.toLowerCase().includes(search.toLowerCase()),
  );

  const summary = {
    planned: audits.filter((a: any) => a.status === 'PLANNED').length,
    inProgress: audits.filter((a: any) => a.status === 'IN_PROGRESS').length,
    completed: audits.filter((a: any) => a.status === 'COMPLETED').length,
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
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
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
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
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> {t('newAudit')}
        </button>
      </div>

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

      {/* Table */}
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

      {showNew && <NewAuditModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
