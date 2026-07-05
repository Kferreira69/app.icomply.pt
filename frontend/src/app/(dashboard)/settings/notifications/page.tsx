'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { Bell, Mail, Smartphone, Loader2, CheckCircle, Save, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Notification types table ──────────────────────────────────
const NOTIFICATION_TYPES = [
  { type: 'TASK_OVERDUE',        label: 'Tarefa em atraso',       description: 'Quando uma tarefa passa o prazo',                  defaultEmail: true,  defaultInApp: true  },
  { type: 'RISK_HIGH',           label: 'Alerta de risco',        description: 'Novos riscos críticos ou altos',                   defaultEmail: true,  defaultInApp: true  },
  { type: 'EVIDENCE_EXPIRING',   label: 'Evidência a expirar',    description: 'Evidências que expiram em 30 dias',                defaultEmail: true,  defaultInApp: true  },
  { type: 'CAPA_OVERDUE',        label: 'CAPA em atraso',         description: 'Ações corretivas não resolvidas',                  defaultEmail: true,  defaultInApp: true  },
  { type: 'AUDIT_SCHEDULED',     label: 'Auditoria agendada',     description: 'Auditorias com data próxima',                      defaultEmail: true,  defaultInApp: true  },
  { type: 'USER_INVITED',        label: 'Utilizador convidado',   description: 'Novos utilizadores adicionados',                   defaultEmail: true,  defaultInApp: true  },
  { type: 'REPORT_READY',        label: 'Relatório pronto',       description: 'Relatórios gerados automaticamente',               defaultEmail: true,  defaultInApp: true  },
  // keep legacy types from old page so existing prefs are not lost
  { type: 'TASK_DUE_SOON',       label: 'Tarefa com prazo próximo', description: 'Tarefas com prazo nos próximos 3 dias',          defaultEmail: false, defaultInApp: true  },
  { type: 'CAPA_DUE_SOON',       label: 'CAPA com prazo próximo', description: 'CAPAs com prazo nos próximos 7 dias',              defaultEmail: false, defaultInApp: true  },
  { type: 'RISK_NO_TREATMENT',   label: 'Risco sem tratamento',   description: 'Riscos altos sem plano de tratamento',             defaultEmail: false, defaultInApp: true  },
  { type: 'POLICY_REVIEW',       label: 'Política a rever',       description: 'Políticas a necessitar de revisão em 14 dias',     defaultEmail: false, defaultInApp: true  },
  { type: 'VENDOR_EXPIRY',       label: 'Contrato de fornecedor', description: 'Contratos de fornecedor a expirar em 30 dias',     defaultEmail: false, defaultInApp: true  },
  { type: 'AUDIT_FINDING',       label: 'Finding de auditoria',   description: 'Findings de auditoria por resolver',               defaultEmail: false, defaultInApp: true  },
];

const DAYS_OF_WEEK = [
  { key: 'mon', label: 'Seg' },
  { key: 'tue', label: 'Ter' },
  { key: 'wed', label: 'Qua' },
  { key: 'thu', label: 'Qui' },
  { key: 'fri', label: 'Sex' },
];

const TIME_OPTIONS = ['08:00', '09:00', '10:00', '12:00', '17:00'];

const LS_CHANNEL_KEY = 'notif_channel_prefs';
const LS_DIGEST_KEY  = 'notif_digest_prefs';

interface ChannelPrefs {
  emailEnabled: boolean;
  frequency: 'immediately' | 'daily' | 'weekly';
}

interface DigestPrefs {
  days: string[];
  time: string;
}

function loadChannelPrefs(): ChannelPrefs {
  if (typeof window === 'undefined') return { emailEnabled: true, frequency: 'immediately' };
  try {
    const raw = localStorage.getItem(LS_CHANNEL_KEY);
    return raw ? JSON.parse(raw) : { emailEnabled: true, frequency: 'immediately' };
  } catch {
    return { emailEnabled: true, frequency: 'immediately' };
  }
}

