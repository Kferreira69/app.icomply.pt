'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { History, CheckCircle2 } from 'lucide-react';

interface VersionInfo {
  version: string;
  name: string;
  buildDate: string;
  environment: string;
}

interface ChangelogEntry {
  version: string;
  date: string;
  name: string;
  features: string[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v1.1.0',
    date: '2026-10-01',
    name: 'Sete novas normas, ISO 14001 no domínio ESG, Gestão Documental e Pesquisa global',
    features: [
      'Sete normas novas, cada uma com checklist completa, evidência por requisito, score e documentos próprios: ISO 22000 e ISO 13485 (Qualidade), ISO 20000-1 (Segurança), ISO 27018 (Privacidade), ISO 27036 (Terceiros), NIST AI RMF e ISO 23894 (IA)',
      'Objetivos ambientais ISO 14001 ligados às métricas ESG (CSRD/GRI): o valor atual é o da métrica, medido uma vez e reportado duas',
      'Site e aplicação ligados: catálogo público do que a aplicação oferece e receção de pedidos de demonstração e sugestões de funcionalidades (backoffice → Leads do site)',
      'Correção: "Inicializar métricas CSRD/GRI" no módulo ESG falhava sempre',
      'ISO 14001 (Gestão Ambiental) no domínio ESG & Sustentabilidade: checklist das cláusulas 4 a 10, aspetos e impactos ambientais com significância, objetivos e metas, requisitos legais com avaliação do cumprimento',
      'Gestão Documental por norma ISO (9001, 14001, 45001, 27001, 22301, 37001, 27701, 42001 e as sete novas normas): ficheiros reais com versões, aprovação e separação de funções',
      'Anexos nas Políticas (Word, PDF…) com histórico de versões e aprovação',
      'Pesquisa global (Ctrl+K): encontra qualquer palavra do conteúdo, ignora acentos, tolera erros e sugere assuntos relacionados; nova página de resultados com filtros',
      'Ao abrir um resultado da pesquisa, a página destaca o item',
      'Correção: páginas Anti-Bribery e TISAX apresentavam as listas vazias',
      'Segurança: as atualizações de Anti-Bribery e TISAX só aceitam campos permitidos e ficam restritas à organização',
    ],
  },
  {
    version: 'v1.0.0',
    date: '2026-06-13',
    name: 'Lançamento MVP',
    features: [
      'Dashboard executivo',
      'Gestão de riscos',
      'Gestão de projetos',
      'Gestão de tarefas',
      'Controlo de evidências',
      'Relatórios (PDF/Excel)',
      'Centro de confiança público',
      'Módulo GDPR',
      'Módulo NIS2',
      'Módulo ISO27701',
      'Módulo DORA',
      'Matriz RACI',
      'Painel de aprovações',
      'Formulários de intake',
      'Motor de automações',
      'Portal de auditores',
      'Gestão de fornecedores',
      'Módulo ESG',
      'Continuidade de negócio',
      'Assistente de IA',
      'Avatar de utilizador',
    ],
  },
  {
    version: 'v0.9.0',
    date: '2026-05-15',
    name: 'Beta Fechado',
    features: [
      'Autenticação 2FA',
      'SSO (SAML/OIDC)',
      'Gestão de utilizadores e roles',
      'Notificações em tempo real',
      'Upload de evidências (MinIO S3)',
      'Relatórios agendados',
      'Módulo de compliance GDPR básico',
    ],
  },
  {
    version: 'v0.8.0',
    date: '2026-04-01',
    name: 'Alpha',
    features: [
      'Estrutura base da plataforma',
      'Base de dados Prisma',
      'API NestJS',
      'Frontend Next.js 14',
      'Deploy VPS com Docker',
    ],
  },
];

export default function ChangelogPage() {
  const { data: versionInfo } = useQuery<VersionInfo>({
    queryKey: ['version'],
    queryFn: () => api.get<VersionInfo>('/health/version').then(r => r.data),
    staleTime: 1000 * 60 * 60,
  });

  const currentVersion = versionInfo?.version ? `v${versionInfo.version}` : 'v1.0.0';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <History className="w-5 h-5 text-blue-800" />
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Histórico de Versões</h1>
          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-800 text-white">
            {currentVersion}
          </span>
        </div>
      </div>

      {/* Changelog entries */}
      <div className="space-y-6">
        {CHANGELOG.map((entry, index) => {
          const isLatest = index === 0;
          return (
            <div
              key={entry.version}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Card header */}
              <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100">
                <span
                  className="px-3 py-1 rounded-full text-sm font-bold"
                  style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}
                >
                  {entry.version}
                </span>
                <span className="text-sm text-gray-500">{entry.date}</span>
                <span className="text-sm font-semibold text-gray-700">{entry.name}</span>
                {isLatest && (
                  <span className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Atual
                  </span>
                )}
              </div>

              {/* Features */}
              <div className="px-6 py-4">
                <div className="flex flex-wrap gap-2">
                  {entry.features.map(feature => (
                    <span
                      key={feature}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-100"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      {versionInfo && (
        <p className="mt-8 text-center text-xs text-gray-400">
          iComply OS {versionInfo.version} · Build {versionInfo.buildDate} · {versionInfo.environment}
        </p>
      )}
    </div>
  );
}
