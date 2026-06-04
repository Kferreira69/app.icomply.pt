'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { evidenceApi } from '@/lib/api';
import { Upload, FileText, X, CheckCircle, Clock, XCircle, Loader2, CheckCheck, Square, CheckSquare } from 'lucide-react';
import { cn, formatDate, formatBytes, formatRelative, getStatusColor } from '@/lib/utils';

function StatusIcon({ status }: { status: string }) {
  if (status === 'APPROVED') return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (status === 'REJECTED') return <XCircle className="w-4 h-4 text-red-500" />;
  return <Clock className="w-4 h-4 text-yellow-500" />;
}

function UploadModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations('evidence');
  const tCommon = useTranslations('common');
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const uploadMutation = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('file', file!);
      form.append('title', title);
      form.append('description', description);
      return evidenceApi.upload(form);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['evidence'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">{t('uploadEvidence')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4',
            file ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary hover:bg-gray-50',
          )}
        >
          <input ref={fileRef} type="file" className="hidden" onChange={e => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setTitle(prev => prev || e.target.files![0].name); }}} />
          {file ? (
            <>
              <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">{t('clickToSelect')}</p>
              <p className="text-xs text-gray-400">{t('fileTypes')}</p>
            </>
          )}
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tCommon('name')} *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="ex: Política de Segurança v2.1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tCommon('description')}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none" />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">{tCommon('cancel')}</button>
          <button
            onClick={() => uploadMutation.mutate()}
            disabled={!file || !title || uploadMutation.isPending}
            className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {uploadMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('upload')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EvidencePage() {
  const t = useTranslations('evidence');
  const qc = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulking, setBulking] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['evidence', statusFilter],
    queryFn: () => evidenceApi.list({ status: statusFilter || undefined, limit: 50 }).then(r => r.data),
  });

  const evidences = data?.data || [];

  const handleBulkStatus = async (status: string) => {
    if (!selected.size) return;
    setBulking(true);
    try {
      await evidenceApi.bulkStatus(Array.from(selected), status);
      qc.invalidateQueries({ queryKey: ['evidence'] });
      setSelected(new Set());
    } finally { setBulking(false); }
  };

  const toggleSelect = (id: string) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(evidences.map((e: any) => e.id)));
  const clearSelection = () => setSelected(new Set());

  const STATUS_KEYS = ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none"
        >
          <option value="">{t('allStatuses')}</option>
          {STATUS_KEYS.map(s => (
            <option key={s} value={s}>{t(`status.${s}`)}</option>
          ))}
        </select>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Upload className="w-4 h-4" /> {t('uploadEvidence')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {STATUS_KEYS.map(s => (
          <div key={s} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {evidences.filter((e: any) => e.status === s).length}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{t(`status.${s}`)}</p>
          </div>
        ))}
      </div>

      {/* Bulk action toolbar */}
      {evidences.length > 0 && (
        <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm">
          <button onClick={selected.size === evidences.length ? clearSelection : selectAll} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700">
            {selected.size === evidences.length ? <CheckCheck className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
            {selected.size === evidences.length ? 'Desseleccionar' : 'Seleccionar tudo'}
          </button>
          {selected.size > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-xs text-primary font-medium">{selected.size} selecionada(s)</span>
              <button onClick={() => handleBulkStatus('APPROVED')} disabled={bulking} className="flex items-center gap-1.5 text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                {bulking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Aprovar
              </button>
              <button onClick={() => handleBulkStatus('REJECTED')} disabled={bulking} className="flex items-center gap-1.5 text-xs bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                <XCircle className="w-3.5 h-3.5" /> Rejeitar
              </button>
              <button onClick={clearSelection} className="text-xs text-gray-400 hover:text-gray-600 ml-auto">Limpar</button>
            </>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 w-8" />
                {[t('colFile'), t('colLinkedTo'), t('colStatus'), t('colUploadedBy'), t('colDate'), t('colSize')].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evidences.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">{t('noEvidence')}</p>
                  </td>
                </tr>
              ) : evidences.map((e: any) => (
                <tr key={e.id} className={cn('border-b border-gray-100 hover:bg-gray-50 transition-colors', selected.has(e.id) && 'bg-blue-50')}>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleSelect(e.id)} className="p-0.5">
                      {selected.has(e.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-gray-300" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{e.title}</p>
                        <p className="text-xs text-gray-400">{e.fileName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {e.project?.name || e.task?.title || e.control?.code || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon status={e.status} />
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', getStatusColor(e.status))}>{t(`status.${e.status}`)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {e.uploadedBy?.firstName} {e.uploadedBy?.lastName}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatRelative(e.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatBytes(e.fileSize)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </div>
  );
}
