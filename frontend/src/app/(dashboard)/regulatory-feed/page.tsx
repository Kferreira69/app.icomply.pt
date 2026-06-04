'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { regulatoryFeedApi } from '@/lib/api';
import { Rss, CheckCheck, ExternalLink, AlertTriangle, Info, Zap, Loader2, Filter } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

const SOURCE_LABELS: Record<string, string> = { EU_OJ: 'EUR-Lex', ENISA: 'ENISA', EBA: 'EBA', EIOPA: 'EIOPA', ESMA: 'ESMA', CNCS: 'CNCS (PT)', CNPD: 'CNPD (PT)', BSI: 'BSI (DE)', ANSSI: 'ANSSI (FR)', OTHER: 'Outro' };
const SOURCE_COLORS: Record<string, string> = { EU_OJ: 'bg-blue-100 text-blue-700', ENISA: 'bg-violet-100 text-violet-700', EBA: 'bg-green-100 text-green-700', CNCS: 'bg-red-100 text-red-700', CNPD: 'bg-red-100 text-red-700', OTHER: 'bg-gray-100 text-gray-600' };
const IMPORTANCE_ICON: Record<string, any> = { CRITICAL: AlertTriangle, HIGH: Zap, MEDIUM: Info, LOW: Info };
const IMPORTANCE_COLOR: Record<string, string> = { CRITICAL: 'text-red-600', HIGH: 'text-orange-500', MEDIUM: 'text-blue-500', LOW: 'text-gray-400' };

export default function RegulatoryFeedPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'HIGH' | 'CRITICAL'>('UNREAD');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['regulatory-feed', filter],
    queryFn: () => regulatoryFeedApi.list(filter === 'UNREAD' ? { isRead: 'false' } : filter === 'HIGH' ? { importance: 'HIGH' } : filter === 'CRITICAL' ? { importance: 'CRITICAL' } : {}).then(r => r.data),
  });

  const { data: countData } = useQuery({ queryKey: ['regulatory-feed-count'], queryFn: () => regulatoryFeedApi.unreadCount().then(r => r.data) });

  const markReadMutation = useMutation({ mutationFn: (id: string) => regulatoryFeedApi.markRead(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['regulatory-feed'] }); qc.invalidateQueries({ queryKey: ['regulatory-feed-count'] }); } });
  const markAllMutation  = useMutation({ mutationFn: () => regulatoryFeedApi.markAllRead(), onSuccess: () => { qc.invalidateQueries({ queryKey: ['regulatory-feed'] }); qc.invalidateQueries({ queryKey: ['regulatory-feed-count'] }); } });
  const seedMutation     = useMutation({ mutationFn: () => regulatoryFeedApi.seed(), onSuccess: () => qc.invalidateQueries({ queryKey: ['regulatory-feed'] }) });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><Rss className="w-5 h-5 text-emerald-300" /><span className="text-emerald-200 text-xs font-medium uppercase tracking-widest">Inteligência Regulatória EU</span></div>
            <h1 className="text-2xl font-bold">Regulatory Intelligence Feed</h1>
            <p className="text-emerald-200 text-sm mt-1">Atualizações EU em tempo real: EUR-Lex, ENISA, EBA, CNCS, CNPD e mais</p>
          </div>
          <div className="flex gap-2">
            {countData?.count > 0 && (
              <button onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-medium">
                <CheckCheck className="w-4 h-4" /> Marcar tudo como lido
              </button>
            )}
            {(items as any[]).length === 0 && (
              <button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} className="flex items-center gap-2 bg-white text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold">
                {seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rss className="w-4 h-4" />} Carregar feed
              </button>
            )}
          </div>
        </div>
        {countData?.count > 0 && (
          <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-sm font-medium">{countData.count} novas atualizações não lidas</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <Filter className="w-4 h-4 text-gray-400" />
        {([['UNREAD','Não lidas'], ['CRITICAL','🔴 Críticas'], ['HIGH','🟠 Importantes'], ['ALL','Todas']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k as any)}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-colors', filter === k ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300')}>
            {l}
          </button>
        ))}
      </div>

      {/* Feed items */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
      ) : (items as any[]).length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16">
          <Rss className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-gray-400 font-medium">Sem atualizações {filter !== 'ALL' ? 'com estes critérios' : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(items as any[]).map((item: any) => {
            const ImpIcon = IMPORTANCE_ICON[item.importance] || Info;
            return (
              <div key={item.id} onClick={() => !item.isRead && markReadMutation.mutate(item.id)}
                className={cn('bg-white rounded-2xl border shadow-sm p-5 transition-all cursor-pointer hover:shadow-md', item.isRead ? 'border-gray-100 opacity-75' : 'border-l-4', !item.isRead && item.importance === 'CRITICAL' ? 'border-l-red-500' : !item.isRead && item.importance === 'HIGH' ? 'border-l-orange-500' : !item.isRead ? 'border-l-blue-400' : '')}>
                <div className="flex items-start gap-4">
                  <ImpIcon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', IMPORTANCE_COLOR[item.importance])} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap mb-2">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0', SOURCE_COLORS[item.source] || SOURCE_COLORS.OTHER)}>
                        {SOURCE_LABELS[item.source] || item.source}
                      </span>
                      {item.frameworks?.map((f: string) => (
                        <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{f}</span>
                      ))}
                      {!item.isRead && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">NOVO</span>}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{item.title}</h3>
                    {item.summary && <p className="text-sm text-gray-600 line-clamp-2">{item.summary}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400">{formatDate(item.publishedAt)}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{item.jurisdiction}</span>
                      {item.sourceUrl && (
                        <a href={item.sourceUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-xs text-emerald-600 hover:underline ml-auto">
                          <ExternalLink className="w-3 h-3" /> Ver fonte
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
