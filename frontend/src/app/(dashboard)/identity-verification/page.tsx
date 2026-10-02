'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCheck, Building2, ShieldAlert, CheckCircle2, XCircle, Clock, Cpu, Hand, Euro, Info } from 'lucide-react';
import { identityVerificationApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { ModuleGuard } from '@/components/module-guard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: 'A processar',        cls: 'bg-blue-100 text-blue-700' },
  REVIEW:   { label: 'Aguarda decisão',    cls: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Aprovado',           cls: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejeitado',          cls: 'bg-red-100 text-red-600' },
  ERROR:    { label: 'Erro',               cls: 'bg-gray-100 text-gray-600' },
};
const KINDS = [
  { key: 'individual', label: 'Pessoa', icon: UserCheck },
  { key: 'business',   label: 'Empresa', icon: Building2 },
  { key: 'sanctions',  label: 'Sanções / PEP', icon: ShieldAlert },
] as const;
type Kind = (typeof KINDS)[number]['key'];

const errMsg = (e: any) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(', ') : m || e?.message || 'Erro inesperado';
};
const money = (n: number | string | null | undefined, cur = 'EUR') =>
  n == null ? '—' : new Intl.NumberFormat('pt-PT', { style: 'currency', currency: cur }).format(Number(n));

const FEATURE_LABEL: Record<string, string> = { individual: 'Verificação de pessoas', business: 'Verificação de empresas', sanctions: 'Rastreio de sanções / PEP' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>{children}</div>;
}
const input = 'w-full border rounded-lg px-3 py-2 text-sm';

function ModeCard({ settings, canAccept, onAccept, busy }: { settings: any; canAccept: boolean; onAccept: (v: number) => void; busy: boolean }) {
  const c = settings.commercial;
  const auto = settings.mode === 'AUTOMATED';
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', auto ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600')}>
          {auto ? <Cpu className="w-5 h-5" /> : <Hand className="w-5 h-5" />}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{auto ? 'Modo automático' : 'Modo manual'}</p>
          <p className="text-sm text-gray-600">
            {auto
              ? `As verificações são feitas pelo fornecedor ${settings.effective}, ao preço acordado por verificação.`
              : 'Os pedidos ficam registados e uma pessoa decide (aprova ou rejeita) com base nas suas diligências. Sem custos adicionais.'}
          </p>
        </div>
      </div>

      {!auto && !c.terms && (
        <p className="text-xs text-gray-500 flex gap-1.5"><Info className="w-4 h-4 flex-shrink-0" />
          A verificação automática por um fornecedor especializado exige condições comerciais (taxa de arranque e preço por verificação). Contacte-nos para a ativar; o modo manual continua sempre disponível.</p>
      )}
      {!auto && c.terms && !c.providerReady && c.accepted && (
        <p className="text-xs text-gray-500 flex gap-1.5"><Info className="w-4 h-4 flex-shrink-0" />
          Condições aceites. A ligação ao fornecedor está em curso; até lá os pedidos continuam em modo manual.</p>
      )}

      {c.terms && (
        <div className={cn('rounded-lg border p-4 text-sm space-y-2', c.awaitingAcceptance ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200 bg-gray-50')}>
          <p className="font-medium text-gray-900 flex items-center gap-1.5"><Euro className="w-4 h-4" /> Condições comerciais — verificação automática (v{c.terms.version})</p>
          <ul className="text-gray-700 space-y-0.5">
            <li>Taxa de arranque (única): <b>{money(c.terms.setupFee, c.terms.currency)}</b></li>
            {Object.entries(c.terms.prices).map(([k, v]) => (
              <li key={k}>{FEATURE_LABEL[k] ?? k}: <b>{money(v as number, c.terms.currency)}</b> por verificação (pay-as-you-go)</li>
            ))}
          </ul>
          {c.terms.note && <p className="text-xs text-gray-500">{c.terms.note}</p>}
          <p className="text-xs text-gray-500">Valores sem IVA. As verificações manuais não têm custo.</p>
          {c.accepted ? (
            <p className="text-xs text-green-700">Aceites em {format(new Date(c.acceptance.acceptedAt), 'dd/MM/yyyy')}.</p>
          ) : canAccept ? (
            <Button size="sm" disabled={busy} onClick={() => { if (confirm('Aceita as condições comerciais acima? A taxa de arranque e cada verificação automática serão faturadas.')) onAccept(c.terms.version); }}>
              {busy ? 'A guardar…' : 'Aceitar condições'}
            </Button>
          ) : (
            <p className="text-xs text-amber-700">Aguarda aceitação por um administrador da organização.</p>
          )}
        </div>
      )}

      {settings.usage?.automatedChecks > 0 && (
        <p className="text-xs text-gray-500">Este mês ({settings.usage.month}): {settings.usage.automatedChecks} verificações automáticas · {money(settings.usage.amount, settings.usage.currency)}</p>
      )}
    </div>
  );
}

