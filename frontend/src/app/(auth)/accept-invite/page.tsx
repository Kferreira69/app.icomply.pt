'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { authApi } from '@/lib/api';
import { useState } from 'react';
import { Loader2, UserCheck, CheckCircle } from 'lucide-react';
import Link from 'next/link';

function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm<{
    password: string;
    confirmPassword: string;
  }>();

  const onSubmit = async ({ password }: { password: string; confirmPassword: string }) => {
    setError('');
    try {
      await authApi.acceptInvite({ token, password });
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Convite inválido ou expirado.');
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-2">
        <p className="text-sm text-red-600">Link de convite inválido.</p>
        <Link href="/login" className="text-sm text-primary hover:underline block">Voltar ao login</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-7 h-7 text-green-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Conta ativada!</h2>
          <p className="text-sm text-gray-500 mt-1">A sua conta foi criada. A redirecionar para o login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <UserCheck className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Aceitar Convite</h2>
        <p className="text-sm text-gray-500 mt-1">Defina a sua palavra-passe para ativar a conta.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Palavra-passe *</label>
          <input
            {...register('password', {
              required: true,
              minLength: { value: 8, message: 'Mínimo 8 caracteres' },
            })}
            type="password"
            autoFocus
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Palavra-passe *</label>
          <input
            {...register('confirmPassword', {
              required: true,
              validate: v => v === watch('password') || 'As palavras-passe não coincidem',
            })}
            type="password"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Ativar Conta
        </button>
      </form>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
      <AcceptInviteForm />
    </Suspense>
  );
}
