'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { usersApi } from '@/lib/api';
import { KeyRound, User, Eye, EyeOff, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProfileSettingsPage() {
  const { user } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords]     = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () => usersApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 4000);
    },
    onError: (e: any) => {
      setError(e?.response?.data?.message || 'Erro ao alterar password');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) return setError('A nova password deve ter pelo menos 8 caracteres');
    if (newPassword !== confirmPassword) return setError('As passwords não coincidem');
    mutation.mutate();
  };

  const strength = newPassword.length === 0 ? 0 : newPassword.length < 8 ? 1 : newPassword.length < 12 ? 2 : newPassword.length < 16 ? 3 : 4;
  const strengthLabel = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'][strength];
  const strengthColor = ['', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'][strength];

  return (
    <div className="max-w-2xl space-y-6">

      {/* Profile info (read-only) */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-xl font-bold text-white">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{user?.firstName} {user?.lastName}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <p className="text-xs text-gray-400 mt-0.5">{user?.organization?.name} · {user?.role}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Primeiro nome</label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">{user?.firstName || '—'}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Apelido</label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">{user?.lastName || '—'}</div>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Password change */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound className="w-5 h-5 text-gray-500" />
          <h3 className="text-base font-semibold text-gray-900">Alterar Password</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password atual *</label>
            <div className="relative">
              <input
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder="A sua password atual"
                required
              />
              <button type="button" onClick={() => setShowPasswords(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova password *</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              placeholder="Mínimo 8 caracteres"
              required
            />
            {newPassword && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= strength ? strengthColor : 'bg-gray-200')} />
                  ))}
                </div>
                <span className="text-xs text-gray-500 w-16">{strengthLabel}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova password *</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className={cn(
                'w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none',
                confirmPassword && newPassword !== confirmPassword ? 'border-red-300 focus:ring-red-200' : 'border-gray-300',
              )}
              placeholder="Repetir nova password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-sm text-green-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Password alterada com sucesso!
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Alterar Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
