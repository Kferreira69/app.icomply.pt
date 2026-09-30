'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { policiesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import {
  Plus, BookOpen, CheckCircle2, Archive,
  Eye, Pencil, Trash2, ThumbsUp, Send,
  RotateCcw, FileText, Paperclip, Download, Upload, History,
} from 'lucide-react';
import { saveBlobResponse } from '@/lib/download';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { format } from 'date-fns';

// ── Modal: Create / Edit Policy ───────────────────────────────
function PolicyModal({
  onClose, onSave, initial,
}: { onClose: () => void; onSave: (d: any) => void; initial?: any }) {
  const t = useTranslations('policies');
  const tCommon = useTranslations('common');

  const CATEGORY_LABELS: Record<string, string> = {
    INFORMATION_SECURITY: t('category.INFORMATION_SECURITY'),
    DATA_PROTECTION: t('category.DATA_PROTECTION'),
    HR: t('category.HUMAN_RESOURCES'),
    COMPLIANCE: t('category.COMPLIANCE'),
    OPERATIONS: t('category.OPERATIONAL'),
    FINANCE: 'Finanças',
    OTHER: t('category.OTHER'),
  };

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
          <h2 className="text-lg font-semibold">{initial ? t('editPolicy') : t('newPolicy')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('policyName')} *</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder={t('titlePlaceholder') as string}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('reviewDate')}</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.category} onChange={e => set('category', e.target.value)}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('reviewDate')}</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.reviewDate} onChange={e => set('reviewDate', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('effectiveDate')}</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.effectiveDate} onChange={e => set('effectiveDate', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('summaryLabel')}</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder={t('descriptionPlaceholder') as string}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('content')} *</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                rows={12}
                value={form.content}
                onChange={e => set('content', e.target.value)}
                placeholder={t('contentPlaceholder') as string}
              />
            </div>
            {initial && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('changeNote')}</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.changeNote}
                  onChange={e => set('changeNote', e.target.value)}
                  placeholder={t('changeNotePlaceholder') as string}
                />
              </div>
            )}
          </div>
        </div>
        <div className="p-6 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>{tCommon('cancel')}</Button>
          <Button onClick={handleSave}>
            {initial ? t('status.APPROVED') : t('newPolicy')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Attachments (Word/PDF/… with version history) ────────────
const ATTACH_ACCEPT = '.pdf,.doc,.docx,.odt,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.odp,.txt,.png,.jpg,.jpeg,.vsdx';
const attErr = (e: any) => e?.response?.data?.message || e?.message || 'Erro inesperado';
const attSize = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function PolicyAttachments({ policy, readOnly }: { policy: any; readOnly: boolean }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [addFile, setAddFile] = useState<File | null>(null);
  const [versioningId, setVersioningId] = useState<string | null>(null);
  const [changeNote, setChangeNote] = useState('');
  const [verFile, setVerFile] = useState<File | null>(null);
  const [openHistory, setOpenHistory] = useState<Record<string, boolean>>({});

  const refresh = () => qc.invalidateQueries({ queryKey: ['policies'] });
  const attachments: any[] = policy.attachments ?? [];
  const warnRevert = policy.status === 'APPROVED' || policy.status === 'IN_REVIEW';

  const addMut = useMutation({
    mutationFn: (fd: FormData) => policiesApi.addAttachment(policy.id, fd),
    onSuccess: () => { refresh(); setAdding(false); setTitle(''); setAddFile(null); },
    onError: (e) => alert(attErr(e)),
  });
  const verMut = useMutation({
    mutationFn: ({ attId, fd }: { attId: string; fd: FormData }) => policiesApi.addAttachmentVersion(policy.id, attId, fd),
    onSuccess: () => { refresh(); setVersioningId(null); setChangeNote(''); setVerFile(null); },
    onError: (e) => alert(attErr(e)),
  });
  const delMut = useMutation({
    mutationFn: (attId: string) => policiesApi.removeAttachment(policy.id, attId),
    onSuccess: refresh,
    onError: (e) => alert(attErr(e)),
  });

  const confirmRevert = () =>
    !warnRevert || confirm('Esta política está em revisão/aprovada. Alterar os anexos volta a colocá-la em rascunho e terá de ser aprovada de novo. Continuar?');

  async function download(attId: string, versionId?: string) {
    try { saveBlobResponse(await policiesApi.attachmentFile(policy.id, attId, versionId)); }
    catch (e) { alert(attErr(e)); }
  }

  function submitAdd() {
    if (!addFile || !confirmRevert()) return;
    const fd = new FormData();
    if (title) fd.append('title', title);
    fd.append('file', addFile);
    addMut.mutate(fd);
  }

  function submitVersion(attId: string) {
    if (!verFile || !confirmRevert()) return;
    const fd = new FormData();
    if (changeNote) fd.append('changeNote', changeNote);
    fd.append('file', verFile);
    verMut.mutate({ attId, fd });
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
          <Paperclip className="w-4 h-4" /> Anexos ({attachments.length})
        </h3>
        {!readOnly && !adding && (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setAdding(true)}>
            <Plus className="w-3 h-3" /> Adicionar ficheiro
          </Button>
        )}
      </div>

      {adding && (
        <div className="border rounded-lg p-3 mb-3 space-y-2 bg-blue-50/40">
          <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Título (opcional — por defeito o nome do ficheiro)"
            value={title} onChange={e => setTitle(e.target.value)} />
          <input type="file" accept={ATTACH_ACCEPT} className="w-full text-sm" onChange={e => setAddFile(e.target.files?.[0] ?? null)} />
          <p className="text-xs text-gray-500">Word, PDF, Excel, PowerPoint, imagens… até 25 MB.</p>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => { setAdding(false); setAddFile(null); setTitle(''); }}>Cancelar</Button>
            <Button size="sm" disabled={!addFile || addMut.isPending} onClick={submitAdd}>{addMut.isPending ? 'A carregar…' : 'Carregar'}</Button>
          </div>
        </div>
      )}

      {attachments.length === 0 && !adding && (
        <p className="text-sm text-gray-400">Sem anexos. Pode anexar, por exemplo, a versão Word da política.</p>
      )}

      <div className="space-y-2">
        {attachments.map((a: any) => {
          const cur = a.versions?.find((v: any) => v.version === a.currentVersion) ?? a.versions?.[0];
          return (
            <div key={a.id} className="border rounded-lg">
              <div className="flex flex-wrap items-center gap-3 px-3 py-2">
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="flex-1 min-w-[180px]">
                  <p className="text-sm font-medium text-gray-900">{a.title} <span className="text-xs font-mono text-gray-500">v{a.currentVersion}</span></p>
                  {cur && (
                    <p className="text-xs text-gray-400">
                      {cur.fileName} · {attSize(cur.fileSize)} · {cur.uploadedBy?.firstName} {cur.uploadedBy?.lastName} · {format(new Date(cur.createdAt), 'dd/MM/yyyy')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button title="Descarregar versão atual" className="p-1.5 rounded hover:bg-gray-100" onClick={() => download(a.id)}><Download className="w-4 h-4" /></button>
                  <button title="Histórico de versões" className="p-1.5 rounded hover:bg-gray-100" onClick={() => setOpenHistory(p => ({ ...p, [a.id]: !p[a.id] }))}><History className="w-4 h-4" /></button>
                  {!readOnly && (
                    <>
                      <button title="Carregar nova versão" className="p-1.5 rounded hover:bg-gray-100" onClick={() => setVersioningId(versioningId === a.id ? null : a.id)}><Upload className="w-4 h-4" /></button>
                      <button title="Eliminar anexo" className="p-1.5 rounded hover:bg-red-50 text-red-500"
                        onClick={() => { if (confirmRevert() && confirm(`Eliminar "${a.title}" e todas as suas versões?`)) delMut.mutate(a.id); }}><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </div>

              {versioningId === a.id && (
                <div className="border-t px-3 py-2 space-y-2 bg-blue-50/40">
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nota de alteração (o que mudou?)" value={changeNote} onChange={e => setChangeNote(e.target.value)} />
                  <input type="file" accept={ATTACH_ACCEPT} className="w-full text-sm" onChange={e => setVerFile(e.target.files?.[0] ?? null)} />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => { setVersioningId(null); setVerFile(null); setChangeNote(''); }}>Cancelar</Button>
                    <Button size="sm" disabled={!verFile || verMut.isPending} onClick={() => submitVersion(a.id)}>{verMut.isPending ? 'A carregar…' : 'Carregar versão'}</Button>
                  </div>
                </div>
              )}

              {openHistory[a.id] && (
                <div className="border-t bg-gray-50 px-3 py-2 space-y-1.5">
                  {a.versions.map((v: any) => (
                    <div key={v.id} className="flex items-center gap-3 text-xs text-gray-600">
                      <span className="font-mono font-semibold w-12">v{v.version}</span>
                      <span className="flex-1 truncate">{v.fileName} · {attSize(v.fileSize)}{v.changeNote ? ` · ${v.changeNote}` : ''}</span>
                      <span className="text-gray-400 whitespace-nowrap">{v.uploadedBy?.firstName} {v.uploadedBy?.lastName} · {format(new Date(v.createdAt), 'dd/MM/yyyy')}</span>
                      <button title="Descarregar esta versão" className="text-primary hover:text-primary/70" onClick={() => download(a.id, v.id)}><Download className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Modal: View Policy ────────────────────────────────────────
function ViewPolicyModal({
  policy: listPolicy, onClose, onAction, currentUserId,
}: { policy: any; onClose: () => void; onAction: (action: string) => void; currentUserId?: string }) {
  const t = useTranslations('policies');
  // The list row has no attachments; load the full detail (also reflects a status
  // change caused by editing attachments, e.g. APPROVED -> DRAFT).
  const { data: detail } = useQuery({
    queryKey: ['policies', 'detail', listPolicy.id],
    queryFn: () => policiesApi.get(listPolicy.id).then(r => r.data),
  });
  const policy = detail ?? listPolicy;

  const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    DRAFT:     { bg: 'bg-gray-100',   text: 'text-gray-700',   label: t('status.DRAFT') },
    IN_REVIEW: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: t('status.IN_REVIEW') },
    APPROVED:  { bg: 'bg-green-100',  text: 'text-green-800',  label: t('status.APPROVED') },
    ARCHIVED:  { bg: 'bg-red-50',     text: 'text-red-700',    label: t('status.ARCHIVED') },
  };
  const CATEGORY_LABELS: Record<string, string> = {
    INFORMATION_SECURITY: t('category.INFORMATION_SECURITY'),
    DATA_PROTECTION: t('category.DATA_PROTECTION'),
    HR: t('category.HUMAN_RESOURCES'),
    COMPLIANCE: t('category.COMPLIANCE'),
    OPERATIONS: t('category.OPERATIONAL'),
    FINANCE: 'Finanças',
    OTHER: t('category.OTHER'),
  };

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
              <Send className="w-3 h-3" /> {t('submitForReview')}
            </Button>
          )}
          {policy.status === 'IN_REVIEW' && (
            <>
              {currentUserId && currentUserId === policy.owner?.id ? (
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                  ⚠ Não pode aprovar a sua própria política (separação de funções)
                </span>
              ) : (
                <Button size="sm" onClick={() => onAction('approve')} className="gap-1 bg-green-600 hover:bg-green-700 text-white">
                  <ThumbsUp className="w-3 h-3" /> {t('approve')}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => onAction('revert')} className="gap-1">
                <RotateCcw className="w-3 h-3" /> {t('revertToDraft')}
              </Button>
            </>
          )}
          {policy.status === 'APPROVED' && (
            <>
              <Button size="sm" onClick={() => onAction('acknowledge')} className="gap-1 bg-blue-600 hover:bg-blue-700 text-white">
                <CheckCircle2 className="w-3 h-3" /> {t('confirmReading')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onAction('archive')} className="gap-1">
                <Archive className="w-3 h-3" /> {t('archive')}
              </Button>
            </>
          )}
          {policy.status === 'ARCHIVED' && (
            <Button size="sm" variant="outline" onClick={() => onAction('revert')} className="gap-1">
              <RotateCcw className="w-3 h-3" /> {t('reactivateAsDraft')}
            </Button>
          )}
        </div>

        <div className="p-6">
          {/* Meta info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
            {policy.owner && (
              <div>
                <span className="text-gray-500 block">{t('metaOwner')}</span>
                <span className="font-medium">{policy.owner.firstName} {policy.owner.lastName}</span>
              </div>
            )}
            {policy.approver && (
              <div>
                <span className="text-gray-500 block">{t('metaApprovedBy')}</span>
                <span className="font-medium">{policy.approver.firstName} {policy.approver.lastName}</span>
              </div>
            )}
            {policy.reviewDate && (
              <div>
                <span className="text-gray-500 block">{t('metaReview')}</span>
                <span className="font-medium">{format(new Date(policy.reviewDate), 'dd/MM/yyyy')}</span>
              </div>
            )}
            {policy.effectiveDate && (
              <div>
                <span className="text-gray-500 block">{t('metaEffective')}</span>
                <span className="font-medium">{format(new Date(policy.effectiveDate), 'dd/MM/yyyy')}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">{policy.content}</pre>
          </div>

          {/* Attachments */}
          <PolicyAttachments policy={policy} readOnly={policy.status === 'ARCHIVED'} />

          {/* Stats */}
          {policy._count && (
            <div className="mt-4 flex gap-4 text-sm text-gray-500">
              <span>{t('ackCount', { n: policy._count.acknowledgments })}</span>
              <span>{t('versionCount', { n: policy._count.versions })}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function PoliciesPage() {
  const t = useTranslations('policies');
  const tCommon = useTranslations('common');
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [viewingPolicy, setViewingPolicy] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    DRAFT:     { bg: 'bg-gray-100',   text: 'text-gray-700',   label: t('status.DRAFT') },
    IN_REVIEW: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: t('status.IN_REVIEW') },
    APPROVED:  { bg: 'bg-green-100',  text: 'text-green-800',  label: t('status.APPROVED') },
    ARCHIVED:  { bg: 'bg-red-50',     text: 'text-red-700',    label: t('status.ARCHIVED') },
  };
  const CATEGORY_LABELS: Record<string, string> = {
    INFORMATION_SECURITY: t('category.INFORMATION_SECURITY'),
    DATA_PROTECTION: t('category.DATA_PROTECTION'),
    HR: t('category.HUMAN_RESOURCES'),
    COMPLIANCE: t('category.COMPLIANCE'),
    OPERATIONS: t('category.OPERATIONAL'),
    FINANCE: 'Finanças',
    OTHER: t('category.OTHER'),
  };

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
    { label: t('statTotal'), value: stats?.total ?? 0, color: 'bg-blue-50 text-blue-700' },
    { label: t('statApproved'), value: stats?.byStatus?.APPROVED ?? 0, color: 'bg-green-50 text-green-700' },
    { label: t('statInReview'), value: stats?.byStatus?.IN_REVIEW ?? 0, color: 'bg-yellow-50 text-yellow-700' },
    { label: t('statDraft'), value: stats?.byStatus?.DRAFT ?? 0, color: 'bg-gray-50 text-gray-700' },
    { label: t('statExpiringSoon'), value: stats?.expiringSoon ?? 0, color: 'bg-red-50 text-red-700' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" /> {t('title')}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{t('descriptionSubtitle')}</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" /> {t('newPolicy')}
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
          <option value="">{t('allStatuses')}</option>
          {Object.entries(STATUS_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="">{t('allCategories')}</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={8} />
      ) : policies.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhuma política criada"
          description="Crie a primeira política para começar a governança documental."
          actionLabel={t('newPolicy') as string}
          onAction={() => setShowCreate(true)}
        />
      ) : (
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">{t('colTitle')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('colCategory')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('colStatus')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('colVersion')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('colOwner')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('colReview')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('colAcks')}</th>
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
                        title={tCommon('view') as string}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingPolicy(p)}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition-colors"
                        title={tCommon('edit') as string}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { if (confirm(t('deleteConfirm') as string)) removeMutation.mutate(p.id); }}
                        className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors"
                        title={tCommon('delete') as string}
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
      </div>
      )}

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
          currentUserId={user?.id}
        />
      )}
    </div>
  );
}
