'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { raciApi, type RaciRole, type RaciEntityType } from '@/lib/api';
import { usersApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Plus, X, Loader2, Users, ChevronDown } from 'lucide-react';

const ROLE_META: Record<RaciRole, { label: string; full: string; color: string; bg: string; description: string }> = {
  R: { label: 'R', full: 'Responsible',  color: 'text-blue-700',   bg: 'bg-blue-100',   description: 'Executa o trabalho' },
  A: { label: 'A', full: 'Accountable',  color: 'text-purple-700', bg: 'bg-purple-100', description: 'Responsável pelo resultado, assina' },
  C: { label: 'C', full: 'Consulted',    color: 'text-amber-700',  bg: 'bg-amber-100',  description: 'Consultado antes de decisões' },
  I: { label: 'I', full: 'Informed',     color: 'text-green-700',  bg: 'bg-green-100',  description: 'Informado sobre progressos' },
};

interface RaciPanelProps {
  entityType: RaciEntityType;
  entityId: string;
  readonly?: boolean;
  compact?: boolean;
}

interface UserOption { id: string; firstName: string; lastName: string; email: string; avatarUrl?: string; }

function UserAvatar({ user, size = 'sm' }: { user: UserOption; size?: 'sm' | 'xs' }) {
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`;
  const sz = size === 'xs' ? 'w-6 h-6 text-[10px]' : 'w-7 h-7 text-xs';
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={initials} className={cn(sz, 'rounded-full object-cover')} />;
  }
  return (
    <div className={cn(sz, 'rounded-full bg-primary flex items-center justify-center font-bold text-white flex-shrink-0')}>
      {initials}
    </div>
  );
}

function AddUserDropdown({ onAdd, excludeIds }: { onAdd: (userId: string, role: RaciRole) => void; excludeIds: string[] }) {
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [selectedRole, setSelectedRole] = useState<RaciRole>('R');

  const { data } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.list({ limit: 100 }).then(r => r.data?.data ?? []),
    enabled: open,
  });

  const users: UserOption[] = (data ?? []).filter((u: UserOption) => !excludeIds.includes(u.id));

  const handleAdd = () => {
    if (!selectedUser) return;
    onAdd(selectedUser.id, selectedRole);
    setOpen(false);
    setSelectedUser(null);
    setSelectedRole('R');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Adicionar
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-20 p-3 space-y-3">
            <p className="text-xs font-semibold text-gray-600">Atribuir papel RACI</p>

            {/* Role selector */}
            <div className="grid grid-cols-4 gap-1">
              {(Object.keys(ROLE_META) as RaciRole[]).map(role => (
                <button key={role} onClick={() => setSelectedRole(role)}
                  className={cn('py-1.5 rounded-lg text-xs font-bold transition-colors',
                    selectedRole === role
                      ? `${ROLE_META[role].bg} ${ROLE_META[role].color}`
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                  )}>
                  {role} — {ROLE_META[role].full.slice(0, 6)}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400">{ROLE_META[selectedRole].description}</p>

            {/* User selector */}
            <div className="max-h-40 overflow-y-auto space-y-0.5 border border-gray-100 rounded-lg p-1">
              {users.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">Sem utilizadores disponíveis</p>
              )}
              {users.map(u => (
                <button key={u.id} onClick={() => setSelectedUser(u)}
                  className={cn('flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs transition-colors',
                    selectedUser?.id === u.id ? 'bg-primary text-white' : 'hover:bg-gray-50 text-gray-700',
                  )}>
                  <UserAvatar user={u} size="xs" />
                  <span className="truncate">{u.firstName} {u.lastName}</span>
                  <span className={cn('ml-auto truncate text-[10px]', selectedUser?.id === u.id ? 'text-white/70' : 'text-gray-400')}>
                    {u.email}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={handleAdd}
              disabled={!selectedUser}
              className="w-full bg-primary text-white rounded-lg py-2 text-xs font-medium hover:bg-primary/90 disabled:opacity-40"
            >
              Atribuir {selectedRole && `como ${ROLE_META[selectedRole].full}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function RaciPanel({ entityType, entityId, readonly = false, compact = false }: RaciPanelProps) {
  const qc = useQueryClient();
  const qKey = ['raci', entityType, entityId];

  const { data, isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () => raciApi.getForEntity(entityType, entityId).then(r => r.data),
  });

  const assignMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: RaciRole }) =>
      raciApi.assign({ entityType, entityId, userId, role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qKey }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => raciApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qKey }),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-6">
      <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
    </div>
  );

  const grouped = data?.grouped ?? { R: [], A: [], C: [], I: [] };
  const allAssigned = data?.assignments ?? [];
  const assignedUserIds = allAssigned.map((a: any) => a.userId);

  if (compact) {
    // Compact mode: just show colored badges inline
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {(Object.keys(ROLE_META) as RaciRole[]).map(role => {
          const items = grouped[role];
          if (items.length === 0) return null;
          return items.map((a: any) => (
            <span key={a.id} className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold', ROLE_META[role].bg, ROLE_META[role].color)}>
              {role}: {a.user.firstName} {a.user.lastName?.[0]}.
            </span>
          ));
        })}
        {allAssigned.length === 0 && (
          <span className="text-xs text-gray-400 italic">Sem RACI definido</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <h4 className="text-sm font-semibold text-gray-700">Matriz RACI</h4>
        </div>
        {!readonly && (
          <AddUserDropdown
            onAdd={(userId, role) => assignMutation.mutate({ userId, role })}
            excludeIds={[]}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(ROLE_META) as RaciRole[]).map(role => {
          const meta = ROLE_META[role];
          const items = grouped[role] ?? [];
          return (
            <div key={role} className={cn('rounded-xl border-2 p-3', items.length > 0 ? 'border-transparent' : 'border-dashed border-gray-200')}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0', meta.bg, meta.color)}>
                  {meta.label}
                </span>
                <div>
                  <p className="text-xs font-semibold text-gray-700 leading-tight">{meta.full}</p>
                  <p className="text-[10px] text-gray-400 leading-tight">{meta.description}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                {items.length === 0 && (
                  <p className="text-[10px] text-gray-300 italic">Não atribuído</p>
                )}
                {items.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-1.5 group">
                    <UserAvatar user={a.user} size="xs" />
                    <span className="text-xs text-gray-700 flex-1 truncate">
                      {a.user.firstName} {a.user.lastName}
                    </span>
                    {!readonly && (
                      <button
                        onClick={() => removeMutation.mutate(a.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 rounded text-red-400 transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
