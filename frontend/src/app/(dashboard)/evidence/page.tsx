'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { evidenceApi } from '@/lib/api';
import { Upload, FileText, X, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import { cn, formatDate, formatBytes, formatRelative, getStatusColor } from '@/lib/utils';

function StatusIcon({ status }: { status: string }) {
  if (status === 'APPROVED') return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (status === 'REJECTED') return <XCircle className="w-4 h-4 text-red-500" />;
  return <Clock className="w-4 h-4 text-yellow-500" />;
}

function UploadModal({ onClose }: { onClose: () => void }) {
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
          <h3 className="text-lg font-bold text-gray-900">Carregar Evidência</h3>
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
          <input ref={fileRef} type="file" className="hidden" onChange={e => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setTitle(t => t || e.target.files![0].name); }}} />
          {file ? (
            <>
              <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Clique para selecionar ficheiro</p>
              <p className="text-xs text-gray-400">PDF, DOCX, XLSX, PNG, JPG (máx. 50 MB)</p>
            </>
          )}
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="ex: Política de Segurança v2.1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none" />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">Cancelar</button>
          <button
            onClick={() => uploadMutation.mutate()}
            disabled={!file || !title || uploadMutation.isPending}
            className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {uploadMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Carregar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EvidencePage() {
  const [showUpload, setShowUpload] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['evidence', statusFilter],
    queryFn: () => evidenceApi.list({ status: statusFilter || undefined, limit: 50 }).then(r => r.data),
  });

  const evidences = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none"
        >
          <option value="">Todos os estados</option>
          {['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Upload className="w-4 h-4" /> Carregar Evidência
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'].map(s => (
          <div key={s} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {evidences.filter((e: any) => e.status === s).length}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{s}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Ficheiro', 'Associado a', 'Estado', 'Carregado por', 'Data', 'Tamanho'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evidences.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Nenhuma evidência carregada</p>
                  </td>
                </tr>
              ) : evidences.map((e: any) => (
                <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
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
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', getStatusColor(e.status))}>{e.status}</span>
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
