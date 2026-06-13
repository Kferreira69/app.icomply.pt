'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Send } from 'lucide-react';

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

  const handleSupportEmail = () => {
    const url   = typeof window !== 'undefined' ? window.location.href : 'N/A';
    const ua    = typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A';
    const ts    = new Date().toLocaleString('pt-PT');

    const subject = encodeURIComponent('[iComply] Erro no Dashboard');
    const body = encodeURIComponent([
      'Olá equipa iComply,',
      '',
      'Encontrei o seguinte erro no dashboard:',
      '',
      `Erro: ${error.message}`,
      error.digest ? `ID de rastreio: ${error.digest}` : '',
      '',
      `URL: ${url}`,
      `Data/Hora: ${ts}`,
      `Navegador: ${ua}`,
      '',
      '— Por favor, anexe também uma captura de ecrã do que estava a fazer antes do erro ocorrer. —',
    ].filter(Boolean).join('\n'));

    window.open(`mailto:support@icomply.pt?subject=${subject}&body=${body}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-8">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-lg w-full shadow-sm">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-red-800 mb-2">Erro ao carregar o Dashboard</h2>
        <p className="text-sm text-red-600 mb-1 font-mono break-all">
          {error.message || 'Ocorreu um erro inesperado.'}
        </p>
        {error.digest && (
          <p className="text-xs text-red-400 mb-2 font-mono">ID: {error.digest}</p>
        )}
        <p className="text-xs text-red-400 mb-6">
          Usa o botão abaixo para nos enviar este erro automaticamente.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
          <button
            onClick={handleSupportEmail}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
          >
            <Send className="w-4 h-4" />
            Enviar pedido de suporte
          </button>
        </div>
      </div>
    </div>
  );
}
