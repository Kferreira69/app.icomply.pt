'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { authApi } from '@/lib/api';
import { Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function SecuritySettingsPage() {
  const [result, setResult] = useState<{ ok?: boolean; message?: string } | null>(null);

  const { register, handleSubmit, reset, watch, formState: { isSubmitting, errors } } = useForm<{
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }>();

  const onSubmit = async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    setResult(null);
    try {
      await authApi.changePassword(data.currentPassword, data.newPassword);
      setResult({ ok: true, message: 'Palavra-passe alterada com sucesso.' });
      reset();
    } catch (e: any) {
      setResult({ ok: false, message: e?.response?.data?.message || 'Erro ao alterar a palavra-passe.' });
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Alterar Palavra-passe</h2>
            <p className="text-xs text-gray-400">Utilize uma palavra-passe forte com mínimo 8 caracteres</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Palavra-passe Atual *</label>
            <input
              {...register('currentPassword', { required: true })}
              type="password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova Palavra-passe *</label>
            <input
              {...register('newPassword', {
                required: true,
                minLength: { value: 8, message: 'Mínimo 8 caracteres' },
              })}
              type="password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none"
              placeholder="••••••••"
            />
            {errors.newPassword && <p className="text-xs text-red-500 mt-1">{errors.newPassword.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Palavra-passe *</label>
            <input
              {...register('confirmPassword', {
                required: true,
                validate: v => v === watch('newPassword') || 'As palavras-passe não coincidem',
              })}
              type="password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none"
              placeholder="••••••••"
            />
            {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
          </div>

          {result && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {result.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {result.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Alterar Palavra-passe
          </button>
        </form>
      </div>

      {/* 2FA placeholder */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Autenticação de Dois Fatores (2FA)</h2>
        <p className="text-sm text-gray-500 mb-4">Adicione uma camada extra de segurança à sua conta.</p>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
          <p className="text-sm text-gray-500">2FA via TOTP (Google Authenticator) — <span className="text-primary font-medium">Em breve</span></p>
        </div>
      </div>
    </div>
  );
}
