'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { auditLogsApi } from '@/lib/api';
import { ScrollText, Loader2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn, formatDateTime, getInitials } from '@/lib/utils';

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-gray-100 text-gray-600',
  EXPORT: 'bg-purple-100 text-purple-700',
  USER_SUSPENDED: 'bg-red-100 text-red-700',
  USER_REACTIVATED: 'bg-green-100 text-green-700',
  USER_DELETED: 'bg-red-100 text-red-700',
};

function getActionColor(action: string): string {
  if (ACTION_COLORS[action]) return ACTION_COLORS[action];
  if (action?.includes('DELETE')) return 'bg-red-100 text-red-700';
  if (action?.includes('CREATE')) return 'bg-green-100 text-green-700';
  if (action?.includes('UPDATE')) return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-600';
}

function MetadataCell({ log }: { log: any }) {
  const [expanded, setExpanded] = useState(false);
  const payload = log.metadata || log.newValues || log.oldValues;
  if (!payload || Object.keys(payload).length === 0) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  const json = JSON.stringify(payload);
  const preview = json.length > 40 ? `${json.slice(0, 40)}…` : json;

  return (
    <button
      onClick={() => setExpanded(e => !e)}
      className="text-left"
    >
      <code className="text-xs text-gray-500 hover:text-gray-700 font-mono">
        {expanded ? (
          <pre className="whitespace-pre-wrap max-w-xs">{JSON.stringify(payload, null, 2)}</pre>
        ) : (
          preview
        )}
      </code>
    </button>
  );
}

export default function AuditLogPage() {
  const t = useTranslations('auditLogPage');
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('ALL');
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, entity, action],
    queryFn: () =>
      auditLogsApi
        .list({ page, limit, ...(entity && { entity }) })
        .then(r => r.data),
  });

  const logs = data?.data || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const actionOptions = Array.from(
    new Set(logs.map((l: any) => l.action).filter(Boolean)),
  ) as string[];

  const filteredLogs = action === 'ALL' ? logs : logs.filter((l: any) => l.action === action);

  const resetPage = () => setPage(1);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ScrollText className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-lg font-bold text-gray-900">{t('title')}</h2>
          <p className="text-sm text-gray-500">{t('subtitle')}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={entity}
            onChange={e => { setEntity(e.target.value); resetPage(); }}
            placeholder={t('entityPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <select
          value={action}
          onChange={e => { setAction(e.target.value); resetPage(); }}
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none"
        >
          <option value="ALL">{t('allActions')}</option>
          {actionOptions.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {[t('colActor'), t('colAction'), t('colEntity'), t('colDetails'), t('colDate')].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log: any) => (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {log.user ? (
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {getInitials(log.user.firstName, log.user.lastName)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{log.user.firstName} {log.user.lastName}</p>
                          <p className="text-xs text-gray-500">{log.user.email}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">{log.userId || t('systemActor')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', getActionColor(log.action))}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-700">{log.entity}</p>
                    {log.entityId && <p className="text-xs text-gray-400 font-mono">{log.entityId}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <MetadataCell log={log} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">
                    {t('empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            <span>{t('count', { count: filteredLogs.length, total })}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>{t('page', { page, totalPages })}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
