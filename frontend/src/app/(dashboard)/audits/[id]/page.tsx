'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auditsApi, evidenceApi, reportsApi } from '@/lib/api';
import {
  ArrowLeft, Plus, AlertTriangle, CheckCircle, Loader2, ClipboardList,
  BarChart2, FileText, ChevronDown, ChevronUp, Mail, X, Download,
  Activity,
} from 'lucide-react';
import { cn, formatDate, formatRelative } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// ── Colour maps ──────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-red-50 text-red-600',
  MAJOR: 'bg-orange-100 text-orange-700',
  MINOR: 'bg-yellow-100 text-yellow-700',
  OBSERVATION: 'bg-blue-100 text-blue-700',
};

const FINDING_STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-red-50 text-red-600',
  IN_PROGRESS: 'bg-yellow-50 text-yellow-700',
  RESOLVED: 'bg-green-50 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-500',
};

// ── Progress tracker ─────────────────────────────────────────────────────────

const AUDIT_STEPS = [
  { key: 'PLANNED', label: 'Planeamento', desc: 'Definição do âmbito e recursos' },
  { key: 'COLLECTING', label: 'Recolha de Evidências', desc: 'Obtenção e validação de documentos' },
  { key: 'IN_PROGRESS', label: 'Revisão', desc: 'Análise das evidências' },
  { key: 'REPORTING', label: 'Relatório', desc: 'Elaboração do relatório' },
  { key: 'COMPLETED', label: 'Concluído', desc: 'Auditoria encerrada' },
];

function getStepIndex(status: string) {
  const map: Record<string, number> = { PLANNED: 0, IN_PROGRESS: 2, COMPLETED: 4, CANCELLED: 4 };
  return map[status] ?? 0;
}