function NewVerification({ canWrite, mode, onDone }: { canWrite: boolean; mode: string; onDone: () => void }) {
  const [kind, setKind] = useState<Kind>('individual');
  const [f, setF] = useState<Record<string, string>>({ country: 'PT' });
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const clean = () => Object.fromEntries(Object.entries(f).filter(([, v]) => v.trim() !== ''));
  const mut = useMutation({
    mutationFn: () => {
      const d = clean();
      return kind === 'individual' ? identityVerificationApi.individual(d)
        : kind === 'business' ? identityVerificationApi.business(d) : identityVerificationApi.sanctions(d);
    },
    onSuccess: () => { setF({ country: 'PT' }); onDone(); },
    onError: e => alert(errMsg(e)),
  });
  const valid = kind === 'individual' ? !!f.fullName?.trim() && !!f.country?.trim()
    : kind === 'business' ? !!f.legalName?.trim() && !!f.country?.trim() : !!f.name?.trim();

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-semibold text-gray-900">Novo pedido</h2>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {KINDS.map(k => (
            <button key={k.key} onClick={() => { setKind(k.key); setF({ country: 'PT' }); }}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium', kind === k.key ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600')}>
              <k.icon className="w-4 h-4" /> {k.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {kind === 'individual' && <>
          <Field label="Nome completo *"><input className={input} value={f.fullName ?? ''} onChange={e => set('fullName', e.target.value)} /></Field>
          <Field label="País (ISO-2) *"><input className={input} maxLength={2} value={f.country ?? ''} onChange={e => set('country', e.target.value.toUpperCase())} /></Field>
          <Field label="Tipo de documento"><input className={input} placeholder="Cartão de Cidadão, Passaporte…" value={f.documentType ?? ''} onChange={e => set('documentType', e.target.value)} /></Field>
          <Field label="Nº do documento"><input className={input} value={f.documentNumber ?? ''} onChange={e => set('documentNumber', e.target.value)} /></Field>
          <Field label="Email"><input className={input} type="email" value={f.email ?? ''} onChange={e => set('email', e.target.value)} /></Field>
        </>}
        {kind === 'business' && <>
          <Field label="Denominação legal *"><input className={input} value={f.legalName ?? ''} onChange={e => set('legalName', e.target.value)} /></Field>
          <Field label="País (ISO-2) *"><input className={input} maxLength={2} value={f.country ?? ''} onChange={e => set('country', e.target.value.toUpperCase())} /></Field>
          <Field label="NIF / VAT"><input className={input} value={f.vatNumber ?? ''} onChange={e => set('vatNumber', e.target.value)} /></Field>
          <Field label="Nº de registo comercial"><input className={input} value={f.registrationNumber ?? ''} onChange={e => set('registrationNumber', e.target.value)} /></Field>
        </>}
        {kind === 'sanctions' && <>
          <Field label="Nome *"><input className={input} value={f.name ?? ''} onChange={e => set('name', e.target.value)} /></Field>
          <Field label="País (ISO-2)"><input className={input} maxLength={2} value={f.country ?? ''} onChange={e => set('country', e.target.value.toUpperCase())} /></Field>
          <Field label="Data de nascimento"><input className={input} type="date" value={f.dateOfBirth ?? ''} onChange={e => set('dateOfBirth', e.target.value)} /></Field>
        </>}
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-500">{mode === 'AUTOMATED' ? 'Será processado pelo fornecedor (cobrado ao preço acordado).' : 'Fica registado para decisão manual. O nº do documento é guardado mascarado.'}</p>
        <Button size="sm" disabled={!canWrite || !valid || mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? 'A enviar…' : 'Registar pedido'}</Button>
      </div>
      {!canWrite && <p className="text-xs text-amber-700">O seu perfil só tem acesso de leitura a este módulo.</p>}
    </div>
  );
}

