'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { diagnosticsApi, projectsApi } from '@/lib/api';
import { ChevronRight, ChevronLeft, CheckCircle2, Loader2, Play, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type DiagnosticStep = 'intro' | 'questionnaire' | 'results';

export default function DiagnosticPage() {
  const t = useTranslations('diagnostic');
  const [step, setStep] = useState<DiagnosticStep>('intro');
  const [runId, setRunId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [results, setResults] = useState<any>(null);
  const qc = useQueryClient();

  const { data: questionsData, isLoading: loadingQ } = useQuery({
    queryKey: ['diagnostics', 'questions'],
    queryFn: () => diagnosticsApi.questions().then(r => r.data),
    enabled: step === 'questionnaire',
  });

  const { data: runsData } = useQuery({
    queryKey: ['diagnostics', 'runs'],
    queryFn: () => diagnosticsApi.listRuns().then(r => r.data),
  });

  const startMutation = useMutation({
    mutationFn: () => diagnosticsApi.startRun(),
    onSuccess: (res) => {
      setRunId(res.data.id);
      setStep('questionnaire');
    },
  });

  const submitMutation = useMutation({
    mutationFn: (data: any) => diagnosticsApi.submitAnswers(runId!, data),
    onSuccess: (res) => {
      if (res.data.recommendations) {
        setResults(res.data);
        setStep('results');
        qc.invalidateQueries({ queryKey: ['diagnostics', 'runs'] });
      }
    },
  });

  const questions = questionsData || [];
  const question = questions[currentQ];

  function handleAnswer(value: any) {
    if (!question) return;
    setAnswers(prev => ({ ...prev, [question.id]: value }));
  }

  function handleNext() {
    if (currentQ < questions.length - 1) {
      setCurrentQ(c => c + 1);
    } else {
      const answersList = Object.entries(answers).map(([questionId, value]) => ({ questionId, value }));
      submitMutation.mutate({ answers: answersList, complete: true });
    }
  }

  if (step === 'intro') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('title')}</h2>
          <p className="text-gray-500 max-w-lg mx-auto mb-8">{t('intro')}</p>
          <button
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending}
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {startMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {t('start')}
          </button>
        </div>

        {runsData && runsData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{t('pastRuns')}</h3>
            <div className="space-y-3">
              {runsData.slice(0, 5).map((run: any) => (
                <div key={run.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(run.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {run._count?.answers} {t('answers')} · {run._count?.projects} {t('projects')}
                    </p>
                  </div>
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-full',
                    run.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700',
                  )}>
                    {run.status === 'COMPLETED' ? t('statusCompleted') : t('statusInProgress')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === 'questionnaire') {
    if (loadingQ) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    const progress = questions.length > 0 ? ((currentQ + 1) / questions.length) * 100 : 0;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">{t('questionOf', { current: currentQ + 1, total: questions.length })}</span>
            <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {question && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
              {question.category?.replace(/_/g, ' ')}
            </p>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{question.question}</h3>
            {question.description && (
              <p className="text-gray-500 text-sm mb-6">{question.description}</p>
            )}

            <div className="space-y-3">
              {question.type === 'BOOLEAN' && (
                <div className="grid grid-cols-2 gap-3">
                  {[{ value: true, label: t('yes') }, { value: false, label: t('no') }].map(opt => (
                    <button
                      key={String(opt.value)}
                      onClick={() => handleAnswer(opt.value)}
                      className={cn(
                        'p-4 rounded-lg border-2 text-sm font-medium transition-all',
                        answers[question.id] === opt.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {question.type === 'SINGLE_CHOICE' && question.options?.map((opt: any) => {
                const val = typeof opt === 'object' ? opt.value : opt;
                const lbl = typeof opt === 'object' ? (opt.label ?? opt.value) : opt;
                return (
                  <button
                    key={val}
                    onClick={() => handleAnswer(val)}
                    className={cn(
                      'w-full text-left p-4 rounded-lg border-2 text-sm transition-all',
                      answers[question.id] === val
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700',
                    )}
                  >
                    {lbl}
                  </button>
                );
              })}

              {question.type === 'TEXT' && (
                <textarea
                  value={answers[question.id] || ''}
                  onChange={e => handleAnswer(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none"
                  placeholder={t('answerHere')}
                />
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <button
            onClick={() => setCurrentQ(c => Math.max(0, c - 1))}
            disabled={currentQ === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> {t('previous')}
          </button>
          <button
            onClick={handleNext}
            disabled={answers[question?.id] === undefined || submitMutation.isPending}
            className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-40"
          >
            {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {currentQ === questions.length - 1 ? t('finish') : t('next')}
            {currentQ < questions.length - 1 && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'results' && results) {
    const recommendations = results.recommendations || [];

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('resultsTitle')}</h2>
          <p className="text-gray-500">{t('resultsSubtitle')}</p>
        </div>

        <div className="space-y-4">
          {recommendations.map((rec: any, idx: number) => (
            <div key={rec.frameworkCode} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                    idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                    idx === 1 ? 'bg-gray-100 text-gray-700' : 'bg-orange-50 text-orange-700',
                  )}>
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{rec.frameworkName}</h3>
                    <p className="text-xs text-gray-500">{rec.frameworkCode}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{rec.score}%</div>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    rec.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                    rec.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700',
                  )}>
                    {rec.priority === 'HIGH' ? t('priorityHigh') : rec.priority === 'MEDIUM' ? t('priorityMedium') : t('priorityLow')}
                  </span>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div className="bg-primary h-2 rounded-full" style={{ width: `${rec.score}%` }} />
              </div>

              {rec.reasons?.length > 0 && (
                <ul className="space-y-1">
                  {rec.reasons.map((r: string, i: number) => (
                    <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                      {r}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4">
                <Link
                  href={`/projects?framework=${rec.frameworkId}&diagnostic=${results.id}`}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                >
                  {t('createProject', { name: rec.frameworkName })} <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Link href="/projects" className="flex-1 text-center bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors">
            {t('goToProjects')}
          </Link>
          <button
            onClick={() => { setStep('intro'); setAnswers({}); setCurrentQ(0); setRunId(null); }}
            className="px-6 py-3 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            {t('newDiagnostic')}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
