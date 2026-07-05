'use client';

import { useState, useEffect } from 'react';
import { vendorQuestionnaireApi } from '@/lib/api';
import { CheckCircle, Loader2, Shield, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────

type Section = { key: string; label: string; questions: Question[] };
type Question = { key: string; label: string; type: string; options?: string[] };

export default function VendorAssessmentPage({ params }: { params: { token: string } }) {
  const [form, setForm]           = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [step, setStep]           = useState(0); // 0 = intro, 1..N = sections, N+1 = done
  const [answers, setAnswers]     = useState<Record<string, Record<string, string>>>({});
  const [meta, setMeta]           = useState({ vendorName: '', vendorContact: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore]         = useState<number | null>(null);

  useEffect(() => {
    vendorQuestionnaireApi.getPublic(params.token)
      .then((data: any) => {
        if (data?.statusCode >= 400) {
          setError(data.message || 'Questionário não disponível');
        } else {
          setForm(data);
        }
        setLoading(false);
      })
      .catch(() => { setError('Não foi possível carregar o questionário.'); setLoading(false); });
  }, [params.token]);

  const setAnswer = (sectionKey: string, questionKey: string, value: string) => {
    setAnswers(p => ({ ...p, [sectionKey]: { ...(p[sectionKey] || {}), [questionKey]: value } }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const responses: Array<{ sectionKey: string; questionKey: string; answer: string }> = [];
    for (const [sectionKey, qs] of Object.entries(answers)) {
      for (const [questionKey, answer] of Object.entries(qs as Record<string, string>)) {
        responses.push({ sectionKey, questionKey, answer });
      }
    }
    try {
      const result: any = await vendorQuestionnaireApi.submitPublic(params.token, {
        responses,
        vendorName: meta.vendorName,
        vendorContact: meta.vendorContact,
      });
      if (result.success) { setScore(result.score); setSubmitted(true); }
      else setError(result.message || 'Erro ao submeter');
    } catch { setError('Erro ao submeter o questionário. Tente novamente.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">Questionário indisponível</h2>
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Questionário submetido!</h2>
        <p className="text-gray-500 text-sm mb-5">
          Obrigado por preencher o questionário de segurança. As suas respostas foram registadas e serão analisadas pela equipa de compliance.
        </p>
        {score !== null && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-sm text-blue-700 font-medium">Score de conformidade estimado</p>
            <p className={cn('text-3xl font-bold mt-1', score >= 70 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600')}>
              {score}%
            </p>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-5">iComply Governance Operating System · Respostas confidenciais</p>
      </div>
    </div>
  );

  const sections: Section[] = form?.sections || [];
  const totalSteps = sections.length + 1; // 0=intro, 1..N=sections
  const isLastSection = step === sections.length;
  const currentSection = sections[step - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-500">iComply Governance Operating System</p>
            <h1 className="text-sm font-semibold text-gray-900">{form?.title}</h1>
          </div>
        </div>
      </div>

      {/* Progress */}
      {step > 0 && (
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-6 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-500">{step}/{sections.length} secções</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(step / sections.length) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Intro */}
        {step === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{form?.title}</h2>
            {form?.instructions && <p className="text-gray-600 text-sm mb-5">{form.instructions}</p>}
            <p className="text-gray-600 text-sm mb-5">
              Este questionário avalia as práticas de segurança e conformidade da sua organização. As respostas são confidenciais e utilizadas apenas para avaliação de risco de terceiros.
            </p>
            {form?.expiresAt && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-5">
                ⏱ Este questionário expira em: {new Date(form.expiresAt).toLocaleDateString('pt-PT')}
              </p>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome da organização (fornecedor) *</label>
                <input type="text" value={meta.vendorName} onChange={e => setMeta(p => ({ ...p, vendorName: e.target.value }))}
                  placeholder="Nome da sua empresa" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome e contacto da pessoa responsável</label>
                <input type="text" value={meta.vendorContact} onChange={e => setMeta(p => ({ ...p, vendorContact: e.target.value }))}
                  placeholder="Nome · Email · Cargo" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
              </div>
            </div>

            <button onClick={() => setStep(1)} disabled={!meta.vendorName.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Iniciar Questionário <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Section */}
        {step > 0 && !isLastSection && currentSection && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-blue-600 px-6 py-5">
              <p className="text-blue-200 text-xs font-medium">Secção {step} de {sections.length}</p>
              <h2 className="text-white text-lg font-bold mt-1">{currentSection.label}</h2>
            </div>
            <div className="p-6 space-y-6">
              {currentSection.questions.map((q: Question) => (
                <div key={q.key}>
                  <label className="block text-sm font-medium text-gray-800 mb-2">{q.label}</label>

                  {q.type === 'yesno' && (
                    <div className="flex gap-3">
                      {['Sim', 'Não'].map(opt => (
                        <button key={opt} type="button"
                          onClick={() => setAnswer(currentSection.key, q.key, opt)}
                          className={cn('flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors',
                            answers[currentSection.key]?.[q.key] === opt
                              ? (opt === 'Sim' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-400 bg-red-50 text-red-600')
                              : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {q.type === 'select' && (
                    <select value={answers[currentSection.key]?.[q.key] || ''}
                      onChange={e => setAnswer(currentSection.key, q.key, e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                      <option value="">Selecionar...</option>
                      {q.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}

                  {q.type === 'multiselect' && (
                    <div className="grid grid-cols-2 gap-2">
                      {q.options?.map(o => {
                        const current = (answers[currentSection.key]?.[q.key] || '').split(',').filter(Boolean);
                        const selected = current.includes(o);
                        return (
                          <button key={o} type="button"
                            onClick={() => {
                              const next = selected ? current.filter(x => x !== o) : [...current, o];
                              setAnswer(currentSection.key, q.key, next.join(','));
                            }}
                            className={cn('px-3 py-2 rounded-xl border-2 text-xs font-medium transition-colors text-left',
                              selected ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                            {selected && '✓ '}{o}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {(q.type === 'text') && (
                    <input type="text" value={answers[currentSection.key]?.[q.key] || ''}
                      onChange={e => setAnswer(currentSection.key, q.key, e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                  )}

                  {q.type === 'textarea' && (
                    <textarea value={answers[currentSection.key]?.[q.key] || ''}
                      onChange={e => setAnswer(currentSection.key, q.key, e.target.value)}
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none" />
                  )}
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setStep(p => p - 1)}
                className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-sm hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <button onClick={() => setStep(p => p + 1)}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                {step < sections.length ? <><span>Próxima Secção</span> <ChevronRight className="w-4 h-4" /></> : <span>Rever respostas</span>}
              </button>
            </div>
          </div>
        )}

        {/* Review + submit */}
        {isLastSection && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Rever e Submeter</h2>
            <p className="text-sm text-gray-500 mb-6">Verifique as suas respostas antes de submeter o questionário.</p>

            <div className="space-y-3 mb-6">
              {sections.map((s, i) => {
                const sectionAnswers = answers[s.key] || {};
                const answered = Object.keys(sectionAnswers).length;
                return (
                  <div key={s.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                        answered > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500')}>
                        {answered > 0 ? '✓' : i + 1}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{s.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{answered}/{s.questions.length} respondidas</span>
                      <button onClick={() => setStep(i + 1)} className="text-xs text-blue-600 hover:underline">Editar</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(p => p - 1)}
                className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-sm hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Submeter Questionário
              </button>
            </div>
          </div>
        )}

      </div>
      <p className="text-center text-xs text-gray-400 py-6">iComply Governance Operating System · Questionário confidencial</p>
    </div>
  );
}
