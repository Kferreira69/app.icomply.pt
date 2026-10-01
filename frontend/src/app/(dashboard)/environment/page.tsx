'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { environmentApi } from '@/lib/api';
import { usePermissions } from '@/hooks/use-permissions';
import { ModuleGuard } from '@/components/module-guard';
import { HelpButton } from '@/components/help/HelpButton';
import { Button } from '@/components/ui/button';
import {
  Recycle, CheckCircle2, XCircle, AlertCircle, MinusCircle, Pencil, Plus, Trash2, FileText, Scale, Target,
  Leaf, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// ── labels ───────────────────────────────────────────────────────────────

const TABS = [
  { key: 'requirements', label: 'Requisitos ISO 14001', icon: CheckCircle2 },
  { key: 'aspects',      label: 'Aspetos e Impactos',   icon: Leaf },
  { key: 'objectives',   label: 'Objetivos e Metas',    icon: Target },
  { key: 'obligations',  label: 'Requisitos Legais',    icon: Scale },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const REQ_STATUS: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  NOT_IMPLEMENTED: { label: 'Não implementado', color: 'text-red-600',    bg: 'bg-red-100',    icon: XCircle },
  PARTIAL:         { label: 'Parcial',          color: 'text-yellow-700', bg: 'bg-yellow-100', icon: AlertCircle },
  IMPLEMENTED:     { label: 'Implementado',     color: 'text-green-700',  bg: 'bg-green-100',  icon: CheckCircle2 },
  NOT_APPLICABLE:  { label: 'N/A',              color: 'text-gray-500',   bg: 'bg-gray-100',   icon: MinusCircle },
};

const CLAUSE_TITLES: Record<string, string> = {
  '4': 'Contexto da organização', '5': 'Liderança', '6': 'Planeamento', '7': 'Suporte',
  '8': 'Operacionalização', '9': 'Avaliação do desempenho', '10': 'Melhoria',
};

const CONDITIONS: Record<string, string> = { NORMAL: 'Normal', ABNORMAL: 'Anormal', EMERGENCY: 'Emergência' };
const OBJ_STATUS: Record<string, { label: string; cls: string }> = {
  PLANNED:      { label: 'Planeado',      cls: 'bg-gray-100 text-gray-600' },
  IN_PROGRESS:  { label: 'Em curso',      cls: 'bg-blue-100 text-blue-700' },
  ACHIEVED:     { label: 'Alcançado',     cls: 'bg-green-100 text-green-700' },
  NOT_ACHIEVED: { label: 'Não alcançado', cls: 'bg-red-100 text-red-600' },
  CANCELLED:    { label: 'Cancelado',     cls: 'bg-gray-100 text-gray-400' },
};
const CATEGORIES: Record<string, string> = {
  WASTE: 'Resíduos', EMISSIONS: 'Emissões', WATER: 'Água e efluentes', NOISE: 'Ruído', ENERGY: 'Energia',
  CHEMICALS: 'Substâncias químicas', LICENCE: 'Licenças e autorizações', OTHER: 'Outros',
};
const OBL_STATUS: Record<string, { label: string; cls: string }> = {
  NOT_ASSESSED:  { label: 'Por avaliar',   cls: 'bg-gray-100 text-gray-600' },
  COMPLIANT:     { label: 'Cumpre',        cls: 'bg-green-100 text-green-700' },
  PARTIAL:       { label: 'Cumpre em parte', cls: 'bg-yellow-100 text-yellow-700' },
  NON_COMPLIANT: { label: 'Não cumpre',    cls: 'bg-red-100 text-red-600' },
};

const SCALE_HELP = ['1 · Muito baixa', '2 · Baixa', '3 · Média', '4 · Alta', '5 · Muito alta'];
const SIGNIFICANCE_THRESHOLD = 12;

const errMsg = (e: any) => e?.response?.data?.message || e?.message || 'Erro inesperado';
const toDateInput = (d?: string | null) => (d ? String(d).slice(0, 10) : '');
const fmtDate = (d?: string | null) => (d ? format(new Date(d), 'dd/MM/yyyy') : '—');
const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-200 focus:border-lime-500 outline-none';

// ── small building blocks ────────────────────────────────────────────────

function Modal({ title, onClose, children, onSave, busy, valid = true }: {
  title: string; onClose: () => void; children: React.ReactNode; onSave: () => void; busy?: boolean; valid?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!valid || busy} onClick={onSave}>{busy ? 'A guardar…' : 'Guardar'}</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{hint && <span className="text-gray-400 font-normal"> {hint}</span>}</label>
      {children}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone: string }) {
  return (
    <div className={cn('rounded-xl p-4', tone)}>
      <div className="text-xs font-medium uppercase opacity-70 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function useCrud(key: string, api: { create: (d: any) => Promise<any>; update: (id: string, d: any) => Promise<any>; remove: (id: string) => Promise<any> }) {
  const qc = useQueryClient();
  const done = () => { qc.invalidateQueries({ queryKey: [key] }); qc.invalidateQueries({ queryKey: ['env-dashboard'] }); };
  const onError = (e: any) => alert(errMsg(e));
  return {
    save: useMutation({ mutationFn: ({ id, data }: { id?: string; data: any }) => (id ? api.update(id, data) : api.create(data)), onSuccess: done, onError }),
    remove: useMutation({ mutationFn: (id: string) => api.remove(id), onSuccess: done, onError }),
  };
}

// ── tab: ISO 14001 requirements ──────────────────────────────────────────

function RequirementModal({ item, onClose }: { item: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ status: item.status, evidence: item.evidence ?? '', notes: item.notes ?? '' });
  const mut = useMutation({
    mutationFn: () => environmentApi.updateRequirement(item.id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['env-dashboard'] }); onClose(); },
    onError: (e: any) => alert(errMsg(e)),
  });
  return (
    <Modal title={`${item.clauseNumber} — ${item.title}`} onClose={onClose} onSave={() => mut.mutate()} busy={mut.isPending}>
      {item.description && <p className="text-xs text-gray-500 bg-gray-50 rounded p-3">{item.description}</p>}
      <Field label="Estado de implementação">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(REQ_STATUS).map(([k, v]) => {
            const Icon = v.icon;
            return (
              <button key={k} type="button" onClick={() => setForm(p => ({ ...p, status: k }))}
                className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all',
                  form.status === k ? `${v.bg} border-current font-medium ${v.color}` : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
                <Icon className="w-3.5 h-3.5" /> {v.label}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Evidência" hint="(onde está demonstrado: documento, registo, ata…)">
        <textarea className={cn(inp, 'resize-none')} rows={3} value={form.evidence} onChange={e => setForm(p => ({ ...p, evidence: e.target.value }))} />
      </Field>
      <Field label="Notas">
        <textarea className={cn(inp, 'resize-none')} rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
      </Field>
    </Modal>
  );
}

function RequirementsTab({ requirements, canWrite }: { requirements: any[]; canWrite: boolean }) {
  const [edit, setEdit] = useState<any>(null);
  const groups = new Map<string, any[]>();
  requirements.forEach(r => { const k = r.clauseNumber.split('.')[0]; groups.set(k, [...(groups.get(k) ?? []), r]); });
  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([clause, items]) => (
        <div key={clause} className="bg-white rounded-xl border overflow-hidden">
          <div className="px-5 py-2.5 bg-gray-50 border-b font-semibold text-sm text-gray-800">
            Cláusula {clause} — {CLAUSE_TITLES[clause] ?? ''}
            <span className="ml-2 text-xs font-normal text-gray-400">{items.length} requisito{items.length === 1 ? '' : 's'}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {items.map(r => {
              const st = REQ_STATUS[r.status] ?? REQ_STATUS.NOT_IMPLEMENTED;
              const Icon = st.icon;
              return (
                <div key={r.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 group">
                  <span className="text-xs font-mono bg-lime-50 text-lime-700 rounded px-2 py-0.5 mt-0.5 w-14 text-center">{r.clauseNumber}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{r.title}</p>
                    {r.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>}
                    {r.evidence && <p className="text-xs text-lime-700 mt-1 truncate">✓ {r.evidence}</p>}
                  </div>
                  <span className={cn('flex-shrink-0 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium', st.bg, st.color)}>
                    <Icon className="w-3 h-3" /> {st.label}
                  </span>
                  {canWrite && (
                    <button onClick={() => setEdit(r)} title="Editar" className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded text-gray-400 transition-opacity">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {edit && <RequirementModal item={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

// ── tab: aspects & impacts (6.1.2) ───────────────────────────────────────

function AspectModal({ item, onClose, onSave, busy }: { item: any | null; onClose: () => void; onSave: (d: any) => void; busy: boolean }) {
  const [f, setF] = useState({
    activity: item?.activity ?? '', aspect: item?.aspect ?? '', impact: item?.impact ?? '',
    condition: item?.condition ?? 'NORMAL', lifecycleStage: item?.lifecycleStage ?? '',
    severity: item?.severity ?? 1, probability: item?.probability ?? 1,
    controls: item?.controls ?? '', reviewDate: toDateInput(item?.reviewDate), status: item?.status ?? 'ACTIVE',
  });
  const s = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
  const score = Number(f.severity) * Number(f.probability);
  const significant = score >= SIGNIFICANCE_THRESHOLD || (f.condition === 'EMERGENCY' && Number(f.severity) >= 4);
  const valid = f.activity.trim() && f.aspect.trim() && f.impact.trim();
  return (
    <Modal title={item ? 'Editar aspeto ambiental' : 'Novo aspeto ambiental'} onClose={onClose} busy={busy} valid={!!valid}
      onSave={() => onSave({ ...f, severity: Number(f.severity), probability: Number(f.probability), reviewDate: f.reviewDate || null })}>
      <Field label="Atividade, produto ou serviço *"><input className={inp} placeholder="Ex.: Produção, Manutenção de frota" value={f.activity} onChange={e => s('activity', e.target.value)} /></Field>
      <Field label="Aspeto ambiental *" hint="(o que interage com o ambiente)"><input className={inp} placeholder="Ex.: Consumo de energia elétrica" value={f.aspect} onChange={e => s('aspect', e.target.value)} /></Field>
      <Field label="Impacto ambiental *" hint="(a alteração resultante)"><input className={inp} placeholder="Ex.: Esgotamento de recursos naturais" value={f.impact} onChange={e => s('impact', e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Condição">
          <select className={inp} value={f.condition} onChange={e => s('condition', e.target.value)}>
            {Object.entries(CONDITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Fase do ciclo de vida"><input className={inp} placeholder="Aquisição, produção, transporte…" value={f.lifecycleStage} onChange={e => s('lifecycleStage', e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Severidade (1-5)">
          <select className={inp} value={f.severity} onChange={e => s('severity', e.target.value)}>{SCALE_HELP.map((l, i) => <option key={i} value={i + 1}>{l}</option>)}</select>
        </Field>
        <Field label="Probabilidade (1-5)">
          <select className={inp} value={f.probability} onChange={e => s('probability', e.target.value)}>{SCALE_HELP.map((l, i) => <option key={i} value={i + 1}>{l}</option>)}</select>
        </Field>
      </div>
      <div className={cn('rounded-lg px-3 py-2 text-sm flex items-center justify-between', significant ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700')}>
        <span>Significância = severidade × probabilidade = <strong>{score}</strong></span>
        <strong>{significant ? 'Aspeto SIGNIFICATIVO' : 'Não significativo'}</strong>
      </div>
      <p className="text-xs text-gray-400 -mt-1">Significativo a partir de {SIGNIFICANCE_THRESHOLD} pontos, ou em emergência com severidade ≥ 4. Os significativos exigem controlo operacional (8.1) e objetivos (6.2).</p>
      <Field label="Controlos operacionais / medidas"><textarea className={cn(inp, 'resize-none')} rows={2} value={f.controls} onChange={e => s('controls', e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Próxima revisão"><input type="date" className={inp} value={f.reviewDate} onChange={e => s('reviewDate', e.target.value)} /></Field>
        <Field label="Estado">
          <select className={inp} value={f.status} onChange={e => s('status', e.target.value)}><option value="ACTIVE">Ativo</option><option value="CLOSED">Encerrado</option></select>
        </Field>
      </div>
    </Modal>
  );
}

function AspectsTab({ canWrite }: { canWrite: boolean }) {
  const { data = [], isLoading } = useQuery<any[]>({ queryKey: ['env-aspects'], queryFn: () => environmentApi.aspects.list().then(r => r.data) });
  const crud = useCrud('env-aspects', environmentApi.aspects);
  const [modal, setModal] = useState<{ item: any | null } | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Registo de aspetos e impactos ambientais (cláusula 6.1.2) com avaliação de significância.</p>
        {canWrite && <Button size="sm" onClick={() => setModal({ item: null })}><Plus className="w-4 h-4 mr-1" /> Novo aspeto</Button>}
      </div>
      <div className="bg-white rounded-xl border overflow-x-auto">
        {isLoading ? <p className="p-6 text-sm text-gray-400">A carregar…</p> : data.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">Ainda não há aspetos ambientais registados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr><th className="text-left px-4 py-2">Atividade</th><th className="text-left px-4 py-2">Aspeto → Impacto</th><th className="px-4 py-2">Condição</th><th className="px-4 py-2">S×P</th><th className="text-left px-4 py-2">Controlos</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map(a => (
                <tr key={a.id} className={cn('hover:bg-gray-50', a.status === 'CLOSED' && 'opacity-50')}>
                  <td className="px-4 py-3 align-top text-gray-700">{a.activity}{a.lifecycleStage && <div className="text-xs text-gray-400">{a.lifecycleStage}</div>}</td>
                  <td className="px-4 py-3 align-top"><div className="font-medium text-gray-900">{a.aspect}</div><div className="text-xs text-gray-500">→ {a.impact}</div></td>
                  <td className="px-4 py-3 align-top text-center text-xs text-gray-600">{CONDITIONS[a.condition] ?? a.condition}</td>
                  <td className="px-4 py-3 align-top text-center">
                    <span className={cn('inline-block text-xs font-semibold rounded-full px-2.5 py-0.5', a.isSignificant ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
                      {a.significance}{a.isSignificant ? ' · significativo' : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-gray-500 max-w-xs">{a.controls ?? '—'}</td>
                  <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                    {canWrite && (<>
                      <button title="Editar" className="p-1.5 rounded hover:bg-gray-100 text-gray-400" onClick={() => setModal({ item: a })}><Pencil className="w-4 h-4" /></button>
                      <button title="Eliminar" className="p-1.5 rounded hover:bg-red-50 text-red-500" onClick={() => { if (confirm(`Eliminar o aspeto "${a.aspect}"?`)) crud.remove.mutate(a.id); }}><Trash2 className="w-4 h-4" /></button>
                    </>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {modal && <AspectModal item={modal.item} busy={crud.save.isPending} onClose={() => setModal(null)}
        onSave={d => crud.save.mutate({ id: modal.item?.id, data: d }, { onSuccess: () => setModal(null) })} />}
    </div>
  );
}

// ── tab: objectives & targets (6.2) ──────────────────────────────────────

function progressOf(o: any): number | null {
  if (o.baseline == null || o.target == null || o.current == null || o.target === o.baseline) return null;
  return Math.max(0, Math.min(100, Math.round(((o.current - o.baseline) / (o.target - o.baseline)) * 100)));
}

function ObjectiveModal({ item, onClose, onSave, busy }: { item: any | null; onClose: () => void; onSave: (d: any) => void; busy: boolean }) {
  const [f, setF] = useState({
    title: item?.title ?? '', description: item?.description ?? '', indicator: item?.indicator ?? '', unit: item?.unit ?? '',
    baseline: item?.baseline ?? '', target: item?.target ?? '', current: item?.current ?? '',
    deadline: toDateInput(item?.deadline), status: item?.status ?? 'PLANNED', actions: item?.actions ?? '',
  });
  const s = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal title={item ? 'Editar objetivo' : 'Novo objetivo ambiental'} onClose={onClose} busy={busy} valid={!!f.title.trim()}
      onSave={() => onSave({ ...f, deadline: f.deadline || null })}>
      <Field label="Objetivo *"><input className={inp} placeholder="Ex.: Reduzir o consumo de eletricidade em 10%" value={f.title} onChange={e => s('title', e.target.value)} /></Field>
      <Field label="Descrição"><textarea className={cn(inp, 'resize-none')} rows={2} value={f.description} onChange={e => s('description', e.target.value)} /></Field>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2"><Field label="Indicador"><input className={inp} placeholder="Consumo de eletricidade" value={f.indicator} onChange={e => s('indicator', e.target.value)} /></Field></div>
        <Field label="Unidade"><input className={inp} placeholder="kWh, t, %" value={f.unit} onChange={e => s('unit', e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Valor de partida"><input type="number" className={inp} value={f.baseline} onChange={e => s('baseline', e.target.value)} /></Field>
        <Field label="Meta"><input type="number" className={inp} value={f.target} onChange={e => s('target', e.target.value)} /></Field>
        <Field label="Valor atual"><input type="number" className={inp} value={f.current} onChange={e => s('current', e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prazo"><input type="date" className={inp} value={f.deadline} onChange={e => s('deadline', e.target.value)} /></Field>
        <Field label="Estado">
          <select className={inp} value={f.status} onChange={e => s('status', e.target.value)}>
            {Object.entries(OBJ_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Ações planeadas" hint="(o que, quem, com que recursos — 6.2.2)"><textarea className={cn(inp, 'resize-none')} rows={2} value={f.actions} onChange={e => s('actions', e.target.value)} /></Field>
    </Modal>
  );
}

function ObjectivesTab({ canWrite }: { canWrite: boolean }) {
  const { data = [], isLoading } = useQuery<any[]>({ queryKey: ['env-objectives'], queryFn: () => environmentApi.objectives.list().then(r => r.data) });
  const crud = useCrud('env-objectives', environmentApi.objectives);
  const [modal, setModal] = useState<{ item: any | null } | null>(null);
  const now = Date.now();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Objetivos ambientais mensuráveis e respetivo planeamento (cláusula 6.2).</p>
        {canWrite && <Button size="sm" onClick={() => setModal({ item: null })}><Plus className="w-4 h-4 mr-1" /> Novo objetivo</Button>}
      </div>
      {isLoading ? <p className="text-sm text-gray-400">A carregar…</p> : data.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-sm text-gray-400">Ainda não há objetivos ambientais.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {data.map(o => {
            const st = OBJ_STATUS[o.status] ?? OBJ_STATUS.PLANNED;
            const pct = progressOf(o);
            const overdue = o.deadline && new Date(o.deadline).getTime() < now && ['PLANNED', 'IN_PROGRESS'].includes(o.status);
            return (
              <div key={o.id} className="bg-white rounded-xl border p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-gray-900 text-sm">{o.title}</p>
                  <span className={cn('text-xs font-medium rounded-full px-2.5 py-0.5 whitespace-nowrap', st.cls)}>{st.label}</span>
                </div>
                {o.indicator && <p className="text-xs text-gray-500">{o.indicator}{o.unit ? ` (${o.unit})` : ''}</p>}
                {pct !== null && (
                  <div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-lime-500" style={{ width: `${pct}%` }} /></div>
                    <p className="text-xs text-gray-500 mt-1">{o.baseline} → <strong>{o.current}</strong> → meta {o.target}{o.unit ? ` ${o.unit}` : ''} · {pct}%</p>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className={cn(overdue ? 'text-red-600 font-medium' : 'text-gray-400')}>Prazo: {fmtDate(o.deadline)}{overdue ? ' · em atraso' : ''}</span>
                  {canWrite && (
                    <span>
                      <button title="Editar" className="p-1.5 rounded hover:bg-gray-100 text-gray-400" onClick={() => setModal({ item: o })}><Pencil className="w-4 h-4" /></button>
                      <button title="Eliminar" className="p-1.5 rounded hover:bg-red-50 text-red-500" onClick={() => { if (confirm(`Eliminar o objetivo "${o.title}"?`)) crud.remove.mutate(o.id); }}><Trash2 className="w-4 h-4" /></button>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {modal && <ObjectiveModal item={modal.item} busy={crud.save.isPending} onClose={() => setModal(null)}
        onSave={d => crud.save.mutate({ id: modal.item?.id, data: d }, { onSuccess: () => setModal(null) })} />}
    </div>
  );
}

// ── tab: legal & other requirements (6.1.3 / 9.1.2) ──────────────────────

function ObligationModal({ item, onClose, onSave, busy }: { item: any | null; onClose: () => void; onSave: (d: any) => void; busy: boolean }) {
  const [f, setF] = useState({
    title: item?.title ?? '', source: item?.source ?? '', category: item?.category ?? 'OTHER',
    requirement: item?.requirement ?? '', applicability: item?.applicability ?? '',
    complianceStatus: item?.complianceStatus ?? 'NOT_ASSESSED', nextEvaluationAt: toDateInput(item?.nextEvaluationAt), notes: item?.notes ?? '',
  });
  const s = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal title={item ? 'Editar requisito legal' : 'Novo requisito legal / outro requisito'} onClose={onClose} busy={busy} valid={!!f.title.trim()}
      onSave={() => onSave({ ...f, nextEvaluationAt: f.nextEvaluationAt || null })}>
      <Field label="Requisito *"><input className={inp} placeholder="Ex.: Gestão de resíduos de embalagens" value={f.title} onChange={e => s('title', e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fonte" hint="(lei, licença, contrato)"><input className={inp} placeholder="Decreto-Lei n.º …, licença …" value={f.source} onChange={e => s('source', e.target.value)} /></Field>
        <Field label="Categoria">
          <select className={inp} value={f.category} onChange={e => s('category', e.target.value)}>
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </div>
      <Field label="O que é exigido"><textarea className={cn(inp, 'resize-none')} rows={2} value={f.requirement} onChange={e => s('requirement', e.target.value)} /></Field>
      <Field label="Onde se aplica" hint="(atividades, instalações)"><input className={inp} value={f.applicability} onChange={e => s('applicability', e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Estado de cumprimento">
          <select className={inp} value={f.complianceStatus} onChange={e => s('complianceStatus', e.target.value)}>
            {Object.entries(OBL_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label="Próxima avaliação"><input type="date" className={inp} value={f.nextEvaluationAt} onChange={e => s('nextEvaluationAt', e.target.value)} /></Field>
      </div>
      <Field label="Notas"><textarea className={cn(inp, 'resize-none')} rows={2} value={f.notes} onChange={e => s('notes', e.target.value)} /></Field>
    </Modal>
  );
}

function ObligationsTab({ canWrite }: { canWrite: boolean }) {
  const { data = [], isLoading } = useQuery<any[]>({ queryKey: ['env-obligations'], queryFn: () => environmentApi.obligations.list().then(r => r.data) });
  const crud = useCrud('env-obligations', environmentApi.obligations);
  const [modal, setModal] = useState<{ item: any | null } | null>(null);
  const now = Date.now();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Requisitos legais e outros requisitos aplicáveis, com avaliação periódica do cumprimento (6.1.3 e 9.1.2).</p>
        {canWrite && <Button size="sm" onClick={() => setModal({ item: null })}><Plus className="w-4 h-4 mr-1" /> Novo requisito</Button>}
      </div>
      <div className="bg-white rounded-xl border overflow-x-auto">
        {isLoading ? <p className="p-6 text-sm text-gray-400">A carregar…</p> : data.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">Ainda não há requisitos legais registados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr><th className="text-left px-4 py-2">Requisito</th><th className="text-left px-4 py-2">Categoria</th><th className="px-4 py-2">Cumprimento</th><th className="px-4 py-2">Próxima avaliação</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map(o => {
                const st = OBL_STATUS[o.complianceStatus] ?? OBL_STATUS.NOT_ASSESSED;
                const overdue = o.nextEvaluationAt && new Date(o.nextEvaluationAt).getTime() < now;
                return (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 align-top"><div className="font-medium text-gray-900">{o.title}</div>{o.source && <div className="text-xs text-gray-500">{o.source}</div>}</td>
                    <td className="px-4 py-3 align-top text-xs text-gray-600">{CATEGORIES[o.category] ?? o.category}</td>
                    <td className="px-4 py-3 align-top text-center"><span className={cn('text-xs font-medium rounded-full px-2.5 py-0.5', st.cls)}>{st.label}</span></td>
                    <td className={cn('px-4 py-3 align-top text-center text-xs', overdue ? 'text-red-600 font-medium' : 'text-gray-500')}>{fmtDate(o.nextEvaluationAt)}{overdue ? ' · em atraso' : ''}</td>
                    <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                      {canWrite && (<>
                        <button title="Editar" className="p-1.5 rounded hover:bg-gray-100 text-gray-400" onClick={() => setModal({ item: o })}><Pencil className="w-4 h-4" /></button>
                        <button title="Eliminar" className="p-1.5 rounded hover:bg-red-50 text-red-500" onClick={() => { if (confirm(`Eliminar "${o.title}"?`)) crud.remove.mutate(o.id); }}><Trash2 className="w-4 h-4" /></button>
                      </>)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {modal && <ObligationModal item={modal.item} busy={crud.save.isPending} onClose={() => setModal(null)}
        onSave={d => crud.save.mutate({ id: modal.item?.id, data: d }, { onSuccess: () => setModal(null) })} />}
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────

function EnvironmentInner() {
  const params = useSearchParams();
  const initial = params.get('tab') as TabKey | null;
  const [tab, setTab] = useState<TabKey>(TABS.some(t => t.key === initial) ? (initial as TabKey) : 'requirements');
  const { can } = usePermissions();
  const canWrite = can('environment', 2);

  const { data: dash, isLoading } = useQuery({ queryKey: ['env-dashboard'], queryFn: () => environmentApi.dashboard().then(r => r.data) });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-lime-600 rounded-xl flex items-center justify-center"><Recycle className="w-5 h-5 text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ISO 14001 — Gestão Ambiental</h1>
            <p className="text-sm text-gray-500">Sistema de Gestão Ambiental (SGA): requisitos, aspetos e impactos, objetivos e requisitos legais</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/quality/documents?standard=ISO_14001" className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <FileText className="w-4 h-4 text-lime-600" /> Documentos ISO 14001
          </Link>
          <Link href="/policies" className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            Política ambiental
          </Link>
        </div>
      </div>

      {isLoading || !dash ? <p className="text-center py-12 text-gray-400">A carregar…</p> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Stat label="Conformidade" value={`${dash.score}%`} tone="bg-lime-50 text-lime-800" />
            <Stat label="Implementados" value={`${dash.summary.implemented}/${dash.summary.total}`} tone="bg-green-50 text-green-800" />
            <Stat label="Parciais" value={dash.summary.partial} tone="bg-yellow-50 text-yellow-800" />
            <Stat label="Por implementar" value={dash.summary.notImplemented} tone="bg-red-50 text-red-700" />
            <Stat label="Aspetos significativos" value={`${dash.aspects.significant}/${dash.aspects.total}`} tone="bg-orange-50 text-orange-800" />
            <Stat label="Objetivos em atraso" value={dash.objectives.overdue} tone={dash.objectives.overdue ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'} />
            <Stat label="Requisitos legais não cumpridos" value={dash.obligations.nonCompliant} tone={dash.obligations.nonCompliant ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'} />
          </div>

          {(dash.obligations.evaluationOverdue > 0 || dash.obligations.notAssessed > 0) && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-2.5 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                {dash.obligations.evaluationOverdue > 0 && <>{dash.obligations.evaluationOverdue} requisito(s) legal(ais) com avaliação em atraso. </>}
                {dash.obligations.notAssessed > 0 && <>{dash.obligations.notAssessed} ainda por avaliar (cláusula 9.1.2).</>}
              </span>
            </div>
          )}

          <div className="flex gap-1 border-b overflow-x-auto">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
                    tab === t.key ? 'border-lime-600 text-lime-700' : 'border-transparent text-gray-500 hover:text-gray-800')}>
                  <Icon className="w-4 h-4" /> {t.label}
                </button>
              );
            })}
          </div>

          {tab === 'requirements' && <RequirementsTab requirements={dash.requirements} canWrite={canWrite} />}
          {tab === 'aspects' && <AspectsTab canWrite={canWrite} />}
          {tab === 'objectives' && <ObjectivesTab canWrite={canWrite} />}
          {tab === 'obligations' && <ObligationsTab canWrite={canWrite} />}
        </>
      )}
    </div>
  );
}

export default function EnvironmentPage() {
  return (
    <ModuleGuard moduleKey="environment">
      <Suspense fallback={null}>
        <EnvironmentInner />
      </Suspense>
      <HelpButton page="environment" />
    </ModuleGuard>
  );
}
