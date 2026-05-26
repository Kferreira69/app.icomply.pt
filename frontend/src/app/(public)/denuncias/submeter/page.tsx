'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { whistleblowApi } from '@/lib/api';
import {
  Shield, AlertCircle, ChevronDown, ChevronUp, Plus, Trash2,
  CheckCircle, Lock, Eye, EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { value: 'CORRUPTION', label: 'Corrupção' },
  { value: 'FRAUD', label: 'Fraude' },
  { value: 'BRIBERY', label: 'Suborno' },
  { value: 'CONFLICT_OF_INTEREST', label: 'Conflito de interesses' },
  { value: 'ABUSE_OF_POWER', label: 'Abuso de poder' },
  { value: 'EMBEZZLEMENT', label: 'Desvio de fundos' },
  { value: 'MISUSE_OF_INFORMATION', label: 'Uso indevido de informação' },
  { value: 'DATA_BREACH', label: 'Violação de dados' },
  { value: 'WORKPLACE_HARASSMENT', label: 'Assédio no trabalho' },
  { value: 'SAFETY_VIOLATION', label: 'Violação de segurança' },
  { value: 'ENVIRONMENTAL_VIOLATION', label: 'Violação ambiental' },
  { value: 'OTHER', label: 'Outro' },
];

const RELATIONS = [
  { value: 'EMPLOYEE', label: 'Colaborador(a)' },
  { value: 'CONTRACTOR', label: 'Prestador de serviços' },
  { value: 'SUPPLIER', label: 'Fornecedor' },
  { value: 'FORMER_EMPLOYEE', label: 'Ex-colaborador(a)' },
  { value: 'OTHER', label: 'Outro' },
];

type Step = 'form' | 'success';

interface Person {
  role: 'ACCUSED' | 'WITNESS';
  name: string;
  jobTitle: string;
  department: string;
}

