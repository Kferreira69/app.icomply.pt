'use client';

import { useState, useEffect } from 'react';
import { Shield, Loader2, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function DsarPublicPage({ params }: { params: { orgSlug: string } }) {
  const [info, setInfo]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [form, setForm] = useState({ type: '', subjectName: '', subjectEmail: '', description: '', consent: false });

  useEffect(() => {
    fetch(`${BASE_URL}/gdpr/dsar/public/${params.orgSlug}`)
      .then(r => r.json())
      .then(d => { if (d?.statusCode >= 400) setError(d.message || 'Organização não encontrada'); else setInfo(d); })
      .catch(() => setError('Erro a carregar a página'))
      .finally(() => setLoading(false));
  }, [params.orgSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.type || !form.subjectEmail || !form.consent) return;
    setSubmitting(true); setSubmitError(null);
    try {
      const res = await fetch(`${BASE_URL}/gdpr/dsar/public/${params.orgSlug}/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: form.type, subjectName: form.subjectName, subjectEmail: form.subjectEmail, description: form.description }),
      });
      const data = await res.json();
      if (data.success) { setRequestId(data.requestId); setSubmitted(true); }
      else setSubmitError(data.message || 'Erro ao submeter');
    } catch { setSubmitError('Erro de ligação. Tente novamente.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-10 max-w-md text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">Página não disponível</h2>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pedido registado!</h2>
        <p className="text-gray-500 text-sm mb-5">
          O seu pedido foi submetido com sucesso à <strong>{info?.orgName}</strong>.<br />
          Receberá uma resposta no prazo de <strong>30 dias</strong> conforme o RGPD (Art. 12.º).
        </p>
        {requestId && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
            <p className="text-xs text-blue-600 font-medium mb-1">Referência do pedido</p>
            <p className="font-mono font-bold text-gray-900">{requestId.substring(0, 8).toUpperCase()}</p>
            <p className="text-xs text-blue-600 mt-1">Guarde esta referência para acompanhar o seu pedido</p>
          </div>
        )}
        <p className="text-xs text-gray-400">Um email de confirmação foi enviado para {form.subjectEmail}</p>
      </div>
    </div>
  );

  const inp = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Portal de Proteção de Dados</p>
            <h1 className="text-sm font-bold text-gray-900">{info?.orgName}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-blue-600 px-6 py-5">
            <h2 className="text-white text-lg font-bold">Exercício de Direitos RGPD</h2>
            <p className="text-blue-200 text-sm mt-1">Submeta um pedido ao abrigo do Regulamento Geral de Proteção de Dados</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Type of request */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">Tipo de pedido *</label>
              <div className="space-y-2">
                {info?.requestTypes?.map((rt: any) => (
                  <label key={rt.type}
                    className={cn('flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors',
                      form.type === rt.type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300')}>
                    <input type="radio" name="type" value={rt.type} checked={form.type === rt.type}
                      onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{rt.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{rt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Personal data */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome completo</label>
                <input type="text" value={form.subjectName} onChange={e => setForm(p => ({ ...p, subjectName: e.target.value }))}
                  placeholder="O seu nome completo" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Email *</label>
                <input type="email" required value={form.subjectEmail} onChange={e => setForm(p => ({ ...p, subjectEmail: e.target.value }))}
                  placeholder="o.seu@email.com" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Descrição / Contexto adicional</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={3} placeholder="Forneça informação adicional que ajude a processar o seu pedido..."
                  className={inp + ' resize-none'} />
              </div>
            </div>

            {/* Consent */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={form.consent} onChange={e => setForm(p => ({ ...p, consent: e.target.checked }))}
                className="mt-0.5 flex-shrink-0" />
              <span className="text-xs text-gray-600">
                Confirmo que sou o titular dos dados ou tenho autorização para agir em seu nome, e que as informações fornecidas são verdadeiras. *
              </span>
            </label>

            {submitError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{submitError}
              </div>
            )}

            <button type="submit" disabled={!form.type || !form.subjectEmail || !form.consent || submitting}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
              Submeter Pedido
            </button>
          </form>
        </div>

        <div className="mt-4 text-xs text-gray-400 text-center space-y-1">
          <p>Os seus dados serão tratados de forma confidencial nos termos do RGPD (UE) 2016/679.</p>
          <p>Prazo de resposta: 30 dias (prorrogável até 3 meses em casos complexos).</p>
          <p className="mt-3">Powered by iComply Governance Operating System</p>
        </div>
      </div>
    </div>
  );
}
