'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qualityDocumentsApi } from '@/lib/api';
import { saveBlobResponse } from '@/lib/download';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import {
  Plus, FileText, Download, Upload, Send, CheckCircle2, Ban, RotateCcw,
  Trash2, ChevronDown, ChevronRight, History, Share2,
} from 'lucide-react';
import { format } from 'date-fns';

// Main clauses 4-10 are the same in every ISO management-system standard (high-level structure)
// and are the folders consultants already think in.
const CLAUSE_TITLES: Record<string, string> = {
  '4': 'Contexto da organização',
  '5': 'Liderança',
  '6': 'Planeamento',
  '7': 'Suporte',
  '8': 'Operacionalização',
  '9': 'Avaliação do desempenho',
  '10': 'Melhoria',
};

const DOC_TYPES: Record<string, string> = {
  MANUAL: 'Manual', PROCEDURE: 'Procedimento', INSTRUCTION: 'Instrução de trabalho',
  FORM: 'Formulário / Modelo', RECORD: 'Registo', OTHER: 'Outro',
};

const STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT:     { label: 'Rascunho',   cls: 'bg-gray-100 text-gray-600' },
  IN_REVIEW: { label: 'Em revisão', cls: 'bg-amber-100 text-amber-700' },
  APPROVED:  { label: 'Aprovado',   cls: 'bg-green-100 text-green-700' },
  OBSOLETE:  { label: 'Obsoleto',   cls: 'bg-red-100 text-red-600' },
};

const ACCEPT = '.pdf,.doc,.docx,.odt,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.odp,.txt,.png,.jpg,.jpeg,.vsdx';

