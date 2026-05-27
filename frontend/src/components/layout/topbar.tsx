'use client';

import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { NotificationBell } from '@/components/notifications/notification-bell';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/diagnostic': 'Diagnóstico de Conformidade',
  '/projects': 'Projetos de Conformidade',
  '/tasks': 'Gestão de Tarefas',
  '/risks': 'Registo de Riscos',
  '/evidence': 'Gestão de Evidências',
  '/audits': 'Auditorias',
  '/capa': 'Ações Corretivas (CAPA)',
  '/reports': 'Relatórios',
  '/excel-import': 'Importar Excel',
  '/settings/organization': 'Organização',
  '/settings/users': 'Utilizadores',
  '/settings/trust-center': 'Trust Center',
  '/settings/translations': 'Traduções',
  '/denuncias': 'Canal de Denúncias',
  '/vendors': 'Fornecedores',
  '/soa': 'SoA ISO 27001',
  '/dora': 'DORA',
  '/policies': 'Políticas',
  '/gdpr': 'GDPR / ROPA',
  '/nis2': 'NIS2',
  '/ai-assistant': 'Assistente IA de Conformidade',
};

export function Topbar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const title = Object.entries(pageTitles).find(([k]) =>
    pathname === k || pathname.startsWith(k + '/')
  )?.[1] || 'iComply';

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-4">
        <NotificationBell />
        {user && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-white">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500">{user.organization?.name}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
