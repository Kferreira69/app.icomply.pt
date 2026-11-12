'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCheck, AlertCircle, PlugZap, Download, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { identityVerificationApi, licensingApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const errMsg = (e: any) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(', ') : m || e?.message || 'Erro inesperado';
};
const input = 'w-full border rounded-lg px-3 py-2 text-sm';
const money = (n: number, cur = 'EUR') => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: cur }).format(n);
const FEATURE_LABEL: Record<string, string> = { individual: 'Pessoas', business: 'Empresas', sanctions: 'Sanções / PEP' };

/** Backoffice: propose the commercial terms (set-up fee + PAYG per feature) of automated KYC for one customer. */
const FEATURES = [
  { key: 'default', label: 'Predefinição (tudo o que não tiver escolha própria)' },
  { key: 'individual', label: 'Verificação de pessoas' },
  { key: 'business', label: 'Verificação de empresas' },
  { key: 'sanctions', label: 'Sanções / PEP' },
] as const;

/** Providers wired to this environment, with a harmless "can we talk to it?" test (never a billable call). */
function ProvidersPanel({ providers }: { providers: any[] }) {
  const [results, setResults] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState<string | null>(null);
  async function test(id: string) {
    setBusy(id);
    try { setResults(r => ({ ...r, [id]: (null as any) })); const res = await identityVerificationApi.adminCheck(id); setResults(r => ({ ...r, [id]: res.data })); }
    catch (e) { setResults(r => ({ ...r, [id]: { ok: false, detail: errMsg(e) } })); }
    finally { setBusy(null); }
  }
  return (
    <div className="bg-white rounded-xl border p-5 space-y-3">
      <h2 className="font-semibold text-gray-900 flex items-center gap-2"><PlugZap className="w-4 h-4" /> Fornecedores ligados a este ambiente</h2>
      <p className="text-xs text-gray-500">Um fornecedor aparece como “configurado” quando as suas variáveis de ambiente estão no servidor (ver PROVIDERS.md). “Testar ligação” confirma que a plataforma o alcança com essas credenciais, sem criar nada nem gerar custos.</p>
      <div className="divide-y">
        {providers.map(p => {
          const r = results[p.id];
          return (
            <div key={p.id} className="py-2.5 flex flex-wrap items-start gap-3">
              <div className="flex-1 min-w-[220px]">
                <p className="text-sm font-medium text-gray-900">{p.displayName} <span className={`ml-1 text-[11px] rounded-full px-2 py-0.5 ${p.configured ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.configured ? 'configurado' : 'não configurado'}</span></p>
                <p className="text-[11px] text-gray-400">Faz: {['individual', 'business', 'sanctions'].filter(k => p.capabilities?.[k]).map(k => FEATURE_LABEL[k]).join(', ') || '—'}</p>
                {r && (
                  <p className={`text-xs mt-1 flex items-start gap-1 ${r.ok === true ? 'text-green-700' : r.ok === false ? 'text-red-600' : 'text-gray-600'}`}>
                    {r.ok === true ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> : r.ok === false ? <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> : <HelpCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
                    {r.detail}
                  </p>
                )}
              </div>
              <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => test(p.id)}>{busy === p.id ? 'A testar…' : 'Testar ligação'}</Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** What to invoice: automated checks of a month per customer, and the one-off set-up fees. */
function UsagePanel() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const { data, isLoading } = useQuery({ queryKey: ['kyc-usage', month], queryFn: () => identityVerificationApi.adminUsage(month).then(r => r.data) });
  const invoiced = useMutation({
    mutationFn: ({ orgId, value }: { orgId: string; value: boolean }) => identityVerificationApi.setupInvoiced(orgId, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kyc-usage'] }), onError: e => alert(errMsg(e)),
  });

  function csv() {
    if (!data) return;
    const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [['Cliente', 'Fornecedor', 'Funcionalidade', 'Verificações', 'Valor (EUR)'].map(q).join(';'),
      ...data.rows.map((r: any) => [r.organizationName, r.provider, FEATURE_LABEL[r.feature] ?? r.feature, r.checks, String(r.amount).replace('.', ',')].map(q).join(';')),
      ['TOTAL', '', '', data.totals.checks, String(data.totals.amount).replace('.', ',')].map(q).join(';')];
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `kyc-consumo-${data.month}.csv`; a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="bg-white rounded-xl border p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-gray-900">Consumo e faturação</h2>
        <div className="flex items-center gap-2">
          <input type="month" className="border rounded-lg px-2 py-1.5 text-sm" value={month} onChange={e => e.target.value && setMonth(e.target.value)} />
          <Button size="sm" variant="outline" disabled={!data?.rows?.length} onClick={csv}><Download className="w-4 h-4 mr-1" /> CSV</Button>
        </div>
      </div>
      {isLoading ? <p className="text-sm text-gray-400">A carregar…</p> : !data ? null : (
        <>
          {data.rows.length === 0 ? <p className="text-sm text-gray-500">Sem verificações automáticas em {data.month}.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-gray-500 border-b"><th className="py-1.5 pr-3">Cliente</th><th className="pr-3">Fornecedor</th><th className="pr-3">Funcionalidade</th><th className="pr-3 text-right">Verificações</th><th className="text-right">Valor</th></tr></thead>
                <tbody>
                  {data.rows.map((r: any) => (
                    <tr key={`${r.organizationId}${r.provider}${r.feature}`} className="border-b last:border-b-0">
                      <td className="py-1.5 pr-3">{r.organizationName}</td><td className="pr-3">{r.provider}</td><td className="pr-3">{FEATURE_LABEL[r.feature] ?? r.feature}</td>
                      <td className="pr-3 text-right">{r.checks}</td><td className="text-right">{money(r.amount, r.currency)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold"><td className="py-1.5" colSpan={3}>Total (sem IVA)</td><td className="pr-3 text-right">{data.totals.checks}</td><td className="text-right">{money(data.totals.amount, data.totals.currency)}</td></tr>
                </tbody>
              </table>
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">Taxas de arranque (condições aceites)</h3>
            {data.setupFees.length === 0 ? <p className="text-sm text-gray-500">Nenhum cliente aceitou condições ainda.</p> : data.setupFees.map((s: any) => (
              <div key={s.organizationId} className="flex flex-wrap items-center gap-3 py-1.5 text-sm border-b last:border-b-0">
                <span className="flex-1 min-w-[160px]">{s.organizationName} — <b>{money(s.amount, s.currency)}</b> <span className="text-xs text-gray-400">(aceite em {format(new Date(s.acceptedAt), 'dd/MM/yyyy')})</span></span>
                {s.invoicedAt
                  ? <span className="text-xs text-green-700">faturada em {format(new Date(s.invoicedAt), 'dd/MM/yyyy')} <button className="underline ml-1 text-gray-500" onClick={() => invoiced.mutate({ orgId: s.organizationId, value: false })}>desfazer</button></span>
                  : <Button size="sm" variant="outline" onClick={() => invoiced.mutate({ orgId: s.organizationId, value: true })}>Marcar como faturada</Button>}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">A faturação é feita por si (Moloni); este relatório diz o que faturar. Os valores são os preços em vigor na data de cada verificação.</p>
        </>
      )}
    </div>
  );
}

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
  const [form, setForm] = useState({ setupFee: '', priceIndividual: '', priceBusiness: '', priceSanctions: '', monthlyCap: '', note: '' });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const { data: clientsRaw, error } = useQuery({ queryKey: ['kyc-terms-clients'], queryFn: () => licensingApi.listClients().then(r => r.data) });
  const clients: any[] = Array.isArray(clientsRaw) ? clientsRaw : clientsRaw?.items ?? [];
  const { data: overview } = useQuery({ queryKey: ['kyc-usage', 'providers'], queryFn: () => identityVerificationApi.adminUsage().then(r => r.data), enabled: !error });
  const { data: settings, error: settingsError } = useQuery({
    queryKey: ['kyc-terms', orgId], enabled: !!orgId, retry: false,
    queryFn: () => identityVerificationApi.adminSettings(orgId).then(r => r.data),
  });

  const num = (s: string) => (s.trim() === '' ? undefined : Number(s.replace(',', '.')));
  const save = useMutation({
    mutationFn: () => identityVerificationApi.proposeTerms(orgId, {
      currency: 'EUR', setupFee: num(form.setupFee) ?? 0,
      priceIndividual: num(form.priceIndividual), priceBusiness: num(form.priceBusiness), priceSanctions: num(form.priceSanctions),
      monthlyCap: num(form.monthlyCap),
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
          <h1 className="text-xl font-semibold text-gray-900">KYC — fornecedores, condições e consumo</h1>
          <p className="text-sm text-gray-500">Taxa de arranque e preço pay-as-you-go por funcionalidade. Só depois de o administrador do cliente aceitar é que as verificações passam a ser automáticas (e cobradas).</p>
        </div>
      </div>

      {overview?.providers && <ProvidersPanel providers={overview.providers} />}
      <UsagePanel />

      <h2 className="text-sm font-semibold text-gray-700 pt-2">Por cliente</h2>
      <select className={input} value={orgId} onChange={e => setOrgId(e.target.value)}>
        <option value="">Escolher cliente…</option>
        {clients.map((cl: any) => <option key={cl.organizationId ?? cl.id} value={cl.organizationId ?? cl.id}>{cl.organization?.name ?? cl.name ?? cl.organizationName ?? cl.id}</option>)}
      </select>

      {orgId && settingsError && <p className="text-sm text-amber-700">Este cliente não tem o add-on “Verificação de Identidade” ativo. Ative-o primeiro em Backoffice → Licenciamento.</p>}
      {orgId && settings && settings.addonActive === false && <p className="text-sm text-amber-700">O add-on “Verificação de Identidade” não está ativo para este cliente: ative-o em Backoffice → Licenciamento antes de propor condições.</p>}

      {settings && (
        <>
          <div className="bg-white rounded-xl border p-4 text-sm space-y-1">
            <p>Modo atual: <b>{settings.mode === 'AUTOMATED' ? 'Automático' : 'Manual'}</b> · fornecedor na plataforma: <b>{settings.effective ?? 'nenhum configurado'}</b></p>
            {c.terms ? (
              <p>Condições v{c.terms.version}: arranque {c.terms.setupFee} € ·{' '}
                {Object.entries(c.terms.prices).map(([k, v]) => `${FEATURE_LABEL[k] ?? k} ${v} €`).join(' · ')}{c.terms.monthlyCap != null ? ` · teto mensal ${c.terms.monthlyCap} €` : ''} —{' '}
                {c.accepted ? <span className="text-green-700">aceites em {format(new Date(c.acceptance.acceptedAt), 'dd/MM/yyyy')}</span> : <span className="text-amber-700">a aguardar aceitação</span>}</p>
            ) : <p className="text-gray-500">Ainda sem condições propostas.</p>}
            <p className="text-gray-500">Este mês: {settings.usage.automatedChecks} verificações automáticas · {settings.usage.amount} €{settings.usage.cap != null ? ` de ${settings.usage.cap} €` : ''}{settings.usage.capReached ? ' — teto atingido: novos pedidos ficam em modo manual' : ''}</p>
          </div>

          <RoutingEditor orgId={orgId} settings={settings} onSaved={() => qc.invalidateQueries({ queryKey: ['kyc-terms', orgId] })} />

          <div className="bg-white rounded-xl border p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">{c.terms ? 'Rever condições (nova versão)' : 'Propor condições'}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="block text-sm mb-1">Taxa de arranque (€) *</label><input className={input} inputMode="decimal" value={form.setupFee} onChange={e => set('setupFee', e.target.value)} /></div>
              <div><label className="block text-sm mb-1">Teto de consumo por mês (€)</label><input className={input} inputMode="decimal" placeholder="sem teto" value={form.monthlyCap} onChange={e => set('monthlyCap', e.target.value)} /></div>
              <div><label className="block text-sm mb-1">Preço por verificação de pessoa (€)</label><input className={input} inputMode="decimal" value={form.priceIndividual} onChange={e => set('priceIndividual', e.target.value)} /></div>
              <div><label className="block text-sm mb-1">Preço por verificação de empresa (€)</label><input className={input} inputMode="decimal" value={form.priceBusiness} onChange={e => set('priceBusiness', e.target.value)} /></div>
              <div><label className="block text-sm mb-1">Preço por rastreio de sanções/PEP (€)</label><input className={input} inputMode="decimal" value={form.priceSanctions} onChange={e => set('priceSanctions', e.target.value)} /></div>
            </div>
            <div><label className="block text-sm mb-1">Nota para o cliente</label><textarea className={input + ' resize-none'} rows={2} value={form.note} onChange={e => set('note', e.target.value)} /></div>
            <p className="text-xs text-gray-500">Deixe em branco a funcionalidade que não quer oferecer. O teto protege o cliente de surpresas: ao atingi-lo, os novos pedidos ficam em modo manual até ao mês seguinte. Uma nova versão exige nova aceitação do cliente.</p>
            <Button size="sm" disabled={save.isPending || form.setupFee.trim() === ''} onClick={() => save.mutate()}>{save.isPending ? 'A guardar…' : 'Guardar condições'}</Button>
          </div>
        </>
      )}
    </div>
  );
}
