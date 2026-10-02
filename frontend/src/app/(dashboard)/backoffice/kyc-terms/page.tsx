'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCheck, AlertCircle } from 'lucide-react';
import { identityVerificationApi, licensingApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const errMsg = (e: any) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(', ') : m || e?.message || 'Erro inesperado';
};
const input = 'w-full border rounded-lg px-3 py-2 text-sm';

/** Backoffice: propose the commercial terms (set-up fee + PAYG per feature) of automated KYC for one customer. */
const FEATURES = [
  { key: 'default', label: 'Predefinição (tudo o que não tiver escolha própria)' },
  { key: 'individual', label: 'Verificação de pessoas' },
  { key: 'business', label: 'Verificação de empresas' },
  { key: 'sanctions', label: 'Sanções / PEP' },
] as const;

/** Which provider serves which feature — switch vendor at any time, for one customer or for all of them. */
function RoutingEditor({ orgId, settings, onSaved }: { orgId: string; settings: any; onSaved: () => void }) {
  const configured: any[] = (settings.providers ?? []).filter((p: any) => p.configured);
  const current = (k: string) => (k === 'default' ? settings.selected : settings.routing?.[k]?.chosen) ?? '';
  const [draft, setDraft] = useState<Record<string, string>>({});
  const value = (k: string) => (k in draft ? draft[k] : current(k));
  const payload = () => Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v === '' ? null : v]));
  const one = useMutation({ mutationFn: () => identityVerificationApi.setRouting(orgId, payload()), onSuccess: () => { setDraft({}); onSaved(); }, onError: e => alert(errMsg(e)) });
  const all = useMutation({ mutationFn: () => identityVerificationApi.setRoutingAll(payload()), onSuccess: r => { setDraft({}); onSaved(); alert(`Atualizado em ${r.data.updated} cliente(s).`); }, onError: e => alert(errMsg(e)) });

  return (
    <div className="bg-white rounded-xl border p-5 space-y-3">
      <h2 className="font-semibold text-gray-900">Fornecedores (quem faz o quê)</h2>
      <p className="text-xs text-gray-500">
        Fornecedores configurados na plataforma: {configured.length ? configured.map((p: any) => p.displayName).join(', ') : 'nenhum (tudo manual)'}.
        Mudar de fornecedor não altera o que o cliente paga. Se o escolhido não puder fazer a funcionalidade, usa-se outro que possa; se nenhum puder, fica manual.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {FEATURES.map(f => (
          <div key={f.key}>
            <label className="block text-sm mb-1">{f.label}</label>
            <select className={input} value={value(f.key)} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}>
              <option value="">Automático (predefinição da plataforma)</option>
              {configured.filter((p: any) => f.key === 'default' || p.capabilities?.[f.key]).map((p: any) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
            </select>
            {f.key !== 'default' && <p className="text-[11px] text-gray-400 mt-0.5">Hoje: {settings.routing?.[f.key]?.effective ?? 'manual'}</p>}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={!Object.keys(draft).length || one.isPending} onClick={() => one.mutate()}>Aplicar a este cliente</Button>
        <Button size="sm" variant="outline" disabled={!Object.keys(draft).length || all.isPending}
          onClick={() => { if (confirm('Aplicar a TODOS os clientes com o add-on de Verificação de Identidade?')) all.mutate(); }}>
          Aplicar a todos os clientes
        </Button>
      </div>
    </div>
  );
}

export default function KycTermsPage() {
  const qc = useQueryClient();
  const [orgId, setOrgId] = useState('');
  const [form, setForm] = useState({ setupFee: '', priceIndividual: '', priceBusiness: '', priceSanctions: '', note: '' });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const { data: clientsRaw, error } = useQuery({ queryKey: ['kyc-terms-clients'], queryFn: () => licensingApi.listClients().then(r => r.data) });
  const clients: any[] = Array.isArray(clientsRaw) ? clientsRaw : clientsRaw?.items ?? [];
  const { data: settings, error: settingsError } = useQuery({
    queryKey: ['kyc-terms', orgId], enabled: !!orgId, retry: false,
    queryFn: () => identityVerificationApi.adminSettings(orgId).then(r => r.data),
  });

  const num = (s: string) => (s.trim() === '' ? undefined : Number(s.replace(',', '.')));
  const save = useMutation({
    mutationFn: () => identityVerificationApi.proposeTerms(orgId, {
      currency: 'EUR', setupFee: num(form.setupFee) ?? 0,
      priceIndividual: num(form.priceIndividual), priceBusiness: num(form.priceBusiness), priceSanctions: num(form.priceSanctions),
      note: form.note.trim() || undefined,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kyc-terms', orgId] }),
    onError: e => alert(errMsg(e)),
  });

  if (error) {
    return <div className="p-8 max-w-xl mx-auto text-center text-gray-600"><AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500" />Sem acesso: esta página é exclusiva do backoffice da Contemporary Constellation.</div>;
  }
  const c = settings?.commercial;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><UserCheck className="w-5 h-5" /></div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">KYC — condições comerciais</h1>
          <p className="text-sm text-gray-500">Taxa de arranque e preço pay-as-you-go por funcionalidade. Só depois de o administrador do cliente aceitar é que as verificações passam a ser automáticas (e cobradas).</p>
        </div>
      </div>

      <select className={input} value={orgId} onChange={e => setOrgId(e.target.value)}>
        <option value="">Escolher cliente…</option>
        {clients.map((cl: any) => <option key={cl.organizationId ?? cl.id} value={cl.organizationId ?? cl.id}>{cl.organization?.name ?? cl.name ?? cl.organizationName ?? cl.id}</option>)}
      </select>

      {orgId && settingsError && <p className="text-sm text-amber-700">Este cliente não tem o add-on “Verificação de Identidade” ativo. Ative-o primeiro em Backoffice → Licenciamento.</p>}

      {settings && (
        <>
          <div className="bg-white rounded-xl border p-4 text-sm space-y-1">
            <p>Modo atual: <b>{settings.mode === 'AUTOMATED' ? 'Automático' : 'Manual'}</b> · fornecedor na plataforma: <b>{settings.effective ?? 'nenhum configurado'}</b></p>
            {c.terms ? (
              <p>Condições v{c.terms.version}: arranque {c.terms.setupFee} € ·{' '}
                {Object.entries(c.terms.prices).map(([k, v]) => `${k} ${v} €`).join(' · ')} —{' '}
                {c.accepted ? <span className="text-green-700">aceites em {format(new Date(c.acceptance.acceptedAt), 'dd/MM/yyyy')}</span> : <span className="text-amber-700">a aguardar aceitação</span>}</p>
            ) : <p className="text-gray-500">Ainda sem condições propostas.</p>}
            <p className="text-gray-500">Este mês: {settings.usage.automatedChecks} verificações automáticas · {settings.usage.amount} € {c.accepted && '(faturar manualmente em Licenciamento)'}</p>
          </div>

          <RoutingEditor orgId={orgId} settings={settings} onSaved={() => qc.invalidateQueries({ queryKey: ['kyc-terms', orgId] })} />

          <div className="bg-white rounded-xl border p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">{c.terms ? 'Rever condições (nova versão)' : 'Propor condições'}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="block text-sm mb-1">Taxa de arranque (€) *</label><input className={input} inputMode="decimal" value={form.setupFee} onChange={e => set('setupFee', e.target.value)} /></div>
              <div />
              <div><label className="block text-sm mb-1">Preço por verificação de pessoa (€)</label><input className={input} inputMode="decimal" value={form.priceIndividual} onChange={e => set('priceIndividual', e.target.value)} /></div>
              <div><label className="block text-sm mb-1">Preço por verificação de empresa (€)</label><input className={input} inputMode="decimal" value={form.priceBusiness} onChange={e => set('priceBusiness', e.target.value)} /></div>
              <div><label className="block text-sm mb-1">Preço por rastreio de sanções/PEP (€)</label><input className={input} inputMode="decimal" value={form.priceSanctions} onChange={e => set('priceSanctions', e.target.value)} /></div>
            </div>
            <div><label className="block text-sm mb-1">Nota para o cliente</label><textarea className={input + ' resize-none'} rows={2} value={form.note} onChange={e => set('note', e.target.value)} /></div>
            <p className="text-xs text-gray-500">Deixe em branco a funcionalidade que não quer oferecer. Uma nova versão exige nova aceitação do cliente.</p>
            <Button size="sm" disabled={save.isPending || form.setupFee.trim() === ''} onClick={() => save.mutate()}>{save.isPending ? 'A guardar…' : 'Guardar condições'}</Button>
          </div>
        </>
      )}
    </div>
  );
}