export default function SubmitWhistleblowPage() {
  // orgSlug can be passed via query param or embedded in URL
  const [orgSlug] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('org') || 'default';
    }
    return 'default';
  });

  const [step, setStep] = useState<Step>('form');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showPersons, setShowPersons] = useState(false);
  const [persons, setPersons] = useState<Person[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showToken, setShowToken] = useState(false);

  const [form, setForm] = useState({
    category: '',
    subject: '',
    description: '',
    incidentDate: '',
    incidentLocation: '',
    repeatOffense: false,
    witnesses: '',
    // Reporter
    reporterName: '',
    reporterEmail: '',
    reporterPhone: '',
    reporterDept: '',
    reporterRelation: '',
  });

  const update = (field: string, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const addPerson = (role: 'ACCUSED' | 'WITNESS') => {
    setPersons(prev => [...prev, { role, name: '', jobTitle: '', department: '' }]);
    setShowPersons(true);
  };

  const removePerson = (i: number) =>
    setPersons(prev => prev.filter((_, idx) => idx !== i));

  const updatePerson = (i: number, field: string, value: string) =>
    setPersons(prev => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.category) e.category = 'Seleccione uma categoria';
    if (!form.subject.trim()) e.subject = 'O assunto é obrigatório';
    if (form.subject.trim().length < 10) e.subject = 'Mínimo 10 caracteres';
    if (!form.description.trim()) e.description = 'A descrição é obrigatória';
    if (form.description.trim().length < 50)
      e.description = 'Forneça mais detalhes (mínimo 50 caracteres)';
    if (!isAnonymous) {
      if (!form.reporterName.trim()) e.reporterName = 'O nome é obrigatório';
      if (!form.reporterRelation) e.reporterRelation = 'Seleccione a sua relação com a organização';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await whistleblowApi.submit(orgSlug, {
        ...form,
        isAnonymous,
        persons: persons.filter(p => p.name.trim()),
        incidentDate: form.incidentDate || undefined,
      });
      setResult(res.data);
      setStep('success');
    } catch (err: any) {
      setErrors({ submit: err.response?.data?.message || 'Erro ao submeter a denúncia.' });
    }
    setSubmitting(false);
  };

  if (step === 'success' && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Denúncia Recebida</h1>
            <p className="text-gray-500 mt-2 text-sm">
              A sua denúncia foi registada com sucesso. Guarde os dados abaixo.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">
                Código de Referência (público)
              </p>
              <p className="text-2xl font-mono font-bold text-blue-900">
                {result.referenceCode}
              </p>
              <p className="text-xs text-blue-500 mt-1">
                Use este código para identificar a sua denúncia.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-1 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Token Seguro (privado — não partilhe)
              </p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm break-all text-amber-900 flex-1">
                  {showToken ? result.secureToken : '•'.repeat(32)}
                </p>
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="text-amber-600 hover:text-amber-800"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-amber-600 mt-2">
                ⚠️ Guarde este token. Sem ele não pode verificar o estado da denúncia.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600 space-y-1">
              <p>📅 <strong>Prazo de acuse de recepção:</strong>{' '}
                {new Date(result.ackDeadline).toLocaleDateString('pt-PT')} (7 dias úteis)
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Conforme a Lei 93/2021 e a Directiva UE 2019/1937, receberá confirmação
                de recepção dentro de 7 dias e resolução em até 3 meses.
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a
              href={`/denuncias/estado?token=${result.secureToken}`}
              className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Verificar estado da denúncia
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur border-b border-white/10 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Canal de Denúncias</h1>
            <p className="text-white/60 text-xs">
              Canal seguro e confidencial — Lei 93/2021 · Directiva UE 2019/1937
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-12">
        {/* Legal notice */}
        <div className="mt-6 mb-4 bg-blue-900/40 border border-blue-500/30 rounded-xl p-4 text-blue-100 text-sm">
          <p className="font-semibold mb-1">🔒 A sua privacidade é protegida por lei</p>
          <p className="text-blue-200 text-xs">
            A sua identidade é protegida nos termos da Lei 93/2021 e da Directiva UE 2019/1937.
            É proibida qualquer retaliação contra denunciantes. As informações são tratadas
            com máxima confidencialidade.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Anonymity toggle */}
          <div className="p-6 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-3">Como quer submeter?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsAnonymous(true)}
                className={cn(
                  'p-4 rounded-xl border-2 text-left transition-all',
                  isAnonymous
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300',
                )}
              >
                <p className="font-semibold text-sm text-gray-800">🕵️ Anónimo</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Sem identificação pessoal. Maior protecção.
                </p>
              </button>
              <button
                onClick={() => setIsAnonymous(false)}
                className={cn(
                  'p-4 rounded-xl border-2 text-left transition-all',
                  !isAnonymous
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300',
                )}
              >
                <p className="font-semibold text-sm text-gray-800">👤 Identificado</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Com dados pessoais. Facilita o acompanhamento.
                </p>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Reporter info (if not anonymous) */}
            {!isAnonymous && (
              <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                <p className="text-sm font-semibold text-gray-700">Seus dados</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Nome completo *
                    </label>
                    <input
                      value={form.reporterName}
                      onChange={e => update('reporterName', e.target.value)}
                      className={cn(
                        'w-full border rounded-lg px-3 py-2 text-sm',
                        errors.reporterName ? 'border-red-400' : 'border-gray-300',
                      )}
                      placeholder="O seu nome"
                    />
                    {errors.reporterName && (
                      <p className="text-xs text-red-500 mt-1">{errors.reporterName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Relação com a organização *
                    </label>
                    <select
                      value={form.reporterRelation}
                      onChange={e => update('reporterRelation', e.target.value)}
                      className={cn(
                        'w-full border rounded-lg px-3 py-2 text-sm',
                        errors.reporterRelation ? 'border-red-400' : 'border-gray-300',
                      )}
                    >
                      <option value="">Seleccionar...</option>
                      {RELATIONS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    {errors.reporterRelation && (
                      <p className="text-xs text-red-500 mt-1">{errors.reporterRelation}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      E-mail (opcional)
                    </label>
                    <input
                      type="email"
                      value={form.reporterEmail}
                      onChange={e => update('reporterEmail', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="email@exemplo.pt"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Departamento (opcional)
                    </label>
                    <input
                      value={form.reporterDept}
                      onChange={e => update('reporterDept', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Departamento"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria da denúncia *
              </label>
              <select
                value={form.category}
                onChange={e => update('category', e.target.value)}
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-sm',
                  errors.category ? 'border-red-400' : 'border-gray-300',
                )}
              >
                <option value="">Seleccionar categoria...</option>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {errors.category && (
                <p className="text-xs text-red-500 mt-1">{errors.category}</p>
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assunto / Resumo *
              </label>
              <input
                value={form.subject}
                onChange={e => update('subject', e.target.value)}
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-sm',
                  errors.subject ? 'border-red-400' : 'border-gray-300',
                )}
                placeholder="Resumo breve da situação (mínimo 10 caracteres)"
              />
              {errors.subject && (
                <p className="text-xs text-red-500 mt-1">{errors.subject}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição detalhada *
              </label>
              <textarea
                rows={6}
                value={form.description}
                onChange={e => update('description', e.target.value)}
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-sm resize-none',
                  errors.description ? 'border-red-400' : 'border-gray-300',
                )}
                placeholder="Descreva os factos com o máximo de detalhe possível: o quê, quando, onde, quem, como... (mínimo 50 caracteres)"
              />
              <div className="flex justify-between mt-1">
                {errors.description ? (
                  <p className="text-xs text-red-500">{errors.description}</p>
                ) : <span />}
                <p className="text-xs text-gray-400">{form.description.length} caracteres</p>
              </div>
            </div>

            {/* Optional fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Data do incidente (se conhecida)
                </label>
                <input
                  type="date"
                  value={form.incidentDate}
                  onChange={e => update('incidentDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Local do incidente
                </label>
                <input
                  value={form.incidentLocation}
                  onChange={e => update('incidentLocation', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Departamento, escritório, online..."
                />
              </div>
            </div>

            {/* Repeat offense */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.repeatOffense}
                onChange={e => update('repeatOffense', e.target.checked)}
                className="w-4 h-4 rounded text-blue-600"
              />
              <span className="text-sm text-gray-700">
                Esta situação é recorrente / já aconteceu anteriormente
              </span>
            </label>

            {/* Persons involved */}
            <div>
              <button
                type="button"
                onClick={() => setShowPersons(!showPersons)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
              >
                {showPersons ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Pessoas envolvidas (opcional)
                {persons.length > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                    {persons.length}
                  </span>
                )}
              </button>

              {showPersons && (
                <div className="mt-3 space-y-3">
                  {persons.map((p, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded-full',
                          p.role === 'ACCUSED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600',
                        )}>
                          {p.role === 'ACCUSED' ? 'Visado' : 'Testemunha'}
                        </span>
                        <button onClick={() => removePerson(i)}>
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          value={p.name}
                          onChange={e => updatePerson(i, 'name', e.target.value)}
                          placeholder="Nome"
                          className="border border-gray-300 rounded px-2 py-1 text-xs"
                        />
                        <input
                          value={p.jobTitle}
                          onChange={e => updatePerson(i, 'jobTitle', e.target.value)}
                          placeholder="Cargo"
                          className="border border-gray-300 rounded px-2 py-1 text-xs"
                        />
                        <input
                          value={p.department}
                          onChange={e => updatePerson(i, 'department', e.target.value)}
                          placeholder="Departamento"
                          className="border border-gray-300 rounded px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button
                      onClick={() => addPerson('ACCUSED')}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Plus className="w-3 h-3" /> Adicionar visado
                    </button>
                    <button
                      onClick={() => addPerson('WITNESS')}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                    >
                      <Plus className="w-3 h-3" /> Adicionar testemunha
                    </button>
                  </div>
                </div>
              )}
            </div>

            {errors.submit && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{errors.submit}</p>
              </div>
            )}

            {/* Submit */}
            <div className="pt-2">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'A submeter...' : 'Submeter Denúncia'}
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">
                Ao submeter, aceita os termos de confidencialidade. A sua denúncia será
                tratada com sigilo absoluto nos termos da legislação aplicável.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
