'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { Bell, Mail, Smartphone, Loader2, CheckCircle, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

const NOTIFICATION_TYPES = [
  { type: 'TASK_DUE_SOON',       label: 'Tarefas com prazo próximo (3 dias)',         category: 'tasks',    severity: 'medium'   },
  { type: 'TASK_OVERDUE',        label: 'Tarefas em atraso',                          category: 'tasks',    severity: 'high'     },
  { type: 'CAPA_DUE_SOON',       label: 'CAPAs com prazo próximo (7 dias)',           category: 'capa',     severity: 'medium'   },
  { type: 'CAPA_OVERDUE',        label: 'CAPAs em atraso',                            category: 'capa',     severity: 'critical' },
  { type: 'RISK_HIGH',           label: 'Riscos altos/críticos sem tratamento',       category: 'risks',    severity: 'critical' },
  { type: 'RISK_NO_TREATMENT',   label: 'Riscos altos sem plano de tratamento',       category: 'risks',    severity: 'high'     },
  { type: 'EVIDENCE_EXPIRING',   label: 'Evidências a expirar (30 dias)',             category: 'evidence', severity: 'medium'   },
  { type: 'POLICY_REVIEW',       label: 'Políticas a necessitar de revisão (14 dias)', category: 'policies', severity: 'medium'  },
  { type: 'VENDOR_EXPIRY',       label: 'Contratos de fornecedor a expirar (30 dias)', category: 'vendors', severity: 'medium'  },
  { type: 'AUDIT_FINDING',       label: 'Findings de auditoria por resolver',         category: 'audits',   severity: 'high'    },
];

const CATEGORIES: Record<string, string> = {
  tasks: 'Tarefas & Projetos', capa: 'CAPA', risks: 'Riscos',
  evidence: 'Evidências', policies: 'Políticas', vendors: 'Fornecedores', audits: 'Auditorias',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-red-600',
  high:     'text-orange-600',
  medium:   'text-yellow-600',
};

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-yellow-500',
};

export default function NotificationPreferencesPage() {
  const qc = useQueryClient();
  const [prefs, setPrefs] = useState<Record<string, { inApp: boolean; email: boolean }>>({});
  const [saved, setSaved]   = useState(false);

  const { data: currentPrefs, isLoading } = useQuery({
    queryKey: ['notification-prefs'],
    queryFn: () => notificationsApi.getPreferences().then(r => r.data),
  });

  useEffect(() => {
    if (currentPrefs && Array.isArray(currentPrefs)) {
      const map: Record<string, { inApp: boolean; email: boolean }> = {};
      for (const p of currentPrefs) map[p.type] = { inApp: p.inApp, email: p.email };
      setPrefs(map);
    }
  }, [currentPrefs]);

  const saveMutation = useMutation({
    mutationFn: () => notificationsApi.updatePreferences(
      NOTIFICATION_TYPES.map(t => ({ type: t.type, ...(prefs[t.type] || { inApp: true, email: false }) }))
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-prefs'] });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    },
  });

  const toggle = (type: string, channel: 'inApp' | 'email') => {
    setPrefs(p => ({ ...p, [type]: { ...(p[type] || { inApp: true, email: false }), [channel]: !p[type]?.[channel] } }));
  };

  const byCategory = NOTIFICATION_TYPES.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, typeof NOTIFICATION_TYPES>);

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Preferências de Notificações</h2>
              <p className="text-xs text-gray-500">Controla que alertas recebe e por que canal</p>
            </div>
          </div>
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Guardado!' : 'Guardar'}
          </button>
        </div>

        {/* Column headers */}
        <div className="flex items-center gap-2 mb-3 px-3">
          <div className="flex-1" />
          <div className="w-24 flex items-center justify-center gap-1 text-xs font-medium text-gray-500">
            <Smartphone className="w-3.5 h-3.5" /> In-app
          </div>
          <div className="w-24 flex items-center justify-center gap-1 text-xs font-medium text-gray-500">
            <Mail className="w-3.5 h-3.5" /> Email
          </div>
        </div>

        <div className="space-y-5">
          {Object.entries(byCategory).map(([cat, types]) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 mb-2">{CATEGORIES[cat] || cat}</p>
              <div className="space-y-1">
                {types.map(t => {
                  const p = prefs[t.type] || { inApp: true, email: false };
                  return (
                    <div key={t.type} className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-gray-50">
                      <div className={cn('w-2 h-2 rounded-full flex-shrink-0', SEVERITY_DOT[t.severity])} />
                      <span className="text-sm text-gray-700 flex-1">{t.label}</span>
                      {/* In-app toggle */}
                      <div className="w-24 flex justify-center">
                        <button onClick={() => toggle(t.type, 'inApp')}
                          className={cn('w-9 h-5 rounded-full relative transition-colors duration-200',
                            p.inApp ? 'bg-primary' : 'bg-gray-200')}>
                          <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
                            p.inApp ? 'translate-x-4' : 'translate-x-0.5')} />
                        </button>
                      </div>
                      {/* Email toggle */}
                      <div className="w-24 flex justify-center">
                        <button onClick={() => toggle(t.type, 'email')}
                          className={cn('w-9 h-5 rounded-full relative transition-colors duration-200',
                            p.email ? 'bg-primary' : 'bg-gray-200')}>
                          <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
                            p.email ? 'translate-x-4' : 'translate-x-0.5')} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" />Crítico</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500" />Alto</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500" />Médio</span>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
        <strong>Nota:</strong> As notificações por email requerem que o SMTP esteja configurado no servidor. As notificações in-app são sempre entregues independentemente.
      </div>
    </div>
  );
}
