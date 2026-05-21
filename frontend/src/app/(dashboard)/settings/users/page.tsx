'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { UserPlus, Search, Loader2, Mail, Shield } from 'lucide-react';
import { cn, formatRelative, getStatusColor, getInitials } from '@/lib/utils';
import { useForm } from 'react-hook-form';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', ADMIN: 'Administrador',
  COMPLIANCE_MANAGER: 'Gestor Compliance', CONSULTANT: 'Consultor', VIEWER: 'Visualizador',
};

function InviteModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const inviteMutation = useMutation({
    mutationFn: (data: any) => usersApi.invite(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Convidar Utilizador</h3>
        <form onSubmit={handleSubmit(d => inviteMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input {...register('email', { required: true })} type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="nome@empresa.pt" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input {...register('firstName', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Nome" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apelido *</label>
              <input {...register('lastName', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Apelido" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Papel</label>
            <select {...register('role')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
              {Object.entries(ROLE_LABELS).slice(1).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={inviteMutation.isPending} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
              {inviteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <Mail className="w-4 h-4" /> Enviar Convite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersSettingsPage() {
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => usersApi.list({ search, limit: 50 }).then(r => r.data),
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => usersApi.suspend(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const users = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar utilizadores..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
        </div>
        <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90">
          <UserPlus className="w-4 h-4" /> Convidar
        </button>
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
                {['Utilizador', 'Papel', 'Estado', 'Último acesso', 'Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                        {getInitials(u.firstName, u.lastName)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm text-gray-600">{ROLE_LABELS[u.role] || u.role}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium', getStatusColor(u.status))}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {u.lastLoginAt ? formatRelative(u.lastLoginAt) : 'Nunca'}
                  </td>
                  <td className="px-4 py-3">
                    {u.status === 'ACTIVE' && (
                      <button
                        onClick={() => suspendMutation.mutate(u.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Suspender
                      </button>
                    )}
                    {u.status === 'INVITED' && (
                      <button
                        onClick={() => usersApi.resendInvite(u.id)}
                        className="text-xs text-primary hover:underline"
                      >
                        Reenviar Convite
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            {users.length} utilizador{users.length !== 1 ? 'es' : ''} · {data?.total ?? 0} total
          </div>
        </div>
      )}

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  );
}
