'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, XCircle, Clock, MinusCircle, Users, Inbox,
  Loader2, ChevronDown, MessageSquare, AlertCircle,
} from 'lucide-react';

const STATUS_META = {
  PENDING:   { label: 'Pendente',  color: 'text-amber-700', bg: 'bg-amber-100',  icon: <Clock className="w-3.5 h-3.5" /> },
  APPROVED:  { label: 'Aprovado',  color: 'text-green-700', bg: 'bg-green-100',  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  REJECTED:  { label: 'Rejeitado', color: 'text-red-700',   bg: 'bg-red-100',    icon: <XCircle className="w-3.5 h-3.5" /> },
  CANCELLED: { label: 'Cancelado', color: 'text-gray-500',  bg: 'bg-gray-100',   icon: <MinusCircle className="w-3.5 h-3.5" /> },
};

const DECISION_META = {
  APPROVED: { label: 'Aprovado',  color: 'text-green-700', bg: 'bg-green-50', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  REJECTED: { label: 'Rejeitado', color: 'text-red-700',   bg: 'bg-red-50',   icon: <XCircle className="w-3.5 h-3.5" /> },
  ABSTAIN:  { label: 'Abstenção', color: 'text-gray-500',  bg: 'bg-gray-50',  icon: <MinusCircle className="w-3.5 h-3.5" /> },
};

function UserAvatar({ user }: { user: any }) {
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`;
  if (user?.avatarUrl) return <img src={user.avatarUrl} alt={initials} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />;
  return <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{initials}</div>;
}

function ApprovalRow({ request, showVote = false }: { request: any; showVote?: boolean }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState('');
  const statusMeta = STATUS_META[request.status as keyof typeof STATUS_META];

  const voteMutation = useMutation({
    mutationFn: ({ decision }: { decision: string }) =>
      approvalsApi.vote(request.id, decision as any, comment),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals-all'] }),
  });

  const myVote = request.votes?.find((v: any) => v.approverId === user?.id);
  const approvedCount = request.votes?.filter((v: any) => v.decision === 'APPROVED').length ?? 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <UserAvatar user={request.requestedBy} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-800">{request.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                <span className="font-medium text-gray-600">{request.entityType}</span>
                {' · '}solicitado por {request.requestedBy?.firstName} {request.requestedBy?.lastName}
                {request.dueDate && <> · prazo {new Date(request.dueDate).toLocaleDateString('pt-PT')}</>}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full', statusMeta.color, statusMeta.bg)}>
                {statusMeta.icon} {statusMeta.label}
              </span>
              <button onClick={() => setExpanded(e => !e)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', expanded && 'rotate-180')} />
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex gap-1">
              {request.votes?.map((v: any) => {
                const dm = v.decision ? DECISION_META[v.decision as keyof typeof DECISION_META] : null;
                return (
                  <div key={v.id} title={`${v.approver?.firstName} ${v.approver?.lastName}: ${dm?.label ?? 'A aguardar'}`}
                    className={cn('w-2.5 h-2.5 rounded-full', !dm ? 'bg-gray-300' : v.decision === 'APPROVED' ? 'bg-green-500' : v.decision === 'REJECTED' ? 'bg-red-500' : 'bg-gray-400')} />
                );
              })}
            </div>
            <span className="text-[10px] text-gray-400">{approvedCount}/{request.threshold} necessários</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-50 bg-gray-50/40 p-4 space-y-3">
          {request.description && <p className="text-xs text-gray-600 italic">"{request.description}"</p>}

          <div className="space-y-1.5">
            {request.votes?.map((v: any) => {
              const dm = v.decision ? DECISION_META[v.decision as keyof typeof DECISION_META] : null;
              return (
                <div key={v.id} className="flex items-center gap-2 text-xs">
                  <UserAvatar user={v.approver} />
                  <span className="flex-1 text-gray-700">{v.approver?.firstName} {v.approver?.lastName}</span>
                  {dm ? (
                    <span className={cn('flex items-center gap-1 font-medium', dm.color)}>{dm.icon} {dm.label}</span>
                  ) : <span className="text-gray-400">A aguardar</span>}
                  {v.comment && <span className="text-gray-400 italic truncate max-w-[120px]">"{v.comment}"</span>}
                </div>
              );
            })}
          </div>

          {showVote && myVote && !myVote.decision && request.status === 'PENDING' && (
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Comentário (opcional)" rows={2}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <div className="flex gap-2">
                {(['APPROVED', 'REJECTED', 'ABSTAIN'] as const).map(d => {
                  const dm = DECISION_META[d];
                  return (
                    <button key={d} onClick={() => voteMutation.mutate({ decision: d })}
                      disabled={voteMutation.isPending}
                      className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border-2 transition-all', dm.bg, dm.color, 'hover:opacity-80 disabled:opacity-40')}>
                      {dm.icon} {dm.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApprovalsPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'mine' | 'all' | 'done'>('mine');

  const { data: summary } = useQuery({
    queryKey: ['approvals-summary'],
    queryFn: () => approvalsApi.getSummary().then(r => r.data),
  });

  const { data: myPending, isLoading: loadingMine } = useQuery({
    queryKey: ['approvals-mine'],
    queryFn: () => approvalsApi.getMyPending().then(r => r.data),
    enabled: tab === 'mine',
  });

  const { data: allPending, isLoading: loadingAll } = useQuery({
    queryKey: ['approvals-all', 'PENDING'],
    queryFn: () => approvalsApi.getAll('PENDING').then(r => r.data),
    enabled: tab === 'all',
  });

  const { data: done, isLoading: loadingDone } = useQuery({
    queryKey: ['approvals-all', 'done'],
    queryFn: () => approvalsApi.getAll().then(r => (r.data ?? []).filter((r: any) => r.status !== 'PENDING')),
    enabled: tab === 'done',
  });

  const items = tab === 'mine' ? myPending : tab === 'all' ? allPending : done;
  const isLoading = tab === 'mine' ? loadingMine : tab === 'all' ? loadingAll : loadingDone;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aprovações</h1>
          <p className="text-sm text-gray-500">Pedidos de aprovação multi-stakeholder</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Para mim', value: summary?.pendingForMe ?? 0, color: 'text-amber-600', bg: 'bg-amber-50', icon: <Inbox className="w-4 h-4" /> },
          { label: 'Total pendentes', value: summary?.totalPending ?? 0, color: 'text-blue-600', bg: 'bg-blue-50', icon: <Clock className="w-4 h-4" /> },
          { label: 'Resolvidos', value: summary?.totalResolved ?? 0, color: 'text-green-600', bg: 'bg-green-50', icon: <CheckCircle2 className="w-4 h-4" /> },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl p-4 border', s.bg, 'border-transparent')}>
            <div className={cn('flex items-center gap-1.5 mb-1', s.color)}>{s.icon}<span className="text-xs font-medium">{s.label}</span></div>
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: 'mine', label: 'Para mim', badge: summary?.pendingForMe },
          { key: 'all',  label: 'Todos pendentes', badge: undefined },
          { key: 'done', label: 'Resolvidos',       badge: undefined },
        ] as Array<{ key: 'mine' | 'all' | 'done'; label: string; badge?: number }>).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn('relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}>
            {t.label}
            {t.badge ? (
              <span className="w-5 h-5 bg-amber-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : (items ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="w-12 h-12 text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">
            {tab === 'mine' ? 'Sem aprovações pendentes para ti' : tab === 'all' ? 'Sem pedidos pendentes' : 'Sem pedidos resolvidos'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(items ?? []).map((r: any) => (
            <ApprovalRow key={r.id} request={r} showVote={tab === 'mine'} />
          ))}
        </div>
      )}
    </div>
  );
}
