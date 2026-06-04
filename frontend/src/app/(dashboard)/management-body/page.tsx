'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { managementBodyApi } from '@/lib/api';
import { Users, Plus, CheckCircle, Clock, AlertTriangle, Shield, Loader2, X, ChevronDown } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

const ACTION_TYPES = ['APPROVAL','AWARENESS','TRAINING','REVIEW','SIGN_OFF'];
const ACTION_LABELS: Record<string, string> = { APPROVAL: 'Aprovação', AWARENESS: 'Tomada de Consciência', TRAINING: 'Formação', REVIEW: 'Revisão', SIGN_OFF: 'Assinatura' };
const FRAMEWORKS = ['NIS2','DORA','GDPR','ISO_27001','AI_ACT','ESG'];

export default function ManagementBodyPage() {
  const qc = useQueryClient();
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddAction, setShowAddAction] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState({ name: '', title: '', email: '' });
  const [actionForm, setActionForm] = useState({ type: 'APPROVAL', title: '', description: '', framework: 'NIS2' });

  const { data: summary = [], isLoading } = useQuery({ queryKey: ['management-body'], queryFn: () => managementBodyApi.getSummary().then(r => r.data) });

  const addMemberMutation  = useMutation({ mutationFn: (d: any) => managementBodyApi.addMember(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['management-body'] }); setShowAddMember(false); setMemberForm({ name: '', title: '', email: '' }); } });
  const addActionMutation  = useMutation({ mutationFn: ({ memberId, ...d }: any) => managementBodyApi.addAction(memberId, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['management-body'] }); setShowAddAction(null); } });
  const ackMutation        = useMutation({ mutationFn: (id: string) => managementBodyApi.acknowledge(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['management-body'] }) });

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none';

  const totalCompliance = (summary as any[]).length > 0
    ? Math.round((summary as any[]).reduce((s: number, m: any) => s + m.complianceRate, 0) / (summary as any[]).length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-700 to-pink-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><Shield className="w-5 h-5 text-purple-300" /><span className="text-purple-200 text-xs font-medium uppercase tracking-widest">NIS2 Art. 20 — Responsabilidade Pessoal</span></div>
            <h1 className="text-2xl font-bold">Órgão de Gestão</h1>
            <p className="text-purple-200 text-sm mt-1">Registo de ações, aprovações e reconhecimentos do órgão de gestão</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="text-center">
              <p className="text-4xl font-black">{totalCompliance}%</p>
              <p className="text-purple-200 text-xs">Conformidade geral</p>
            </div>
            <button onClick={() => setShowAddMember(true)} className="flex items-center gap-2 bg-white text-purple-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-50">
              <Plus className="w-4 h-4" /> Adicionar Membro
            </button>
          </div>
        </div>
      </div>

      {/* Members */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
      ) : (summary as any[]).length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16">
          <Users className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-gray-400 font-medium">Sem membros do órgão de gestão</p>
          <button onClick={() => setShowAddMember(true)} className="mt-4 flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700">
            <Plus className="w-4 h-4" /> Adicionar primeiro membro
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {(summary as any[]).map((member: any) => (
            <div key={member.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 p-5 cursor-pointer" onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)}>
                {/* Avatar */}
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-lg flex-shrink-0">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{member.name}</p>
                  <p className="text-sm text-gray-500">{member.title}</p>
                </div>
                {/* Stats */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-center">
                    <p className="text-xl font-black" style={{ color: member.complianceRate >= 80 ? '#16a34a' : member.complianceRate >= 50 ? '#d97706' : '#dc2626' }}>{member.complianceRate}%</p>
                    <p className="text-xs text-gray-400">Conformidade</p>
                  </div>
                  {member.pending > 0 && (
                    <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-lg font-medium">
                      <Clock className="w-3.5 h-3.5" /> {member.pending} pendentes
                    </span>
                  )}
                  {member.pending === 0 && member.totalActions > 0 && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', expandedMember === member.id ? 'rotate-180' : '')} />
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-gray-100">
                <div className="h-full transition-all" style={{ width: `${member.complianceRate}%`, background: member.complianceRate >= 80 ? '#16a34a' : member.complianceRate >= 50 ? '#d97706' : '#dc2626' }} />
              </div>

              {/* Expanded actions */}
              {expandedMember === member.id && (
                <div className="border-t border-gray-100 p-5 space-y-3">
                  {member.actions?.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-2">Sem ações registadas</p>
                  ) : (
                    <div className="space-y-2">
                      {member.actions.map((action: any) => (
                        <div key={action.id} className={cn('flex items-center gap-3 p-3 rounded-xl', action.acknowledgedAt ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-200')}>
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0', action.acknowledgedAt ? 'bg-green-500 text-white' : 'bg-amber-400 text-white')}>
                            {action.acknowledgedAt ? '✓' : '!'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{action.title}</p>
                            <p className="text-xs text-gray-500">{ACTION_LABELS[action.type]} · {action.framework}</p>
                          </div>
                          {action.acknowledgedAt ? (
                            <span className="text-xs text-green-600">{formatDate(action.acknowledgedAt)}</span>
                          ) : (
                            <button onClick={() => ackMutation.mutate(action.id)} className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-amber-600">
                              Reconhecer
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setShowAddAction(member.id)} className="w-full flex items-center justify-center gap-2 border border-dashed border-purple-300 text-purple-600 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-50 transition-colors">
                    <Plus className="w-4 h-4" /> Adicionar ação / aprovação
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Adicionar Membro</h2>
              <button onClick={() => setShowAddMember(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {[{ label: 'Nome completo *', key: 'name', ph: 'Ex: João Silva' }, { label: 'Cargo *', key: 'title', ph: 'Ex: CEO, CFO, Membro do Conselho' }, { label: 'Email', key: 'email', ph: 'joao.silva@empresa.pt' }].map(f => (
                <div key={f.key}><label className="block text-xs font-semibold text-gray-600 mb-1.5">{f.label}</label><input className={inp} value={(memberForm as any)[f.key]} onChange={e => setMemberForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.ph} /></div>
              ))}
              <div className="flex gap-3">
                <button onClick={() => setShowAddMember(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
                <button onClick={() => addMemberMutation.mutate(memberForm)} disabled={!memberForm.name || !memberForm.title || addMemberMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
                  {addMemberMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Action Modal */}
      {showAddAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Adicionar Ação</h2>
              <button onClick={() => setShowAddAction(null)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo de Ação</label>
                <select className={inp} value={actionForm.type} onChange={e => setActionForm(p => ({ ...p, type: e.target.value }))}>
                  {ACTION_TYPES.map(t => <option key={t} value={t}>{ACTION_LABELS[t]}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Título *</label><input className={inp} value={actionForm.title} onChange={e => setActionForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Aprovação da política de segurança NIS2" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Framework</label>
                <select className={inp} value={actionForm.framework} onChange={e => setActionForm(p => ({ ...p, framework: e.target.value }))}>
                  {FRAMEWORKS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Descrição</label><textarea className={inp + ' resize-none'} rows={2} value={actionForm.description} onChange={e => setActionForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="flex gap-3">
                <button onClick={() => setShowAddAction(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
                <button onClick={() => addActionMutation.mutate({ memberId: showAddAction, ...actionForm })} disabled={!actionForm.title || addActionMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
                  {addActionMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
