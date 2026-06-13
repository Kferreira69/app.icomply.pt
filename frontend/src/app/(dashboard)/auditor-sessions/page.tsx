'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auditorPortalApi, auditsApi, evidenceApi } from '@/lib/api';
import {
  Shield, Plus, Trash2, Copy, CheckCircle, Loader2, Clock, X, Mail,
  ChevronDown, ExternalLink, AlertTriangle, FileText, BarChart2,
} from 'lucide-react';
import { cn, formatDate, formatRelative } from '@/lib/utils';

const PERMISSIONS = ['EVIDENCE', 'CONTROLS', 'FINDINGS', 'POLICIES', 'RISKS'];

// ── Evidence status helpers ─────────────────────────────────────────────────

type EvidenceStatus = 'AVAILABLE' | 'EXPIRING' | 'MISSING' | 'IN_REVIEW';

function evidenceStatusLabel(s: EvidenceStatus) {
  return {
    AVAILABLE: '✅ Disponível',
    EXPIRING: '⚠️ A expirar',
    MISSING: '❌ Em falta',
    IN_REVIEW: '🔄 Em revisão',
  }[s] ?? s;
}

function evidenceStatusStyle(s: EvidenceStatus) {
  return {
    AVAILABLE: 'bg-green-50 text-green-700 border-green-200',
    EXPIRING: 'bg-amber-50 text-amber-700 border-amber-200',
    MISSING: 'bg-red-50 text-red-700 border-red-200',
    IN_REVIEW: 'bg-blue-50 text-blue-700 border-blue-200',
  }[s] ?? 'bg-gray-50 text-gray-600 border-gray-200';
}

// Map evidence API status to our display status
function mapEvidenceStatus(ev: any): EvidenceStatus {
  if (!ev) return 'MISSING';
  const s: string = ev.status ?? '';
  if (s === 'IN_REVIEW' || s === 'PENDING_REVIEW') return 'IN_REVIEW';
  if (s === 'APPROVED' || s === 'ACTIVE') {
    const exp = ev.expiresAt ? new Date(ev.expiresAt) : null;
    if (exp) {
      const daysLeft = Math.ceil((exp.getTime() - Date.now()) / 86400000);
      if (daysLeft <= 30) return 'EXPIRING';
    }
    return 'AVAILABLE';
  }
  return 'MISSING';
}

// ── FRAMEWORK CONTROLS catalogue ──────────────────────────────────────────
const FRAMEWORK_CONTROLS: Record<string, string[]> = {
  'ISO 27001': [
    'A.5 Políticas de Segurança',
    'A.6 Organização da Segurança',
    'A.7 Segurança de RH',
    'A.8 Gestão de Ativos',
    'A.9 Controlo de Acessos',
    'A.10 Criptografia',
    'A.12 Segurança de Operações',
    'A.13 Segurança de Comunicações',
    'A.16 Gestão de Incidentes',
    'A.18 Conformidade',
  ],
  NIS2: [
    'Art.21 Gestão de Riscos',
    'Art.21 Notificação de Incidentes',
    'Art.21 Continuidade de Negócio',
    'Art.21 Segurança da Cadeia de Abastecimento',
    'Art.21 Higiene Digital',
    'Art.20 Formação de Gestão',
  ],
  GDPR: [
    'Art.30 ROPA',
    'Art.37 DPO',
    'Art.35 DPIA',
    'Art.33 Notificação de Violações',
    'Art.28 Contratos DPA',
    'Art.15-22 Direitos dos Titulares',
  ],
  'SOC 2': [
    'CC1 Ambiente de Controlo',
    'CC2 Comunicação',
    'CC3 Avaliação de Risco',
    'CC6 Controlo de Acesso Lógico',
    'CC7 Operações do Sistema',
    'CC9 Gestão de Risco de Fornecedores',
  ],
};

function getControlsForSession(session: any): string[] {
  // Infer from session notes / framework field if present, else generic list
  const fw: string = session?.framework ?? '';
  return FRAMEWORK_CONTROLS[fw] ?? [
    'Políticas e Procedimentos',
    'Controlo de Acessos',
    'Gestão de Riscos',
    'Continuidade de Negócio',
    'Gestão de Incidentes',
    'Conformidade Legal',
  ];
}

// ── AUDIT PROGRESS STEPS ────────────────────────────────────────────────────

