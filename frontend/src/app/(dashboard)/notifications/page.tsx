'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { notificationsApi } from '@/lib/api';
import {
  Bell,
  Clock,
  AlertTriangle,
  FileText,
  AlertCircle,
  Calendar,
  User,
  Loader2,
  Trash2,
  CheckCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────

type NotificationType =
  | 'TASK_DUE'
  | 'RISK_ALERT'
  | 'EVIDENCE_EXPIRING'
  | 'CAPA_OVERDUE'
  | 'AUDIT_SCHEDULED'
  | 'USER_INVITED'
  | 'SYSTEM';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  data: Notification[];
  total: number;
  unreadCount: number;
}

// ── Helpers ────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin}min`;
  if (diffHr < 24) return `há ${diffHr}h`;
  if (diffDay === 1) return 'ontem';
  if (diffDay < 7) return `há ${diffDay} dias`;
  const weeks = Math.floor(diffDay / 7);
  if (weeks < 5) return `há ${weeks} sem`;
  const months = Math.floor(diffDay / 30);
  return `há ${months} ${months === 1 ? 'mês' : 'meses'}`;
}

// ── Icon per type ──────────────────────────────────────────────

const TYPE_ICON: Record<NotificationType, React.ElementType> = {
  SYSTEM: Bell,
  TASK_DUE: Clock,
  RISK_ALERT: AlertTriangle,
  EVIDENCE_EXPIRING: FileText,
  CAPA_OVERDUE: AlertCircle,
  AUDIT_SCHEDULED: Calendar,
  USER_INVITED: User,
};

const TYPE_COLOR: Record<NotificationType, string> = {
  SYSTEM: 'bg-gray-100 text-gray-500',
  TASK_DUE: 'bg-blue-100 text-blue-600',
  RISK_ALERT: 'bg-red-100 text-red-600',
  EVIDENCE_EXPIRING: 'bg-amber-100 text-amber-600',
  CAPA_OVERDUE: 'bg-orange-100 text-orange-600',
  AUDIT_SCHEDULED: 'bg-purple-100 text-purple-600',
  USER_INVITED: 'bg-green-100 text-green-600',
};

const TYPE_LABEL: Record<NotificationType, string> = {
  TASK_DUE: 'Tarefa',
  RISK_ALERT: 'Risco',
  EVIDENCE_EXPIRING: 'Evidência',
  CAPA_OVERDUE: 'CAPA',
  AUDIT_SCHEDULED: 'Auditoria',
  USER_INVITED: 'Utilizador',
  SYSTEM: 'Sistema',
};

// ── Entity navigation ──────────────────────────────────────────

const ENTITY_ROUTE: Record<string, string> = {
  Task: '/tasks',
  Risk: '/risks',
  Evidence: '/evidence',
  Capa: '/capa',
  Audit: '/audits',
};

// ── Filter tabs ────────────────────────────────────────────────

type FilterTab = 'all' | 'unread' | 'TASK_DUE' | 'RISK_ALERT' | 'EVIDENCE_EXPIRING' | 'CAPA_OVERDUE';

const TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'unread', label: 'Não lidas' },
  { id: 'TASK_DUE', label: 'Tarefas' },
  { id: 'RISK_ALERT', label: 'Riscos' },
  { id: 'EVIDENCE_EXPIRING', label: 'Evidências' },
  { id: 'CAPA_OVERDUE', label: 'CAPAs' },
];

const PAGE_LIMIT = 20;

// ── Notification item ──────────────────────────────────────────

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
  onNavigate,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (n: Notification) => void;
}) {
  const Icon = TYPE_ICON[notification.type] ?? Bell;
  const colorClass = TYPE_COLOR[notification.type] ?? TYPE_COLOR.SYSTEM;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={cn(
        'flex items-start gap-4 px-6 py-4 border-b border-gray-100 transition-colors group',
        !notification.read ? 'bg-blue-50/30' : 'bg-white',
        'hover:bg-gray-50',
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Type icon */}
      <div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', colorClass)}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <button
        className="flex-1 text-left min-w-0"
        onClick={() => onNavigate(notification)}
      >
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn('text-sm', notification.read ? 'text-gray-700' : 'font-semibold text-gray-900')}>
            {notification.title}
          </span>
          {!notification.read && (
            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-gray-500 line-clamp-2">{notification.message}</p>
        <p className="text-[11px] text-gray-400 mt-1">{timeAgo(notification.createdAt)}</p>
      </button>

      {/* Actions */}
      <div className={cn('flex items-center gap-1 flex-shrink-0 transition-opacity', hovered ? 'opacity-100' : 'opacity-0')}>
        {!notification.read && (
          <button
            onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id); }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Marcar como lida"
          >
            <CheckCheck className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Eliminar"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

export default function NotificationsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<FilterTab>('all');
  const [page, setPage] = useState(1);

  // Build query params from current tab
  const queryParams = {
    page,
    limit: PAGE_LIMIT,
    ...(tab === 'unread' ? { unreadOnly: true } : {}),
    ...(tab !== 'all' && tab !== 'unread' ? { type: tab } : {}),
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['notifications', tab, page],
    queryFn: () =>
      notificationsApi.list(queryParams as any).then((r) => r.data as NotificationsResponse),
    staleTime: 15_000,
  });

  const notifications = data?.data ?? [];
  const total = data?.total ?? 0;
  const unreadCount = data?.unreadCount ?? 0;
  const hasMore = page * PAGE_LIMIT < total;

  // Mark single as read
  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  // Delete one
  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  function handleNavigate(n: Notification) {
    // Mark as read first
    if (!n.read) markReadMutation.mutate(n.id);
    // Navigate to entity if applicable
    if (n.entityType && n.entityId) {
      const route = ENTITY_ROUTE[n.entityType];
      if (route) router.push(route);
    }
  }

  function handleTabChange(t: FilterTab) {
    setTab(t);
    setPage(1);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{unreadCount} não lidas</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors disabled:opacity-60"
          >
            {markAllReadMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <CheckCheck className="w-4 h-4" />
            }
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              tab === t.id
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Bell className="w-10 h-10 mb-3 text-gray-200" />
            <p className="text-sm font-medium">Sem notificações</p>
            <p className="text-xs mt-1">
              {tab === 'unread' ? 'Está tudo lido!' : 'Nenhuma notificação nesta categoria.'}
            </p>
          </div>
        ) : (
          <>
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onMarkRead={(id) => markReadMutation.mutate(id)}
                onDelete={(id) => deleteMutation.mutate(id)}
                onNavigate={handleNavigate}
              />
            ))}

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                A mostrar {notifications.length} de {total}
              </p>
              {hasMore && (
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isFetching}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-60"
                >
                  {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Carregar mais
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
