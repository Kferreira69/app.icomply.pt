'use client';

import { useState, useEffect } from 'react';
import { whistleblowApi } from '@/lib/api';
import { Shield, Search, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  RECEIVED: {
    label: 'Recebida — aguarda acuse de recepção',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    icon: Clock,
  },
  ACKNOWLEDGED: {
    label: 'Acuse de recepção enviado — em análise',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    icon: CheckCircle,
  },
  UNDER_INVESTIGATION: {
    label: 'Em investigação',
    color: 'text-purple-700 bg-purple-50 border-purple-200',
    icon: Search,
  },
  CONCLUDED: {
    label: 'Concluída',
    color: 'text-green-700 bg-green-50 border-green-200',
    icon: CheckCircle,
  },
  UNFOUNDED: {
    label: 'Arquivada — sem fundamento apurado',
    color: 'text-gray-600 bg-gray-50 border-gray-200',
    icon: XCircle,
  },
  ARCHIVED: {
    label: 'Arquivada',
    color: 'text-gray-600 bg-gray-50 border-gray-200',
    icon: XCircle,
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  CORRUPTION: 'Corrupção',
  FRAUD: 'Fraude',
  BRIBERY: 'Suborno',
  CONFLICT_OF_INTEREST: 'Conflito de interesses',
  ABUSE_OF_POWER: 'Abuso de poder',
  EMBEZZLEMENT: 'Desvio de fundos',
  MISUSE_OF_INFORMATION: 'Uso indevido de informação',
  DATA_BREACH: 'Violação de dados',
  WORKPLACE_HARASSMENT: 'Assédio no trabalho',
  SAFETY_VIOLATION: 'Violação de segurança',
  ENVIRONMENTAL_VIOLATION: 'Violação ambiental',
  OTHER: 'Outro',
};

export default function CheckStatusPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  // Pre-fill token from URL query param
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const t = new URLSearchParams(window.location.search).get('token');
      if (t) {
        setToken(t);
        // Auto-search
        setTimeout(() => handleCheck(t), 100);
      }
    }
  }, []);

  const handleCheck = async (t?: string) => {
    const tokenToUse = t ?? token;
    if (!tokenToUse.trim()) {
      setError('Introduza o token seguro da sua denúncia.');
      return;
    }
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await whistleblowApi.checkStatus(tokenToUse.trim());
      setData(res.data);
    } catch {
      setError('Denúncia não encontrada. Verifique o token e tente novamente.');
    }
    setLoading(false);
  };

  const statusCfg = data ? (STATUS_CONFIG[data.status] || STATUS_CONFIG['RECEIVED']) : null;
  const StatusIcon = statusCfg?.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur border-b border-white/10 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Verificar Estado da Denúncia</h1>
            <p className="text-white/60 text-xs">
              Canal de Denúncias — Lei 93/2021
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 pt-8">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <p className="text-sm text-gray-600 mb-4">
            Introduza o <strong>token seguro</strong> que recebeu ao submeter a sua denúncia.
          </p>

          <div className="flex gap-3">
            <input
              value={token}
              onChange={e => setToken(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCheck()}
              placeholder="Token seguro (64 caracteres hexadecimais)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            />
            <button
              onClick={() => handleCheck()}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              {loading ? 'A verificar...' : 'Verificar'}
            </button>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {data && (
            <div className="mt-6 space-y-4">
              {/* Status badge */}
              <div className={cn(
                'flex items-center gap-3 p-4 rounded-xl border',
                statusCfg?.color,
              )}>
                {StatusIcon && <StatusIcon className="w-5 h-5 flex-shrink-0" />}
                <div>
                  <p className="font-semibold text-sm">{statusCfg?.label}</p>
                  <p className="text-xs opacity-70">
                    Referência: <span className="font-mono">{data.referenceCode}</span>
                  </p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Categoria</span>
                  <span className="font-medium">
                    {CATEGORY_LABELS[data.category] || data.category}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Data de submissão</span>
                  <span className="font-medium">
                    {new Date(data.createdAt).toLocaleDateString('pt-PT', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Prazo de acuse de recepção</span>
                  <span className={cn(
                    'font-medium',
                    !data.acknowledgedAt && new Date(data.ackDeadline) < new Date()
                      ? 'text-red-600'
                      : '',
                  )}>
                    {new Date(data.ackDeadline).toLocaleDateString('pt-PT')}
                    {data.acknowledgedAt && ' ✓'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Prazo de resolução</span>
                  <span className="font-medium">
                    {new Date(data.resolutionDeadline).toLocaleDateString('pt-PT')}
                  </span>
                </div>
                {data.acknowledgedAt && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Acuse enviado em</span>
                    <span className="font-medium text-green-700">
                      {new Date(data.acknowledgedAt).toLocaleDateString('pt-PT')}
                    </span>
                  </div>
                )}
                {data.concludedAt && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Concluída em</span>
                    <span className="font-medium">
                      {new Date(data.concludedAt).toLocaleDateString('pt-PT')}
                    </span>
                  </div>
                )}
              </div>

              {/* Conclusion (if concluded) */}
              {data.conclusionSummary && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
                    Resultado da investigação
                  </p>
                  <p className="text-sm text-green-800">{data.conclusionSummary}</p>
                </div>
              )}

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500">
                Nos termos da Lei 93/2021, tem direito à confidencialidade da sua identidade,
                protecção contra represálias e acompanhamento do estado da denúncia.
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <a
            href="/denuncias/submeter"
            className="text-white/60 hover:text-white text-sm transition-colors"
          >
            ← Submeter uma nova denúncia
          </a>
        </div>
      </div>
    </div>
  );
}