const topClause = (c: string) => c.split('.')[0];
const clauseSort = (a: string, b: string) => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? -1) - (pb[i] ?? -1);
    if (d) return d;
  }
  return 0;
};
const errMsg = (e: any) => e?.response?.data?.message || e?.message || 'Erro inesperado';
const fmtSize = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** "Applies to" picker: one document, one file and one approval, filed for several standards. */
function AlsoStandards({ standards, primary, value, onChange }: {
  standards: Standard[]; primary: string; value: string[]; onChange: (v: string[]) => void;
}) {
  const options = standards.filter(x => x.canWrite && x.key !== primary);
  if (!options.length) return null;
  const toggle = (k: string) => onChange(value.includes(k) ? value.filter(x => x !== k) : [...value, k]);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Aplica-se também a <span className="text-gray-400 font-normal">(o mesmo documento, partilhado)</span></label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(x => {
          const on = value.includes(x.key);
          return (
            <button type="button" key={x.key} onClick={() => toggle(x.key)}
              className={`text-xs rounded-full border px-2.5 py-1 ${on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              {x.label.split(' · ')[0]}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-400 mt-1">Um procedimento comum (ex.: controlo de documentos) fica num só sítio, com uma só versão e aprovação, e aparece nas listas de cada norma. Só a norma principal o pode alterar.</p>
    </div>
  );
}

function ShareModal({ doc, standards, onClose, onSave, busy }: {
  doc: any; standards: Standard[]; onClose: () => void; onSave: (also: string[]) => void; busy: boolean;
}) {
  const [also, setAlso] = useState<string[]>(doc.alsoStandards ?? []);
  // keep standards already shared that this user cannot write to (they can be removed but not added)
  const known = standards.filter(x => x.key !== doc.standard);
  return (
    <ModalShell title={`Partilhar — ${doc.title}`} onClose={onClose}>
      <div className="p-5 space-y-3">
        <p className="text-xs text-gray-500">Norma principal: <b>{standards.find(x => x.key === doc.standard)?.label ?? doc.standard}</b>. A cláusula {doc.clause} é a mesma nas normas ISO de gestão (estrutura de alto nível).</p>
        <AlsoStandards standards={known.map(x => ({ ...x, canWrite: x.canWrite || also.includes(x.key) }))} primary={doc.standard} value={also} onChange={setAlso} />
      </div>
      <div className="p-5 border-t flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" disabled={busy} onClick={() => onSave(also)}>{busy ? 'A guardar…' : 'Guardar'}</Button>
      </div>
    </ModalShell>
  );
}

function NewDocumentModal({ onClose, onSave, busy, standards, initialStandard }: {
  onClose: () => void; onSave: (f: FormData) => void; busy: boolean;
  standards: Standard[]; initialStandard: string;
}) {
  const [form, setForm] = useState({ standard: initialStandard, clause: '', title: '', code: '', docType: 'MANUAL', description: '', version: '1.0', reviewDate: '', tags: '' });
  const [also, setAlso] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const s = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const valid = /^\d+(\.\d+)*$/.test(form.clause) && form.title.trim() && file;

  function submit() {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
    const extra = also.filter(k => k !== form.standard);
    if (extra.length) fd.append('alsoStandards', extra.join(','));
    fd.append('file', file as File);
    onSave(fd);
  }

  return (
    <ModalShell title="Novo documento" onClose={onClose}>
      <div className="p-5 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sistema de gestão *</label>
          <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.standard} onChange={e => s('standard', e.target.value)}>
            {standards.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select>
        </div>
        <AlsoStandards standards={standards} primary={form.standard} value={also} onChange={setAlso} />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cláusula *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="4, 5.3, 7.5…" value={form.clause} onChange={e => s('clause', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="MQ-01" value={form.code} onChange={e => s('code', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Versão</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.version} onChange={e => s('version', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Manual da Qualidade, Procedimento de gestão de resíduos…" value={form.title} onChange={e => s('title', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.docType} onChange={e => s('docType', e.target.value)}>
              {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Próxima revisão</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.reviewDate} onChange={e => s('reviewDate', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.description} onChange={e => s('description', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ficheiro * <span className="text-gray-400 font-normal">(máx. 25 MB)</span></label>
          <input type="file" accept={ACCEPT} onChange={e => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
        </div>
      </div>
      <div className="p-5 border-t flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" disabled={!valid || busy} onClick={submit}>{busy ? 'A carregar…' : 'Criar'}</Button>
      </div>
    </ModalShell>
  );
}

function NewVersionModal({ doc, onClose, onSave, busy }: { doc: any; onClose: () => void; onSave: (f: FormData) => void; busy: boolean }) {
  const [version, setVersion] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [file, setFile] = useState<File | null>(null);

  function submit() {
    const fd = new FormData();
    if (version) fd.append('version', version);
    if (changeNote) fd.append('changeNote', changeNote);
    fd.append('file', file as File);
    onSave(fd);
  }

  return (
    <ModalShell title={`Nova versão — ${doc.title}`} onClose={onClose}>
      <div className="p-5 space-y-3">
        <p className="text-xs text-gray-500">Versão atual: {doc.currentVersion}. O documento volta a rascunho e tem de ser aprovado de novo.</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nº da versão <span className="text-gray-400 font-normal">(vazio = automático)</span></label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={version} onChange={e => setVersion(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nota de alteração</label>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={changeNote} onChange={e => setChangeNote(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ficheiro *</label>
          <input type="file" accept={ACCEPT} onChange={e => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
        </div>
      </div>
      <div className="p-5 border-t flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" disabled={!file || busy} onClick={submit}>{busy ? 'A carregar…' : 'Carregar versão'}</Button>
      </div>
    </ModalShell>
  );
}

function VersionHistory({ id, onDownload }: { id: string; onDownload: (id: string, versionId?: string) => void }) {
  const { data: doc } = useQuery({
    queryKey: ['quality-document', id],
    queryFn: () => qualityDocumentsApi.get(id).then(r => r.data),
  });
  if (!doc) return <p className="text-xs text-gray-400 px-4 py-2">A carregar…</p>;
  return (
    <div className="bg-gray-50 px-4 py-3 space-y-1.5">
      {doc.versions.map((v: any) => (
        <div key={v.id} className="flex items-center gap-3 text-xs text-gray-600">
          <span className="font-mono font-semibold w-12">v{v.version}</span>
          <span className="flex-1 truncate">{v.fileName} · {fmtSize(v.fileSize)}{v.changeNote ? ` · ${v.changeNote}` : ''}</span>
          <span className="text-gray-400 whitespace-nowrap">
            {v.uploadedBy?.firstName} {v.uploadedBy?.lastName} · {format(new Date(v.createdAt), 'dd/MM/yyyy')}
          </span>
          <button title="Descarregar" className="text-primary hover:text-primary/70" onClick={() => onDownload(id, v.id)}>
            <Download className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

interface Standard { key: string; label: string; canWrite: boolean }

function DocumentsInner() {
  const qc = useQueryClient();
  const params = useSearchParams();
  const [standard, setStandard] = useState(params.get('standard') ?? '');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [versionFor, setVersionFor] = useState<any>(null);
  const [shareFor, setShareFor] = useState<any>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [history, setHistory] = useState<Record<string, boolean>>({});

  // Standards (ISO 9001, 14001, 45001…) this user may see; each is gated by its own module permission.
  const { data: standards = [], isLoading: loadingStandards } = useQuery<Standard[]>({
    queryKey: ['quality-document-standards'],
    queryFn: () => qualityDocumentsApi.standards().then(r => r.data),
  });
  useEffect(() => {
    if (standards.length && !standards.some(x => x.key === standard)) {
      setStandard(standards.find(x => x.key === 'ISO_9001')?.key ?? standards[0].key);
    }
  }, [standards, standard]);
  const current = standards.find(x => x.key === standard);
  const canWrite = !!current?.canWrite;

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['quality-documents', standard, statusFilter, typeFilter],
    enabled: !!current,
    queryFn: () => qualityDocumentsApi
      .list({ standard, status: statusFilter || undefined, docType: typeFilter || undefined })
      .then(r => r.data),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['quality-documents'] });
    qc.invalidateQueries({ queryKey: ['quality-document'] });
  };
  const onError = (e: any) => alert(errMsg(e));

  const createMut = useMutation({ mutationFn: (f: FormData) => qualityDocumentsApi.create(f), onSuccess: () => { refresh(); setShowNew(false); }, onError });
  const versionMut = useMutation({ mutationFn: ({ id, f }: { id: string; f: FormData }) => qualityDocumentsApi.addVersion(id, f), onSuccess: () => { refresh(); setVersionFor(null); }, onError });
  const shareMut = useMutation({
    mutationFn: ({ id, also }: { id: string; also: string[] }) => qualityDocumentsApi.update(id, { alsoStandards: also }),
    onSuccess: () => { refresh(); setShareFor(null); }, onError,
  });
  const actionMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'submit' | 'approve' | 'obsolete' | 'revert' | 'remove' }) => qualityDocumentsApi[action](id),
    onSuccess: refresh, onError,
  });

  async function download(id: string, versionId?: string) {
    try {
      saveBlobResponse(await qualityDocumentsApi.file(id, versionId));
    } catch (e) { onError(e); }
  }

  // Group by top-level ISO clause, sub-clauses sorted inside.
  const groups = new Map<string, any[]>();
  [...docs].sort((a: any, b: any) => clauseSort(a.clause, b.clause)).forEach((d: any) => {
    const k = topClause(d.clause);
    groups.set(k, [...(groups.get(k) ?? []), d]);
  });
  const orderedGroups = [...groups.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestão Documental</h1>
          <p className="text-sm text-gray-500">Documentos controlados (informação documentada, §7.5), organizados por cláusula, com versões e aprovação.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="border rounded-lg px-3 py-2 text-sm font-medium bg-white" value={standard} onChange={e => setStandard(e.target.value)}>
            {standards.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select>
          <select className="border rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Todos os estados</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="border rounded-lg px-3 py-2 text-sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">Todos os tipos</option>
            {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {canWrite && <Button size="sm" onClick={() => setShowNew(true)}><Plus className="w-4 h-4 mr-1" /> Novo documento</Button>}
        </div>
      </div>

      {loadingStandards || (current && isLoading) ? (
        <TableSkeleton rows={5} cols={5} />
      ) : !current ? (
        <EmptyState icon={FileText} title="Sem acesso a documentos" description="A sua função não tem acesso a documentos de nenhum sistema de gestão." />
      ) : orderedGroups.length === 0 ? (
        <EmptyState icon={FileText} title={`Sem documentos — ${current.label}`} description="Carregue o manual, procedimentos, instruções e registos, organizados por cláusula." />
      ) : (
        orderedGroups.map(([clause, items]) => {
          const open = expanded[clause] ?? true;
          return (
            <div key={clause} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <button className="w-full flex items-center gap-2 px-5 py-3 bg-gray-50 border-b text-left"
                onClick={() => setExpanded(p => ({ ...p, [clause]: !open }))}>
                {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className="font-semibold text-gray-900">Cláusula {clause}{CLAUSE_TITLES[clause] ? ` — ${CLAUSE_TITLES[clause]}` : ''}</span>
                <span className="text-xs text-gray-400">{items.length} documento{items.length === 1 ? '' : 's'}</span>
              </button>
              {open && items.map((d: any) => {
                const st = STATUS[d.status] ?? STATUS.DRAFT;
                const showHist = history[d.id];
                const canWrite = !!d.canWrite; // per document: a shared document is changed by its primary standard's team
                const sharedFrom = d.standard !== standard ? standards.find(x => x.key === d.standard)?.label.split(' · ')[0] ?? d.standard.replace('_', ' ') : null;
                const alsoLabels: string[] = (d.alsoStandards ?? []).filter((k: string) => k !== standard)
                  .map((k: string) => standards.find(x => x.key === k)?.label.split(' · ')[0] ?? k.replace('_', ' '));
                return (
                  <div key={d.id} className="border-b last:border-b-0">
                    <div className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <span className="text-xs font-mono bg-blue-50 text-blue-700 rounded px-2 py-0.5">{d.clause}</span>
                      <div className="flex-1 min-w-[200px]">
                        <p className="text-sm font-medium text-gray-900">
                          {d.code ? `${d.code} · ` : ''}{d.title}
                          {sharedFrom && <span title="Documento da norma indicada, partilhado com esta" className="ml-2 align-middle text-[10px] font-medium rounded-full px-2 py-0.5 bg-violet-100 text-violet-700">Partilhado de {sharedFrom}</span>}
                          {alsoLabels.length > 0 && <span title="Este documento também serve estas normas" className="ml-2 align-middle text-[10px] font-medium rounded-full px-2 py-0.5 bg-blue-50 text-blue-700">Também: {alsoLabels.join(', ')}</span>}
                        </p>
                        <p className="text-xs text-gray-400">
                          {DOC_TYPES[d.docType] ?? d.docType} · v{d.currentVersion} · {d.owner?.firstName} {d.owner?.lastName}
                          {d.reviewDate ? ` · revisão ${format(new Date(d.reviewDate), 'dd/MM/yyyy')}` : ''}
                        </p>
                      </div>
                      <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${st.cls}`}>{st.label}</span>
                      <div className="flex items-center gap-1">
                        <button title="Descarregar versão atual" className="p-1.5 rounded hover:bg-gray-100" onClick={() => download(d.id)}><Download className="w-4 h-4" /></button>
                        <button title="Histórico de versões" className="p-1.5 rounded hover:bg-gray-100" onClick={() => setHistory(p => ({ ...p, [d.id]: !showHist }))}><History className="w-4 h-4" /></button>
                        {canWrite && <button title="Partilhar com outras normas" className="p-1.5 rounded hover:bg-gray-100" onClick={() => setShareFor(d)}><Share2 className="w-4 h-4" /></button>}
                        {canWrite && <button title="Nova versão" className="p-1.5 rounded hover:bg-gray-100" onClick={() => setVersionFor(d)}><Upload className="w-4 h-4" /></button>}
                        {canWrite && d.status === 'DRAFT' && <button title="Submeter para revisão" className="p-1.5 rounded hover:bg-amber-50 text-amber-600" onClick={() => actionMut.mutate({ id: d.id, action: 'submit' })}><Send className="w-4 h-4" /></button>}
                        {canWrite && d.status === 'IN_REVIEW' && <button title="Aprovar" className="p-1.5 rounded hover:bg-green-50 text-green-600" onClick={() => actionMut.mutate({ id: d.id, action: 'approve' })}><CheckCircle2 className="w-4 h-4" /></button>}
                        {canWrite && d.status !== 'OBSOLETE' && <button title="Marcar obsoleto" className="p-1.5 rounded hover:bg-red-50 text-red-500" onClick={() => actionMut.mutate({ id: d.id, action: 'obsolete' })}><Ban className="w-4 h-4" /></button>}
                        {canWrite && d.status !== 'DRAFT' && <button title="Voltar a rascunho" className="p-1.5 rounded hover:bg-gray-100" onClick={() => actionMut.mutate({ id: d.id, action: 'revert' })}><RotateCcw className="w-4 h-4" /></button>}
                        {canWrite && <button title="Eliminar" className="p-1.5 rounded hover:bg-red-50 text-red-500"
                          onClick={() => { if (confirm(`Eliminar "${d.title}" e todas as suas versões?`)) actionMut.mutate({ id: d.id, action: 'remove' }); }}><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    </div>
                    {showHist && <VersionHistory id={d.id} onDownload={download} />}
                  </div>
                );
              })}
            </div>
          );
        })
      )}

      {showNew && <NewDocumentModal busy={createMut.isPending} standards={standards.filter(x => x.canWrite)} initialStandard={standard} onClose={() => setShowNew(false)} onSave={f => createMut.mutate(f)} />}
      {shareFor && <ShareModal doc={shareFor} standards={standards} busy={shareMut.isPending} onClose={() => setShareFor(null)} onSave={also => shareMut.mutate({ id: shareFor.id, also })} />}
      {versionFor && <NewVersionModal doc={versionFor} busy={versionMut.isPending} onClose={() => setVersionFor(null)} onSave={f => versionMut.mutate({ id: versionFor.id, f })} />}
    </div>
  );
}

export default function QualityDocumentsPage() {
  return (
    <Suspense fallback={null}>
      <DocumentsInner />
    </Suspense>
  );
}
