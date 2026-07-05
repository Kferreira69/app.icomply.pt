'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalsApi, type ApprovalEntityType, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, XCircle, Clock, MinusCircle, Plus, Loader2,
  ChevronDown, MessageSquare, Users, AlertCircle,
} from 'lucide-react';

const DECISION_META = {
  APPROVED: { label: 'Aprovado',  color: 'text-green-700', bg: 'bg-green-100', icon: <CheckCircle2 className="w-4 h-4" /> },
  REJECTED: { label: 'Rejeitado', color: 'text-red-700',   bg: 'bg-red-100',   icon: <XCircle className="w-4 h-4" /> },
  ABSTAIN:  { label: 'Abstenção', color: 'text-gray-500',  bg: 'bg-gray-100',  icon: <MinusCircle className="w-4 h-4" /> },
};

const STATUS_META = {
  PENDING:   { label: 'Pendente',  color: 'text-amber-700', bg: 'bg-amber-100',  icon: <Clock className="w-3.5 h-3.5" /> },
  APPROVED:  { label: 'Aprovado',  color: 'text-green-700', bg: 'bg-green-100',  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  REJECTED:  { label: 'Rejeitado', color: 'text-red-700',   bg: 'bg-red-100',    icon: <XCircle className="w-3.5 h-3.5" /> },
  CANCELLED: { label: 'Cancelado', color: 'text-gray-500',  bg: 'bg-gray-100',   icon: <MinusCircle className="w-3.5 h-3.5" /> },
};

function UserAvatar({ user, size = 'sm' }: { user: any; size?: 'xs' | 'sm' }) {
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`;
  const sz = size === 'xs' ? 'w-6 h-6 text-[10px]' : 'w-7 h-7 text-xs';
  if (user?.avatarUrl) return <img src={user.avatarUrl} alt={initials} className={cn(sz, 'rounded-full object-cover flex-shrink-0')} />;
  return <div className={cn(sz, 'rounded-full bg-primary flex items-center justify-center font-bold text-white flex-shrink-0')}>{initials}</div>;
}

// ── Create approval request form ──────────────────────────────────────────────
function CreateApprovalForm({ entityType, entityId, onClose }: { entityType: ApprovalEntityType; entityId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedApprovers, setSelectedApprovers] = useState<any[]>([]);
  const [threshold, setThreshold] = useState(1);
  const [dueDate, setDueDate] = useState('');

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.list({ limit: 100 }).then(r => r.data?.data ?? []),
  });

  const mutation = useMutation({
    mutationFn: () => approvalsApi.create({
      entityType, entityId, title, description,
      approverIds: selectedApprovers.map(u => u.id),
      threshold,
      dueDate: dueDate || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals', entityType, entityId] });
      onClose();
    },
  });

  const toggleApprover = (user: any) => {
    setSelectedApprovers(prev =>
      prev.find(u => u.id === user.id) ? prev.filter(u => u.id !== user.id) : [...prev, user],
    );
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <p className="text-xs font-semibold text-gray-700">Novo pedido de aprovação</p>

      <input
        value={title} onChange={e => setTitle(e.target.value)}
        placeholder="Título do pedido"
        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <textarea
        value={description} onChange={e => setDescription(e.target.value)}
        placeholder="Descrição / contexto (opcional)"
        rows={2}
        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
      />

      <div>
        <p className="text-xs text-gray-500 mb-2">Aprovadores</p>
        <div className="max-h-36 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
          {(usersData ?? []).map((u: any) => (
            <button key={u.id} onClick={() => toggleApprover(u)}
              className={cn('flex items-center gap-2 w-full px-3 py-2 text-xs text-left transition-colors',
                selectedApprovers.find(a => a.id === u.id) ? 'bg-primary/5 text-primary' : 'hover:bg-gray-50 text-gray-700',
              )}>
              <UserAvatar user={u} size="xs" />
              {u.firstName} {u.lastName}
              {selectedApprovers.find(a => a.id === u.id) && <CheckCircle2 className="w-3 h-3 ml-auto text-primary" />}
            </button>
          ))}
        </div>
      </div>

      {selectedApprovers.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Mínimo de aprovações:</label>
          <input type="number" min={1} max={selectedApprovers.length} value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className="w-16 text-sm border border-gray-200 rounded-lg px-2 py-1 text-center"
          />
          <span className="text-xs text-gray-400">de {selectedApprovers.length}</span>
        </div>
      )}

      <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600"
      />

      <div className="flex gap-2">
        <button
          onClick={() => mutation.mutate()}
          disabled={!title || selectedApprovers.length === 0 || mutation.isPending}
          className="flex-1 bg-primary text-white rounded-xl py-2 text-xs font-semibold hover:bg-primary/90 disabled:opacity-40 flex items-center justify-center gap-1"
        >
          {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Enviar pedido
        </button>
        <button onClick={onClose} className="px-4 py-2 text-xs text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ── Single approval request card ──────────────────────────────────────────────
function ApprovalCard({ request }: { request: any }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const [expanded, setExpanded] = useState(false);

  const myVote = request.votes?.find((v: any) => v.approverId === user?.id);
  const statusMeta = STATUS_META[request.status as keyof typeof STATUS_META];
  const approvedCount = request.votes?.filter((v: any) => v.decision === 'APPROVED').length ?? 0;
  const totalVoters = request.votes?.length ?? 0;

  const voteMutation = useMutation({
    mutationFn: ({ decision, comment }: { decision: string; comment?: string }) =>
      approvalsApi.vote(request.id, decision as any, comment),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => approvalsApi.cancel(request.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <UserAvatar user={request.requestedBy} size="xs" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{request.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {request.requestedBy?.firstName} {request.requestedBy?.lastName}
              {request.dueDate && <> · prazo {new Date(request.dueDate).toLocaleDateString('pt-PT')}</>}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full', statusMeta.color, statusMeta.bg)}>
              {statusMeta.icon} {statusMeta.label}
            </span>
            <button onClick={() => setExpanded(e => !e)} className="p-1 hover:bg-gray-100 rounded-lg">
              <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform', expanded && 'rotate-180')} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
            <div className={cn('h-1.5 rounded-full transition-all', approvedCount >= request.threshold ? 'bg-green-500' : 'bg-primary')}
              style={{ width: `${totalVoters ? (approvedCount / totalVoters) * 100 : 0}%` }} />
          </div>
          <span className="text-[10px] text-gray-400">{approvedCount}/{request.threshold} necessários</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-50 p-4 space-y-3 bg-gray-50/50">
          {request.description && <p className="text-xs text-gray-600 italic">"{request.description}"</p>}

          {/* Voters */}
          <div className="space-y-2">
            {request.votes?.map((v: any) => {
              const dm = v.decision ? DECISION_META[v.decision as keyof typeof DECISION_META] : null;
              return (
                <div key={v.id} className="flex items-center gap-2">
                  <UserAvatar user={v.approver} size="xs" />
                  <span className="text-xs text-gray-700 flex-1">{v.approver?.firstName} {v.approver?.lastName}</span>
                  {dm ? (
                    <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full', dm.color, dm.bg)}>
                      {dm.icon} {dm.label}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400">A aguardar…</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Vote buttons — only if I'm a voter and haven't voted yet */}
          {myVote && !myVote.decision && request.status === 'PENDING' && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <textarea
                value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Comentário (opcional)"
                rows={2}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <div className="flex gap-2">
                {(['APPROVED', 'REJECTED', 'ABSTAIN'] as const).map(d => {
                  const dm = DECISION_META[d];
                  return (
                    <button key={d}
                      onClick={() => voteMutation.mutate({ decision: d, comment })}
                      disabled={voteMutation.isPending}
                      className={cn('flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold border-2 transition-colors', dm.bg, dm.color, 'hover:opacity-80 disabled:opacity-40')}>
                      {dm.icon} {dm.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cancel — only requester */}
          {request.requestedBy?.id === user?.id && request.status === 'PENDING' && (
            <button onClick={() => cancelMutation.mutate()}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors">
              Cancelar pedido
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
interface ApprovalPanelProps {
  entityType: ApprovalEntityType;
  entityId: string;
  readonly?: boolean;
}

export function ApprovalPanel({ entityType, entityId, readonly = false }: ApprovalPanelProps) {
  const [creating, setCreating] = useState(false);
  const qKey = ['approvals', entityType, entityId];

  const { data, isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () => approvalsApi.getForEntity(entityType, entityId).then(r => r.data),
  });

  const requests = data ?? [];
  const pending = requests.filter((r: any) => r.status === 'PENDING');

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <h4 className="text-sm font-semibold text-gray-700">Aprovações</h4>
          {pending.length > 0 && (
            <span className="w-5 h-5 bg-amber-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">{pending.length}</span>
          )}
        </div>
        {!readonly && !creating && (
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium px-2 py-1 rounded-lg hover:bg-primary/5">
            <Plus className="w-3.5 h-3.5" /> Pedir aprovação
          </button>
        )}
      </div>

      {creating && <CreateApprovalForm entityType={entityType} entityId={entityId} onClose={() => setCreating(false)} />}

      {requests.length === 0 && !creating && (
        <p className="text-xs text-gray-400 italic text-center py-3">Sem pedidos de aprovação</p>
      )}

      <div className="space-y-2">
        {requests.map((r: any) => <ApprovalCard key={r.id} request={r} />)}
      </div>
    </div>
  );
}
