'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { RagBadge, RagEditor, RAG_META, type RagStatus } from '@/components/rag/rag-badge';
import {
  LayoutGrid, List, Calendar, TrendingUp, AlertTriangle,
  CheckCircle2, Circle, FolderOpen, Loader2,
} from 'lucide-react';
import Link from 'next/link';

// ─── Summary strip ────────────────────────────────────────────────────────────
function PortfolioSummary({ projects }: { projects: any[] }) {
  const counts = {
    GREEN: projects.filter(p => p.ragStatus === 'GREEN').length,
    AMBER: projects.filter(p => p.ragStatus === 'AMBER').length,
    RED:   projects.filter(p => p.ragStatus === 'RED').length,
    none:  projects.filter(p => !p.ragStatus).length,
  };
  const avgScore = projects.length
    ? Math.round(projects.reduce((s, p) => s + (p.complianceScore ?? 0), 0) / projects.length)
    : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 col-span-2 sm:col-span-1">
        <p className="text-xs text-gray-500 mb-1">Projetos</p>
        <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
      </div>
      {(['GREEN', 'AMBER', 'RED'] as RagStatus[]).map(s => (
        <div key={s} className={cn('rounded-xl border-2 shadow-sm p-4', RAG_META[s].bg, RAG_META[s].border)}>
          <p className={cn('text-xs font-medium mb-1', RAG_META[s].color)}>{RAG_META[s].label}</p>
          <p className={cn('text-2xl font-bold', RAG_META[s].color)}>{counts[s]}</p>
        </div>
      ))}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs text-gray-500 mb-1">Score médio</p>
        <p className={cn('text-2xl font-bold', avgScore >= 70 ? 'text-green-600' : avgScore >= 40 ? 'text-amber-500' : 'text-red-500')}>
          {avgScore}%
        </p>
      </div>
    </div>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────────
function PortfolioCard({ project }: { project: any }) {
  const score = project.complianceScore ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
      {/* RAG colour strip */}
      <div className={cn('h-1.5', project.ragStatus === 'GREEN' ? 'bg-green-500' : project.ragStatus === 'AMBER' ? 'bg-amber-400' : project.ragStatus === 'RED' ? 'bg-red-500' : 'bg-gray-200')} />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FolderOpen className="w-4.5 h-4.5 w-[18px] h-[18px] text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <Link href={`/projects/${project.id}`} className="font-semibold text-gray-900 hover:text-primary line-clamp-1 block">
              {project.name}
            </Link>
            <p className="text-xs text-gray-500 truncate">{project.framework?.name}</p>
          </div>
          <RagEditor
            entityPath={`/projects/${project.id}`}
            queryKeys={[['projects'], ['portfolio']]}
            currentStatus={project.ragStatus}
            currentNarrative={project.statusNarrative}
          />
        </div>

        {/* Narrative */}
        {project.statusNarrative && (
          <p className="text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-2 line-clamp-2 italic">
            "{project.statusNarrative}"
          </p>
        )}

        {/* Score bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Conformidade</span>
            <span className="font-semibold">{Math.round(score)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={cn('h-2 rounded-full transition-all', score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-400' : 'bg-red-400')}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span>{project._count?.tasks ?? 0} tarefas</span>
            <span>{project._count?.risks ?? 0} riscos</span>
          </div>
          {project.targetDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(project.targetDate)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────
function PortfolioRow({ project }: { project: any }) {
  return (
    <tr className="hover:bg-gray-50/50 transition-colors border-b border-gray-50">
      <td className="px-4 py-3">
        <Link href={`/projects/${project.id}`} className="font-medium text-gray-800 hover:text-primary">
          {project.name}
        </Link>
        <p className="text-xs text-gray-400 truncate">{project.framework?.name}</p>
      </td>
      <td className="px-4 py-3">
        <RagEditor
          entityPath={`/projects/${project.id}`}
          queryKeys={[['projects'], ['portfolio']]}
          currentStatus={project.ragStatus}
          currentNarrative={project.statusNarrative}
        />
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
        <p className="truncate italic">{project.statusNarrative || <span className="text-gray-300">—</span>}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-20 bg-gray-100 rounded-full h-1.5">
            <div
              className={cn('h-1.5 rounded-full', (project.complianceScore ?? 0) >= 80 ? 'bg-green-500' : (project.complianceScore ?? 0) >= 60 ? 'bg-amber-400' : 'bg-red-400')}
              style={{ width: `${project.complianceScore ?? 0}%` }}
            />
          </div>
          <span className="text-xs text-gray-600 tabular-nums">{Math.round(project.complianceScore ?? 0)}%</span>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
        {project.targetDate ? formatDate(project.targetDate) : '—'}
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filterRag, setFilterRag] = useState<RagStatus | 'ALL'>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => projectsApi.list({ limit: 100 }).then(r => r.data?.data ?? []),
  });

  const projects: any[] = (data ?? []).filter((p: any) =>
    filterRag === 'ALL' ? true : p.ragStatus === filterRag,
  );

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vista executiva de todos os projetos GRC</p>
        </div>

        <div className="flex items-center gap-2">
          {/* RAG filter */}
          {(['ALL', 'GREEN', 'AMBER', 'RED'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterRag(s)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
                filterRag === s
                  ? s === 'ALL' ? 'bg-gray-900 text-white' : `${RAG_META[s as RagStatus].bg} ${RAG_META[s as RagStatus].color} border ${RAG_META[s as RagStatus].border}`
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
              )}
            >
              {s === 'ALL' ? 'Todos' : RAG_META[s as RagStatus].label}
            </button>
          ))}

          <div className="w-px h-5 bg-gray-200" />

          {/* View toggle */}
          <button onClick={() => setView('grid')} className={cn('p-2 rounded-lg', view === 'grid' ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-100')}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setView('list')} className={cn('p-2 rounded-lg', view === 'list' ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-100')}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-gray-300" /></div>
      ) : data?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="w-14 h-14 text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">Sem projetos</p>
        </div>
      ) : (
        <>
          <PortfolioSummary projects={data ?? []} />

          {view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projects.map(p => <PortfolioCard key={p.id} project={p} />)}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Projeto', 'RAG', 'Narrativa', 'Score', 'Data alvo'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>{projects.map(p => <PortfolioRow key={p.id} project={p} />)}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
