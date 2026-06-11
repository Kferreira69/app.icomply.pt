'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { usersApi } from '@/lib/api';
import {
  UserPlus, Search, Loader2, Mail, Shield, SlidersHorizontal,
  X, KeyRound, UserCheck, UserX, MoreVertical, Eye, EyeOff,
} from 'lucide-react';
import { cn, formatRelative, getStatusColor, getInitials } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { UserPermissionsPanel } from '@/components/permissions/user-permissions-panel';

/* ── Invite Modal ─────────────────────────────────────────────── */
function InviteModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations('usersPage');
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const inviteMutation = useMutation({
    mutationFn: (data: any) => usersApi.invite(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose(); },
  });

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: t('roleAdmin'),
    COMPLIANCE_MANAGER: t('roleComplianceManager'),
    CONSULTANT: t('roleConsultant'),
    VIEWER: t('roleViewer'),
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">{t('inviteUser')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit(d => inviteMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')} *</label>
            <input
              {...register('email', { required: true })}
              type="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              placeholder="nome@empresa.pt"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('firstName')} *</label>
              <input
                {...register('firstName', { required: true })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder={t('firstNamePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('lastName')} *</label>
              <input
                {...register('lastName', { required: true })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder={t('lastNamePlaceholder')}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('role')}</label>
            <select {...register('role')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
              {Object.entries(ROLE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={inviteMutation.isPending || isSubmitting}
              className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {inviteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <Mail className="w-4 h-4" /> {t('sendInvite')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Set Password Modal ───────────────────────────────────────── */
function SetPasswordModal({ user, onClose }: { user: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => usersApi.setPassword(user.id, password),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.message || 'Erro ao definir password'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError('Mínimo 8 caracteres');
    if (password !== confirm) return setError('As passwords não coincidem');
    setError('');
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Definir Password</h3>
            <p className="text-sm text-gray-500 mt-0.5">{user.firstName} {user.lastName} — {user.email}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova password *</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder="Mínimo 8 caracteres"
              />
              <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar password *</label>
            <input
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              placeholder="Repetir password"
            />
          </div>

          {/* Strength indicator */}
          <div className="flex gap-1">
            {[8, 12, 16].map((len, i) => (
              <div key={i} className={cn('h-1 flex-1 rounded', password.length >= len ? ['bg-red-400', 'bg-yellow-400', 'bg-green-500'][i] : 'bg-gray-200')} />
            ))}
            <span className="text-xs text-gray-400 ml-1">{password.length < 8 ? 'Fraca' : password.length < 12 ? 'Razoável' : password.length < 16 ? 'Boa' : 'Forte'}</span>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <KeyRound className="w-4 h-4" /> Guardar Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Permissions Drawer ───────────────────────────────────────── */
function PermissionsDrawer({ user, onClose }: { user: any; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        <UserPermissionsPanel
          userId={user.id}
          userName={`${user.firstName} ${user.lastName}`}
          userRole={user.role}
          onClose={onClose}
        />
      </div>
    </>
  );
}

/* ── User Actions Menu ────────────────────────────────────────── */
function UserActionsMenu({ user, onSetPassword, onPermissions }: {
  user: any;
  onSetPassword: () => void;
  onPermissions: () => void;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const suspendMutation = useMutation({
    mutationFn: () => usersApi.suspend(user.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setOpen(false); },
  });
  const reactivateMutation = useMutation({
    mutationFn: () => usersApi.reactivate(user.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setOpen(false); },
  });
  const resendMutation = useMutation({
    mutationFn: () => usersApi.resendInvite(user.id),
    onSuccess: () => setOpen(false),
  });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden py-1">

            <button
              onClick={() => { setOpen(false); onPermissions(); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <SlidersHorizontal className="w-4 h-4 text-gray-400" />
              Gerir Permissões
            </button>

            <button
              onClick={() => { setOpen(false); onSetPassword(); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <KeyRound className="w-4 h-4 text-gray-400" />
              Definir Password
            </button>

            {user.status === 'INVITED' && (
              <button
                onClick={() => resendMutation.mutate()}
                disabled={resendMutation.isPending}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Mail className="w-4 h-4 text-gray-400" />
                Reenviar Convite
              </button>
            )}

            <div className="border-t border-gray-100 mt-1 pt-1">
              {user.status === 'SUSPENDED' ? (
                <button
                  onClick={() => reactivateMutation.mutate()}
                  disabled={reactivateMutation.isPending}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-green-600 hover:bg-green-50 disabled:opacity-50"
                >
                  {reactivateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  Reativar Utilizador
                </button>
              ) : user.status === 'ACTIVE' ? (
                <button
                  onClick={() => suspendMutation.mutate()}
                  disabled={suspendMutation.isPending}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {suspendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                  Suspender
                </button>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Status badge ─────────────────────────────────────────────── */
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo',
  SUSPENDED: 'Suspenso',
  INVITED: 'Convidado',
  DELETED: 'Eliminado',
};

/* ── Main Page ────────────────────────────────────────────────── */
export default function UsersSettingsPage() {
  const t = useTranslations('usersPage');
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [passwordUser, setPasswordUser] = useState<any>(null);
  const [permissionsUser, setPermissionsUser] = useState<any>(null);

  const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: t('roleAdmin'),
    COMPLIANCE_MANAGER: t('roleComplianceManager'),
    CONSULTANT: t('roleConsultant'),
    VIEWER: t('roleViewer'),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => usersApi.list({ search, limit: 50 }).then(r => r.data),
  });

  const users = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <UserPlus className="w-4 h-4" /> {t('invite')}
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
                {['Utilizador', 'Perfil', 'Estado', 'Último Acesso', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className={cn('border-b border-gray-100 hover:bg-gray-50', u.status === 'SUSPENDED' && 'opacity-60')}>
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
                    <span className={cn(
                      'text-xs px-2.5 py-1 rounded-full font-medium',
                      u.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      u.status === 'SUSPENDED' ? 'bg-red-100 text-red-700' :
                      u.status === 'INVITED' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600',
                    )}>
                      {STATUS_LABELS[u.status] || u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {u.lastLoginAt ? formatRelative(u.lastLoginAt) : 'Nunca'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <UserActionsMenu
                      user={u}
                      onSetPassword={() => setPasswordUser(u)}
                      onPermissions={() => setPermissionsUser(u)}
                    />
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">
                    Nenhum utilizador encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            {users.length} de {data?.total ?? 0} utilizadores
          </div>
        </div>
      )}

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
      {passwordUser && <SetPasswordModal user={passwordUser} onClose={() => setPasswordUser(null)} />}
      {permissionsUser && (
        <PermissionsDrawer user={permissionsUser} onClose={() => setPermissionsUser(null)} />
      )}
    </div>
  );
}
