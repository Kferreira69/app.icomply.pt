'use client';

import { useQuery } from '@tanstack/react-query';
import { Brain, Zap, TrendingUp, Database, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

// Fetch AI usage stats from the backend
const aiUsageApi = {
  getUsage: () => api.get('/ai-usage'),
};

export default function AiUsagePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['ai-usage'],
    queryFn: () => aiUsageApi.getUsage().then(r => r.data).catch(() => null),
  });

  // Show static info if no data available
  const stats = data || {
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    requestCount: 0,
    estimatedCostUsd: 0,
    byEndpoint: [],
    byModel: [],
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center"><Brain className="w-5 h-5 text-violet-600" /></div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Utilização de IA</h2>
            <p className="text-xs text-gray-500">Consumo de tokens e custos do AI Assistant</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-violet-600" /></div>
        ) : (
          <div className="space-y-5">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Total de Tokens',    value: stats.totalTokens?.toLocaleString() || '0',    icon: Database, color: 'bg-violet-50 text-violet-600' },
                { label: 'Pedidos Realizados', value: stats.requestCount?.toLocaleString() || '0',   icon: Zap,      color: 'bg-blue-50 text-blue-600' },
                { label: 'Tokens de Entrada',  value: stats.inputTokens?.toLocaleString() || '0',    icon: TrendingUp, color: 'bg-green-50 text-green-600' },
                { label: 'Custo Estimado',     value: `$${(stats.estimatedCostUsd || 0).toFixed(4)}`, icon: Brain,   color: 'bg-amber-50 text-amber-600' },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-xl p-4">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', s.color)}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* By endpoint */}
            {stats.byEndpoint?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Por Funcionalidade</p>
                <div className="space-y-2">
                  {stats.byEndpoint.map((e: any) => (
                    <div key={e.endpoint} className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-700">{e.endpoint}</span>
                      <span className="text-sm font-semibold text-gray-900">{e.tokens?.toLocaleString()} tokens</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Usage limits info */}
            <div className={cn('flex items-start gap-3 p-4 rounded-xl border', stats.requestCount === 0 ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100')}>
              {stats.requestCount === 0 ? (
                <>
                  <Brain className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Sem utilização ainda</p>
                    <p className="text-xs text-blue-700 mt-1">Use o AI Assistant ou as AI Compliance Tools para começar a gerar documentos e análises.</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Limites do plano</p>
                    <p className="text-xs text-amber-700 mt-1">O limite de tokens depende do plano de subscrição. Actualize para Enterprise para uso ilimitado.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Model info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Configuração do Modelo IA</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span>Provider ativo</span>
            <span className="font-medium text-gray-900">AUTO (Anthropic → OpenAI fallback)</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span>Modelo principal</span>
            <span className="font-medium text-gray-900">Claude Sonnet 4.x</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span>Modelo fallback</span>
            <span className="font-medium text-gray-900">GPT-4o-mini</span>
          </div>
          <div className="flex justify-between py-2">
            <span>Contexto organizacional</span>
            <span className="text-green-600 font-medium">✓ Ativo</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">O modelo pode ser alterado nas definições de licenciamento → Provider IA.</p>
      </div>
    </div>
  );
}
