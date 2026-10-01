'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { standardsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, MinusCircle, Pencil, FileText, ClipboardCheck, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  NOT_IMPLEMENTED: { label: 'Não implementado', color: 'text-red-600',    bg: 'bg-red-100',    icon: XCircle },
  PARTIAL:         { label: 'Parcial',          color: 'text-yellow-700', bg: 'bg-yellow-100', icon: AlertCircle },
  IMPLEMENTED:     { label: 'Implementado',     color: 'text-green-700',  bg: 'bg-green-100',  icon: CheckCircle2 },
  NOT_APPLICABLE:  { label: 'N/A',              color: 'text-gray-500',   bg: 'bg-gray-100',   icon: MinusCircle },
};

const errMsg = (e: any) => e?.response?.data?.message || e?.message || 'Erro inesperado';
const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none';

function EditModal({ stdKey, item, onClose }: { stdKey: string; item: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ status: item.status, evidence: item.evidence ?? '', notes: item.notes ?? '' });
  const mut = useMutation({
    mutationFn: () => standardsApi.update(stdKey, item.id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['standard', stdKey] }); qc.invalidateQueries({ queryKey: ['standards'] }); onClose(); },
    onError: (e: any) => alert(errMsg(e)),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900"><span className="font-mono text-gray-400 mr-2">{item.clause}</span>{item.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-3">
          {item.description && <p className="text-xs text-gray-500 bg-gray-50 rounded p-3">{item.description}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado de implementação</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(STATUS).map(([k, v]) => {
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
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Evidência <span className="text-gray-400 font-normal">(documento, registo, ata…)</span></label>
            <textarea className={cn(inp, 'resize-none')} rows={3} value={form.evidence} onChange={e => setForm(p => ({ ...p, evidence: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea className={cn(inp, 'resize-none')} rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? 'A guardar…' : 'Guardar'}</Button>
        </div>
      </div>
    </div>
  );
}

export default function StandardPage() {
  const { key } = useParams<{ key: string }>();
  const [edit, setEdit] = useState<any>(null);
  const [filter, setFilter] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['standard', key],
    queryFn: () => standardsApi.get(key).then(r => r.data),
    retry: false,
  });

  if (isLoading) return <p className="text-center py-16 text-gray-400">A carregar…</p>;
  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <p className="text-lg font-semibold text-gray-800">Norma indisponível</p>
        <p className="text-sm text-gray-500 mt-1">Não existe ou o seu perfil não tem acesso a esta norma.</p>
        <Link href="/dashboard" className="inline-block mt-4 text-sm text-blue-600 hover:underline">Voltar ao dashboard</Link>
      </div>
    );
  }

  const { standard, requirements } = data as any;
  const q = filter.trim().toLowerCase();
  const shown = q ? requirements.filter((r: any) => `${r.clause} ${r.title} ${r.description ?? ''} ${r.evidence ?? ''}`.toLowerCase().includes(q)) : requirements;
  const chapters = new Map<string, any[]>();
  shown.forEach((r: any) => chapters.set(r.chapter, [...(chapters.get(r.chapter) ?? []), r]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center"><ClipboardCheck className="w-5 h-5 text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{standard.name}</h1>
            <p className="text-sm text-gray-500">{standard.fullName}</p>
          </div>
        </div>
        <Link href={`/quality/documents?standard=${standard.key}`}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
          <FileText className="w-4 h-4 text-blue-600" /> Documentos {standard.name}
        </Link>
      </div>

      <p className="text-sm text-gray-600">{standard.description}</p>
      <p className="text-xs text-gray-400 -mt-4">{standard.scope}</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Conformidade" value={`${data.score}%`} tone="bg-blue-50 text-blue-800" />
        <Stat label="Implementados" value={`${data.implemented}/${data.total}`} tone="bg-green-50 text-green-800" />
        <Stat label="Parciais" value={data.partial} tone="bg-yellow-50 text-yellow-800" />
        <Stat label="Por implementar" value={data.notImplemented} tone="bg-red-50 text-red-700" />
        <Stat label="Não aplicáveis" value={data.notApplicable} tone="bg-gray-50 text-gray-600" />
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input className={cn(inp, 'pl-9')} placeholder="Filtrar requisitos…" value={filter} onChange={e => setFilter(e.target.value)} />
      </div>

      <div className="space-y-4">
        {[...chapters.entries()].map(([chapter, items]) => (
          <div key={chapter} className="bg-white rounded-xl border overflow-hidden">
            <div className="px-5 py-2.5 bg-gray-50 border-b font-semibold text-sm text-gray-800">
              {chapter}<span className="ml-2 text-xs font-normal text-gray-400">{items.length} requisito{items.length === 1 ? '' : 's'}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {items.map((r: any) => {
                const st = STATUS[r.status] ?? STATUS.NOT_IMPLEMENTED;
                const Icon = st.icon;
                return (
                  <div key={r.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 group">
                    <span className="text-xs font-mono bg-blue-50 text-blue-700 rounded px-2 py-0.5 mt-0.5 min-w-[3.5rem] text-center whitespace-nowrap">{r.clause}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{r.title}</p>
                      {r.description && <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>}
                      {r.evidence && <p className="text-xs text-blue-700 mt-1 truncate">✓ {r.evidence}</p>}
                    </div>
                    <span className={cn('flex-shrink-0 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium', st.bg, st.color)}>
                      <Icon className="w-3 h-3" /> {st.label}
                    </span>
                    {standard.canWrite && (
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
        {shown.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Nenhum requisito corresponde ao filtro.</p>}
      </div>

      {edit && <EditModal stdKey={standard.key} item={edit} onClose={() => setEdit(null)} />}
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
