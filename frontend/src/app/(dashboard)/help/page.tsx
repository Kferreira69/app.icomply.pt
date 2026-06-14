'use client';

import Link from 'next/link';
import {
  Mail, BookOpen, MessageCircle, FileText,
  ChevronRight, ExternalLink, Phone, Clock,
} from 'lucide-react';

const FAQ = [
  {
    q: 'Como começo a usar o iComply?',
    a: 'Acede a Diagnóstico → preenche o questionário de maturidade → o sistema gera automaticamente um plano de acção com tarefas prioritárias.',
  },
  {
    q: 'Como adiciono um utilizador à minha organização?',
    a: 'Vai a Definições → Utilizadores → Convidar utilizador. O convite é enviado por email com instruções de acesso.',
  },
  {
    q: 'O que é o iGuard?',
    a: 'iGuard é o agente de conformidade de dispositivos. Monitoriza endpoints e servidores em tempo real, verificando encriptação, antivírus, actualizações e firewall.',
  },
  {
    q: 'Como exporto relatórios para a administração?',
    a: 'Em Relatórios → Board Reports podes gerar PDFs executivos com o score de conformidade, riscos e progresso por framework.',
  },
  {
    q: 'Os meus dados estão seguros?',
    a: 'Sim. Todos os dados são armazenados em servidores na União Europeia, com encriptação em repouso e em trânsito (TLS 1.3). O iComply é conforme com o RGPD.',
  },
  {
    q: 'Posso usar o iComply para múltiplas empresas?',
    a: 'Sim. O iComply suporta multi-tenant — cada organização tem os seus dados completamente isolados.',
  },
];

const RESOURCES = [
  { label: 'Documentação técnica', href: 'https://docs.icomply.pt', icon: FileText, external: true },
  { label: 'Academia iComply (vídeos)', href: '/academy', icon: BookOpen, external: false },
  { label: 'Trust Center', href: '/trust', icon: FileText, external: false },
];

export default function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-2">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Centro de Ajuda</h1>
        <p className="text-gray-500 mt-1">Documentação, FAQ e suporte para o iComply.</p>
      </div>

      {/* Contact cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="mailto:support@icomply.pt"
          className="flex flex-col gap-3 p-5 bg-blue-50 border border-blue-100 rounded-2xl hover:bg-blue-100 transition-colors group"
        >
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-blue-900">Email de Suporte</p>
            <p className="text-xs text-blue-700 mt-0.5">support@icomply.pt</p>
            <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Resposta em até 4h úteis
            </p>
          </div>
        </a>

        <a
          href="https://wa.me/351910000000"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col gap-3 p-5 bg-green-50 border border-green-100 rounded-2xl hover:bg-green-100 transition-colors group"
        >
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-green-900">WhatsApp / Chat</p>
            <p className="text-xs text-green-700 mt-0.5">+351 910 000 000</p>
            <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Seg–Sex, 9h–18h
            </p>
          </div>
        </a>

        <a
          href="tel:+351910000000"
          className="flex flex-col gap-3 p-5 bg-purple-50 border border-purple-100 rounded-2xl hover:bg-purple-100 transition-colors group"
        >
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-purple-900">Telefone</p>
            <p className="text-xs text-purple-700 mt-0.5">+351 910 000 000</p>
            <p className="text-xs text-purple-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Seg–Sex, 9h–18h
            </p>
          </div>
        </a>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Perguntas Frequentes</h2>
        <div className="divide-y divide-gray-100">
          {FAQ.map((item, i) => (
            <details key={i} className="group py-4 first:pt-0 last:pb-0">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="text-sm font-medium text-gray-800 group-open:text-blue-700 pr-4">{item.q}</span>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Resources */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Recursos</h2>
        <div className="space-y-2">
          {RESOURCES.map((r) => {
            const Icon = r.icon;
            const content = (
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-gray-600" />
                </div>
                <span className="text-sm text-gray-700 flex-1">{r.label}</span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
              </div>
            );
            return r.external ? (
              <a key={r.label} href={r.href} target="_blank" rel="noopener noreferrer">{content}</a>
            ) : (
              <Link key={r.label} href={r.href}>{content}</Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