function ProgressTracker({ status }: { status: string }) {
  const current = getStepIndex(status);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-5 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-blue-500" />
        Progresso da Auditoria
      </h3>
      <div className="relative flex items-start justify-between">
        {/* track */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-200" />
        <div
          className="absolute top-4 left-6 h-0.5 bg-blue-500 transition-all duration-500"
          style={{ width: `calc(${(current / (AUDIT_STEPS.length - 1)) * 100}% - ${current === 0 ? 0 : current === AUDIT_STEPS.length - 1 ? 48 : 24}px)` }}
        />
        {AUDIT_STEPS.map((step, idx) => {
          const done = idx < current;
          const active = idx === current;
          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center gap-2 flex-1">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all',
                  done ? 'bg-blue-500 border-blue-500 text-white' :
                  active ? 'bg-white border-blue-500 text-blue-600 ring-4 ring-blue-100' :
                  'bg-white border-gray-300 text-gray-400',
                )}
              >
                {done ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs font-bold">{idx + 1}</span>}
              </div>
              <div className="text-center max-w-[90px]">
                <p className={cn('text-xs font-semibold leading-tight', active ? 'text-blue-600' : done ? 'text-gray-700' : 'text-gray-400')}>
                  {step.label}
                </p>
                <p className={cn('text-xs mt-0.5 leading-tight hidden lg:block', active ? 'text-blue-400' : 'text-gray-400')}>
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Evidence checklist ───────────────────────────────────────────────────────

type EvidenceStatus = 'AVAILABLE' | 'EXPIRING' | 'MISSING' | 'IN_REVIEW';

const GENERIC_CONTROLS = [
  'Políticas de Segurança da Informação',
  'Controlo de Acessos e Autenticação',
  'Gestão de Riscos e Vulnerabilidades',
  'Continuidade de Negócio / BCP',
  'Gestão de Incidentes e Resposta',
  'Conformidade Legal e Regulatória',
  'Formação e Consciencialização',
  'Registos e Logs de Auditoria',
];

function mapEvidenceStatus(ev: any): EvidenceStatus {
  if (!ev) return 'MISSING';
  const s: string = ev.status ?? '';
  if (s === 'IN_REVIEW' || s === 'PENDING_REVIEW') return 'IN_REVIEW';
  if (s === 'APPROVED' || s === 'ACTIVE' || s === 'VALID') {
    const exp = ev.expiresAt ? new Date(ev.expiresAt) : null;
    if (exp && Math.ceil((exp.getTime() - Date.now()) / 86400000) <= 30) return 'EXPIRING';
    return 'AVAILABLE';
  }
  if (s === 'EXPIRED') return 'EXPIRING';
  return 'MISSING';
}

function evidenceStatusBadge(s: EvidenceStatus) {
  const cfg: Record<EvidenceStatus, { label: string; style: string }> = {
    AVAILABLE: { label: '✅ Disponível', style: 'bg-green-50 text-green-700 border-green-200' },
    EXPIRING: { label: '⚠️ A expirar', style: 'bg-amber-50 text-amber-700 border-amber-200' },
    MISSING: { label: '❌ Em falta', style: 'bg-red-50 text-red-700 border-red-200' },
    IN_REVIEW: { label: '🔄 Em revisão', style: 'bg-blue-50 text-blue-700 border-blue-200' },
  };
  return cfg[s];
}

type EvidenceFilter = 'ALL' | EvidenceStatus;

function EvidenceChecklist({ audit, evidenceList }: { audit: any; evidenceList: any[] }) {
  const [filter, setFilter] = useState<EvidenceFilter>('ALL');
  const [requesting, setRequesting] = useState<string | null>(null);

  const controls = GENERIC_CONTROLS;

  const items = controls.map(ctrl => {
    const ev = evidenceList.find((e: any) =>
      (e.title ?? '').toLowerCase().includes(ctrl.split(' ')[0].toLowerCase()) ||
      (e.controlCode ?? '').toLowerCase().includes(ctrl.split(' ')[0].toLowerCase()),
    );
    return { control: ctrl, evidence: ev, status: mapEvidenceStatus(ev) };
  });

  const available = items.filter(i => i.status === 'AVAILABLE').length;
  const pct = Math.round((available / items.length) * 100);
  const filtered = filter === 'ALL' ? items : items.filter(i => i.status === filter);

  const FILTERS: { key: EvidenceFilter; label: string; count: number }[] = [
    { key: 'ALL', label: 'Todos', count: items.length },
    { key: 'AVAILABLE', label: 'Disponíveis', count: items.filter(i => i.status === 'AVAILABLE').length },
    { key: 'MISSING', label: 'Em falta', count: items.filter(i => i.status === 'MISSING').length },
    { key: 'EXPIRING', label: 'A expirar', count: items.filter(i => i.status === 'EXPIRING').length },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-green-500" />
            Checklist de Evidências
          </h3>
          <span className="text-xs text-gray-500 font-medium">{available} de {items.length} disponíveis</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className={cn('h-2 rounded-full transition-all', pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400')}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mb-3">{pct}% das evidências disponíveis</p>

        {/* Filter tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border font-medium transition-colors',
                filter === f.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300',
              )}
            >
              {f.label} <span className="opacity-70">({f.count})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
        {filtered.map(({ control, evidence: ev, status }) => {
          const badge = evidenceStatusBadge(status);
          return (
            <div key={control} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{control}</p>
                {ev?.title && <p className="text-xs text-gray-400 truncate">{ev.title}</p>}
              </div>
              <span className={cn('text-xs px-2 py-0.5 rounded-full border flex-shrink-0', badge.style)}>
                {badge.label}
              </span>
              {status === 'MISSING' && (
                <button
                  onClick={() => setRequesting(control)}
                  className="text-xs bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-xl font-medium flex-shrink-0"
                >
                  Solicitar evidência
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Request evidence dialog */}
      {requesting && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-2">Solicitar Evidência</h3>
            <p className="text-sm text-gray-500 mb-4">
              Enviar notificação ao responsável pela evidência de <strong>{requesting}</strong>.
            </p>
            <textarea
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-4 resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              rows={3}
              placeholder="Mensagem adicional (opcional)..."
            />
            <div className="flex gap-3">
              <button onClick={() => setRequesting(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={() => { alert('Notificação enviada!'); setRequesting(null); }}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Auditor actions panel ────────────────────────────────────────────────────

function ActionsPanel({ audit, onStatusChange }: { audit: any; onStatusChange: (s: string) => void }) {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const res = await reportsApi.generate({ auditId: audit.id, type: 'AUDIT_REPORT' });
      if (res.data?.id) {
        const dl = await reportsApi.download(res.data.id);
        const url = URL.createObjectURL(new Blob([dl.data]));
        const a = document.createElement('a');
        a.href = url; a.download = `relatorio-auditoria-${audit.id}.pdf`; a.click();
      }
    } catch {
      alert('Relatório em preparação. Verifique a secção de relatórios em breve.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportChecklist = () => {
    const rows = ['Controlo,Estado,Evidência', ...GENERIC_CONTROLS.map(c => `"${c}",Em falta,`)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `checklist-${audit.id}.csv`; a.click();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Ações do Auditor</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-medium transition-colors text-left disabled:opacity-60"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 flex-shrink-0" />}
          <span>Gerar relatório de auditoria</span>
          <span className="ml-auto text-xs text-blue-400">PDF</span>
        </button>

        <button
          onClick={handleExportChecklist}
          className="flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-sm font-medium transition-colors text-left"
        >
          <BarChart2 className="w-4 h-4 flex-shrink-0" />
          <span>Exportar checklist</span>
          <span className="ml-auto text-xs text-green-400">CSV</span>
        </button>

        <button
          onClick={() => setShowRequestForm(true)}
          className="flex items-center gap-3 px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-sm font-medium transition-colors text-left"
        >
          <Mail className="w-4 h-4 flex-shrink-0" />
          <span>Solicitar documentação adicional</span>
        </button>

        {audit.status !== 'COMPLETED' && audit.status !== 'CANCELLED' && (
          <button
            onClick={() => setShowConfirmClose(true)}
            className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-green-50 text-gray-600 hover:text-green-700 rounded-xl text-sm font-medium transition-colors text-left"
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>Marcar como concluída</span>
          </button>
        )}
      </div>

      {/* Request doc form */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Solicitar Documentação Adicional</h3>
              <button onClick={() => setShowRequestForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Destinatário *</label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" placeholder="email@empresa.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Documentação solicitada *</label>
                <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" rows={4} placeholder="Descreva os documentos necessários..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Prazo</label>
                <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowRequestForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={() => { alert('Pedido enviado!'); setShowRequestForm(false); }} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700">Enviar pedido</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm close */}
      {showConfirmClose && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Marcar como Concluída?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Esta ação irá encerrar a auditoria <strong>{audit.title}</strong>. Tem a certeza?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmClose(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button
                onClick={() => { onStatusChange('COMPLETED'); setShowConfirmClose(false); }}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Audit timeline / activity log ────────────────────────────────────────────

function AuditTimeline({ audit }: { audit: any }) {
  const events: Array<{ ts: string; icon: string; label: string; detail?: string; color: string }> = [];

  if (audit.createdAt) {
    events.push({ ts: audit.createdAt, icon: '📋', label: 'Auditoria criada', detail: audit.type, color: 'bg-blue-100' });
  }
  if (audit.startDate) {
    events.push({ ts: audit.startDate, icon: '▶️', label: 'Auditoria iniciada', color: 'bg-green-100' });
  }

  (audit.findings ?? []).forEach((f: any) => {
    events.push({
      ts: f.createdAt,
      icon: f.severity === 'CRITICAL' ? '🔴' : f.severity === 'MAJOR' ? '🟠' : '🟡',
      label: `Achado registado: ${f.title}`,
      detail: f.severity,
      color: f.severity === 'CRITICAL' ? 'bg-red-100' : 'bg-orange-100',
    });
    if (f.status === 'RESOLVED') {
      events.push({ ts: f.updatedAt ?? f.createdAt, icon: '✅', label: `Achado resolvido: ${f.title}`, color: 'bg-green-100' });
    }
  });

  if (audit.updatedAt && audit.updatedAt !== audit.createdAt) {
    events.push({ ts: audit.updatedAt, icon: '✏️', label: 'Auditoria atualizada', color: 'bg-gray-100' });
  }
  if (audit.completedAt) {
    events.push({ ts: audit.completedAt, icon: '🏁', label: 'Auditoria concluída', color: 'bg-green-100' });
  }

  events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-purple-500" />
        Linha do Tempo
      </h3>
      {events.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Sem eventos registados</p>
      ) : (
        <div className="relative">
          {/* vertical line */}
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-100" />
          <div className="space-y-4">
            {events.map((ev, idx) => (
              <div key={idx} className="flex gap-3 items-start pl-2">
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 relative z-10', ev.color)}>
                  {ev.icon}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm font-medium text-gray-800 leading-tight">{ev.label}</p>
                  {ev.detail && <p className="text-xs text-gray-400">{ev.detail}</p>}
                </div>
                <time className="text-xs text-gray-400 flex-shrink-0 pt-0.5">{formatRelative(ev.ts)}</time>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── New Finding modal ────────────────────────────────────────────────────────

function NewFindingModal({ auditId, onClose }: { auditId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm();

  const createMutation = useMutation({
    mutationFn: (data: any) => auditsApi.createFinding(auditId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['audit', auditId] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Novo Achado</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input
              {...register('title', { required: true })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              placeholder="Título do achado..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
              placeholder="Descreva o achado em detalhe..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severidade</label>
              <select {...register('severity')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                <option value="OBSERVATION">Observação</option>
                <option value="MINOR">Menor</option>
                <option value="MAJOR">Maior</option>
                <option value="CRITICAL">Crítico</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de Resolução</label>
              <input {...register('dueDate')} type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Evidência / Referência</label>
            <input
              {...register('evidence')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              placeholder="Doc. referenciado, secção, etc."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">Cancelar</button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Registar Achado
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

type SectionKey = 'progress' | 'evidence' | 'actions' | 'timeline';

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showNewFinding, setShowNewFinding] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(
    new Set(['progress']),
  );
  const qc = useQueryClient();

  const { data: audit, isLoading } = useQuery({
    queryKey: ['audit', id],
    queryFn: () => auditsApi.getOne(id).then(r => r.data),
  });

  const { data: evidenceData } = useQuery({
    queryKey: ['evidence'],
    queryFn: () => evidenceApi.list({ limit: 100 }).then(r => r.data),
    enabled: expandedSections.has('evidence'),
  });

  const evidenceList = (evidenceData?.data ?? evidenceData ?? []) as any[];

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => auditsApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['audit', id] }),
  });

  const updateFindingMutation = useMutation({
    mutationFn: ({ findingId, status }: { findingId: string; status: string }) =>
      auditsApi.updateFinding(findingId, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['audit', id] }),
  });

  const toggleSection = (key: SectionKey) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!audit) return null;

  const findings = audit.findings ?? [];
  const openFindings = findings.filter((f: any) => f.status === 'OPEN').length;
  const criticalFindings = findings.filter((f: any) => f.severity === 'CRITICAL').length;

  const sections: Array<{ key: SectionKey; label: string; icon: React.ComponentType<any>; iconColor: string }> = [
    { key: 'progress', label: 'Progresso da Auditoria', icon: BarChart2, iconColor: 'text-blue-500' },
    { key: 'evidence', label: 'Checklist de Evidências', icon: FileText, iconColor: 'text-green-500' },
    { key: 'actions', label: 'Ações do Auditor', icon: ClipboardList, iconColor: 'text-amber-500' },
    { key: 'timeline', label: 'Linha do Tempo', icon: Activity, iconColor: 'text-purple-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/audits" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{audit.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {audit.type} · {audit.project?.name ?? 'Sem projeto'}
              {audit.startDate && <> · {formatDate(audit.startDate)}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={audit.status}
            onChange={e => updateStatusMutation.mutate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="PLANNED">Planeado</option>
            <option value="IN_PROGRESS">Em Curso</option>
            <option value="COMPLETED">Concluído</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
          <button
            onClick={() => setShowNewFinding(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> Registar Achado
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total de Achados', value: findings.length, icon: ClipboardList, color: 'text-gray-600', bg: 'bg-gray-50' },
          { label: 'Em Aberto', value: openFindings, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Críticos', value: criticalFindings, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Resolvidos', value: findings.filter((f: any) => f.status === 'RESOLVED').length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', c.bg)}>
                <c.icon className={cn('w-4 h-4', c.color)} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{c.value}</p>
                <p className="text-xs text-gray-500">{c.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Scope */}
      {audit.scope && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Âmbito</h3>
          <p className="text-sm text-gray-600">{audit.scope}</p>
        </div>
      )}

      {/* ── Expandable enhancement sections ──────────────────────────────── */}
      <div className="space-y-3">
        {sections.map(({ key, label, icon: Icon, iconColor }) => (
          <div key={key} className="rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => toggleSection(key)}
              className="w-full flex items-center justify-between px-5 py-3.5 bg-white hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Icon className={cn('w-4 h-4', iconColor)} />
                {label}
              </span>
              {expandedSections.has(key) ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {expandedSections.has(key) && (
              <div className="border-t border-gray-100 p-4">
                {key === 'progress' && <ProgressTracker status={audit.status} />}
                {key === 'evidence' && <EvidenceChecklist audit={audit} evidenceList={evidenceList} />}
                {key === 'actions' && (
                  <ActionsPanel audit={audit} onStatusChange={s => updateStatusMutation.mutate(s)} />
                )}
                {key === 'timeline' && <AuditTimeline audit={audit} />}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Findings table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Achados e Não-Conformidades</h3>
          {findings.length > 0 && (
            <span className="text-xs text-gray-400">{findings.length} achado{findings.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        {findings.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CheckCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Sem achados registados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Título', 'Severidade', 'Estado', 'Prazo', 'Responsável'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {findings.map((f: any) => (
                  <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{f.title}</p>
                      {f.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{f.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-1 rounded-full font-medium', SEVERITY_COLORS[f.severity] ?? 'bg-gray-100 text-gray-600')}>
                        {f.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={f.status}
                        onChange={e => updateFindingMutation.mutate({ findingId: f.id, status: e.target.value })}
                        className={cn('text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer', FINDING_STATUS_COLORS[f.status])}
                      >
                        <option value="OPEN">Aberto</option>
                        <option value="IN_PROGRESS">Em Curso</option>
                        <option value="RESOLVED">Resolvido</option>
                        <option value="CLOSED">Fechado</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {f.dueDate ? formatDate(f.dueDate) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {f.assignee ? `${f.assignee.firstName} ${f.assignee.lastName}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNewFinding && <NewFindingModal auditId={id} onClose={() => setShowNewFinding(false)} />}
    </div>
  );
}
