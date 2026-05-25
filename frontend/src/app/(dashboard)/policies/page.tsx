'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { policiesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Plus, BookOpen, CheckCircle2, Archive,
  Eye, Pencil, Trash2, ThumbsUp, Send,
  RotateCcw,
} from 'lucide-react';
import { format } from 'date-fns';

// ── Status colours ────────────────────────────────────────────
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT:     { bg: 'bg-gray-100',   text: 'text-gray-700',   label: 'Rascunho' },
  IN_REVIEW: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Em Revisão' },
  APPROVED:  { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Aprovada' },
  ARCHIVED:  { bg: 'bg-red-50',     text: 'text-red-700',    label: 'Arquivada' },
};

const CATEGORY_LABELS: Record<string, string> = {
  INFORMATION_SECURITY: 'Segurança da Informação',
  DATA_PROTECTION:      'Proteção de Dados',
  HR:                   'Recursos Humanos',
  COMPLIANCE:           'Compliance',
  OPERATIONS:           'Operações',
  FINANCE:              'Finanças',
  OTHER:                'Outro',
};

// ── Modal: Create / Edit Policy ───────────────────────────────
function PolicyModal({
  onClose, onSave, initial,
}: { onClose: () => void; onSave: (d: any) => void; initial?: any }) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    category: initial?.category ?? 'OTHER',
    description: initial?.description ?? '',
    content: initial?.content ?? '',
    reviewDate: initial?.reviewDate ? initial.reviewDate.slice(0, 10) : '',
    effectiveDate: initial?.effectiveDate ? initial.effectiveDate.slice(0, 10) : '',
    changeNote: '',
  });

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  function handleSave() {
    if (!form.title || !form.content) return;
    const d: any = { ...form };
    if (!d.reviewDate) delete d.reviewDate;
    if (!d.effectiveDate) delete d.effectiveDate;
    if (!d.changeNote) delete d.changeNote;
    onSave(d);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initial ? 'Editar Política' : 'Nova Política'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Ex: Política de Segurança da Informação"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.category} onChange={e => set('category', e.target.value)}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Revisão</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.reviewDate} onChange={e => set('reviewDate', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Entrada em Vigor</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.effectiveDate} onChange={e => set('effectiveDate', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Resumo</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Breve descrição do propósito desta política"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo *</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                rows={12}
                value={form.content}
                onChange={e => set('content', e.target.value)}
                placeholder="Escreva o conteúdo completo da política aqui..."
              />
            </div>
            {initial && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nota de Alteração</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.changeNote}
                  onChange={e => set('changeNote', e.target.value)}
                  placeholder="Descreva o que foi alterado (opcional)"
                />
              </div>
            )}
          </div>
        </div>
        <div className="p-6 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>
            {initial ? 'Guardar Alterações' : 'Criar Política'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: View Policy ────────────────────────────────────────
function ViewPolicyModal({
  policy, onClose, onAction,
}: { policy: any; onClose: () => void; onAction: (action: string) => void }) {
  const s = STATUS_STYLES[policy.status] ?? STATUS_STYLES.DRAFT;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.bg} ${s.text}`}>{s.label}</span>
              <span className="text-xs text-gray-500">v{policy.version}</span>
              {policy.category && <span className="text-xs text-gray-500">{CATEGORY_LABELS[policy.category] ?? policy.category}</span>}
            </div>
            <h2 className="text-xl font-semibold">{policy.title}</h2>
            {policy.description && <p className="text-sm text-gray-500 mt-1">{policy.description}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none shrink-0">&times;</button>
        </div>

        {/* Workflow actions */}
        <div className="px-6 py-3 border-b bg-gray-50 flex gap-2 flex-wrap">
          {policy.status === 'DRAFT' && (
            <Button size="sm" variant="outline" onClick={() => onAction('submit')} className="gap-1">
              <Send className="w-3 h-3" /> Submeter para Revisão
            </Button>
          )}
          {policy.status === 'IN_REVIEW' && (
            <>
              <Button size="sm" onClick={() => onAction('approve')} className="gap-1 bg-green-600 hover:bg-green-700 text-white">
                <ThumbsUp className="w-3 h-3" /> Aprovar
              </Button>
              <Button size="sm" variant="outline" onClick={() => onAction('revert')} className="gap-1">
                <RotateCcw className="w-3 h-3" /> Devolver a Rascunho
              </Button>
            </>
          )}
          {policy.status === 'APPROVED' && (
            <>
              <Button size="sm" onClick={() => onAction('acknowledge')} className="gap-1 bg-blue-600 hover:bg-blue-700 text-white">
                <CheckCircle2 className="w-3 h-3" /> Confirmar Leitura
              </Button>
              <Button size="sm" variant="outline" onClick={() => onAction('archive')} className="gap-1">
                <Archive className="w-3 h-3" /> Arquivar
              </Button>
            </>
          )}
          {policy.status === 'ARCHIVED' && (
            <Button size="sm" variant="outline" onClick={() => onAction('revert')} className="gap-1">
              <RotateCcw className="w-3 h-3" /> Reativar como Rascunho
            </Button>
          )}
        </div>

        <div className="p-6">
          {/* Meta info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
            {policy.owner && (
              <div>
                <span className="text-gray-500 block">Responsável</span>
                <span className="font-medium">{policy.owner.firstName} {policy.owner.lastName}</span>
              </div>
            )}
            {policy.approver && (
              <div>
                <span className="text-gray-500 block">Aprovado por</span>
                <span className="font-medium">{policy.approver.firstName} {policy.approver.lastName}</span>
              </div>
            )}
            {policy.reviewDate && (
              <div>
                <span className="text-gray-500 block">Revisão</span>
                <span className="font-medium">{format(new Date(policy.reviewDate), 'dd/MM/yyyy')}</span>
              </div>
            )}
            {policy.effectiveDate && (
              <div>
                <span className="text-gray-500 block">Vigência</span>
                <span className="font-medium">{format(new Date(policy.effectiveDate), 'dd/MM/yyyy')}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">{policy.content}</pre>
          </div>

          {/* Stats */}
          {policy._count && (
            <div className="mt-4 flex gap-4 text-sm text-gray-500">
              <span>{policy._count.acknowledgments} confirmações de leitura</span>
              <span>{policy._count.versions} versões guardadas</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function PoliciesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [viewingPolicy, setViewingPolicy] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['policies', 'stats'],
    queryFn: () => policiesApi.stats().then(r => r.data),
  });

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['policies', 'list', statusFilter, categoryFilter],
    queryFn: () => policiesApi.list({
      ...(statusFilter && { status: statusFilter }),
      ...(categoryFilter && { category: categoryFilter }),
    }).then(r => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['policies'] });

  const createMutation = useMutation({
    mutationFn: (data: any) => policiesApi.create(data),
    onSuccess: () => { invalidate(); setShowCreate(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => policiesApi.update(id, data),
    onSuccess: () => { invalidate(); setEditingPolicy(null); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => policiesApi.remove(id),
    onSuccess: invalidate,
  });

  const workflowMutation = useMutation({
    mutationFn: ({ action, id }: { action: string; id: string }) => {
      if (action === 'submit') return policiesApi.submitForReview(id);
      if (action === 'approve') return policiesApi.approve(id);
      if (action === 'archive') return policiesApi.archive(id);
      if (action === 'revert') return policiesApi.revertToDraft(id);
      if (action === 'acknowledge') return policiesApi.acknowledge(id);
      throw new Error(`Unknown action: ${action}`);
    },
    onSuccess: () => { invalidate(); setViewingPolicy(null); },
  });

  const statCards = [
    { label: 'Total', value: stats?.total ?? 0, color: 'bg-blue-50 text-blue-700' },
    { label: 'Aprovadas', value: stats?.byStatus?.APPROVED ?? 0, color: 'bg-green-50 text-green-700' },
    { label: 'Em Revisão', value: stats?.byStatus?.IN_REVIEW ?? 0, color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Rascunhos', value: stats?.byStatus?.DRAFT ?? 0, color: 'bg-gray-50 text-gray-700' },
    { label: 'A Rever em 30d', value: stats?.expiringSoon ?? 0, color: 'bg-red-50 text-red-700' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" /> Políticas
          </h1>
          <p className="text-gray-500 text-sm mt-1">Gestão do ciclo de vida de políticas e procedimentos da organização</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Política
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCards.map(c => (
          <div key={c.label} className={`rounded-xl p-4 ${c.color}`}>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs font-medium mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">Todos os estados</option>
          {Object.entries(STATUS_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">A carregar...</div>
        ) : policies.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Sem políticas</p>
            <p className="text-gray-400 text-sm mt-1">Crie a primeira política da organização</p>
            <Button className="mt-4 gap-2" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" /> Nova Política
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Título</th>
                <th className="text-left px-4 py-3 font-medium">Categoria</th>
                <th className="text-left px-4 py-3 font-medium">Estado</th>
                <th className="text-left px-4 py-3 font-medium">Versão</th>
                <th className="text-left px-4 py-3 font-medium">Responsável</th>
                <th className="text-left px-4 py-3 font-medium">Revisão</th>
                <th className="text-left px-4 py-3 font-medium">Acks</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {policies.map((p: any) => {
                const s = STATUS_STYLES[p.status] ?? STATUS_STYLES.DRAFT;
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setViewingPolicy(p)}
                        className="font-medium text-gray-900 hover:text-blue-600 text-left"
                      >
                        {p.title}
                      </button>
                      {p.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{p.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{CATEGORY_LABELS[p.category] ?? p.category ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.bg} ${s.text}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">v{p.version}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.owner ? `${p.owner.firstName} ${p.owner.lastName}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.reviewDate ? format(new Date(p.reviewDate), 'dd/MM/yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p._count?.acknowledgments ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewingPolicy(p)}
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingPolicy(p)}
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { if (confirm('Eliminar esta política?')) removeMutation.mutate(p.id); }}
                          className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <PolicyModal
          onClose={() => setShowCreate(false)}
          onSave={(data) => createMutation.mutate(data)}
        />
      )}
      {editingPolicy && (
        <PolicyModal
          initial={editingPolicy}
          onClose={() => setEditingPolicy(null)}
          onSave={(data) => updateMutation.mutate({ id: editingPolicy.id, data })}
        />
      )}
      {viewingPolicy && (
        <ViewPolicyModal
          policy={viewingPolicy}
          onClose={() => setViewingPolicy(null)}
          onAction={(action) => workflowMutation.mutate({ action, id: viewingPolicy.id })}
        />
      )}
    </div>
  );
}
