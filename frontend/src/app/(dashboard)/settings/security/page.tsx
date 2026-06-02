'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { authApi } from '@/lib/api';
import {
  Shield, Smartphone, CheckCircle, AlertCircle, Loader2,
  Eye, EyeOff, Key, Lock, ShieldCheck, ShieldOff, Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SecurityPage() {
  const t = useTranslations('security');
  const qc = useQueryClient();

  const [showPassword, setShowPassword]   = useState(false);
  const [twoFAStep, setTwoFAStep]         = useState<'idle' | 'setup' | 'verify' | 'disable'>('idle');
  const [qrCodeUrl, setQrCodeUrl]         = useState<string | null>(null);
  const [otpSecret, setOtpSecret]         = useState<string | null>(null);
  const [totpToken, setTotpToken]         = useState('');
  const [secretCopied, setSecretCopied]   = useState(false);
  const [twoFAMsg, setTwoFAMsg]           = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [msg, setMsg]                     = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { register, handleSubmit, reset, watch } = useForm<{
    currentPassword: string; newPassword: string; confirmPassword: string;
  }>();

  const { data: status2FA, isLoading: statusLoading } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: () => authApi.get2FAStatus().then(r => r.data),
  });
  const is2FAEnabled = status2FA?.enabled ?? false;

  const changePwMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: any) =>
      authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setMsg({ type: 'success', text: t('changeSuccess') });
      reset();
      setTimeout(() => setMsg(null), 4000);
    },
    onError: () => setMsg({ type: 'error', text: t('changeError') }),
  });

  const setup2FAMutation = useMutation({
    mutationFn: () => authApi.setup2FA().then(r => r.data),
    onSuccess: (data: any) => { setQrCodeUrl(data.qrCodeUrl); setOtpSecret(data.secret); setTwoFAStep('setup'); },
  });

  const verify2FAMutation = useMutation({
    mutationFn: (token: string) => authApi.verify2FA(token),
    onSuccess: () => {
      setTwoFAStep('idle'); setTwoFAMsg({ type: 'success', text: '2FA activado com sucesso!' });
      qc.invalidateQueries({ queryKey: ['2fa-status'] }); setTotpToken('');
      setTimeout(() => setTwoFAMsg(null), 4000);
    },
    onError: () => setTwoFAMsg({ type: 'error', text: 'Código inválido. Tente novamente.' }),
  });

  const disable2FAMutation = useMutation({
    mutationFn: (token: string) => authApi.disable2FA(token),
    onSuccess: () => {
      setTwoFAStep('idle'); setTwoFAMsg({ type: 'success', text: '2FA desactivado.' });
      qc.invalidateQueries({ queryKey: ['2fa-status'] }); setTotpToken('');
      setTimeout(() => setTwoFAMsg(null), 4000);
    },
    onError: () => setTwoFAMsg({ type: 'error', text: 'Código inválido. Tente novamente.' }),
  });

  const onSubmitPassword = handleSubmit((data) => {
    if (data.newPassword !== data.confirmPassword) return;
    changePwMutation.mutate(data);
  });

  const copySecret = () => {
    if (otpSecret) { navigator.clipboard.writeText(otpSecret); setSecretCopied(true); setTimeout(() => setSecretCopied(false), 2000); }
  };

  return (
    <div className="max-w-xl space-y-6">

      {/* ── Password ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Key className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">{t('title')}</h2>
            <p className="text-xs text-gray-500">{t('subtitle')}</p>
          </div>
        </div>

        <form onSubmit={onSubmitPassword} className="space-y-4">
          {[
            { label: t('currentPassword'), name: 'currentPassword', ph: '••••••••' },
            { label: t('newPassword'),     name: 'newPassword',     ph: t('minLength') },
            { label: t('confirmPassword'), name: 'confirmPassword', ph: '••••••••' },
          ].map(({ label, name, ph }) => (
            <div key={name}>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} placeholder={ph}
                  {...register(name as any, { required: true, minLength: name !== 'currentPassword' ? 8 : 1 })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm pr-10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                {name === 'newPassword' && (
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          {watch('newPassword') !== watch('confirmPassword') && watch('confirmPassword') && (
            <p className="text-xs text-red-500">{t('passwordMismatch')}</p>
          )}

          {msg && (
            <div className={cn('flex items-center gap-2 text-sm p-3 rounded-lg',
              msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
              {msg.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              {msg.text}
            </div>
          )}

          <button type="submit" disabled={changePwMutation.isPending}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {changePwMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {t('changePasswordBtn')}
          </button>
        </form>
      </div>

      {/* ── 2FA / TOTP ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', is2FAEnabled ? 'bg-green-50' : 'bg-gray-50')}>
            {is2FAEnabled ? <ShieldCheck className="w-5 h-5 text-green-600" /> : <Shield className="w-5 h-5 text-gray-400" />}
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">{t('twoFATitle')}</h2>
            <p className="text-xs text-gray-500">{t('twoFASubtitle')}</p>
          </div>
          <div className="ml-auto">
            {statusLoading ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : (
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium',
                is2FAEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                {is2FAEnabled ? 'Activo' : 'Inactivo'}
              </span>
            )}
          </div>
        </div>

        {twoFAMsg && (
          <div className={cn('flex items-center gap-2 text-sm p-3 rounded-lg mb-4',
            twoFAMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
            {twoFAMsg.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {twoFAMsg.text}
          </div>
        )}

        {/* Idle + not enabled */}
        {twoFAStep === 'idle' && !is2FAEnabled && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              A autenticação de dois fatores (2FA) adiciona uma camada extra de segurança à sua conta.
              Após activar, precisará do código da sua app autenticadora a cada início de sessão.
            </p>
            <div className="flex gap-2 text-xs text-gray-500 bg-blue-50 rounded-lg p-3">
              <Smartphone className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <span>Compatível com: Google Authenticator, Authy, Microsoft Authenticator, 1Password</span>
            </div>
            <button onClick={() => setup2FAMutation.mutate()} disabled={setup2FAMutation.isPending}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {setup2FAMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Activar 2FA com TOTP
            </button>
          </div>
        )}

        {/* Setup: show QR code */}
        {twoFAStep === 'setup' && qrCodeUrl && (
          <div className="space-y-5">
            <p className="text-sm font-medium text-gray-700">1. Digitalize o QR code com a sua app autenticadora:</p>
            <div className="flex justify-center">
              <img src={qrCodeUrl} alt="QR Code 2FA" className="w-48 h-48 rounded-xl border border-gray-200 p-2 bg-white" />
            </div>
            {otpSecret && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Ou introduza o código manualmente:</p>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                  <code className="text-xs font-mono text-gray-700 tracking-wider flex-1 break-all">{otpSecret}</code>
                  <button onClick={copySecret} className="text-gray-400 hover:text-primary flex-shrink-0">
                    {secretCopied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
            <p className="text-sm font-medium text-gray-700">2. Introduza o código de 6 dígitos gerado pela app:</p>
            <input type="text" inputMode="numeric" maxLength={6} value={totpToken}
              onChange={e => setTotpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            <div className="flex gap-2">
              <button onClick={() => { setTwoFAStep('idle'); setQrCodeUrl(null); setOtpSecret(null); setTotpToken(''); }}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => verify2FAMutation.mutate(totpToken)}
                disabled={totpToken.length !== 6 || verify2FAMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {verify2FAMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Verificar e Activar
              </button>
            </div>
          </div>
        )}

        {/* Enabled */}
        {twoFAStep === 'idle' && is2FAEnabled && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
              <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700">2FA está activo. A sua conta está protegida com autenticação de dois fatores via TOTP.</p>
            </div>
            <button onClick={() => { setTwoFAStep('disable'); setTotpToken(''); }}
              className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 px-4 py-2 rounded-lg transition-colors">
              <ShieldOff className="w-4 h-4" />
              Desactivar 2FA
            </button>
          </div>
        )}

        {/* Disable confirmation */}
        {twoFAStep === 'disable' && (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
              ⚠️ Ao desactivar o 2FA a sua conta ficará menos segura. Certifique-se de que é uma decisão consciente.
            </div>
            <p className="text-sm font-medium text-gray-700">Introduza o código TOTP atual para confirmar:</p>
            <input type="text" inputMode="numeric" maxLength={6} value={totpToken}
              onChange={e => setTotpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            <div className="flex gap-2">
              <button onClick={() => { setTwoFAStep('idle'); setTotpToken(''); }}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => disable2FAMutation.mutate(totpToken)}
                disabled={totpToken.length !== 6 || disable2FAMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {disable2FAMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
                Confirmar Desactivação
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Session policies ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Políticas de Segurança</h2>
            <p className="text-xs text-gray-500">Configurações de segurança activas na plataforma</p>
          </div>
        </div>
        <div className="divide-y divide-gray-50 text-sm text-gray-600">
          {[
            { label: 'Expiração de sessão',              value: '8 horas',     color: 'bg-gray-100 text-gray-600'    },
            { label: 'Algoritmo de hash de password',    value: 'Argon2id',    color: 'bg-green-100 text-green-700'  },
            { label: 'Tokens de sessão',                 value: 'JWT RS256',   color: 'bg-blue-100 text-blue-700'    },
            { label: 'Comprimento mínimo de password',   value: '8 caracteres', color: 'bg-gray-100 text-gray-600'  },
            { label: 'Throttle (login)',                 value: '5 tentativas / 15 min', color: 'bg-amber-100 text-amber-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between py-2.5">
              <span>{label}</span>
              <span className={`text-xs px-2 py-1 rounded font-medium ${color}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
