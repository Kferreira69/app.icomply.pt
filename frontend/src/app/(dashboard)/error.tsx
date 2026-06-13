'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error.name, error.message, error.stack);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-8">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-lg w-full shadow-sm">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-red-800 mb-2">Erro ao carregar o Dashboard</h2>
        <p className="text-sm text-red-600 mb-1 font-mono break-all">
          {error.message || 'Ocorreu um erro inesperado.'}
        </p>
        {error.digest && (
          <p className="text-xs text-red-400 mb-4 font-mono">ID: {error.digest}</p>
        )}
        <p className="text-xs text-red-400 mb-6">
          Copie esta mensagem e envie ao suporte para ajudar a diagnosticar o problema.
        </p>
        <button
          onClick={reset}
          className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