const AUDIT_STEPS = [
  { key: 'PLANNED', label: 'Planeamento', desc: 'Definição do âmbito e recursos' },
  { key: 'COLLECTING', label: 'Recolha de Evidências', desc: 'Obtenção e validação de documentos' },
  { key: 'IN_PROGRESS', label: 'Revisão', desc: 'Análise e avaliação das evidências' },
  { key: 'REPORTING', label: 'Relatório', desc: 'Elaboração do relatório final' },
  { key: 'COMPLETED', label: 'Concluído', desc: 'Auditoria encerrada e aprovada' },
];

function getStepIndex(status: string) {
  const map: Record<string, number> = {
    PLANNED: 0,
    IN_PROGRESS: 2,
    COMPLETED: 4,
    CANCELLED: 4,
  };
  return map[status] ?? 0;
}

// ── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function ProgressTracker({ status }: { status: string }) {
  const current = getStepIndex(status);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-blue-500" />
        Progresso da Auditoria
      </h3>
      <div className="relative flex items-start justify-between">
        {/* Connecting line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 mx-8" />
        <div
          className="absolute top-4 left-0 h-0.5 bg-blue-500 mx-8 transition-all duration-500"
          style={{ width: `${(current / (AUDIT_STEPS.length - 1)) * (100 - (100 / AUDIT_STEPS.length))}%` }}
        />
        {AUDIT_STEPS.map((step, idx) => {
          const done = idx < current;
          const active = idx === current;
          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center gap-2 flex-1">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors',
                  done ? 'bg-blue-500 border-blue-500 text-white' :
                  active ? 'bg-white border-blue-500 text-blue-600' :
                  'bg-white border-gray-300 text-gray-400',
                )}
              >
                {done ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-bold">{idx + 1}</span>
                )}
              </div>
              <div className="text-center">
                <p className={cn('text-xs font-semibold', active ? 'text-blue-600' : done ? 'text-gray-700' : 'text-gray-400')}>
                  {step.label}
                </p>
                <p className={cn('text-xs mt-0.5 hidden md:block', active ? 'text-blue-500' : 'text-gray-400')}>
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

type EvidenceFilter = 'ALL' | 'AVAILABLE' | 'MISSING' | 'EXPIRING';

function EvidenceChecklist({ session, evidence }: { session: any; evidence: any[] }) {
  const [filter, setFilter] = useState<EvidenceFilter>('ALL');
  const [requesting, setRequesting] = useState<string | null>(null);

  const controls = getControlsForSession(session);

  // Map each control to a best-guess evidence item
  const items = controls.map(ctrl => {
    const ev = evidence.find((e: any) =>
      e.title?.toLowerCase().includes(ctrl.split(' ')[0].toLowerCase()) ||
      e.tags?.some((t: string) => ctrl.toLowerCase().includes(t.toLowerCase()))
    );
    return { control: ctrl, evidence: ev, status: mapEvidenceStatus(ev) };
  });

  const available = items.filter(i => i.status === 'AVAILABLE').length;
  const filtered = filter === 'ALL' ? items : items.filter(i => i.status === filter);
  const pct = Math.round((available / items.length) * 100);

  const filters: { key: EvidenceFilter; label: string }[] = [
    { key: 'ALL', label: 'Todos' },
    { key: 'AVAILABLE', label: 'Disponíveis' },
    { key: 'MISSING', label: 'Em falta' },
    { key: 'EXPIRING', label: 'A expirar' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
        {/* Filters */}
        <div className="flex gap-1.5 flex-wrap">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border font-medium transition-colors',
                filter === f.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
        {filtered.map(({ control, evidence: ev, status }) => (
          <div key={control} className="flex items-center gap-3 px-5 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{control}</p>
              {ev?.title && <p className="text-xs text-gray-400 truncate">{ev.title}</p>}
            </div>
            <span className={cn('text-xs px-2 py-0.5 rounded-full border flex-shrink-0', evidenceStatusStyle(status))}>
              {evidenceStatusLabel(status)}
            </span>
            {status === 'MISSING' && (
              <button
                onClick={() => setRequesting(control)}
                disabled={requesting === control}
                className="text-xs bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-xl font-medium flex-shrink-0 transition-colors"
              >
                {requesting === control ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Solicitar'}
              </button>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">Nenhum item encontrado</p>
        )}
      </div>

      {/* Request evidence modal (lightweight) */}
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

function ActionsPanel({ session, auditId }: { session: any; auditId?: string }) {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const qc = useQueryClient();

  const closeMutation = useMutation({
    mutationFn: () => auditsApi.update(auditId!, { status: 'COMPLETED' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['audits'] });
      setShowConfirmClose(false);
    },
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Ações Rápidas</h3>
      <div className="space-y-2">
        <button
          onClick={() => auditId && window.open(`/audits/${auditId}`, '_blank')}
          className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-medium transition-colors text-left"
        >
          <FileText className="w-4 h-4 flex-shrink-0" />
          Gerar relatório de auditoria
          <span className="ml-auto text-xs text-blue-400">PDF</span>
        </button>

        <button
          onClick={() => {
            const csv = 'Controlo,Estado,Evidência\n' + getControlsForSession(session).map(c => `${c},Em falta,`).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'checklist.csv'; a.click();
          }}
          className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-sm font-medium transition-colors text-left"
        >
          <BarChart2 className="w-4 h-4 flex-shrink-0" />
          Exportar checklist
          <span className="ml-auto text-xs text-green-400">Excel/CSV</span>
        </button>

        <button
          onClick={() => setShowRequestForm(true)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-sm font-medium transition-colors text-left"
        >
          <Mail className="w-4 h-4 flex-shrink-0" />
          Solicitar documentação adicional
        </button>

        {auditId && (
          <button
            onClick={() => setShowConfirmClose(true)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-xl text-sm font-medium transition-colors text-left"
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Marcar como concluída
          </button>
        )}
      </div>

      {/* Request form modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">Solicitar Documentação Adicional</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Destinatário</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  placeholder="email@empresa.com"
                  defaultValue={session?.auditorEmail ?? ''}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Documentação solicitada</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  rows={4}
                  placeholder="Descreva os documentos necessários..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Prazo</label>
                <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowRequestForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={() => { alert('Pedido enviado!'); setShowRequestForm(false); }}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700"
              >
                Enviar pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm close modal */}
      {showConfirmClose && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-2">Marcar como Concluída?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Esta ação irá encerrar a auditoria. Esta operação não pode ser facilmente revertida.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmClose(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={() => closeMutation.mutate()}
                disabled={closeMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {closeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditTimeline({ session, audit }: { session: any; audit?: any }) {
  // Build timeline from real audit data when available, falling back to session metadata
  const events: Array<{ ts: string; icon: string; label: string; detail?: string }> = [];

  if (audit?.createdAt) {
    events.push({ ts: audit.createdAt, icon: '📋', label: 'Auditoria criada', detail: audit.title });
  } else if (session?.createdAt) {
    events.push({ ts: session.createdAt, icon: '🔐', label: 'Sessão de auditor criada', detail: session.auditorName });
  }

  if (audit?.startDate) {
    events.push({ ts: audit.startDate, icon: '▶️', label: 'Auditoria iniciada' });
  }

  if (audit?.findings?.length) {
    audit.findings.forEach((f: any) => {
      events.push({ ts: f.createdAt, icon: f.severity === 'CRITICAL' ? '🔴' : '🟡', label: `Achado registado: ${f.title}`, detail: f.severity });
    });
  }

  if (audit?.updatedAt && audit?.updatedAt !== audit?.createdAt) {
    events.push({ ts: audit.updatedAt, icon: '✏️', label: 'Última atualização' });
  }

  if (audit?.completedAt) {
    events.push({ ts: audit.completedAt, icon: '✅', label: 'Auditoria concluída' });
  }

  // Sort descending
  events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-purple-500" />
        Linha do Tempo
      </h3>
      {events.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Sem eventos registados</p>
      ) : (
        <div className="space-y-3">
          {events.map((ev, idx) => (
            <div key={idx} className="flex gap-3 items-start">
              <span className="text-base flex-shrink-0 mt-0.5">{ev.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{ev.label}</p>
                {ev.detail && <p className="text-xs text-gray-400 truncate">{ev.detail}</p>}
              </div>
              <time className="text-xs text-gray-400 flex-shrink-0">{formatRelative(ev.ts)}</time>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Session detail panel ─────────────────────────────────────────────────────

function SessionDetail({ session, onClose }: { session: any; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'progress' | 'evidence' | 'actions' | 'timeline'>('progress');

  // Attempt to load audits so we can pick any audit linked to this session's auditor
  const { data: auditsData } = useQuery({
    queryKey: ['audits'],
    queryFn: () => auditsApi.list({ limit: 50 }).then(r => r.data),
  });

  const audits = (auditsData?.data ?? auditsData ?? []) as any[];
  // Heuristic: match by auditor email or name
  const relatedAudit = audits.find((a: any) =>
    a.leadAuditor?.toLowerCase().includes(session.auditorName?.toLowerCase() ?? '') ||
    a.leadAuditor?.toLowerCase().includes(session.auditorEmail?.split('@')[0]?.toLowerCase() ?? ''),
  ) ?? audits[0];

  const { data: evidenceData } = useQuery({
    queryKey: ['evidence'],
    queryFn: () => evidenceApi.list({ limit: 100 }).then(r => r.data),
  });

  const evidenceList = (evidenceData?.data ?? evidenceData ?? []) as any[];

  const tabs = [
    { key: 'progress', label: 'Progresso' },
    { key: 'evidence', label: 'Evidências' },
    { key: 'actions', label: 'Ações' },
    { key: 'timeline', label: 'Linha do Tempo' },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className={cn('w-2.5 h-2.5 rounded-full', session.isActive ? 'bg-green-500' : 'bg-gray-300')} />
              <h2 className="text-base font-bold text-gray-900">{session.auditorName}</h2>
              {session.auditorFirm && <span className="text-sm text-gray-400">· {session.auditorFirm}</span>}
            </div>
            <p className="text-xs text-gray-500 ml-4">{session.auditorEmail} · Expira {formatDate(session.expiresAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            {relatedAudit && (
              <a
                href={`/audits/${relatedAudit.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-medium hover:bg-blue-100"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Ver auditoria
              </a>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b px-6 flex gap-1 flex-shrink-0">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                'py-3 px-4 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'progress' && (
            <ProgressTracker status={relatedAudit?.status ?? 'PLANNED'} />
          )}
          {activeTab === 'evidence' && (
            <EvidenceChecklist session={session} evidence={evidenceList} />
          )}
          {activeTab === 'actions' && (
            <ActionsPanel session={session} auditId={relatedAudit?.id} />
          )}
          {activeTab === 'timeline' && (
            <AuditTimeline session={session} audit={relatedAudit} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function AuditorSessionsPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [form, setForm] = useState({
    auditorName: '',
    auditorFirm: '',
    auditorEmail: '',
    permissions: ['EVIDENCE', 'CONTROLS', 'FINDINGS', 'POLICIES'],
    expiresAt: '',
    notes: '',
    framework: 'ISO 27001',
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['auditor-sessions'],
    queryFn: () => auditorPortalApi.listSessions().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => auditorPortalApi.createSession(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['auditor-sessions'] }); setShowNew(false); },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => auditorPortalApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auditor-sessions'] }),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => auditorPortalApi.resendInvite(id),
    onSuccess: () => alert('Convite reenviado!'),
  });

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/auditor/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const inp =
    'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none';

  const activeSessions = (sessions as any[]).filter((s: any) => s.isActive).length;
  const totalSessions = (sessions as any[]).length;
  const pendingRequests = (sessions as any[]).reduce(
    (acc: number, s: any) => acc + (s.requests?.filter((r: any) => r.status === 'OPEN').length ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="bg-gradient-to-br from-slate-700 to-gray-900 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-gray-300" />
              <span className="text-gray-400 text-xs font-medium uppercase tracking-widest">Auditoria Externa</span>
            </div>
            <h1 className="text-2xl font-bold">Portal de Auditoria</h1>
            <p className="text-gray-300 text-sm mt-1">Crie acessos seguros e limitados para auditores externos</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-100"
          >
            <Plus className="w-4 h-4" /> Criar Acesso
          </button>
        </div>

        {/* Stats row */}
        {totalSessions > 0 && (
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { label: 'Sessões ativas', value: activeSessions, color: 'text-green-400' },
              { label: 'Total de sessões', value: totalSessions, color: 'text-white' },
              { label: 'Pedidos por responder', value: pendingRequests, color: pendingRequests > 0 ? 'text-amber-400' : 'text-white' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl px-4 py-3">
                <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
                <p className="text-gray-400 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {(sessions as any[]).length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16">
          <Shield className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-gray-400 font-medium">Sem sessões de auditoria</p>
          <button
            onClick={() => setShowNew(true)}
            className="mt-4 flex items-center gap-2 bg-gray-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-900"
          >
            <Plus className="w-4 h-4" /> Criar primeiro acesso
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {(sessions as any[]).map((s: any) => (
            <div
              key={s.id}
              className={cn(
                'bg-white rounded-2xl border shadow-sm p-5 transition-all',
                s.isActive ? 'border-gray-100 hover:border-blue-200 hover:shadow-md' : 'border-gray-200 opacity-60',
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', s.isActive ? 'bg-green-500' : 'bg-gray-300')} />
                    <p className="font-semibold text-gray-900">{s.auditorName}</p>
                    {s.auditorFirm && <span className="text-xs text-gray-400">· {s.auditorFirm}</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 ml-4">{s.auditorEmail}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3 ml-4">
                    {s.permissions?.map((p: string) => (
                      <span key={p} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {p.toLowerCase()}
                      </span>
                    ))}
                    {s.framework && (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        {s.framework}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Expira</p>
                    <p className="text-xs font-medium text-gray-700">{formatDate(s.expiresAt)}</p>
                  </div>

                  {/* Detail expand button */}
                  <button
                    onClick={() => setSelectedSession(s)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
                    title="Ver detalhes"
                  >
                    <ChevronDown className="w-3.5 h-3.5" /> Detalhes
                  </button>

                  <button
                    onClick={() => copyLink(s.token)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                      copied === s.token ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                    )}
                  >
                    {copied === s.token ? (
                      <><CheckCircle className="w-3.5 h-3.5" /> Copiado</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> Copiar link</>
                    )}
                  </button>

                  {s.isActive && (
                    <>
                      <button
                        onClick={() => resendMutation.mutate(s.id)}
                        disabled={resendMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100"
                        title="Reenviar email de convite"
                      >
                        {resendMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => deactivateMutation.mutate(s.id)}
                        className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {s.requests?.length > 0 && (
                <div className="mt-3 ml-4 flex items-center gap-2 text-xs text-amber-600">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {s.requests.filter((r: any) => r.status === 'OPEN').length} pedidos por responder
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Session detail panel */}
      {selectedSession && (
        <SessionDetail session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}

      {/* New session modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Criar Acesso de Auditor</h2>
              <button onClick={() => setShowNew(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'Nome do auditor *', key: 'auditorName', ph: 'Ex: Maria Santos' },
                { label: 'Firma de auditoria', key: 'auditorFirm', ph: 'Ex: Ernst & Young Portugal' },
                { label: 'Email *', key: 'auditorEmail', ph: 'marta.santos@ey.com', type: 'email' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{f.label}</label>
                  <input
                    type={f.type ?? 'text'}
                    className={inp}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.ph}
                  />
                </div>
              ))}

              {/* Framework */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Framework de auditoria</label>
                <select className={inp} value={form.framework} onChange={e => setForm(p => ({ ...p, framework: e.target.value }))}>
                  {Object.keys(FRAMEWORK_CONTROLS).map(fw => <option key={fw}>{fw}</option>)}
                  <option value="">Outra</option>
                </select>
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Permissões de acesso</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PERMISSIONS.map(p => (
                    <label
                      key={p}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-xs font-medium',
                        form.permissions.includes(p)
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-gray-50 border-gray-200 text-gray-500',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(p)}
                        onChange={e =>
                          setForm(pr => ({
                            ...pr,
                            permissions: e.target.checked
                              ? [...pr.permissions, p]
                              : pr.permissions.filter(x => x !== p),
                          }))
                        }
                        className="w-3.5 h-3.5"
                      />
                      {p.toLowerCase()}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Expiração do acesso</label>
                <input
                  type="date"
                  className={inp}
                  value={form.expiresAt}
                  onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notas (opcional)</label>
                <textarea
                  className={inp + ' resize-none'}
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Âmbito, instruções especiais..."
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowNew(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button
                  onClick={() => createMutation.mutate(form)}
                  disabled={!form.auditorName || !form.auditorEmail || createMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-800 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-gray-900"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  Criar + enviar convite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
