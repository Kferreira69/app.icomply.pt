'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nis2IncidentsApi } from '@/lib/api';
import { AlertTriangle, Plus, Clock, CheckCircle, Send, FileText, Loader2, X, ChevronRight, Bell } from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';

// Countdown timer component for NIS2 deadlines
function DeadlineTimer({ deadline, label, sent }: { deadline: Date; label: string; sent: boolean }) {
  const [remaining, setRemaining] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) { setRemaining('EXPIRADO'); setIsExpired(true); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
      setIsUrgent(diff < 4 * 3600000); // urgent if < 4h
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (sent) return (
    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
      <span className="text-sm font-medium text-green-700">{label} — Enviado</span>
    </div>
  );

  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border', isExpired ? 'bg-red-100 border-red-300' : isUrgent ? 'bg-orange-50 border-orange-300 animate-pulse' : 'bg-gray-50 border-gray-200')}>
      <Clock className={cn('w-4 h-4 flex-shrink-0', isExpired ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-gray-500')} />
      <div className="min-w-0">
        <p className={cn('text-xs font-medium', isExpired ? 'text-red-700' : 'text-gray-700')}>{label}</p>
        <p className={cn('text-sm font-mono font-bold', isExpired ? 'text-red-700' : isUrgent ? 'text-orange-700 text-base' : 'text-gray-800')}>{remaining}</p>
      </div>
    </div>
  );
}

const SEVERITY_STYLE: Record<string, string> = {
  SIGNIFICANT: 'bg-yellow-100 text-yellow-700',
  MAJOR:       'bg-orange-100 text-orange-700',
  CRITICAL:    'bg-red-100 text-red-700',
};

const STATUS_STEPS = [
  { key: 'DRAFT',                 label: 'Rascunho',          step: 0 },
  { key: 'EARLY_WARNING_SENT',    label: 'Aviso Antecipado',  step: 1 },
  { key: 'INITIAL_REPORT_SENT',   label: 'Relatório Inicial', step: 2 },
  { key: 'FINAL_REPORT_SENT',     label: 'Relatório Final',   step: 3 },
  { key: 'CLOSED',                label: 'Encerrado',         step: 4 },
];

export default function Nis2IncidentsPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [newForm, setNewForm] = useState({
    title: '', description: '', severity: 'SIGNIFICANT', incidentDate: '',
    detectionDate: '', affectedSystems: '', affectedServices: '', authorityCountry: 'PT',
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['nis2-incidents'],
    queryFn: () => nis2IncidentsApi.list().then(r => r.data),
  });

  const { data: selectedDetail } = useQuery({
    queryKey: ['nis2-incident', selected?.id],
    queryFn: () => selected ? nis2IncidentsApi.get(selected.id).then(r => r.data) : null,
    enabled: !!selected?.id,
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => nis2IncidentsApi.create(d),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['nis2-incidents'] }); setSelected(r.data); setShowNew(false); },
  });

  const submitMutation = useMutation({
    mutationFn: ({ id, type }: { id: string; type: string }) => nis2IncidentsApi.submit(id, type),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['nis2-incidents'] }); qc.invalidateQueries({ queryKey: ['nis2-incident', selected?.id] }); },
  });

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all';

  const detail = selectedDetail || selected;
  const currentStep = STATUS_STEPS.find(s => s.key === detail?.status)?.step ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-5 h-5 text-red-300" />
              <span className="text-red-200 text-xs font-medium uppercase tracking-widest">NIS2 Art. 23</span>
            </div>
            <h1 className="text-2xl font-bold">Notificações de Incidentes</h1>
            <p className="text-red-200 text-sm mt-1">Gestão de notificações obrigatórias às autoridades competentes</p>
          </div>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-white text-red-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-50">
            <Plus className="w-4 h-4" /> Novo Incidente
          </button>
        </div>
        {/* Timeline reminder */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { t: '24h', label: 'Aviso Antecipado', desc: 'Notificação inicial à ANC' },
            { t: '72h', label: 'Relatório Inicial', desc: 'Relatório detalhado à ANC' },
            { t: '1 mês', label: 'Relatório Final', desc: 'Relatório completo + lições' },
          ].map(d => (
            <div key={d.t} className="bg-white/15 rounded-xl p-3">
              <p className="text-2xl font-black text-white">{d.t}</p>
              <p className="text-red-200 text-xs font-semibold mt-0.5">{d.label}</p>
              <p className="text-red-300 text-[10px]">{d.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Incident list */}
        <div className="space-y-3">
          {(incidents as any[]).length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <AlertTriangle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Sem incidentes registados</p>
            </div>
          ) : (incidents as any[]).map((inc: any) => (
            <button key={inc.id} onClick={() => setSelected(inc)}
              className={cn('w-full text-left bg-white rounded-2xl border shadow-sm p-4 transition-all hover:shadow-md', selected?.id === inc.id ? 'border-red-400 ring-2 ring-red-200' : 'border-gray-100')}>
              <div className="flex items-start gap-3">
                <div className={cn('w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0', inc.status === 'DRAFT' ? 'bg-gray-400' : inc.status === 'CLOSED' ? 'bg-green-500' : 'bg-red-500 animate-pulse')} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{inc.title}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{inc.incidentRef}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', SEVERITY_STYLE[inc.severity] || 'bg-gray-100 text-gray-600')}>
                      {inc.severity}
                    </span>
                    <span className="text-xs text-gray-400">{STATUS_STEPS.find(s => s.key === inc.status)?.label}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        {detail ? (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b px-5 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{detail.title}</h3>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{detail.incidentRef}</p>
                </div>
                <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold', SEVERITY_STYLE[detail.severity] || '')}>
                  {detail.severity}
                </span>
              </div>
              {/* Progress stepper */}
              <div className="flex items-center mt-4 gap-1">
                {STATUS_STEPS.slice(0, 4).map((step, i) => (
                  <div key={step.key} className="flex items-center gap-1 flex-1">
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all',
                      currentStep > i ? 'bg-green-500 text-white' : currentStep === i ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500')}>
                      {currentStep > i ? '✓' : i + 1}
                    </div>
                    <p className={cn('text-[10px] flex-1', currentStep >= i ? 'text-gray-700 font-medium' : 'text-gray-400')}>{step.label}</p>
                    {i < 3 && <div className={cn('h-0.5 w-4 flex-shrink-0', currentStep > i ? 'bg-green-400' : 'bg-gray-200')} />}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Deadlines with live countdown */}
              {detail.deadlines && detail.status !== 'CLOSED' && (
                <div className="grid grid-cols-3 gap-2">
                  <DeadlineTimer deadline={detail.deadlines.earlyWarning} label="Aviso Antecipado (24h)" sent={!!detail.earlyWarningAt} />
                  <DeadlineTimer deadline={detail.deadlines.initialReport} label="Relatório Inicial (72h)" sent={!!detail.initialReportAt} />
                  <DeadlineTimer deadline={detail.deadlines.finalReport} label="Relatório Final (1 mês)" sent={!!detail.finalReportAt} />
                </div>
              )}

              {/* NCA info */}
              {detail.nca && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-blue-800">{detail.nca.name}</p>
                    {detail.nca.email && <p className="text-xs text-blue-600">{detail.nca.email}</p>}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Descrição</p>
                <p className="text-sm text-gray-700">{detail.description || '—'}</p>
              </div>

              {/* Submit actions */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações de Submissão</p>
                {[
                  { type: 'EARLY_WARNING',  label: 'Submeter Aviso Antecipado (24h)',   sent: !!detail.earlyWarningAt,  disabled: !!detail.earlyWarningAt },
                  { type: 'INITIAL_REPORT', label: 'Submeter Relatório Inicial (72h)',   sent: !!detail.initialReportAt, disabled: !detail.earlyWarningAt || !!detail.initialReportAt },
                  { type: 'FINAL_REPORT',   label: 'Submeter Relatório Final (1 mês)',   sent: !!detail.finalReportAt,   disabled: !detail.initialReportAt || !!detail.finalReportAt },
                ].map(action => (
                  <button key={action.type}
                    onClick={() => !action.disabled && !action.sent && submitMutation.mutate({ id: detail.id, type: action.type })}
                    disabled={action.disabled || submitMutation.isPending}
                    className={cn('w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all',
                      action.sent ? 'bg-green-50 border-green-200 text-green-700 cursor-default' :
                      action.disabled ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' :
                      'bg-red-50 border-red-200 text-red-700 hover:bg-red-100')}>
                    <div className="flex items-center gap-2">
                      {action.sent ? <CheckCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                      {action.label}
                    </div>
                    {action.sent && <span className="text-xs">Enviado</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center py-20">
            <div className="text-center">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Selecione um incidente para ver detalhes</p>
            </div>
          </div>
        )}
      </div>

      {/* New incident modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Registar Incidente NIS2</h2>
              <button onClick={() => setShowNew(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Título do Incidente *</label>
                <input className={inp.replace('red', 'blue')} value={newForm.title} onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))} placeholder="Descreva brevemente o incidente" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Severidade</label>
                  <select className={inp.replace('red', 'blue')} value={newForm.severity} onChange={e => setNewForm(p => ({ ...p, severity: e.target.value }))}>
                    <option value="SIGNIFICANT">Significativo</option>
                    <option value="MAJOR">Maior</option>
                    <option value="CRITICAL">Crítico</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Autoridade Nacional (ANC)</label>
                  <select className={inp.replace('red', 'blue')} value={newForm.authorityCountry} onChange={e => setNewForm(p => ({ ...p, authorityCountry: e.target.value }))}>
                    {['PT','DE','FR','ES','NL','IT','BE','PL','SE'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data do Incidente *</label>
                  <input type="datetime-local" className={inp.replace('red', 'blue')} value={newForm.incidentDate} onChange={e => setNewForm(p => ({ ...p, incidentDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data de Deteção *</label>
                  <input type="datetime-local" className={inp.replace('red', 'blue')} value={newForm.detectionDate} onChange={e => setNewForm(p => ({ ...p, detectionDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Descrição</label>
                <textarea className={inp.replace('red', 'blue') + ' resize-none'} rows={3} value={newForm.description} onChange={e => setNewForm(p => ({ ...p, description: e.target.value }))} placeholder="Descrição detalhada do incidente..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sistemas Afetados</label>
                  <input className={inp.replace('red', 'blue')} value={newForm.affectedSystems} onChange={e => setNewForm(p => ({ ...p, affectedSystems: e.target.value }))} placeholder="Ex: Portal Web, API Pagamentos" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Serviços Afetados</label>
                  <input className={inp.replace('red', 'blue')} value={newForm.affectedServices} onChange={e => setNewForm(p => ({ ...p, affectedServices: e.target.value }))} placeholder="Ex: Serviço de Autenticação" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowNew(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
                <button onClick={() => createMutation.mutate({ ...newForm, affectedSystems: newForm.affectedSystems.split(',').map(s => s.trim()).filter(Boolean), affectedServices: newForm.affectedServices.split(',').map(s => s.trim()).filter(Boolean) })}
                  disabled={!newForm.title || !newForm.incidentDate || !newForm.detectionDate || createMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  Registar Incidente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
