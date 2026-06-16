'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Mail, BookOpen, MessageCircle, FileText,
  ChevronRight, ExternalLink, Phone, Clock,
  Play, CheckCircle2, ArrowRight, Shield,
  Users, BarChart3, AlertTriangle, Target,
} from 'lucide-react';

// ── FAQ ───────────────────────────────────────────────────────
const FAQ = [
  {
    q: 'Como começo a usar o iComply?',
    a: 'Acede a Diagnóstico → preenche o questionário de maturidade → o sistema gera automaticamente um plano de acção com tarefas prioritárias.',
  },
  {
    q: 'Como adiciono utilizadores à minha organização?',
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
  {
    q: 'Como funciona o mapa de riscos?',
    a: 'O mapa de riscos 5×5 cruza Probabilidade × Impacto de cada risco registado. Os riscos críticos (vermelho) requerem plano de tratamento imediato.',
  },
  {
    q: 'Posso personalizar os frameworks de conformidade?',
    a: 'Sim. O iComply suporta ISO 27001, NIS2, RGPD, SOC2 e frameworks personalizados. Contacta o suporte para configurar frameworks específicos do teu sector.',
  },
];

// ── Getting Started steps ─────────────────────────────────────
const STEPS = [
  {
    icon: Target,
    color: 'bg-blue-100 text-blue-700',
    title: 'Diagnóstico inicial',
    desc: 'Preenche o questionário de maturidade para obter o teu score de conformidade e identificar lacunas.',
    href: '/diagnostic',
    cta: 'Fazer diagnóstico',
  },
  {
    icon: AlertTriangle,
    color: 'bg-orange-100 text-orange-700',
    title: 'Regista os teus riscos',
    desc: 'Cria um registo de riscos com probabilidade, impacto e planos de tratamento.',
    href: '/risks',
    cta: 'Ver riscos',
  },
  {
    icon: FileText,
    color: 'bg-green-100 text-green-700',
    title: 'Políticas de segurança',
    desc: 'Cria e aprova as políticas internas da tua organização.',
    href: '/policies',
    cta: 'Ver políticas',
  },
  {
    icon: Shield,
    color: 'bg-purple-100 text-purple-700',
    title: 'Instala o iGuard',
    desc: 'Monitoriza os dispositivos da equipa em tempo real.',
    href: '/iguard/install',
    cta: 'Instalar agente',
  },
  {
    icon: Users,
    color: 'bg-pink-100 text-pink-700',
    title: 'Convida a tua equipa',
    desc: 'Adiciona utilizadores e atribui permissões por função.',
    href: '/settings',
    cta: 'Gerir utilizadores',
  },
  {
    icon: BarChart3,
    color: 'bg-indigo-100 text-indigo-700',
    title: 'Gera relatórios',
    desc: 'Exporta relatórios para a administração e auditores.',
    href: '/reports',
    cta: 'Ver relatórios',
  },
];

// ── Video guides ──────────────────────────────────────────────
const VIDEOS = [
  { title: 'Introdução ao iComply', duration: '3:42', thumb: null, id: 1 },
  { title: 'Como fazer um diagnóstico de conformidade', duration: '5:15', thumb: null, id: 2 },
  { title: 'Gestão de riscos — passo a passo', duration: '6:30', thumb: null, id: 3 },
  { title: 'Instalar o iGuard em macOS', duration: '2:50', thumb: null, id: 4 },
  { title: 'Instalar o iGuard em Windows', duration: '3:10', thumb: null, id: 5 },
  { title: 'Board Reports — relatórios executivos', duration: '4:20', thumb: null, id: 6 },
];

const RESOURCES = [
  { label: 'Documentação técnica iGuard', href: '/docs/iguard', icon: FileText, external: false },
  { label: 'Documentação da API REST', href: '/docs/api', icon: BookOpen, external: false },
  { label: 'Academia iComply (20 vídeos)', href: '/academy', icon: BookOpen, external: false },
  { label: 'Trust Center público', href: '/trust', icon: Shield, external: false },
];

// ── FAQ Accordion ─────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-4 text-left gap-4"
      >
        <span className="text-sm font-medium text-gray-800">{q}</span>
        <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && <p className="pb-4 text-sm text-gray-600 leading-relaxed">{a}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function HelpPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 py-2">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Centro de Ajuda</h1>
        <p className="text-gray-500 mt-1">Guias, vídeos e suporte para tirar o máximo do iComply.</p>
      </div>

      {/* Contact cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="mailto:support@icomply.pt"
          className="flex flex-col gap-3 p-5 bg-blue-50 border border-blue-100 rounded-2xl hover:bg-blue-100 transition-colors">
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
        <a href="https://wa.me/351917599852" target="_blank" rel="noopener noreferrer"
          className="flex flex-col gap-3 p-5 bg-green-50 border border-green-100 rounded-2xl hover:bg-green-100 transition-colors">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-green-900">WhatsApp / Chat</p>
            <p className="text-xs text-green-700 mt-0.5">+351 917 599 852</p>
            <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Seg–Sex, 9h–18h
            </p>
          </div>
        </a>
        <a href="tel:+351210210039"
          className="flex flex-col gap-3 p-5 bg-purple-50 border border-purple-100 rounded-2xl hover:bg-purple-100 transition-colors">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-purple-900">Telefone</p>
            <p className="text-xs text-purple-700 mt-0.5">+351 210 210 039</p>
            <p className="text-xs text-purple-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Seg–Sex, 9h–18h
            </p>
          </div>
        </a>
      </div>

      {/* Getting started */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Primeiros passos</h2>
        <p className="text-sm text-gray-500 mb-5">Segue estes 6 passos para configurar o iComply na tua organização.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Link key={step.href} href={step.href}
                className="flex flex-col gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${step.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-medium text-gray-400">PASSO {i + 1}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">{step.title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.desc}</p>
                </div>
                <span className="text-xs text-blue-600 flex items-center gap-1 mt-auto font-medium">
                  {step.cta} <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Video guides */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Guias em vídeo</h2>
            <p className="text-sm text-gray-500">Tutoriais passo a passo da Academia iComply.</p>
          </div>
          <Link href="/academy" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            Ver todos <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {VIDEOS.map(v => (
            <Link key={v.id} href="/academy"
              className="group flex flex-col gap-2 rounded-xl overflow-hidden border border-gray-100 hover:shadow-sm transition-all">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 aspect-video flex items-center justify-center relative">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <Play className="w-5 h-5 text-white fill-white" />
                </div>
                <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded font-mono">{v.duration}</span>
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-gray-800 leading-snug group-hover:text-blue-700 transition-colors">{v.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Perguntas Frequentes</h2>
        <div>
          {FAQ.map((item, i) => <FaqItem key={i} q={item.q} a={item.a} />)}
        </div>
      </div>

      {/* Resources */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Recursos adicionais</h2>
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
            return r.external
              ? <a key={r.label} href={r.href} target="_blank" rel="noopener noreferrer">{content}</a>
              : <Link key={r.label} href={r.href}>{content}</Link>;
          })}
        </div>
      </div>

      {/* Checklist CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-white">
          <p className="font-semibold text-lg">Precisas de ajuda personalizada?</p>
          <p className="text-blue-100 text-sm mt-1">A nossa equipa faz sessões de onboarding individuais — gratuitas no primeiro mês.</p>
        </div>
        <a href="mailto:support@icomply.pt?subject=Pedido%20de%20Onboarding"
          className="shrink-0 inline-flex items-center gap-2 bg-white text-blue-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors">
          <CheckCircle2 className="w-4 h-4" /> Agendar onboarding
        </a>
      </div>
    </div>
  );
}
