'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ExternalLink, ChevronRight, Lock, Key, Copy, Check,
  Zap, Shield, FileText, Users, AlertTriangle, Target,
  BookOpen, BarChart3, Server,
} from 'lucide-react';

const SWAGGER_URL = 'https://api.icomply.pt/api/docs';

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
    desc: 'Autenticação e autorização',
    endpoints: [
      { method: 'POST', path: '/api/v1/auth/login', desc: 'Login com email + password → JWT' },
      { method: 'POST', path: '/api/v1/auth/refresh', desc: 'Renovar token via refresh token' },
      { method: 'POST', path: '/api/v1/auth/logout', desc: 'Invalidar tokens' },
      { method: 'GET',  path: '/api/v1/auth/me', desc: 'Perfil do utilizador autenticado' },
    ],
  },
  {
    tag: 'Organizations',
    icon: Users,
    color: 'text-blue-600 bg-blue-50 border-blue-100',
    desc: 'Gestão de organizações (multi-tenant)',
    endpoints: [
      { method: 'GET',   path: '/api/v1/organizations/dashboard', desc: 'Dashboard KPIs' },
      { method: 'GET',   path: '/api/v1/organizations/me', desc: 'Organização actual' },
      { method: 'PATCH', path: '/api/v1/organizations/me', desc: 'Actualizar organização' },
    ],
  },
  {
    tag: 'Risks',
    icon: AlertTriangle,
    color: 'text-orange-600 bg-orange-50 border-orange-100',
    desc: 'Registo de riscos (ISO 27001, NIS2)',
    endpoints: [
      { method: 'GET',    path: '/api/v1/risks', desc: 'Listar riscos (filtros: level, status, framework)' },
      { method: 'POST',   path: '/api/v1/risks', desc: 'Criar risco' },
      { method: 'GET',    path: '/api/v1/risks/:id', desc: 'Detalhe de risco' },
      { method: 'PATCH',  path: '/api/v1/risks/:id', desc: 'Actualizar risco' },
      { method: 'DELETE', path: '/api/v1/risks/:id', desc: 'Eliminar risco' },
    ],
  },
  {
    tag: 'Tasks',
    icon: Target,
    color: 'text-green-600 bg-green-50 border-green-100',
    desc: 'Gestão de tarefas e planos de acção',
    endpoints: [
      { method: 'GET',   path: '/api/v1/tasks', desc: 'Listar tarefas (filtros: assignee, status, priority)' },
      { method: 'POST',  path: '/api/v1/tasks', desc: 'Criar tarefa' },
      { method: 'PATCH', path: '/api/v1/tasks/:id', desc: 'Actualizar tarefa (status, assignee, etc.)' },
    ],
  },
  {
    tag: 'Evidence',
    icon: FileText,
    color: 'text-purple-600 bg-purple-50 border-purple-100',
    desc: 'Gestão de evidências e documentos',
    endpoints: [
      { method: 'GET',  path: '/api/v1/evidence', desc: 'Listar evidências' },
      { method: 'POST', path: '/api/v1/evidence', desc: 'Upload de evidência (multipart/form-data)' },
      { method: 'GET',  path: '/api/v1/evidence/:id', desc: 'Descarregar evidência' },
    ],
  },
  {
    tag: 'iGuard',
    icon: Shield,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    desc: 'Agente de conformidade de dispositivos',
    endpoints: [
      { method: 'POST', path: '/api/v1/iguard/register', desc: 'Registar dispositivo (agent → API)' },
      { method: 'POST', path: '/api/v1/iguard/report', desc: 'Submeter relatório de conformidade' },
      { method: 'GET',  path: '/api/v1/iguard/devices', desc: 'Listar dispositivos da organização' },
      { method: 'GET',  path: '/api/v1/iguard/probes', desc: 'Listar sondas de rede' },
      { method: 'POST', path: '/api/v1/iguard/probes', desc: 'Criar sonda de rede' },
    ],
  },
  {
    tag: 'Reports',
    icon: BarChart3,
    color: 'text-pink-600 bg-pink-50 border-pink-100',
    desc: 'Relatórios e exportações',
    endpoints: [
      { method: 'GET',  path: '/api/v1/reports/summary', desc: 'Score geral + métricas de conformidade' },
      { method: 'POST', path: '/api/v1/reports/export', desc: 'Exportar relatório PDF/Excel' },
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
              API RESTful com autenticação JWT. Base URL:{' '}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">https://api.icomply.pt/api/v1</code>
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
          <h2 className="font-semibold">Autenticação</h2>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Todas as rotas (excepto <code className="text-gray-200 font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded">/auth/login</code> e{' '}
          <code className="text-gray-200 font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded">/auth/refresh</code>) requerem{' '}
          um token JWT no header <code className="text-gray-200 font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded">Authorization</code>.
        </p>

        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">1. Obter token</p>
        <div className="relative bg-gray-950 rounded-xl p-4 mb-4 font-mono text-xs text-gray-300">
          <CopyCode text={`curl -X POST https://api.icomply.pt/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@empresa.pt","password":"••••••••"}'`} />
          {`curl -X POST https://api.icomply.pt/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@empresa.pt","password":"••••••••"}'`}
        </div>

        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">2. Usar o token nas chamadas</p>
        <div className="relative bg-gray-950 rounded-xl p-4 font-mono text-xs text-gray-300">
          <CopyCode text={`curl https://api.icomply.pt/api/v1/risks \\
  -H "Authorization: Bearer SEU_TOKEN_JWT"`} />
          {`curl https://api.icomply.pt/api/v1/risks \\
  -H "Authorization: Bearer SEU_TOKEN_JWT"`}
        </div>
      </div>

      {/* Rate limiting */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Rate limit', value: '100 req / min', desc: 'Por IP autenticado', icon: Zap, color: 'text-blue-600' },
          { label: 'Versão da API', value: 'v1', desc: 'Estável — sem breaking changes', icon: Server, color: 'text-green-600' },
          { label: 'Formato', value: 'JSON', desc: 'Content-Type: application/json', icon: BookOpen, color: 'text-purple-600' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3">
              <div className={`shrink-0 mt-0.5 ${item.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="font-semibold text-gray-900">{item.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Endpoints by group */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Endpoints por módulo</h2>
        <div className="space-y-4">
          {ENDPOINT_GROUPS.map(group => {
            const Icon = group.icon;
            return (
              <div key={group.tag} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className={`flex items-center gap-3 px-5 py-3 border-b border-gray-100`}>
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
                    Ver no Swagger <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="divide-y divide-gray-50">
                  {group.endpoints.map(ep => (
                    <div key={ep.path} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50/50 transition-colors">
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
      </div>

      {/* Swagger CTA */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-white">
          <p className="font-semibold text-lg">Explorar API interactivamente</p>
          <p className="text-blue-100 text-sm mt-1">
            O Swagger UI permite testar todos os endpoints directamente no browser, com autenticação integrada.
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
