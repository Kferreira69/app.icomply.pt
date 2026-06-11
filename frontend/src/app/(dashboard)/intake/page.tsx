'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { intakeApi, IntakeField, IntakeFieldType } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  ClipboardList, Plus, Trash2, Eye, EyeOff, Copy, Link2,
  ChevronDown, ChevronUp, GripVertical, Loader2,
  CheckCircle2, FileText, Users, ToggleLeft, ToggleRight,
} from 'lucide-react';

const FIELD_TYPES: { type: IntakeFieldType; label: string }[] = [
  { type: 'text',     label: 'Texto curto' },
  { type: 'textarea', label: 'Texto longo' },
  { type: 'email',    label: 'Email' },
  { type: 'phone',    label: 'Telefone' },
  { type: 'number',   label: 'Número' },
  { type: 'select',   label: 'Lista (dropdown)' },
  { type: 'radio',    label: 'Escolha única' },
  { type: 'checkbox', label: 'Caixas de seleção' },
  { type: 'date',     label: 'Data' },
];

function newField(): IntakeField {
  return { id: crypto.randomUUID(), type: 'text', label: '', required: false };
}

function FormBuilder({ initial, onSave, onCancel }: {
  initial?: { title: string; description?: string; fields: IntakeField[] };
  onSave: (data: { title: string; description?: string; fields: IntakeField[] }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle]       = useState(initial?.title ?? '');
  const [desc, setDesc]         = useState(initial?.description ?? '');
  const [fields, setFields]     = useState<IntakeField[]>(initial?.fields ?? [newField()]);

  const updateField = (idx: number, patch: Partial<IntakeField>) =>
    setFields(f => f.map((x, i) => i === idx ? { ...x, ...patch } : x));

  const addField    = () => setFields(f => [...f, newField()]);
  const removeField = (idx: number) => setFields(f => f.filter((_, i) => i !== idx));
  const moveField   = (idx: number, dir: -1 | 1) => {
    const next = [...fields];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setFields(next);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Título do formulário *</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Ex: Questionário de Due Diligence" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Descrição (opcional)</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
            className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            placeholder="Instruções para o preenchimento..." />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Campos ({fields.length})</label>
          <button onClick={addField}
            className="flex items-center gap-1 text-xs text-primary font-semibold hover:opacity-80">
            <Plus className="w-3.5 h-3.5" /> Adicionar campo
          </button>
        </div>

        <div className="space-y-3">
          {fields.map((f, idx) => (
            <div key={f.id} className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 space-y-2">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                <input value={f.label} onChange={e => updateField(idx, { label: e.target.value })}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  placeholder="Pergunta / label do campo" />
                <select value={f.type} onChange={e => updateField(idx, { type: e.target.value as IntakeFieldType })}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white">
                  {FIELD_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
                </select>
                <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={f.required} onChange={e => updateField(idx, { required: e.target.checked })}
                    className="rounded" />
                  Obrigatório
                </label>
                <div className="flex gap-0.5">
                  <button onClick={() => moveField(idx, -1)} disabled={idx === 0}
                    className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1}
                    className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                  <button onClick={() => removeField(idx)} className="p-1 hover:bg-red-100 rounded text-red-500">
                    <Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              {(f.type === 'select' || f.type === 'radio' || f.type === 'checkbox') && (
                <div className="pl-6">
                  <input
                    value={(f.options ?? []).join('\n')}
                    onChange={e => updateField(idx, { options: e.target.value.split('\n').filter(Boolean) })}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                    placeholder="Uma opção por linha"
                    onKeyDown={e => { if (e.key === 'Enter') e.stopPropagation(); }}
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Uma opção por linha</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium">Cancelar</button>
        <button onClick={() => onSave({ title, description: desc || undefined, fields })}
          disabled={!title.trim() || fields.length === 0}
          className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl disabled:opacity-40 hover:opacity-90">
          Guardar formulário
        </button>
      </div>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} title="Copiar link"
      className={cn('p-1.5 rounded-lg transition-colors', copied ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:bg-gray-100')}>
      {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function FormCard({ form, onEdit, onDelete }: { form: any; onEdit: () => void; onDelete: () => void }) {
  const qc = useQueryClient();
  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/submit/${form.publicToken}`;

  const toggleMutation = useMutation({
    mutationFn: () => intakeApi.update(form.id, { isActive: !form.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['intake-forms'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => intakeApi.remove(form.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['intake-forms'] }); onDelete(); },
  });

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-800 text-sm truncate">{form.title}</p>
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', form.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
              {form.isActive ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          {form.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{form.description}</p>}
          <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{(form.fields as any[]).length} campos</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{form._count?.submissions ?? 0} respostas</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => toggleMutation.mutate()} disabled={toggleMutation.isPending}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title={form.isActive ? 'Desativar' : 'Ativar'}>
            {form.isActive ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4" />}
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="Editar">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => { if (confirm('Eliminar formulário e todas as respostas?')) deleteMutation.mutate(); }}
            disabled={deleteMutation.isPending}
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400" title="Eliminar">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5">
        <Link2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <span className="text-[11px] text-gray-500 truncate flex-1">{publicUrl}</span>
        <CopyButton value={publicUrl} />
      </div>
    </div>
  );
}

export default function IntakePage() {
  const qc = useQueryClient();
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editTarget, setEditTarget] = useState<any>(null);

  const { data: summary } = useQuery({
    queryKey: ['intake-summary'],
    queryFn: () => intakeApi.getSummary().then(r => r.data),
  });

  const { data: forms, isLoading } = useQuery({
    queryKey: ['intake-forms'],
    queryFn: () => intakeApi.list().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => intakeApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['intake-forms'] }); qc.invalidateQueries({ queryKey: ['intake-summary'] }); setView('list'); },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => intakeApi.update(editTarget.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['intake-forms'] }); setView('list'); setEditTarget(null); },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Intake Forms</h1>
            <p className="text-sm text-gray-500">Formulários de recolha de dados GRC</p>
          </div>
        </div>
        {view === 'list' && (
          <button onClick={() => setView('create')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:opacity-90">
            <Plus className="w-4 h-4" /> Novo formulário
          </button>
        )}
      </div>

      {view === 'list' && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total',      value: summary?.total ?? 0,            color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Ativos',     value: summary?.active ?? 0,           color: 'text-green-600',  bg: 'bg-green-50' },
              { label: 'Respostas',  value: summary?.totalSubmissions ?? 0, color: 'text-blue-600',   bg: 'bg-blue-50' },
            ].map(s => (
              <div key={s.label} className={cn('rounded-xl p-4 border border-transparent', s.bg)}>
                <p className={cn('text-xs font-medium mb-1', s.color)}>{s.label}</p>
                <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
          ) : (forms ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ClipboardList className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">Nenhum formulário criado</p>
              <p className="text-gray-400 text-sm mt-1">Cria o primeiro para partilhar com clientes ou parceiros</p>
              <button onClick={() => setView('create')}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:opacity-90">
                <Plus className="w-4 h-4" /> Criar formulário
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {(forms ?? []).map((f: any) => (
                <FormCard key={f.id} form={f}
                  onEdit={() => { setEditTarget(f); setView('edit'); }}
                  onDelete={() => {}} />
              ))}
            </div>
          )}
        </>
      )}

      {(view === 'create' || view === 'edit') && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-5">
            {view === 'create' ? 'Novo formulário' : 'Editar formulário'}
          </h2>
          <FormBuilder
            initial={view === 'edit' ? { title: editTarget.title, description: editTarget.description, fields: editTarget.fields as IntakeField[] } : undefined}
            onSave={data => view === 'create' ? createMutation.mutate(data) : updateMutation.mutate(data)}
            onCancel={() => { setView('list'); setEditTarget(null); }}
          />
          {(createMutation.isPending || updateMutation.isPending) && (
            <div className="flex items-center justify-center py-3 text-sm text-gray-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> A guardar...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