function loadDigestPrefs(): DigestPrefs {
  if (typeof window === 'undefined') return { days: ['mon'], time: '09:00' };
  try {
    const raw = localStorage.getItem(LS_DIGEST_KEY);
    return raw ? JSON.parse(raw) : { days: ['mon'], time: '09:00' };
  } catch {
    return { days: ['mon'], time: '09:00' };
  }
}

// ── Toggle component ──────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      aria-checked={checked}
      className={cn(
        'w-9 h-5 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30',
        checked ? 'bg-primary' : 'bg-gray-200',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <div
        className={cn(
          'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

export default function NotificationPreferencesPage() {
  const qc = useQueryClient();

  // Per-type prefs (from API)
  const [typedPrefs, setTypedPrefs] = useState<Record<string, { inApp: boolean; email: boolean }>>({});
  // Channel & frequency prefs (localStorage)
  const [channelPrefs, setChannelPrefs] = useState<ChannelPrefs>({ emailEnabled: true, frequency: 'immediately' });
  // Digest schedule (localStorage)
  const [digestPrefs, setDigestPrefs] = useState<DigestPrefs>({ days: ['mon'], time: '09:00' });

  const [saved, setSaved] = useState(false);

  // Load localStorage prefs on mount
  useEffect(() => {
    setChannelPrefs(loadChannelPrefs());
    setDigestPrefs(loadDigestPrefs());
  }, []);

  // Load per-type prefs from API
  const { isLoading } = useQuery({
    queryKey: ['notification-prefs'],
    queryFn: () => notificationsApi.getPreferences().then(r => r.data),
    onSuccess: (data: any) => {
      if (Array.isArray(data)) {
        const map: Record<string, { inApp: boolean; email: boolean }> = {};
        for (const p of data) map[p.type] = { inApp: p.inApp, email: p.email };
        setTypedPrefs(map);
      }
    },
  } as any);

  const saveMutation = useMutation({
    mutationFn: () => {
      // Save channel/digest to localStorage
      localStorage.setItem(LS_CHANNEL_KEY, JSON.stringify(channelPrefs));
      localStorage.setItem(LS_DIGEST_KEY, JSON.stringify(digestPrefs));
      // Save per-type prefs to API
      return notificationsApi.updatePreferences(
        NOTIFICATION_TYPES.map(t => ({
          type: t.type,
          ...(typedPrefs[t.type] || { inApp: t.defaultInApp, email: t.defaultEmail }),
        })),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-prefs'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const toggleType = (type: string, channel: 'inApp' | 'email') => {
    const def = NOTIFICATION_TYPES.find(t => t.type === type);
    const current = typedPrefs[type] || { inApp: def?.defaultInApp ?? true, email: def?.defaultEmail ?? false };
    setTypedPrefs(p => ({ ...p, [type]: { ...current, [channel]: !current[channel] } }));
  };

  const toggleDay = (day: string) => {
    setDigestPrefs(p => ({
      ...p,
      days: p.days.includes(day) ? p.days.filter(d => d !== day) : [...p.days, day],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Section 1: Canais de Notificação ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Canais de Notificação</h2>
            <p className="text-xs text-gray-500">Escolhe como e quando queres ser notificado</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Email toggle */}
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-800">Notificações por email</p>
                <p className="text-xs text-gray-500">Receber alertas no teu endereço de email</p>
              </div>
            </div>
            <Toggle
              checked={channelPrefs.emailEnabled}
              onChange={() => setChannelPrefs(p => ({ ...p, emailEnabled: !p.emailEnabled }))}
            />
          </div>

          {/* In-app — always on */}
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-800">Notificações in-app</p>
                <p className="text-xs text-gray-500">Alertas dentro da plataforma (sempre ativo)</p>
              </div>
            </div>
            <Toggle checked disabled onChange={() => {}} />
          </div>

          {/* Frequency */}
          <div className="pt-1">
            <p className="text-sm font-medium text-gray-700 mb-3">Frequência de envio</p>
            <div className="flex flex-col sm:flex-row gap-2">
              {[
                { value: 'immediately', label: 'Imediatamente',     desc: 'Assim que ocorre' },
                { value: 'daily',       label: 'Resumo diário',      desc: 'Uma vez por dia' },
                { value: 'weekly',      label: 'Resumo semanal',     desc: 'Uma vez por semana' },
              ].map(opt => (
                <label
                  key={opt.value}
                  className={cn(
                    'flex items-start gap-2 flex-1 rounded-lg border p-3 cursor-pointer transition-colors',
                    channelPrefs.frequency === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300',
                  )}
                >
                  <input
                    type="radio"
                    name="frequency"
                    value={opt.value}
                    checked={channelPrefs.frequency === opt.value}
                    onChange={() => setChannelPrefs(p => ({ ...p, frequency: opt.value as ChannelPrefs['frequency'] }))}
                    className="mt-0.5 accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: Tipos de Notificação ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <Bell className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Tipos de Notificação</h2>
            <p className="text-xs text-gray-500">Configura cada tipo de alerta individualmente</p>
          </div>
        </div>

        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[1fr_auto_auto] gap-x-2 mb-2 px-3">
          <div />
          <div className="w-20 text-center text-xs font-semibold text-gray-500 flex items-center justify-center gap-1">
            <Mail className="w-3 h-3" /> Email
          </div>
          <div className="w-20 text-center text-xs font-semibold text-gray-500 flex items-center justify-center gap-1">
            <Smartphone className="w-3 h-3" /> In-app
          </div>
        </div>

        <div className="space-y-1">
          {NOTIFICATION_TYPES.slice(0, 7).map(t => {
            const p = typedPrefs[t.type] || { inApp: t.defaultInApp, email: t.defaultEmail };
            return (
              <div
                key={t.type}
                className="grid grid-cols-[1fr_auto_auto] gap-x-2 items-center px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{t.label}</p>
                  <p className="text-xs text-gray-500">{t.description}</p>
                </div>
                <div className="w-20 flex justify-center">
                  <Toggle checked={p.email} onChange={() => toggleType(t.type, 'email')} />
                </div>
                <div className="w-20 flex justify-center">
                  <Toggle checked={p.inApp} onChange={() => toggleType(t.type, 'inApp')} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 3: Resumo por Email ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <Clock className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Resumo por Email</h2>
            <p className="text-xs text-gray-500">Agenda o envio do resumo semanal</p>
          </div>
        </div>

        {channelPrefs.frequency !== 'weekly' && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-100 px-4 py-2.5 text-xs text-amber-700">
            Estas definições aplicam-se quando a frequência estiver definida como <strong>Resumo semanal</strong>.
          </div>
        )}

        {/* Days of week */}
        <div className="mb-5">
          <p className="text-sm font-medium text-gray-700 mb-3">Dias de envio</p>
          <div className="flex gap-2">
            {DAYS_OF_WEEK.map(d => (
              <button
                key={d.key}
                type="button"
                onClick={() => toggleDay(d.key)}
                className={cn(
                  'w-10 h-10 rounded-lg text-sm font-medium transition-colors border',
                  digestPrefs.days.includes(d.key)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time of day */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Hora de envio</p>
          <div className="flex flex-wrap gap-2">
            {TIME_OPTIONS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setDigestPrefs(p => ({ ...p, time: t }))}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                  digestPrefs.time === t
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Save button ── */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 shadow-sm transition-colors"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved ? 'Guardado!' : 'Guardar preferências'}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
        <strong>Nota:</strong> As notificações por email requerem que o SMTP esteja configurado no servidor. As notificações in-app são sempre entregues independentemente das preferências de email.
      </div>
    </div>
  );
}
