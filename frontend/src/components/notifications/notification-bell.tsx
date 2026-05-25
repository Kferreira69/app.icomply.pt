'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { notificationsApi } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  read: boolean;
  createdAt: string;
}

const typeIcon: Record<string, string> = {
  TASK_ASSIGNED: '📋',
  TASK_DUE_SOON: '⏰',
  TASK_OVERDUE: '🔴',
  TASK_COMPLETED: '✅',
  RISK_HIGH: '⚠️',
  RISK_STATUS_CHANGED: '🔄',
  CAPA_ASSIGNED: '📌',
  CAPA_DUE_SOON: '⏰',
  CAPA_OVERDUE: '🔴',
  AUDIT_SCHEDULED: '📅',
  AUDIT_FINDING_ADDED: '🔍',
  EVIDENCE_EXPIRING: '📄',
  EVIDENCE_REJECTED: '❌',
  USER_INVITED: '👤',
  SYSTEM: 'ℹ️',
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Poll unread count every 30s
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationsApi.unreadCount();
      setUnreadCount(res.data.count);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Load notifications when panel opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    notificationsApi.list({ limit: 20 })
      .then(res => setNotifications(res.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markAsRead(id);
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleDelete = async (id: string, wasUnread: boolean) => {
    await notificationsApi.remove(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (wasUnread) setUnreadCount(c => Math.max(0, c - 1));
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notificações"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">
              Notificações
              {unreadCount > 0 && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {unreadCount} novas
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Todas lidas
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
            {loading && (
              <div className="py-8 text-center text-gray-400 text-sm">A carregar...</div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Sem notificações</p>
              </div>
            )}

            {!loading && notifications.map(n => (
              <div
                key={n.id}
                className={`flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                  !n.read ? 'bg-blue-50/40' : ''
                }`}
              >
                {/* Icon */}
                <span className="text-lg flex-shrink-0 mt-0.5">
                  {typeIcon[n.type] || 'ℹ️'}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  {!n.read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="p-1 text-blue-400 hover:text-blue-600 rounded"
                      title="Marcar como lida"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n.id, !n.read)}
                    className="p-1 text-gray-300 hover:text-red-400 rounded"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 text-center">
              <span className="text-xs text-gray-400">
                Mostrando as últimas {notifications.length} notificações
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
