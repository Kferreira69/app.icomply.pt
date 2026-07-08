'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { intakeApi, IntakeField } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ClipboardList, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

function FieldInput({ field, value, onChange }: {
  field: IntakeField;
  value: any;
  onChange: (v: any) => void;
}) {
  const base = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

  if (field.type === 'textarea') {
    return <textarea rows={3} value={value ?? ''} onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder} className={cn(base, 'resize-none')} />;
  }

  if (field.type === 'select') {
    return (
      <select value={value ?? ''} onChange={e => onChange(e.target.value)} className={cn(base, 'bg-white')}>
        <option value="">Selecionar...</option>
        {(field.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  if (field.type === 'radio') {
    return (
      <div className="space-y-2">
        {(field.options ?? []).map(o => (
          <label key={o} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name={field.id} value={o} checked={value === o} onChange={() => onChange(o)}
              className="accent-primary" />
            <span className="text-sm text-gray-700">{o}</span>
          </label>
        ))}
      </div>
    );
  }

  if (field.type === 'checkbox') {
    const selected: string[] = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2">
        {(field.options ?? []).map(o => (
          <label key={o} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" value={o} checked={selected.includes(o)}
              onChange={e => {
                if (e.target.checked) onChange([...selected, o]);
                else onChange(selected.filter(x => x !== o));
              }} className="rounded accent-primary" />
            <span className="text-sm text-gray-700">{o}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <input type={field.type === 'phone' ? 'tel' : field.type}
      value={value ?? ''} onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder} className={base} />
  );
}

export default function SubmitPage() {
  const params = useParams<{ token: string }>();
  const [answers, setAnswers]   = useState<Record<string, any>>({});
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: form, isLoading, error } = useQuery({
    queryKey: ['public-intake', params.token],
    queryFn: () => intakeApi.getPublicForm(params.token).then(r => r.data),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () => intakeApi.submitPublic(params.token, {
      answers,
      submitterName: name || undefined,
      submitterEmail: email || undefined,
    }),
    onSuccess: () => setSubmitted(true),
  });

  const fields: IntakeField[] = form?.fields ?? [];

  const isValid = fields
    .filter(f => f.required)
    .every(f => {
      const v = answers[f.id];
      if (Array.isArray(v)) return v.length > 0;
      return v !== undefined && v !== '';
    });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Formulário não encontrado ou inativo</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Submetido com sucesso</h2>
          <p className="text-gray-500 text-sm">As suas respostas foram registadas. Obrigado pela colaboração.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">{form.organization?.name}</p>
            <h1 className="text-xl font-bold text-gray-900">{form.title}</h1>
          </div>
        </div>

        {form.description && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-800">
            {form.description}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          {/* Submitter info */}
          <div className="grid grid-cols-2 gap-3 pb-4 border-b border-gray-100">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Nome (opcional)</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="O seu nome" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Email (opcional)</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="email@exemplo.com" />
            </div>
          </div>

          {/* Fields */}
          {fields.map(f => (
            <div key={f.id}>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                {f.label}
                {f.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <FieldInput field={f} value={answers[f.id]} onChange={v => setAnswers(a => ({ ...a, [f.id]: v }))} />
            </div>
          ))}

          <button onClick={() => mutation.mutate()}
            disabled={!isValid || mutation.isPending}
            className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2 mt-2">
            {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> A enviar...</> : 'Enviar respostas'}
          </button>

          {mutation.isError && (
            <p className="text-center text-sm text-red-600">Ocorreu um erro. Tente novamente.</p>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Formulário gerido por iComply · As suas respostas são confidenciais
        </p>
      </div>
    </div>
  );
}
