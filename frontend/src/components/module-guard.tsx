'use client';

import { usePermissions, AccessLevel } from '@/hooks/use-permissions';
import { ShieldOff, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface ModuleGuardProps {
  moduleKey: string;
  minLevel?: AccessLevel;
  children: React.ReactNode;
}

export function ModuleGuard({ moduleKey, minLevel = 1, children }: ModuleGuardProps) {
  const { isLoading, can } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!can(moduleKey, minLevel)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
          <ShieldOff className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Acesso Restrito</h2>
        <p className="text-gray-500 max-w-sm mb-6">
          Não tem permissão para aceder a este módulo.
          Contacte o administrador da sua organização para solicitar acesso.
        </p>
        <Link href="/dashboard"
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90">
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
