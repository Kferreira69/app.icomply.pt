'use client';

import { useQuery } from '@tanstack/react-query';
import { permissionsApi } from '@/lib/api';

export type AccessLevel = 0 | 1 | 2; // 0=none, 1=read, 2=full

export function usePermissions() {
  const { data, isLoading } = useQuery({
    queryKey: ['permissions', 'me'],
    queryFn: () => permissionsApi.getMyPermissions().then(r => r.data as Record<string, number>),
    staleTime: 5 * 60 * 1000,
  });

  // Pessimistic during load — don't grant access until confirmed
  const can = (module: string, minLevel: AccessLevel = 1): boolean => {
    if (isLoading || !data) return false;
    return (data[module] ?? 0) >= minLevel;
  };

  const level = (module: string): AccessLevel => {
    if (isLoading || !data) return 0;
    return (data[module] ?? 0) as AccessLevel;
  };

  return { permissions: data, isLoading, can, level };
}
