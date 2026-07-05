'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, frameworksApi } from '@/lib/api';
import { Plus, Search, FolderOpen, Calendar, LayoutGrid, BarChart2, Loader2 } from 'lucide-react';
import { cn, formatDate, getStatusColor, cleanFormData } from '@/lib/utils';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { GanttChart, type GanttItem } from '@/components/gantt/GanttChart';
import { RagBadge, RagEditor } from '@/components/rag/rag-badge';

// Status → Gantt bar colour
const PROJECT_COLORS: Record<string, string> = {
  DRAFT:     'bg-gray-400',
  ACTIVE:    'bg-blue-500',
  PAUSED:    'bg-amber-500',
  COMPLETED: 'bg-green-500',
  ARCHIVED:  'bg-gray-300',
};

function projectsToGanttItems(projects: any[]): GanttItem[] {
  return projects.map(p => {
    const start = p.startDate ? new Date(p.startDate) : new Date(p.createdAt);
    const endRaw = p.targetDate ? new Date(p.targetDate) : null;
    const end   = endRaw ?? new Date(start.getTime() + 90 * 86400000);
    // Ensure end > start by at least 1 day
    const safeEnd = end > start ? end : new Date(start.getTime() + 86400000);
    return {
      id:       p.id,
      name:     p.name,
      subtitle: p.framework?.name,
      start,
      end:      safeEnd,
      progress: p.complianceScore ?? 0,
      color:    PROJECT_COLORS[p.status] ?? 'bg-blue-500',
      href:     `/projects/${p.id}`,
    };
  });
}

function ProjectCard({ project }: { project: any }) {
  const t = useTranslations('projects');
  const score = project.complianceScore ?? 0;
  return (
    <Link href={`/projects/${project.id}`} className="block">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all hover:border-primary/30">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{project.framework?.name}</p>
          </div>
          <div className="ml-2 flex flex-col items-end gap-1">
            <span className={cn('text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap', getStatusColor(project.status))}>
              {project.status}
            </span>
            <RagBadge status={project.ragStatus} size="xs" />
          </div>
        </div>

        {/* Compliance score bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{t('cardCompliance')}</span>
            <span className="font-medium">{Math.round(score)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={cn('h-1.5 rounded-full', score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500')}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: t('cardTasks'),    value: project._count?.tasks    ?? 0 },
            { label: t('cardRisks'),    value: project._count?.risks    ?? 0 },
            { label: t('cardEvidence'), value: project._count?.evidences ?? 0 },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-lg p-2">
              <p className="text-base font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {project.targetDate && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            {t('cardTarget')} {formatDate(project.targetDate)}
          </div>
        )}
      </div>
    </Link>
  );
}

function NewProjectModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');
  const qc = useQueryClient();
  const { data: frameworks } = useQuery({
    queryKey: ['frameworks'],
    queryFn: () => frameworksApi.list().then(r => r.data),
  });

  const { register, handleSubmit, formState: { isSubmitting } } = useForm();

  const createMutation = useMutation({
    mutationFn: (data: any) => projectsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{t('newProjectFull')}</h3>
        <form onSubmit={handleSubmit(d => createMutation.mutate(cleanFormData(d)))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectName')} *</label>
            <input {...register('name', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none" placeholder={t('projectNamePlaceholder') as string} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('framework')} *</label>
            <select {...register('frameworkId', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
              <option value="">{t('selectFramework')}</option>
              {frameworks?.map((fw: any) => (
                <option key={fw.id} value={fw.id}>{fw.name} ({fw.version})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('description')}</label>
            <textarea {...register('description')} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none" placeholder={t('descriptionPlaceholder') as string} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('startDate')}</label>
              <input {...register('startDate')} type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('targetDate')}</label>
              <input {...register('targetDate')} type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>
          {createMutation.isError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {t('createError')}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">{tCommon('cancel')}</button>
            <button type="submit" disabled={isSubmitting || createMutation.isPending} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {tCommon('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type ViewMode = 'cards' | 'gantt';

export default function ProjectsPage() {
  const t = useTranslations('projects');
  const [search,  setSearch]  = useState('');
  const [view,    setView]    = useState<ViewMode>('cards');
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list({ limit: 100 }).then(r => r.data),
  });

  const projects = useMemo(() =>
    (data?.data || []).filter((p: any) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.framework?.name.toLowerCase().includes(search.toLowerCase()),
    ), [data, search]);

  const ganttItems = useMemo(() => projectsToGanttItems(projects), [projects]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder') as string}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
          <button
            onClick={() => setView('cards')}
            title={t('viewCards') as string}
            className={cn('p-2.5 transition-colors', view === 'cards' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50')}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('gantt')}
            title={t('viewGantt') as string}
            className={cn('p-2.5 transition-colors', view === 'gantt' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50')}
          >
            <BarChart2 className="w-4 h-4" />
          </button>
        </div>

        {/* New project */}
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> {t('newProject')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: t('statTotal'),     value: data?.total ?? 0 },
          { label: t('statActive'),    value: (data?.data || []).filter((p: any) => p.status === 'ACTIVE').length },
          { label: t('statCompleted'), value: (data?.data || []).filter((p: any) => p.status === 'COMPLETED').length },
          { label: t('statDraft'),     value: (data?.data || []).filter((p: any) => p.status === 'DRAFT').length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Content area */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">{t('noProjects')}</p>
          <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" /> {t('createFirst')}
          </button>
        </div>
      ) : view === 'gantt' ? (
        <GanttChart
          items={ganttItems}
          emptyMessage={t('ganttNoDate') as string}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p: any) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
