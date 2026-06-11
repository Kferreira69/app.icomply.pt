'use client';

import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { usersApi } from '@/lib/api';
import { KeyRound, User, Eye, EyeOff, CheckCircle, Loader2, Camera, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Password strength ───────────────────────────────────────────────────────
function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0-5
}
const STRENGTH_LABELS = ['', 'Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Excelente'];
const STRENGTH_COLORS = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-500', 'bg-green-500'];

// ─── Avatar upload ────────────────────────────────────────────────────────────
function AvatarUpload() {
  const { user, setUser } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const mutation = useMutation({
    mutationFn: (file: File) => usersApi.uploadAvatar(file),
    onSuccess: (res) => {
      const avatarUrl = res.data?.avatarUrl;
      if (avatarUrl && user) setUser({ ...user, avatarUrl });
    },
  });

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    mutation.mutate(file);
  };

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`;
  const avatarSrc = preview || user?.avatarUrl;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <User className="w-5 h-5 text-gray-400" />
        <h2 className="text-base font-semibold text-gray-900">Foto de perfil</h2>
      </div>

      <div className="flex items-center gap-6">
        {/* Current avatar */}
        <div className="relative flex-shrink-0">
          <div className={cn(
            'w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center',
            !avatarSrc && 'bg-primary',
          )}>
            {avatarSrc ? (
              <img src={avatarSrc} alt={initials} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white">{initials}</span>
            )}
          </div>
          {mutation.isPending && (
            <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          )}
          {mutation.isSuccess && !mutation.isPending && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Drop zone */}
        <div
          className={cn(
            'flex-1 border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors',
            dragOver ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
          )}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          <Upload className="w-5 h-5 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 font-medium">Clica ou arrasta uma imagem</p>
          <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP · máx 2MB</p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {mutation.isError && (
        <p className="mt-3 text-sm text-red-500">
          {(mutation.error as any)?.response?.data?.message || 'Erro ao fazer upload'}
        </p>
      )}
    </div>
  );
}

// ─── Password change ──────────────────────────────────────────────────────────
function PasswordChange() {
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
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => setSuccess(false), 4000);
    },
    onError: (e: any) => setError(e?.response?.data?.message || 'Erro ao alterar password'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) return setError('A nova password deve ter pelo menos 8 caracteres');
    if (newPassword !== confirmPassword) return setError('As passwords não coincidem');
    mutation.mutate();
  };

  const strength = passwordStrength(newPassword);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900">Alterar password</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowPasswords(v => !v)}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
        >
          {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showPasswords ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Password atual</label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Nova password</label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="••••••••"
          />
          {newPassword && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= strength ? STRENGTH_COLORS[strength] : 'bg-gray-200')} />
                ))}
              </div>
              <p className={cn('text-[10px]', strength >= 4 ? 'text-green-600' : strength >= 3 ? 'text-yellow-600' : 'text-red-500')}>
                {STRENGTH_LABELS[strength]}
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Confirmar nova password</label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            className={cn(
              'w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30',
              confirmPassword && newPassword !== confirmPassword
                ? 'border-red-300 focus:border-red-400'
                : 'border-gray-200 focus:border-primary',
            )}
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {success && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl px-3 py-2.5">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Password alterada com sucesso!</span>
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending || !currentPassword || !newPassword || !confirmPassword}
          className="w-full bg-primary text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> A guardar…</> : 'Alterar password'}
        </button>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProfileSettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">O meu perfil</h1>
        <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
      </div>

      <AvatarUpload />
      <PasswordChange />
    </div>
  );
}
