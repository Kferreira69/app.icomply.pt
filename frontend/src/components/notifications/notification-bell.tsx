'use client';

import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { notificationsApi } from '@/lib/api';

export function NotificationBell() {
  const router = useRouter();

  const { data } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () =>
      notificationsApi
        .list({ page: 1, limit: 1, unreadOnly: true })
        .then((r) => r.data as { total: number; unreadCount: number }),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  const count = data?.unreadCount ?? 0;
  const label = count > 9 ? '9+' : String(count);

  return (
    <button
      onClick={() => router.push('/notifications')}
      className="relative p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      title="Notificações"
      aria-label={`Notificações${count > 0 ? ` (${count} não lidas)` : ''}`}
    >
      <Bell className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 leading-none">
          {label}
        </span>
      )}
    </button>
  );
}
