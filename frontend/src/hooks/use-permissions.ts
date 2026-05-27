'use client';

import { useQuery } from '@tanstack/react-query';
import { permissionsApi } from '@/lib/api';

export type AccessLevel = 0 | 1 | 2; // 0=none, 1=read, 2=full

export function usePermissions() {
  const { data, isLoading } = useQuery({
    queryKey: ['permissions', 'me'],
    queryFn: () => permissionsApi.getMyPermissions().then(r => r.data as Record<string, number>),
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  const can = (module: string, minLevel: AccessLevel = 1): boolean => {
    if (!data) return true; // optimistic while loading
    return (data[module] ?? 1) >= minLevel;
  };

  const level = (module: string): AccessLevel => {
    if (!data) return 1;
    return (data[module] ?? 1) as AccessLevel;
  };

  return { permissions: data, isLoading, can, level };
}