function DecisionModal({ v, onClose, onSave, busy }: { v: any; onClose: () => void; onSave: (d: any) => void; busy: boolean }) {
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="font-semibold">Decisão — {v.subjectName}</h3>
          <button className="text-gray-400 text-2xl leading-none" onClick={onClose}>&times;</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex gap-2">
            {(['APPROVED', 'REJECTED'] as const).map(d => (
              <button key={d} onClick={() => setDecision(d)}
                className={cn('flex-1 py-2 rounded-lg border text-sm font-medium', decision === d ? (d === 'APPROVED' ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600') : 'bg-white text-gray-600')}>
                {d === 'APPROVED' ? 'Aprovar' : 'Rejeitar'}
              </button>
            ))}
          </div>
          <Field label="Fundamentação (diligências feitas, listas consultadas…)">
            <textarea className={input + ' resize-none'} rows={4} value={note} onChange={e => setNote(e.target.value)} />
          </Field>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={busy} onClick={() => onSave({ decision, note: note.trim() || undefined })}>{busy ? 'A guardar…' : 'Guardar decisão'}</Button>
        </div>
      </div>
    </div>
  );
}

function IdentityInner() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [status, setStatus] = useState('');
  const [deciding, setDeciding] = useState<any>(null);
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role ?? '');

  const { data: settings, error: settingsError } = useQuery({
    queryKey: ['identity-settings'], queryFn: () => identityVerificationApi.settings().then(r => r.data),
  });
  const { data: items = [], isLoading } = useQuery<any[]>({
    queryKey: ['identity-verifications', status], queryFn: () => identityVerificationApi.list(status || undefined).then(r => r.data),
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['identity-settings'] }); qc.invalidateQueries({ queryKey: ['identity-verifications'] }); };
  const acceptMut = useMutation({ mutationFn: (v: number) => identityVerificationApi.acceptTerms(v), onSuccess: refresh, onError: e => alert(errMsg(e)) });
  const decideMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: any }) => identityVerificationApi.decide(id, d),
    onSuccess: () => { refresh(); setDeciding(null); }, onError: e => alert(errMsg(e)),
  });

  if (settingsError) {
    return <div className="p-8 text-center text-gray-600">Este módulo não está disponível para a sua organização ou perfil. Se precisa dele, contacte-nos para ativar o add-on de Verificação de Identidade.</div>;
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Verificação de Identidade</h1>
        <p className="text-sm text-gray-500">KYC · KYB · rastreio de sanções e PEP. Funciona em modo manual desde o primeiro dia; a verificação automática por um fornecedor especializado liga-se quando for contratada.</p>
      </div>

      {settings && <ModeCard settings={settings} canAccept={isAdmin} busy={acceptMut.isPending} onAccept={v => acceptMut.mutate(v)} />}
      <NewVerification canWrite mode={settings?.mode ?? 'MANUAL'} onDone={refresh} />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-gray-900">Pedidos</h2>
          <select className="border rounded-lg px-3 py-1.5 text-sm" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">Todos os estados</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        {isLoading ? <p className="p-5 text-sm text-gray-400">A carregar…</p> : items.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">Ainda não há pedidos.</p>
        ) : items.map(v => {
          const st = STATUS[v.status] ?? STATUS.ERROR;
          return (
            <div key={v.id} className="px-5 py-3 border-b last:border-b-0 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <p className="text-sm font-medium text-gray-900">{v.subjectName} <span className="text-xs text-gray-400">· {v.subjectType === 'BUSINESS' ? 'Empresa' : 'Pessoa'}{v.country ? ` · ${v.country}` : ''}</span></p>
                <p className="text-xs text-gray-500">
                  {format(new Date(v.createdAt), 'dd/MM/yyyy HH:mm')} · {v.automated ? `Automático (${v.provider})` : 'Manual'}
                  {v.automated && v.unitPrice != null ? ` · ${money(v.unitPrice, v.currency ?? 'EUR')}` : ''}
                  {v.riskScore != null ? ` · risco ${v.riskScore}` : ''}
                </p>
                {v.decisionNote && <p className="text-xs text-gray-600 mt-0.5">“{v.decisionNote}”</p>}
              </div>
              <span className={cn('text-xs font-medium rounded-full px-2.5 py-0.5 flex items-center gap-1', st.cls)}>
                {v.status === 'APPROVED' ? <CheckCircle2 className="w-3 h-3" /> : v.status === 'REJECTED' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}{st.label}
              </span>
              {['REVIEW', 'ERROR'].includes(v.status) && <Button size="sm" variant="outline" onClick={() => setDeciding(v)}>Decidir</Button>}
            </div>
          );
        })}
      </div>

      {deciding && <DecisionModal v={deciding} busy={decideMut.isPending} onClose={() => setDeciding(null)} onSave={d => decideMut.mutate({ id: deciding.id, d })} />}
    </div>
  );
}

export default function IdentityVerificationPage() {
  return (
    <ModuleGuard moduleKey="aml">
      <IdentityInner />
    </ModuleGuard>
  );
}
