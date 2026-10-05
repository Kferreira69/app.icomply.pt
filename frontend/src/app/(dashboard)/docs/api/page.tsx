'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ExternalLink, ChevronRight, Lock, Key, Copy, Check,
  Zap, Shield, FileText, Users, AlertTriangle, Target,
  BookOpen, BarChart3, Server, Settings, ClipboardList,
  Search, FolderKanban,
} from 'lucide-react';

const SWAGGER_URL = 'https://api.icomply.pt/api/docs';
const BASE = 'https://api.icomply.pt/api/v1';

function CopyCode({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

const ENDPOINT_GROUPS = [
  {
    tag: 'Auth',
    icon: Lock,
    color: 'text-red-600 bg-red-50 border-red-100',
    desc: 'Autenticação, tokens e 2FA',
    endpoints: [
      { method: 'POST',  path: '/auth/login',           desc: 'Login → devolve access_token + refresh_token' },
      { method: 'POST',  path: '/auth/logout',          desc: 'Invalidar tokens (blacklist)' },
      { method: 'POST',  path: '/auth/refresh',         desc: 'Renovar access_token via refresh_token' },
      { method: 'GET',   path: '/auth/me',              desc: 'Perfil do utilizador autenticado' },
      { method: 'PATCH', path: '/auth/change-password', desc: 'Alterar password (autenticado)' },
      { method: 'POST',  path: '/auth/forgot-password', desc: 'Enviar email de recuperação' },
      { method: 'POST',  path: '/auth/reset-password',  desc: 'Redefinir password com token' },
      { method: 'POST',  path: '/auth/accept-invite',   desc: 'Aceitar convite de organização' },
      { method: 'GET',   path: '/auth/2fa/status',      desc: 'Estado do 2FA' },
      { method: 'POST',  path: '/auth/2fa/setup',       desc: 'Iniciar setup TOTP' },
      { method: 'POST',  path: '/auth/2fa/verify',      desc: 'Verificar e activar TOTP' },
      { method: 'POST',  path: '/auth/2fa/disable',     desc: 'Desactivar 2FA' },
    ],
  },
  {
    tag: 'Organizations',
    icon: Users,
    color: 'text-blue-600 bg-blue-50 border-blue-100',
    desc: 'Gestão de organizações (multi-tenant)',
    endpoints: [
      { method: 'GET',   path: '/organizations/my',           desc: 'Organização do utilizador actual' },
      { method: 'GET',   path: '/organizations/my/dashboard', desc: 'KPIs do dashboard executivo' },
      { method: 'PATCH', path: '/organizations/my',           desc: 'Actualizar dados da organização' },
      { method: 'GET',   path: '/users',                      desc: 'Listar utilizadores (org actual)' },
      { method: 'POST',  path: '/users',                      desc: 'Convidar utilizador' },
      { method: 'PATCH', path: '/users/:id',                  desc: 'Actualizar utilizador' },
      { method: 'PATCH', path: '/users/:id/suspend',          desc: 'Suspender utilizador' },
      { method: 'POST',  path: '/users/me/avatar',            desc: 'Upload foto de perfil (multipart)' },
    ],
  },
  {
    tag: 'Risks',
    icon: AlertTriangle,
    color: 'text-orange-600 bg-orange-50 border-orange-100',
    desc: 'Registo de riscos — ISO 27001 / NIS2',
    endpoints: [
      { method: 'GET',   path: '/risks',                desc: 'Listar riscos (filtros: level, status, framework)' },
      { method: 'POST',  path: '/risks',                desc: 'Criar risco' },
      { method: 'GET',   path: '/risks/heatmap',        desc: 'Dados da matriz 5×5 (Probabilidade × Impacto)' },
      { method: 'GET',   path: '/risks/:id',            desc: 'Detalhe de risco' },
      { method: 'PATCH', path: '/risks/:id',            desc: 'Actualizar risco' },
      { method: 'GET',   path: '/risks/:id/history',    desc: 'Histórico de alterações' },
      { method: 'PATCH', path: '/risks/:id/treatment',  desc: 'Actualizar plano de tratamento' },
      { method: 'POST',  path: '/risks/:id/accept',     desc: 'Aceitar risco (risk acceptance)' },
    ],
  },
  {
    tag: 'Tasks',
    icon: Target,
    color: 'text-green-600 bg-green-50 border-green-100',
    desc: 'Gestão de tarefas e planos de acção',
    endpoints: [
      { method: 'GET',    path: '/tasks',                               desc: 'Listar tarefas (filtros: assignee, status, priority, project)' },
      { method: 'POST',   path: '/tasks',                               desc: 'Criar tarefa' },
      { method: 'GET',    path: '/tasks/:id',                           desc: 'Detalhe de tarefa' },
      { method: 'PATCH',  path: '/tasks/:id',                           desc: 'Actualizar tarefa' },
      { method: 'POST',   path: '/tasks/:id/comments',                  desc: 'Adicionar comentário' },
      { method: 'PATCH',  path: '/tasks/bulk/status',                   desc: 'Actualizar status em bloco' },
      { method: 'POST',   path: '/tasks/:id/dependencies',              desc: 'Adicionar dependência' },
      { method: 'DELETE', path: '/tasks/:id/dependencies/:blockingId',  desc: 'Remover dependência' },
    ],
  },
  {
    tag: 'Evidence',
    icon: FileText,
    color: 'text-purple-600 bg-purple-50 border-purple-100',
    desc: 'Evidências e documentos de conformidade',
    endpoints: [
      { method: 'POST',  path: '/evidence/upload',     desc: 'Upload de evidência (multipart/form-data → MinIO)' },
      { method: 'GET',   path: '/evidence',            desc: 'Listar evidências' },
      { method: 'GET',   path: '/evidence/gap-analysis', desc: 'Análise de lacunas por controlo' },
      { method: 'GET',   path: '/evidence/:id',        desc: 'Detalhe / URL de download' },
      { method: 'PATCH', path: '/evidence/:id/status', desc: 'Aprovar / rejeitar evidência' },
      { method: 'PATCH', path: '/evidence/bulk/status', desc: 'Aprovar / rejeitar em bloco' },
    ],
  },
  {
    tag: 'Controls',
    icon: Settings,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-100',
    desc: 'Controlos e frameworks de conformidade',
    endpoints: [
      { method: 'GET',   path: '/controls',              desc: 'Listar controlos (filtro: frameworkId, status)' },
      { method: 'GET',   path: '/controls/:id',          desc: 'Detalhe de controlo' },
      { method: 'PATCH', path: '/controls/:id/status',   desc: 'Actualizar status (implemented, partial, etc.)' },
      { method: 'GET',   path: '/frameworks',            desc: 'Listar frameworks (ISO 27001, NIS2, RGPD…)' },
      { method: 'GET',   path: '/frameworks/:id',        desc: 'Detalhe do framework' },
      { method: 'GET',   path: '/frameworks/:id/controls', desc: 'Controlos do framework' },
    ],
  },
  {
    tag: 'Diagnostics',
    icon: Search,
    color: 'text-teal-600 bg-teal-50 border-teal-100',
    desc: 'Questionário de diagnóstico de maturidade',
    endpoints: [
      { method: 'GET',  path: '/diagnostics/questions',      desc: 'Perguntas do questionário (agrupadas por domínio)' },
      { method: 'POST', path: '/diagnostics/runs',           desc: 'Iniciar nova avaliação' },
      { method: 'GET',  path: '/diagnostics/runs',           desc: 'Listar avaliações anteriores' },
      { method: 'GET',  path: '/diagnostics/runs/:id',       desc: 'Resultado e score de uma avaliação' },
      { method: 'POST', path: '/diagnostics/runs/:id/answers', desc: 'Submeter respostas' },
    ],
  },
  {
    tag: 'Projects',
    icon: FolderKanban,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    desc: 'Projetos e Gantt',
    endpoints: [
      { method: 'GET',   path: '/projects',        desc: 'Listar projetos' },
      { method: 'POST',  path: '/projects',        desc: 'Criar projeto' },
      { method: 'GET',   path: '/projects/gantt',  desc: 'Dados Gantt (tarefas + dependências + datas)' },
      { method: 'GET',   path: '/projects/:id',    desc: 'Detalhe do projeto' },
      { method: 'GET',   path: '/projects/:id/stats', desc: 'Estatísticas (progresso, tarefas por status)' },
      { method: 'PATCH', path: '/projects/:id',    desc: 'Actualizar projeto' },
    ],
  },
  {
    tag: 'Reports',
    icon: BarChart3,
    color: 'text-pink-600 bg-pink-50 border-pink-100',
    desc: 'Relatórios executivos e exportações',
    endpoints: [
      { method: 'GET',    path: '/reports/summary',         desc: 'Score geral + métricas de conformidade' },
      { method: 'POST',   path: '/reports/generate',        desc: 'Gerar relatório (PDF / Excel)' },
      { method: 'GET',    path: '/reports',                 desc: 'Listar relatórios gerados' },
      { method: 'GET',    path: '/reports/:id',             desc: 'Detalhe do relatório' },
      { method: 'GET',    path: '/reports/:id/download',    desc: 'Download do ficheiro gerado' },
      { method: 'GET',    path: '/reports/schedules/list',  desc: 'Listar relatórios agendados' },
      { method: 'POST',   path: '/reports/schedules',       desc: 'Criar agendamento' },
      { method: 'PUT',    path: '/reports/schedules/:id',   desc: 'Actualizar agendamento' },
      { method: 'DELETE', path: '/reports/schedules/:id',   desc: 'Remover agendamento' },
    ],
  },
  {
    tag: 'iGuard',
    icon: Shield,
    color: 'text-blue-700 bg-blue-50 border-blue-100',
    desc: 'Agente de conformidade de dispositivos e sondas de rede',
    endpoints: [
      { method: 'GET',    path: '/iguard/stats',              desc: 'Estatísticas globais (dispositivos, score médio)' },
      { method: 'GET',    path: '/iguard/devices',            desc: 'Listar dispositivos da organização' },
      { method: 'GET',    path: '/iguard/devices/mine',       desc: 'Dispositivo do utilizador actual' },
      { method: 'POST',   path: '/iguard/devices/register',   desc: 'Registar dispositivo (chamado pelo agente)' },
      { method: 'POST',   path: '/iguard/report',             desc: 'Submeter relatório de conformidade (agente)' },
      { method: 'GET',    path: '/iguard/devices/:id',        desc: 'Detalhe de dispositivo' },
      { method: 'DELETE', path: '/iguard/devices/:id',        desc: 'Revogar dispositivo' },
      { method: 'GET',    path: '/iguard/probes',             desc: 'Listar sondas de rede' },
      { method: 'POST',   path: '/iguard/probes',             desc: 'Criar sonda de rede' },
      { method: 'DELETE', path: '/iguard/probes/:id',         desc: 'Remover sonda' },
      { method: 'GET',    path: '/iguard/probes/:id/devices', desc: 'Dispositivos descobertos pela sonda' },
      { method: 'POST',   path: '/iguard/probe-report',       desc: 'Submeter relatório de sonda (agente servidor)' },
    ],
  },
  {
    tag: 'Audits',
    icon: ClipboardList,
    color: 'text-amber-600 bg-amber-50 border-amber-100',
    desc: 'Auditorias e CAPA',
    endpoints: [
      { method: 'GET',   path: '/audits',                              desc: 'Listar auditorias' },
      { method: 'POST',  path: '/audits',                              desc: 'Criar auditoria' },
      { method: 'GET',   path: '/audits/:id',                          desc: 'Detalhe de auditoria' },
      { method: 'PATCH', path: '/audits/:id',                          desc: 'Actualizar auditoria' },
      { method: 'PATCH', path: '/audits/:id/status',                   desc: 'Mudar estado (planned → in_progress → completed)' },
      { method: 'POST',  path: '/audits/:id/findings',                 desc: 'Adicionar não-conformidade' },
      { method: 'PATCH', path: '/audits/:auditId/findings/:findingId', desc: 'Actualizar não-conformidade' },
      { method: 'GET',   path: '/capa',                                desc: 'Listar acções CAPA' },
      { method: 'POST',  path: '/capa',                                desc: 'Criar acção CAPA' },
      { method: 'GET',   path: '/capa/:id',                            desc: 'Detalhe de acção CAPA' },
      { method: 'PATCH', path: '/capa/:id',                            desc: 'Actualizar acção CAPA' },
    ],
  },
  {
    tag: 'Support Tickets',
    icon: Search,
    color: 'text-rose-700 bg-rose-50 border-rose-100',
    desc: 'Pedidos de suporte: o autor vê os seus; a equipa de suporte (SUPPORT / SUPER_ADMIN da plataforma) vê todos. Cada novo ticket e resposta notifica por email.',
    endpoints: [
      { method: 'POST',  path: '/support-tickets',                          desc: 'Abrir pedido (notifica a equipa de suporte por email)' },
      { method: 'GET',   path: '/support-tickets',                          desc: 'Listar (autor: os seus; suporte: todos; filtro status)' },
      { method: 'GET',   path: '/support-tickets/stats',                    desc: 'Contagens por estado (só suporte)' },
      { method: 'GET',   path: '/support-tickets/:id',                      desc: 'Detalhe; as notas internas só aparecem ao suporte' },
      { method: 'POST',  path: '/support-tickets/:id/replies',              desc: 'Responder (suporte pode marcar nota interna); notifica a outra parte' },
      { method: 'DELETE', path: '/support-tickets/:id',                     desc: 'Apagar um ticket aberto por uma conta de teste automático (suporte ou a própria conta de teste; nunca tickets de clientes)' },
      { method: 'PATCH', path: '/support-tickets/:id',                      desc: 'Suporte: estado, prioridade, atribuição (só a membros da equipa)' },
      { method: 'POST',  path: '/support-tickets/:id/attachments',          desc: 'Anexar ficheiro (autor ou suporte)' },
      { method: 'GET',   path: '/support-tickets/attachments/:id/download', desc: 'Descarregar anexo (mesma visibilidade do ticket)' },
    ],
  },
  {
    tag: 'Identity Verification (KYC)',
    icon: Search,
    color: 'text-violet-700 bg-violet-50 border-violet-100',
    desc: 'KYC / KYB / sanções: modo manual sempre disponível; automático com fornecedor + condições aceites',
    endpoints: [
      { method: 'GET',   path: '/identity-verification',                  desc: 'Listar pedidos (filtro status)' },
      { method: 'GET',   path: '/identity-verification/providers',        desc: 'Modo (MANUAL / AUTOMATED), fornecedores, condições comerciais e consumo do mês' },
      { method: 'PUT',   path: '/identity-verification/provider',         desc: 'Escolher o fornecedor da organização' },
      { method: 'POST',  path: '/identity-verification/terms/accept',     desc: 'Administrador aceita a versão das condições (taxa de arranque + PAYG)' },
      { method: 'POST',  path: '/identity-verification/individual',       desc: 'Pedido de verificação de pessoa' },
      { method: 'POST',  path: '/identity-verification/business',         desc: 'Pedido de verificação de empresa' },
      { method: 'POST',  path: '/identity-verification/sanctions-screening', desc: 'Rastreio de sanções / PEP' },
      { method: 'PATCH', path: '/identity-verification/:id/decision',     desc: 'Decisão humana (APPROVED / REJECTED + fundamentação)' },
      { method: 'PUT',   path: '/identity-verification/admin/:orgId/terms', desc: 'Backoffice: propor condições comerciais a um cliente' },
      { method: 'PUT',   path: '/identity-verification/admin/:orgId/routing', desc: 'Backoffice: fornecedor por funcionalidade (individual / business / sanctions / default) para um cliente' },
      { method: 'PUT',   path: '/identity-verification/admin/routing/all', desc: 'Backoffice: o mesmo, para todos os clientes de uma vez' },
      { method: 'POST',  path: '/identity-verification/webhook/:provider', desc: 'Webhook do fornecedor (autenticado pela assinatura sobre o corpo bruto)' },
    ],
  },
  {
    tag: 'Search',
    icon: Search,
    color: 'text-sky-600 bg-sky-50 border-sky-100',
    desc: 'Pesquisa global em todos os módulos a que o utilizador tem acesso',
    endpoints: [
      { method: 'GET', path: '/search?q=&limit=', desc: 'Pesquisa sem acentos/maiúsculas, tolerante a erros; resultados em 3 níveis: exact, partial, related' },
    ],
  },
  {
    tag: 'Standards (checklists por norma)',
    icon: Target,
    color: 'text-blue-700 bg-blue-50 border-blue-100',
    desc: 'Motor genérico: ISO 22000, ISO 13485, ISO 20000-1, ISO 27018, ISO 27036, NIST AI RMF, ISO 23894',
    endpoints: [
      { method: 'GET',   path: '/standards',                          desc: 'Normas visíveis para o utilizador, com progresso e se pode escrever' },
      { method: 'GET',   path: '/standards/:key',                     desc: 'Checklist da norma (criada na 1.ª visita) e totais' },
      { method: 'PATCH', path: '/standards/:key/requirements/:id',    desc: 'Atualizar estado, evidência, notas, responsável e prazo de um requisito' },
    ],
  },
  {
    tag: 'Public (site)',
    icon: Search,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    desc: 'Endpoints sem autenticação para o website: catálogo do produto e receção de leads',
    endpoints: [
      { method: 'GET',  path: '/public/catalog',      desc: 'Domínios, normas (available / partial / roadmap) e funcionalidades da plataforma' },
      { method: 'POST', path: '/public/leads',        desc: 'Demonstração, contacto, sugestão de funcionalidade ou novidades (consentimento obrigatório; 5 por 10 min por IP)' },
      { method: 'GET',  path: '/backoffice/leads',    desc: 'Backoffice (super-admin): listar leads por estado/tipo' },
      { method: 'PATCH', path: '/backoffice/leads/:id', desc: 'Backoffice (super-admin): estado e notas do lead' },
      { method: 'DELETE', path: '/backoffice/leads/:id', desc: 'Backoffice (super-admin): apagar um lead (RGPD)' },
      { method: 'POST', path: '/backoffice/leads/erase', desc: 'Backoffice (super-admin): apagar todos os leads de um email (corpo: {email}; pedido de apagamento)' },
    ],
  },
  {
    tag: 'Environment (ISO 14001)',
    icon: Target,
    color: 'text-lime-700 bg-lime-50 border-lime-100',
    desc: 'Sistema de gestão ambiental — requisitos, aspetos e impactos, objetivos e requisitos legais',
    endpoints: [
      { method: 'GET',    path: '/environment/dashboard',         desc: 'Score ISO 14001, checklist de cláusulas e totais (semeia a lista na 1.ª visita)' },
      { method: 'PATCH',  path: '/environment/requirements/:id',  desc: 'Atualizar estado, evidência e notas de uma cláusula' },
      { method: 'GET',    path: '/environment/aspects',           desc: 'Listar aspetos e impactos ambientais (significativos primeiro)' },
      { method: 'POST',   path: '/environment/aspects',           desc: 'Criar aspeto (severidade × probabilidade → significância)' },
      { method: 'PATCH',  path: '/environment/aspects/:id',       desc: 'Atualizar aspeto (recalcula a significância)' },
      { method: 'DELETE', path: '/environment/aspects/:id',       desc: 'Eliminar aspeto' },
      { method: 'GET',    path: '/environment/esg-metrics',       desc: 'Métricas ESG que podem ser ligadas a um objetivo (requer acesso ao módulo ESG)' },
      { method: 'GET',    path: '/environment/objectives',        desc: 'Listar objetivos e metas (com esgMetricId e valor efetivo quando ligados a uma métrica ESG)' },
      { method: 'POST',   path: '/environment/objectives',        desc: 'Criar objetivo (indicador, valor de partida, meta, prazo)' },
      { method: 'PATCH',  path: '/environment/objectives/:id',    desc: 'Atualizar objetivo / valor atual' },
      { method: 'DELETE', path: '/environment/objectives/:id',    desc: 'Eliminar objetivo' },
      { method: 'GET',    path: '/environment/obligations',       desc: 'Listar requisitos legais e outros requisitos' },
      { method: 'POST',   path: '/environment/obligations',       desc: 'Criar requisito legal' },
      { method: 'PATCH',  path: '/environment/obligations/:id',   desc: 'Atualizar requisito / avaliar cumprimento' },
      { method: 'DELETE', path: '/environment/obligations/:id',   desc: 'Eliminar requisito legal' },
    ],
  },
  {
    tag: 'Quality Documents (Gestão Documental)',
    icon: FileText,
    color: 'text-cyan-700 bg-cyan-50 border-cyan-100',
    desc: 'Documentos controlados por norma ISO, com versões (ficheiro real) e aprovação',
    endpoints: [
      { method: 'GET',    path: '/quality-documents/standards',     desc: 'Normas visíveis para o utilizador e se pode alterá-las' },
      { method: 'GET',    path: '/quality-documents?standard=',     desc: 'Listar documentos (filtros: standard, clause, status, docType); inclui os partilhados com a norma e canWrite por documento' },
      { method: 'POST',   path: '/quality-documents',               desc: 'Criar documento + ficheiro (multipart; standard, clause, title…; alsoStandards = outras normas a que também se aplica)' },
      { method: 'GET',    path: '/quality-documents/:id',           desc: 'Detalhe e histórico de versões' },
      { method: 'GET',    path: '/quality-documents/:id/file',      desc: 'Descarregar a versão atual (ou ?versionId=)' },
      { method: 'POST',   path: '/quality-documents/:id/versions',  desc: 'Carregar nova versão (volta a rascunho)' },
      { method: 'POST',   path: '/quality-documents/:id/submit',    desc: 'Submeter para revisão' },
      { method: 'POST',   path: '/quality-documents/:id/approve',   desc: 'Aprovar (quem carregou a versão não pode aprovar)' },
      { method: 'POST',   path: '/quality-documents/:id/obsolete',  desc: 'Marcar como obsoleto' },
      { method: 'POST',   path: '/quality-documents/:id/revert',    desc: 'Voltar a rascunho' },
      { method: 'DELETE', path: '/quality-documents/:id',           desc: 'Eliminar documento e versões' },
    ],
  },
];

const METHOD_COLOR: Record<string, string> = {
  GET:    'bg-green-100 text-green-700',
  POST:   'bg-blue-100 text-blue-700',
  PATCH:  'bg-amber-100 text-amber-700',
  PUT:    'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
};

export default function ApiDocsPage() {
  const [filter, setFilter] = useState('');

  const filtered = filter.trim()
    ? ENDPOINT_GROUPS.map(g => ({
        ...g,
        endpoints: g.endpoints.filter(
          e => e.path.toLowerCase().includes(filter.toLowerCase()) ||
               e.desc.toLowerCase().includes(filter.toLowerCase()),
        ),
      })).filter(g => g.endpoints.length > 0 ||
        g.tag.toLowerCase().includes(filter.toLowerCase()))
    : ENDPOINT_GROUPS;

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-2">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <Link href="/help" className="hover:text-gray-600">Ajuda</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/docs/iguard" className="hover:text-gray-600">Docs</Link>
          <ChevronRight className="w-3 h-3" />
          <span>API</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">iComply REST API</h1>
            <p className="text-gray-500 mt-1">
              API RESTful com autenticação JWT · Base URL:{' '}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{BASE}</code>
            </p>
          </div>
          <a
            href={SWAGGER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 bg-blue-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Zap className="w-4 h-4" /> Swagger UI
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
        </div>
      </div>

      {/* Auth banner */}
      <div className="bg-gray-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-5 h-5 text-yellow-400" />
          <h2 className="font-semibold">Autenticação JWT</h2>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Todas as rotas requerem{' '}
          <code className="text-gray-200 font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded">Authorization: Bearer &lt;token&gt;</code>{' '}
          excepto <code className="text-gray-200 font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded">/auth/login</code>,{' '}
          <code className="text-gray-200 font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded">/auth/refresh</code>,{' '}
          <code className="text-gray-200 font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded">/auth/forgot-password</code> e{' '}
          <code className="text-gray-200 font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded">/auth/reset-password</code>.
        </p>

        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">1. Obter token</p>
        <div className="relative bg-gray-950 rounded-xl p-4 mb-4 font-mono text-xs text-gray-300">
          <CopyCode text={`curl -X POST ${BASE}/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@empresa.pt","password":"••••••••"}'`} />
          {`curl -X POST ${BASE}/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@empresa.pt","password":"••••••••"}'`}
        </div>

        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">2. Usar o token</p>
        <div className="relative bg-gray-950 rounded-xl p-4 font-mono text-xs text-gray-300">
          <CopyCode text={`curl ${BASE}/risks \\
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"`} />
          {`curl ${BASE}/risks \\
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"`}
        </div>
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total de endpoints', value: '98', desc: '11 módulos', icon: Zap, color: 'text-blue-600' },
          { label: 'Versão da API', value: 'v1', desc: 'Estável — sem breaking changes', icon: Server, color: 'text-green-600' },
          { label: 'Autenticação 2FA', value: 'TOTP', desc: 'Google Authenticator / Authy', icon: BookOpen, color: 'text-purple-600' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3">
              <div className={`shrink-0 mt-0.5 ${item.color}`}><Icon className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="font-semibold text-gray-900">{item.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Filtrar endpoints… ex: risks, /auth, upload"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>

      {/* Endpoints by group */}
      <div className="space-y-4">
        {filtered.map(group => {
          const Icon = group.icon;
          return (
            <div key={group.tag} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${group.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-gray-900 text-sm">{group.tag}</span>
                  <span className="text-xs text-gray-400 ml-2">{group.desc}</span>
                </div>
                <a
                  href={`${SWAGGER_URL}#tag/${group.tag}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Swagger <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="divide-y divide-gray-50">
                {group.endpoints.map(ep => (
                  <div key={ep.method + ep.path} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50/50 transition-colors">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono w-14 text-center shrink-0 ${METHOD_COLOR[ep.method] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ep.method}
                    </span>
                    <code className="text-xs font-mono text-gray-700 shrink-0">{ep.path}</code>
                    <span className="text-xs text-gray-400 ml-auto text-right hidden md:block">{ep.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Swagger CTA */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-white">
          <p className="font-semibold text-lg">Testar a API no browser</p>
          <p className="text-blue-100 text-sm mt-1">
            O Swagger UI permite autenticar com o teu JWT e executar qualquer endpoint directamente.
          </p>
        </div>
        <a
          href={SWAGGER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-2 bg-white text-blue-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors"
        >
          <Zap className="w-4 h-4" /> Abrir Swagger UI
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </a>
      </div>
    </div>
  );
}
