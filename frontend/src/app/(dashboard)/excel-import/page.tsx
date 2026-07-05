'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { excelImportApi, projectsApi } from '@/lib/api';
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PENDING:    <Clock    className="w-4 h-4 text-yellow-500" />,
  PROCESSING: <Loader2  className="w-4 h-4 text-blue-500 animate-spin" />,
  COMPLETED:  <CheckCircle className="w-4 h-4 text-green-500" />,
  FAILED:     <XCircle  className="w-4 h-4 text-red-500" />,
};

export default function ExcelImportPage() {
  const t = useTranslations('excelImport');
  const [importType, setImportType] = useState<'TASKS' | 'RISKS' | 'GAP_ANALYSIS_ISO27001' | 'ROPA' | 'ASSET_INVENTORY' | 'TREATMENT_PLAN' | 'ACTION_PLAN' | 'POLICIES'>('TASKS');
  const [selectedProject, setSelectedProject] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: imports, isLoading } = useQuery({
    queryKey: ['imports'],
    queryFn: () => excelImportApi.list({ limit: 20 }).then(r => r.data),
    refetchInterval: 5000,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list({ limit: 100 }).then(r => r.data),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, type, projectId }: { file: File; type: string; projectId?: string }) =>
      excelImportApi.upload(file, type, projectId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['imports'] }),
  });

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert(t('invalidFileType'));
      return;
    }
    uploadMutation.mutate({ file, type: importType, projectId: selectedProject || undefined });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const importList = imports?.data || [];

  return (
    <div className="space-y-6">
      {/* Template Download */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">{t('downloadTemplates')}</h2>
        <p className="text-sm text-gray-500 mb-4">{t('downloadTemplatesDesc')}</p>
        <div className="grid grid-cols-3 gap-4">
          {(['TASKS', 'RISKS', 'GAP_ANALYSIS_ISO27001', 'ROPA', 'ASSET_INVENTORY', 'TREATMENT_PLAN', 'ACTION_PLAN', 'POLICIES'] as const).map(type => (
            <div key={type} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {t('templateLabel')} {t(`type.${type}`)}
                  </p>
                  <p className="text-xs text-gray-400">{t('templateFormat')}</p>
                </div>
              </div>
              <button
                onClick={() => excelImportApi.downloadTemplate(type).then(r => {
                  const url = window.URL.createObjectURL(new Blob([r.data]));
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `template_${type.toLowerCase()}.xlsx`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                })}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium"
              >
                <Download className="w-4 h-4" /> {t('download')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">{t('importData')}</h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('importType')}</label>
            <select
              value={importType}
              onChange={e => setImportType(e.target.value as 'TASKS' | 'RISKS' | 'GAP_ANALYSIS_ISO27001' | 'ROPA' | 'ASSET_INVENTORY' | 'TREATMENT_PLAN' | 'ACTION_PLAN' | 'POLICIES')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="TASKS">{t('type.TASKS')}</option>
              <option value="RISKS">{t('type.RISKS')}</option>
              <option value="GAP_ANALYSIS_ISO27001">{t('type.GAP_ANALYSIS_ISO27001')}</option>
              <option value="ROPA">{t('type.ROPA')}</option>
              <option value="ASSET_INVENTORY">{t('type.ASSET_INVENTORY')}</option>
              <option value="TREATMENT_PLAN">{t('type.TREATMENT_PLAN')}</option>
              <option value="ACTION_PLAN">{t('type.ACTION_PLAN')}</option>
              <option value="POLICIES">{t('type.POLICIES')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectLabel')}</label>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">{t('selectProject')}</option>
              {projects?.data?.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50',
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {uploadMutation.isPending ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm font-medium text-gray-700">{t('uploading')}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-10 h-10 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">{t('dropZoneTitle')}</p>
              <p className="text-xs text-gray-400">{t('dropZoneSubtitle')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Import History */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">{t('importHistory')}</h3>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['imports'] })}
            className="text-gray-400 hover:text-gray-600"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : importList.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileSpreadsheet className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">{t('noImports')}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {[t('colFile'), t('colType'), t('colProject'), t('colStatus'), t('colRecords'), t('colDate'), t('colErrors')].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {importList.map((imp: any) => (
                <tr key={imp.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate max-w-[160px]">{imp.fileName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{t(`type.${imp.type}`)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{imp.project?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {STATUS_ICONS[imp.status]}
                      <span className="text-xs text-gray-600">{t(`importStatus.${imp.status}`)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {imp.processedRows != null ? (
                      <span>
                        <span className="text-green-600 font-medium">{imp.processedRows}</span>
                        {imp.totalRows != null && <span className="text-gray-400"> / {imp.totalRows}</span>}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDateTime(imp.createdAt)}</td>
                  <td className="px-4 py-3">
                    {imp.errors ? (
                      <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded" title={JSON.stringify(imp.errors)}>
                        {t('viewErrors')}
                      </span>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
