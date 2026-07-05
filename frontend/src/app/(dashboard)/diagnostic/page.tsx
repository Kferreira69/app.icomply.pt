'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Download,
  Plus,
  X,
  BarChart3,
  ClipboardList,
  Zap,
  Shield,
  ArrowRight,
  Layers,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { tasksApi, projectsApi, diagnosticsApi } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

type Answer = 'sim' | 'parcial' | 'nao' | null;

type FrameworkKey =
  | 'ISO_27001'
  | 'GDPR'
  | 'NIS2'
  | 'DORA'
  | 'SOC2'
  | 'ISO_9001'
  | 'ISO_22301'
  | 'PCI_DSS'
  | 'LEI_93_2021'
  | 'MENAC'
  | 'ISO_31000'
  | 'ISO_27701'
  | 'CIS'
  | 'TISAX'
  | 'AML'
  | 'EU_AI_ACT'
  | 'ESG_CSRD'
  | 'ePRIVACY';

interface FrameworkDef {
  key: FrameworkKey;
  name: string;
  subtitle: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  category: FrameworkCategory;
}

type FrameworkCategory =
  | 'seguranca'
  | 'privacidade'
  | 'resiliencia'
  | 'qualidade'
  | 'regulatorio'
  | 'setor';

interface FrameworkCategoryDef {
  key: FrameworkCategory;
  label: string;
  icon: string;
}

const FRAMEWORK_CATEGORIES: FrameworkCategoryDef[] = [
  { key: 'seguranca', label: 'Segurança da Informação', icon: '🔐' },
  { key: 'privacidade', label: 'Privacidade de Dados', icon: '🛡️' },
  { key: 'resiliencia', label: 'Resiliência & Continuidade', icon: '♻️' },
  { key: 'qualidade', label: 'Qualidade & Governança', icon: '🏆' },
  { key: 'regulatorio', label: 'Regulatório & Compliance', icon: '⚖️' },
  { key: 'setor', label: 'Frameworks Setoriais', icon: '🏭' },
];

interface Question {
  id: string;
  text: string;
  category: CategoryKey;
  frameworks: FrameworkKey[];
}

interface Category {
  key: CategoryKey;
  label: string;
  questions: Question[];
}

type CategoryKey =
  | 'riscos'
  | 'evidencias'
  | 'tarefas'
  | 'auditorias'
  | 'politicas'
  | 'formacao'
  | 'incidentes'
  | 'privacidade'
  | 'continuidade'
  | 'denuncias'
  | 'setorial';

interface WizardAnswers {
  [questionId: string]: Answer;
}

interface Recommendation {
  id: string;
  priority: 'critica' | 'alta' | 'media' | 'baixa';
  area: CategoryKey;
  title: string;
  effort: string;
  impactPts: number;
  dismissed: boolean;
  taskCreated: boolean;
  prefilledTitle: string;
  prefilledDescription: string;
}

// ─── Framework Definitions ────────────────────────────────────────────────────

const FRAMEWORKS: FrameworkDef[] = [
  // ── Segurança da Informação ──────────────────────────────────
  {
    key: 'ISO_27001',
    name: 'ISO 27001:2022',
    subtitle: 'Segurança da Informação',
    description: 'Sistema de Gestão de Segurança da Informação — requisitos para proteção de dados e ativos de informação.',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    icon: '🔒',
    category: 'seguranca',
  },
  {
    key: 'NIS2',
    name: 'NIS2',
    subtitle: 'Segurança de Redes e Sistemas',
    description: 'Diretiva de Segurança de Redes e Sistemas de Informação — obrigatória para entidades essenciais e importantes.',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    icon: '🌐',
    category: 'seguranca',
  },
  {
    key: 'DORA',
    name: 'DORA',
    subtitle: 'Resiliência Operacional Digital',
    description: 'Digital Operational Resilience Act — resiliência digital para entidades do setor financeiro.',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    icon: '⚡',
    category: 'seguranca',
  },
  {
    key: 'SOC2',
    name: 'SOC 2 Type II',
    subtitle: 'Service Organization Controls',
    description: 'Critérios de confiança para organizações de serviços — segurança, disponibilidade, confidencialidade e privacidade.',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-300',
    icon: '✅',
    category: 'seguranca',
  },
  {
    key: 'CIS',
    name: 'CIS Controls v8',
    subtitle: 'Controlos de Segurança Críticos',
    description: 'Center for Internet Security — 18 controlos críticos de segurança para proteção cibernética.',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-300',
    icon: '🛡',
    category: 'seguranca',
  },
  {
    key: 'PCI_DSS',
    name: 'PCI DSS v4.0',
    subtitle: 'Segurança de Dados de Pagamento',
    description: 'Payment Card Industry Data Security Standard — proteção de dados de titulares de cartões de pagamento.',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    icon: '💳',
    category: 'setor',
  },
  // ── Privacidade de Dados ─────────────────────────────────────
  {
    key: 'GDPR',
    name: 'RGPD / GDPR',
    subtitle: 'Proteção de Dados Pessoais',
    description: 'Regulamento Geral de Proteção de Dados — conformidade com o tratamento de dados pessoais de cidadãos da UE.',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    icon: '🛡️',
    category: 'privacidade',
  },
  {
    key: 'ISO_27701',
    name: 'ISO 27701',
    subtitle: 'Gestão da Privacidade',
    description: 'Extensão à ISO 27001 para gestão de informação de privacidade (PIMS) — alinha com o RGPD.',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-300',
    icon: '🔐',
    category: 'privacidade',
  },
  {
    key: 'ePRIVACY',
    name: 'ePrivacy',
    subtitle: 'Diretiva Cookies e Comunicações',
    description: 'Diretiva de privacidade e comunicações eletrónicas — cookies, marketing direto e metadados de comunicação.',
    color: 'text-fuchsia-700',
    bgColor: 'bg-fuchsia-50',
    borderColor: 'border-fuchsia-300',
    icon: '🍪',
    category: 'privacidade',
  },
  // ── Resiliência & Continuidade ───────────────────────────────
  {
    key: 'ISO_22301',
    name: 'ISO 22301:2019',
    subtitle: 'Continuidade de Negócio',
    description: 'Sistema de Gestão de Continuidade de Negócio — preparação e recuperação face a incidentes disruptivos.',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    icon: '♻️',
    category: 'resiliencia',
  },
  {
    key: 'ISO_31000',
    name: 'ISO 31000:2018',
    subtitle: 'Gestão de Riscos',
    description: 'Princípios e diretrizes para gestão de riscos — framework universal aplicável a qualquer organização.',
    color: 'text-lime-700',
    bgColor: 'bg-lime-50',
    borderColor: 'border-lime-300',
    icon: '⚖️',
    category: 'resiliencia',
  },
  // ── Qualidade & Governança ───────────────────────────────────
  {
    key: 'ISO_9001',
    name: 'ISO 9001:2015',
    subtitle: 'Gestão da Qualidade',
    description: 'Sistema de Gestão da Qualidade — melhoria contínua, satisfação do cliente e eficiência operacional.',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    icon: '🏆',
    category: 'qualidade',
  },
  {
    key: 'MENAC',
    name: 'MENAC',
    subtitle: 'Mecanismo Nacional Anticorrupção',
    description: 'Lei 93/2021 — Regime Geral de Prevenção da Corrupção e mecanismo nacional de combate à corrupção.',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    icon: '⚖',
    category: 'qualidade',
  },
  {
    key: 'ESG_CSRD',
    name: 'ESG / CSRD',
    subtitle: 'Sustentabilidade e Reporte',
    description: 'Corporate Sustainability Reporting Directive — reporte de sustentabilidade ambiental, social e de governança.',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    icon: '🌿',
    category: 'qualidade',
  },
  // ── Regulatório & Compliance ─────────────────────────────────
  {
    key: 'LEI_93_2021',
    name: 'Lei 93/2021',
    subtitle: 'Canal de Denúncias',
    description: 'Regime de proteção de denunciantes — transpõe a Diretiva UE 2019/1937, obrigatório para organizações ≥50 trabalhadores.',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-300',
    icon: '📣',
    category: 'regulatorio',
  },
  {
    key: 'AML',
    name: 'AML / LBCFT',
    subtitle: 'Prevenção de Branqueamento',
    description: 'Anti-Money Laundering — Lei n.º 83/2017 e diretivas UE de prevenção de branqueamento de capitais e financiamento do terrorismo.',
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-300',
    icon: '🏦',
    category: 'regulatorio',
  },
  {
    key: 'EU_AI_ACT',
    name: 'EU AI Act',
    subtitle: 'Governança de Inteligência Artificial',
    description: 'Regulamento europeu de IA — classificação de risco de sistemas de IA e obrigações para operadores de IA de alto risco.',
    color: 'text-sky-700',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-300',
    icon: '🤖',
    category: 'regulatorio',
  },
  // ── Frameworks Setoriais ─────────────────────────────────────
  {
    key: 'TISAX',
    name: 'TISAX',
    subtitle: 'Segurança na Indústria Automóvel',
    description: 'Trusted Information Security Assessment Exchange — avaliação de segurança da informação para fornecedores da indústria automóvel.',
    color: 'text-zinc-700',
    bgColor: 'bg-zinc-50',
    borderColor: 'border-zinc-300',
    icon: '🚗',
    category: 'setor',
  },
];

// ─── Questions with framework tags ───────────────────────────────────────────

const CATEGORIES: Category[] = [
  {
    key: 'riscos',
    label: 'Gestão de Riscos',
    questions: [
      {
        id: 'r1',
        text: 'Tem registo de riscos atualizado?',
        category: 'riscos',
        frameworks: ['ISO_27001', 'NIS2', 'DORA', 'SOC2', 'ISO_9001', 'ISO_22301', 'PCI_DSS', 'ISO_31000', 'EU_AI_ACT', 'AML'],
      },
      {
        id: 'r2',
        text: 'Riscos são avaliados regularmente (mínimo anual)?',
        category: 'riscos',
        frameworks: ['ISO_27001', 'NIS2', 'DORA', 'SOC2', 'ISO_9001', 'ISO_22301', 'ISO_31000', 'AML'],
      },
      {
        id: 'r3',
        text: 'Existe plano de mitigação para os riscos identificados?',
        category: 'riscos',
        frameworks: ['ISO_27001', 'GDPR', 'NIS2', 'DORA', 'SOC2', 'ISO_9001', 'ISO_22301', 'PCI_DSS', 'ISO_31000'],
      },
      {
        id: 'r4',
        text: 'Riscos críticos têm um owner definido?',
        category: 'riscos',
        frameworks: ['ISO_27001', 'NIS2', 'DORA', 'SOC2', 'ISO_9001', 'ISO_31000'],
      },
      {
        id: 'r5',
        text: 'A organização tem um contexto e critérios de risco formalmente definidos?',
        category: 'riscos',
        frameworks: ['ISO_31000', 'ISO_27001', 'ISO_9001', 'ISO_22301'],
      },
      {
        id: 'r6',
        text: 'Os riscos de cibersegurança são avaliados com metodologia estruturada?',
        category: 'riscos',
        frameworks: ['NIS2', 'DORA', 'ISO_27001', 'CIS', 'SOC2', 'PCI_DSS'],
      },
      {
        id: 'r7',
        text: 'Existe avaliação de risco específica para fornecedores e terceiros?',
        category: 'riscos',
        frameworks: ['DORA', 'NIS2', 'ISO_27001', 'SOC2', 'AML'],
      },
      {
        id: 'r8',
        text: 'A organização avaliou os riscos de sistemas de IA utilizados?',
        category: 'riscos',
        frameworks: ['EU_AI_ACT'],
      },
    ],
  },
  {
    key: 'evidencias',
    label: 'Evidências',
    questions: [
      {
        id: 'e1',
        text: 'Evidências são recolhidas sistematicamente?',
        category: 'evidencias',
        frameworks: ['ISO_27001', 'GDPR', 'NIS2', 'SOC2', 'ISO_9001', 'PCI_DSS', 'CIS'],
      },
      {
        id: 'e2',
        text: 'Evidências têm data de validade definida?',
        category: 'evidencias',
        frameworks: ['ISO_27001', 'SOC2', 'PCI_DSS'],
      },
      {
        id: 'e3',
        text: 'Taxa de evidências válidas superior a 80%?',
        category: 'evidencias',
        frameworks: ['ISO_27001', 'SOC2', 'ISO_9001', 'PCI_DSS'],
      },
      {
        id: 'e4',
        text: 'Existe processo de revisão de evidências?',
        category: 'evidencias',
        frameworks: ['ISO_27001', 'GDPR', 'SOC2', 'ISO_9001'],
      },
    ],
  },
  {
    key: 'tarefas',
    label: 'Tarefas e CAPAs',
    questions: [
      {
        id: 't1',
        text: 'CAPAs têm prazo de conclusão definido?',
        category: 'tarefas',
        frameworks: ['ISO_27001', 'ISO_9001', 'NIS2', 'SOC2'],
      },
      {
        id: 't2',
        text: 'Taxa de conclusão de tarefas superior a 70%?',
        category: 'tarefas',
        frameworks: ['ISO_27001', 'ISO_9001', 'NIS2', 'DORA', 'SOC2'],
      },
      {
        id: 't3',
        text: 'Existe processo de escalamento para tarefas em atraso?',
        category: 'tarefas',
        frameworks: ['ISO_27001', 'ISO_9001', 'NIS2'],
      },
    ],
  },
  {
    key: 'auditorias',
    label: 'Auditorias',
    questions: [
      {
        id: 'a1',
        text: 'Auditorias internas são realizadas regularmente?',
        category: 'auditorias',
        frameworks: ['ISO_27001', 'GDPR', 'NIS2', 'DORA', 'SOC2', 'ISO_9001', 'ISO_22301', 'PCI_DSS', 'ISO_27701', 'CIS'],
      },
      {
        id: 'a2',
        text: 'Auditorias externas estão planeadas?',
        category: 'auditorias',
        frameworks: ['ISO_27001', 'SOC2', 'ISO_9001', 'PCI_DSS', 'TISAX'],
      },
      {
        id: 'a3',
        text: 'Findings de auditoria são tratados e fechados?',
        category: 'auditorias',
        frameworks: ['ISO_27001', 'GDPR', 'NIS2', 'SOC2', 'ISO_9001', 'PCI_DSS', 'MENAC'],
      },
    ],
  },
  {
    key: 'politicas',
    label: 'Políticas',
    questions: [
      {
        id: 'p1',
        text: 'Políticas de compliance estão publicadas e acessíveis?',
        category: 'politicas',
        frameworks: ['ISO_27001', 'GDPR', 'NIS2', 'DORA', 'SOC2', 'ISO_9001', 'ISO_22301', 'PCI_DSS', 'LEI_93_2021', 'MENAC', 'AML', 'EU_AI_ACT'],
      },
      {
        id: 'p2',
        text: 'Políticas são revistas anualmente?',
        category: 'politicas',
        frameworks: ['ISO_27001', 'GDPR', 'NIS2', 'SOC2', 'ISO_9001', 'PCI_DSS', 'AML', 'LEI_93_2021'],
      },
      {
        id: 'p3',
        text: 'Colaboradores confirmaram leitura das políticas?',
        category: 'politicas',
        frameworks: ['ISO_27001', 'GDPR', 'NIS2', 'SOC2', 'PCI_DSS', 'LEI_93_2021', 'MENAC'],
      },
      {
        id: 'p4',
        text: 'Existe Código de Conduta aprovado e comunicado?',
        category: 'politicas',
        frameworks: ['MENAC', 'LEI_93_2021', 'ESG_CSRD', 'AML'],
      },
    ],
  },
  {
    key: 'formacao',
    label: 'Formação',
    questions: [
      {
        id: 'f1',
        text: 'Existe programa de formação de compliance?',
        category: 'formacao',
        frameworks: ['ISO_27001', 'GDPR', 'NIS2', 'DORA', 'SOC2', 'ISO_9001', 'PCI_DSS', 'LEI_93_2021', 'MENAC', 'AML'],
      },
      {
        id: 'f2',
        text: 'Taxa de conclusão de formação superior a 80%?',
        category: 'formacao',
        frameworks: ['ISO_27001', 'GDPR', 'NIS2', 'SOC2', 'ISO_9001', 'PCI_DSS', 'AML'],
      },
      {
        id: 'f3',
        text: 'Formações são documentadas e rastreadas?',
        category: 'formacao',
        frameworks: ['ISO_27001', 'GDPR', 'NIS2', 'SOC2', 'ISO_9001', 'PCI_DSS', 'LEI_93_2021'],
      },
    ],
  },
  // ── Novas categorias para novos frameworks ───────────────────
  {
    key: 'incidentes',
    label: 'Gestão de Incidentes',
    questions: [
      {
        id: 'i1',
        text: 'Existe um processo formal de gestão e resposta a incidentes?',
        category: 'incidentes',
        frameworks: ['ISO_27001', 'NIS2', 'DORA', 'SOC2', 'PCI_DSS', 'CIS'],
      },
      {
        id: 'i2',
        text: 'Incidentes significativos de TIC são notificados às autoridades no prazo legal (24h/72h)?',
        category: 'incidentes',
        frameworks: ['NIS2', 'DORA', 'GDPR'],
      },
      {
        id: 'i3',
        text: 'A organização tem um registo de incidentes TIC com categorização de impacto?',
        category: 'incidentes',
        frameworks: ['DORA', 'NIS2', 'ISO_27001'],
      },
      {
        id: 'i4',
        text: 'Existem testes de penetração ou resiliência operacional realizados pelo menos anualmente?',
        category: 'incidentes',
        frameworks: ['DORA', 'NIS2', 'PCI_DSS', 'ISO_27001', 'CIS'],
      },
      {
        id: 'i5',
        text: 'A organização mapeia as dependências críticas de fornecedores TIC?',
        category: 'incidentes',
        frameworks: ['DORA', 'NIS2'],
      },
      {
        id: 'i6',
        text: 'Violações de dados pessoais são notificadas à CNPD em ≤72 horas?',
        category: 'incidentes',
        frameworks: ['GDPR', 'ISO_27701'],
      },
    ],
  },
  {
    key: 'privacidade',
    label: 'Privacidade e Dados',
    questions: [
      {
        id: 'priv1',
        text: 'Existe um registo de atividades de tratamento de dados (ROPA)?',
        category: 'privacidade',
        frameworks: ['GDPR', 'ISO_27701'],
      },
      {
        id: 'priv2',
        text: 'As DPIAs (avaliações de impacto) são realizadas para tratamentos de alto risco?',
        category: 'privacidade',
        frameworks: ['GDPR', 'ISO_27701', 'EU_AI_ACT'],
      },
      {
        id: 'priv3',
        text: 'Existe um DPO (Encarregado de Proteção de Dados) nomeado?',
        category: 'privacidade',
        frameworks: ['GDPR', 'ISO_27701'],
      },
      {
        id: 'priv4',
        text: 'Os titulares de dados podem exercer os seus direitos (acesso, apagamento, portabilidade)?',
        category: 'privacidade',
        frameworks: ['GDPR', 'ISO_27701'],
      },
      {
        id: 'priv5',
        text: 'O website/app tem banner de cookies conforme e política de privacidade atualizada?',
        category: 'privacidade',
        frameworks: ['ePRIVACY', 'GDPR'],
      },
      {
        id: 'priv6',
        text: 'Cookies de terceiros e rastreamento requerem consentimento explícito do utilizador?',
        category: 'privacidade',
        frameworks: ['ePRIVACY'],
      },
      {
        id: 'priv7',
        text: 'Transferências de dados para países terceiros têm salvaguardas adequadas (SCCs, BCRs)?',
        category: 'privacidade',
        frameworks: ['GDPR', 'ISO_27701'],
      },
    ],
  },
  {
    key: 'continuidade',
    label: 'Continuidade e Resiliência',
    questions: [
      {
        id: 'cont1',
        text: 'Existe um Plano de Continuidade de Negócio (PCN) documentado?',
        category: 'continuidade',
        frameworks: ['ISO_22301', 'DORA', 'ISO_27001', 'SOC2'],
      },
      {
        id: 'cont2',
        text: 'O PCN foi testado nos últimos 12 meses?',
        category: 'continuidade',
        frameworks: ['ISO_22301', 'DORA'],
      },
      {
        id: 'cont3',
        text: 'A organização tem RTO e RPO definidos para sistemas críticos?',
        category: 'continuidade',
        frameworks: ['ISO_22301', 'DORA', 'ISO_27001'],
      },
      {
        id: 'cont4',
        text: 'Existem backups testados regularmente e armazenados em local separado?',
        category: 'continuidade',
        frameworks: ['ISO_22301', 'ISO_27001', 'PCI_DSS', 'DORA', 'CIS'],
      },
      {
        id: 'cont5',
        text: 'Existe análise de impacto de negócio (BIA) atualizada?',
        category: 'continuidade',
        frameworks: ['ISO_22301', 'DORA'],
      },
    ],
  },
  {
    key: 'denuncias',
    label: 'Canal de Denúncias',
    questions: [
      {
        id: 'den1',
        text: 'A organização tem um canal de denúncias implementado e acessível (interno e/ou externo)?',
        category: 'denuncias',
        frameworks: ['LEI_93_2021', 'MENAC'],
      },
      {
        id: 'den2',
        text: 'Existe um responsável pelo tratamento de denúncias nomeado?',
        category: 'denuncias',
        frameworks: ['LEI_93_2021', 'MENAC'],
      },
      {
        id: 'den3',
        text: 'As denúncias são acusadas de receção em ≤7 dias e tratadas em ≤3 meses?',
        category: 'denuncias',
        frameworks: ['LEI_93_2021'],
      },
      {
        id: 'den4',
        text: 'A confidencialidade e proteção do denunciante são garantidas no processo?',
        category: 'denuncias',
        frameworks: ['LEI_93_2021', 'MENAC'],
      },
      {
        id: 'den5',
        text: 'Os colaboradores foram informados e formados sobre o canal de denúncias?',
        category: 'denuncias',
        frameworks: ['LEI_93_2021', 'MENAC'],
      },
      {
        id: 'den6',
        text: 'Existe um Plano de Prevenção de Riscos de Corrupção (PPRC) aprovado?',
        category: 'denuncias',
        frameworks: ['MENAC'],
      },
    ],
  },
  {
    key: 'setorial',
    label: 'Requisitos Setoriais',
    questions: [
      {
        id: 'set1',
        text: 'Os dados de cartões de pagamento são armazenados com cifragem AES-256 ou equivalente?',
        category: 'setorial',
        frameworks: ['PCI_DSS'],
      },
      {
        id: 'set2',
        text: 'Existe segmentação de rede para sistemas que processam dados de pagamento (CDE)?',
        category: 'setorial',
        frameworks: ['PCI_DSS'],
      },
      {
        id: 'set3',
        text: 'Os scans de vulnerabilidades são realizados trimestralmente por entidade aprovada (ASV)?',
        category: 'setorial',
        frameworks: ['PCI_DSS'],
      },
      {
        id: 'set4',
        text: 'A organização possui uma avaliação TISAX válida para partilha de informação com OEMs?',
        category: 'setorial',
        frameworks: ['TISAX'],
      },
      {
        id: 'set5',
        text: 'Os 18 controlos CIS estão priorizados e em implementação por Grupos de Implementação?',
        category: 'setorial',
        frameworks: ['CIS'],
      },
      {
        id: 'set6',
        text: 'Existem procedimentos de Customer Due Diligence (CDD) e KYC implementados?',
        category: 'setorial',
        frameworks: ['AML'],
      },
      {
        id: 'set7',
        text: 'Transações suspeitas são reportadas às autoridades competentes (DCIAP/UIF)?',
        category: 'setorial',
        frameworks: ['AML'],
      },
      {
        id: 'set8',
        text: 'Os sistemas de IA de alto risco têm documentação técnica e registo de conformidade?',
        category: 'setorial',
        frameworks: ['EU_AI_ACT'],
      },
      {
        id: 'set9',
        text: 'Existe supervisão humana adequada sobre sistemas de IA que tomam decisões com impacto em pessoas?',
        category: 'setorial',
        frameworks: ['EU_AI_ACT'],
      },
      {
        id: 'set10',
        text: 'A organização publica um relatório de sustentabilidade alinhado com ESRS (CSRD)?',
        category: 'setorial',
        frameworks: ['ESG_CSRD'],
      },
      {
        id: 'set11',
        text: 'Existem métricas ESG (ambiental, social, governança) definidas e monitorizadas?',
        category: 'setorial',
        frameworks: ['ESG_CSRD'],
      },
      {
        id: 'set12',
        text: 'A organização realizou análise de dupla materialidade (impacto + financeiro)?',
        category: 'setorial',
        frameworks: ['ESG_CSRD'],
      },
      {
        id: 'set13',
        text: 'A ISO 27701 está implementada como extensão ao SGSI existente?',
        category: 'setorial',
        frameworks: ['ISO_27701'],
      },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFilteredCategories(selectedFrameworks: FrameworkKey[]): Category[] {
  if (selectedFrameworks.length === 0) return CATEGORIES;
  return CATEGORIES.map((cat) => ({
    ...cat,
    questions: cat.questions.filter((q) =>
      q.frameworks.some((fw) => selectedFrameworks.includes(fw)),
    ),
  })).filter((cat) => cat.questions.length > 0);
}

function getAllFilteredQuestions(selectedFrameworks: FrameworkKey[]): Question[] {
  return getFilteredCategories(selectedFrameworks).flatMap((c) => c.questions);
}

const ANSWER_SCORE: Record<NonNullable<Answer>, number> = {
  sim: 100,
  parcial: 50,
  nao: 0,
};

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  riscos: 'Riscos',
  evidencias: 'Evidências',
  tarefas: 'Tarefas',
  auditorias: 'Auditorias',
  politicas: 'Políticas',
  formacao: 'Formação',
  incidentes: 'Incidentes',
  privacidade: 'Privacidade',
  continuidade: 'Continuidade',
  denuncias: 'Denúncias',
  setorial: 'Setorial',
};

const PRIORITY_LABEL: Record<Recommendation['priority'], string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

const PRIORITY_COLORS: Record<Recommendation['priority'], string> = {
  critica: 'bg-red-100 text-red-700 border-red-200',
  alta: 'bg-orange-100 text-orange-700 border-orange-200',
  media: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  baixa: 'bg-gray-100 text-gray-600 border-gray-200',
};

const PRIORITY_BORDER: Record<Recommendation['priority'], string> = {
  critica: 'border-l-red-500',
  alta: 'border-l-orange-400',
  media: 'border-l-yellow-400',
  baixa: 'border-l-gray-300',
};

const MATURITY_LEVELS = [
  { min: 0, max: 40, label: 'Inicial', color: 'text-red-600', bg: 'bg-red-50' },
  { min: 41, max: 60, label: 'Em Desenvolvimento', color: 'text-orange-600', bg: 'bg-orange-50' },
  { min: 61, max: 80, label: 'Definido', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { min: 81, max: 90, label: 'Gerido', color: 'text-blue-600', bg: 'bg-blue-50' },
  { min: 91, max: 100, label: 'Otimizado', color: 'text-green-600', bg: 'bg-green-50' },
];

const TARGET_SCORE = 80;

function categoryScore(
  answers: WizardAnswers,
  cat: Category,
): number {
  const answered = cat.questions.filter((q) => answers[q.id] != null);
  if (answered.length === 0) return 0;
  const total = answered.reduce((sum, q) => sum + ANSWER_SCORE[answers[q.id]!], 0);
  return Math.round(total / cat.questions.length);
}

function overallScore(answers: WizardAnswers, categories: Category[]): number {
  if (categories.length === 0) return 0;
  const scores = categories.map((c) => categoryScore(answers, c));
  return Math.round(scores.reduce((a, b) => a + b, 0) / categories.length);
}

function frameworkScore(answers: WizardAnswers, frameworkKey: FrameworkKey): number {
  const relevantQuestions = CATEGORIES.flatMap((c) =>
    c.questions.filter((q) => q.frameworks.includes(frameworkKey)),
  );
  const answered = relevantQuestions.filter((q) => answers[q.id] != null);
  if (answered.length === 0) return 0;
  const total = answered.reduce((sum, q) => sum + ANSWER_SCORE[answers[q.id]!], 0);
  return Math.round(total / relevantQuestions.length);
}

function getMaturity(score: number) {
  return MATURITY_LEVELS.find((m) => score >= m.min && score <= m.max) ?? MATURITY_LEVELS[0];
}

// ─── Recommendation engine ───────────────────────────────────────────────────

const REC_MAP: Array<{
  questionId: string;
  answer: Answer;
  priority: Recommendation['priority'];
  area: CategoryKey;
  title: string;
  effort: string;
  impactPts: number;
  prefilledTitle: string;
  prefilledDescription: string;
}> = [
  {
    questionId: 'r1', answer: 'nao', priority: 'critica', area: 'riscos',
    title: 'Criar registo de riscos formal',
    effort: '1-2 semanas', impactPts: 20,
    prefilledTitle: 'Criar registo de riscos formal',
    prefilledDescription: 'Estabelecer e manter um registo centralizado de todos os riscos identificados, incluindo descrição, probabilidade, impacto e owner.',
  },
  {
    questionId: 'r1', answer: 'parcial', priority: 'alta', area: 'riscos',
    title: 'Completar e atualizar registo de riscos',
    effort: '1 semana', impactPts: 10,
    prefilledTitle: 'Completar registo de riscos',
    prefilledDescription: 'Atualizar o registo de riscos existente para garantir que todos os riscos relevantes estão documentados e classificados.',
  },
  {
    questionId: 'r2', answer: 'nao', priority: 'alta', area: 'riscos',
    title: 'Implementar revisão periódica de riscos',
    effort: '2-3 semanas', impactPts: 15,
    prefilledTitle: 'Implementar revisão periódica de riscos',
    prefilledDescription: 'Definir cadência de avaliação de riscos (trimestral recomendado) e nomear responsável pelo processo.',
  },
  {
    questionId: 'r3', answer: 'nao', priority: 'critica', area: 'riscos',
    title: 'Desenvolver planos de mitigação de riscos',
    effort: '3-4 semanas', impactPts: 20,
    prefilledTitle: 'Desenvolver planos de mitigação de riscos',
    prefilledDescription: 'Para cada risco identificado, definir ações de mitigação, responsável e prazo de implementação.',
  },
  {
    questionId: 'r4', answer: 'nao', priority: 'alta', area: 'riscos',
    title: 'Atribuir owners a riscos críticos',
    effort: '1 semana', impactPts: 12,
    prefilledTitle: 'Atribuir owners a riscos críticos',
    prefilledDescription: 'Nomear responsáveis para todos os riscos classificados como críticos e comunicar as responsabilidades.',
  },
  {
    questionId: 'e1', answer: 'nao', priority: 'critica', area: 'evidencias',
    title: 'Criar processo de recolha sistemática de evidências',
    effort: '2-3 semanas', impactPts: 20,
    prefilledTitle: 'Criar processo de recolha de evidências',
    prefilledDescription: 'Definir processo formal para recolha, armazenamento e gestão de evidências de compliance.',
  },
  {
    questionId: 'e2', answer: 'nao', priority: 'alta', area: 'evidencias',
    title: 'Definir datas de validade para evidências',
    effort: '1 semana', impactPts: 12,
    prefilledTitle: 'Definir validade das evidências',
    prefilledDescription: 'Estabelecer política de validade para cada tipo de evidência e configurar alertas de renovação.',
  },
  {
    questionId: 'e3', answer: 'nao', priority: 'alta', area: 'evidencias',
    title: 'Aumentar taxa de evidências válidas para >80%',
    effort: '4-6 semanas', impactPts: 15,
    prefilledTitle: 'Melhorar taxa de evidências válidas',
    prefilledDescription: 'Identificar e renovar evidências expiradas para atingir taxa mínima de 80% de evidências válidas.',
  },
  {
    questionId: 'e4', answer: 'nao', priority: 'media', area: 'evidencias',
    title: 'Implementar processo de revisão de evidências',
    effort: '2 semanas', impactPts: 10,
    prefilledTitle: 'Implementar revisão de evidências',
    prefilledDescription: 'Criar processo regular de revisão e validação de evidências existentes.',
  },
  {
    questionId: 't1', answer: 'nao', priority: 'alta', area: 'tarefas',
    title: 'Garantir que todas as CAPAs têm prazo definido',
    effort: '1 semana', impactPts: 15,
    prefilledTitle: 'Atualizar prazos de CAPAs',
    prefilledDescription: 'Rever todas as CAPAs abertas e garantir que cada uma tem data de conclusão definida.',
  },
  {
    questionId: 't2', answer: 'nao', priority: 'alta', area: 'tarefas',
    title: 'Melhorar taxa de conclusão de tarefas',
    effort: '3-4 semanas', impactPts: 18,
    prefilledTitle: 'Melhorar taxa de conclusão de tarefas',
    prefilledDescription: 'Analisar causas de incumprimento e implementar medidas para atingir taxa de conclusão >70%.',
  },
  {
    questionId: 't3', answer: 'nao', priority: 'media', area: 'tarefas',
    title: 'Implementar processo de escalamento de tarefas overdue',
    effort: '1-2 semanas', impactPts: 10,
    prefilledTitle: 'Implementar escalamento de tarefas overdue',
    prefilledDescription: 'Definir regras de escalamento automático para tarefas em atraso e notificações às chefias.',
  },
  {
    questionId: 'a1', answer: 'nao', priority: 'critica', area: 'auditorias',
    title: 'Implementar programa de auditorias internas',
    effort: '4-8 semanas', impactPts: 25,
    prefilledTitle: 'Implementar programa de auditorias internas',
    prefilledDescription: 'Criar calendário anual de auditorias internas, definir scope e responsáveis.',
  },
  {
    questionId: 'a2', answer: 'nao', priority: 'alta', area: 'auditorias',
    title: 'Planear auditorias externas',
    effort: '2-4 semanas', impactPts: 15,
    prefilledTitle: 'Planear auditorias externas',
    prefilledDescription: 'Identificar auditorias externas necessárias e agendar para o ano corrente.',
  },
  {
    questionId: 'a3', answer: 'nao', priority: 'alta', area: 'auditorias',
    title: 'Tratar e fechar findings de auditoria',
    effort: '3-6 semanas', impactPts: 20,
    prefilledTitle: 'Tratar findings de auditoria',
    prefilledDescription: 'Criar plano de ação para tratar todos os findings abertos e implementar acompanhamento.',
  },
  {
    questionId: 'p1', answer: 'nao', priority: 'critica', area: 'politicas',
    title: 'Publicar políticas de compliance',
    effort: '2-4 semanas', impactPts: 20,
    prefilledTitle: 'Publicar políticas de compliance',
    prefilledDescription: 'Elaborar e publicar todas as políticas de compliance em falta, tornando-as acessíveis a todos os colaboradores.',
  },
  {
    questionId: 'p1', answer: 'parcial', priority: 'alta', area: 'politicas',
    title: 'Completar publicação de políticas em falta',
    effort: '1-2 semanas', impactPts: 10,
    prefilledTitle: 'Completar publicação de políticas',
    prefilledDescription: 'Identificar políticas em falta e garantir publicação completa.',
  },
  {
    questionId: 'p2', answer: 'nao', priority: 'alta', area: 'politicas',
    title: 'Implementar revisão anual de políticas',
    effort: '2 semanas', impactPts: 12,
    prefilledTitle: 'Implementar revisão anual de políticas',
    prefilledDescription: 'Definir processo de revisão anual para todas as políticas e agendar próxima revisão.',
  },
  {
    questionId: 'p3', answer: 'nao', priority: 'media', area: 'politicas',
    title: 'Implementar confirmação de leitura de políticas',
    effort: '1-2 semanas', impactPts: 10,
    prefilledTitle: 'Implementar confirmação de leitura de políticas',
    prefilledDescription: 'Criar mecanismo para colaboradores confirmarem a leitura e compreensão das políticas.',
  },
  {
    questionId: 'f1', answer: 'nao', priority: 'critica', area: 'formacao',
    title: 'Criar programa de formação de compliance',
    effort: '4-8 semanas', impactPts: 20,
    prefilledTitle: 'Criar programa de formação de compliance',
    prefilledDescription: 'Desenvolver currículo de formação obrigatória em compliance para todos os colaboradores.',
  },
  {
    questionId: 'f2', answer: 'nao', priority: 'alta', area: 'formacao',
    title: 'Aumentar taxa de conclusão de formação para >80%',
    effort: '3-4 semanas', impactPts: 15,
    prefilledTitle: 'Aumentar taxa de conclusão de formação',
    prefilledDescription: 'Identificar colaboradores com formação incompleta e implementar ações para atingir taxa >80%.',
  },
  {
    questionId: 'f3', answer: 'nao', priority: 'media', area: 'formacao',
    title: 'Documentar e rastrear formações realizadas',
    effort: '1-2 semanas', impactPts: 10,
    prefilledTitle: 'Documentar formações realizadas',
    prefilledDescription: 'Criar registo centralizado de todas as formações realizadas com data, participantes e duração.',
  },
  // ── Incidentes ───────────────────────────────────────────────
  {
    questionId: 'i1', answer: 'nao', priority: 'critica', area: 'incidentes',
    title: 'Implementar processo formal de gestão de incidentes',
    effort: '3-4 semanas', impactPts: 20,
    prefilledTitle: 'Criar processo de gestão de incidentes',
    prefilledDescription: 'Definir processo formal de deteção, classificação, resposta e registo de incidentes de segurança.',
  },
  {
    questionId: 'i2', answer: 'nao', priority: 'critica', area: 'incidentes',
    title: 'Implementar notificação de incidentes às autoridades (NIS2/DORA)',
    effort: '2-3 semanas', impactPts: 18,
    prefilledTitle: 'Implementar procedimentos de notificação regulatória',
    prefilledDescription: 'Criar procedimentos para notificar incidentes significativos à CNCS/BdP nos prazos legais (24h notificação inicial, 72h relatório intermédio).',
  },
  {
    questionId: 'i3', answer: 'nao', priority: 'alta', area: 'incidentes',
    title: 'Criar registo de incidentes TIC com categorização de impacto',
    effort: '1-2 semanas', impactPts: 12,
    prefilledTitle: 'Criar registo de incidentes TIC',
    prefilledDescription: 'Implementar registo centralizado de incidentes TIC com campos de severidade, impacto, sistemas afetados e estado de resolução.',
  },
  {
    questionId: 'i4', answer: 'nao', priority: 'alta', area: 'incidentes',
    title: 'Agendar testes de penetração e resiliência operacional',
    effort: '4-8 semanas', impactPts: 15,
    prefilledTitle: 'Agendar teste de penetração anual',
    prefilledDescription: 'Contratar entidade especializada para realização de testes de penetração e avaliação de vulnerabilidades com periodicidade anual.',
  },
  {
    questionId: 'i6', answer: 'nao', priority: 'critica', area: 'incidentes',
    title: 'Implementar procedimento de notificação de violações de dados à CNPD',
    effort: '2 semanas', impactPts: 20,
    prefilledTitle: 'Procedimento de notificação de violações RGPD',
    prefilledDescription: 'Criar procedimento para deteção e notificação de violações de dados à CNPD em ≤72 horas e aos titulares quando necessário.',
  },
  // ── Privacidade ──────────────────────────────────────────────
  {
    questionId: 'priv1', answer: 'nao', priority: 'critica', area: 'privacidade',
    title: 'Criar Registo de Atividades de Tratamento (ROPA)',
    effort: '3-4 semanas', impactPts: 20,
    prefilledTitle: 'Criar Registo de Atividades de Tratamento',
    prefilledDescription: 'Elaborar e manter registo de todas as atividades de tratamento de dados pessoais conforme Art.30 RGPD.',
  },
  {
    questionId: 'priv2', answer: 'nao', priority: 'alta', area: 'privacidade',
    title: 'Implementar processo de DPIA para tratamentos de alto risco',
    effort: '4-6 semanas', impactPts: 15,
    prefilledTitle: 'Implementar processo de DPIA',
    prefilledDescription: 'Criar metodologia e templates para avaliação de impacto sobre proteção de dados para tratamentos de alto risco.',
  },
  {
    questionId: 'priv3', answer: 'nao', priority: 'alta', area: 'privacidade',
    title: 'Nomear Encarregado de Proteção de Dados (DPO)',
    effort: '2-3 semanas', impactPts: 15,
    prefilledTitle: 'Nomear DPO',
    prefilledDescription: 'Verificar obrigação de nomeação de DPO e, se aplicável, designar internamente ou contratar externamente.',
  },
  {
    questionId: 'priv5', answer: 'nao', priority: 'alta', area: 'privacidade',
    title: 'Atualizar banner de cookies e política de privacidade',
    effort: '2 semanas', impactPts: 12,
    prefilledTitle: 'Atualizar conformidade ePrivacy',
    prefilledDescription: 'Implementar solução de gestão de consentimento (CMP) conforme ePrivacy e atualizar política de privacidade.',
  },
  // ── Continuidade ─────────────────────────────────────────────
  {
    questionId: 'cont1', answer: 'nao', priority: 'critica', area: 'continuidade',
    title: 'Criar Plano de Continuidade de Negócio (PCN)',
    effort: '6-8 semanas', impactPts: 25,
    prefilledTitle: 'Criar Plano de Continuidade de Negócio',
    prefilledDescription: 'Desenvolver PCN completo incluindo BIA, estratégias de recuperação, procedimentos de ativação e comunicação.',
  },
  {
    questionId: 'cont2', answer: 'nao', priority: 'alta', area: 'continuidade',
    title: 'Realizar teste do Plano de Continuidade de Negócio',
    effort: '3-4 semanas', impactPts: 15,
    prefilledTitle: 'Testar PCN',
    prefilledDescription: 'Planear e executar exercício de teste do PCN (tabletop ou simulação real) e documentar resultados e lições aprendidas.',
  },
  {
    questionId: 'cont3', answer: 'nao', priority: 'alta', area: 'continuidade',
    title: 'Definir RTO e RPO para sistemas críticos',
    effort: '2-3 semanas', impactPts: 12,
    prefilledTitle: 'Definir objetivos de recuperação',
    prefilledDescription: 'Identificar sistemas críticos e definir Recovery Time Objective (RTO) e Recovery Point Objective (RPO) para cada um.',
  },
  // ── Denúncias ────────────────────────────────────────────────
  {
    questionId: 'den1', answer: 'nao', priority: 'critica', area: 'denuncias',
    title: 'Implementar canal de denúncias (Lei 93/2021)',
    effort: '3-4 semanas', impactPts: 22,
    prefilledTitle: 'Implementar canal de denúncias',
    prefilledDescription: 'Criar canal de denúncias interno (e externo se aplicável) conforme Lei 93/2021, com formulário seguro e garantia de confidencialidade.',
  },
  {
    questionId: 'den2', answer: 'nao', priority: 'alta', area: 'denuncias',
    title: 'Nomear responsável pelo tratamento de denúncias',
    effort: '1 semana', impactPts: 12,
    prefilledTitle: 'Nomear gestor de denúncias',
    prefilledDescription: 'Designar formalmente um responsável pelo tratamento de denúncias com independência e sem conflito de interesses.',
  },
  {
    questionId: 'den6', answer: 'nao', priority: 'alta', area: 'denuncias',
    title: 'Criar Plano de Prevenção de Riscos de Corrupção (PPRC)',
    effort: '4-6 semanas', impactPts: 18,
    prefilledTitle: 'Criar PPRC (MENAC)',
    prefilledDescription: 'Elaborar Plano de Prevenção de Riscos de Corrupção conforme orientações do MENAC e submetê-lo à aprovação do órgão de gestão.',
  },
  // ── Setorial ─────────────────────────────────────────────────
  {
    questionId: 'set8', answer: 'nao', priority: 'critica', area: 'setorial',
    title: 'Documentar sistemas de IA de alto risco (EU AI Act)',
    effort: '4-6 semanas', impactPts: 20,
    prefilledTitle: 'Documentar sistemas IA de alto risco',
    prefilledDescription: 'Catalogar e classificar sistemas de IA utilizados. Para sistemas de alto risco, elaborar documentação técnica conforme Anexo IV do EU AI Act.',
  },
  {
    questionId: 'set10', answer: 'nao', priority: 'alta', area: 'setorial',
    title: 'Iniciar relatório de sustentabilidade CSRD',
    effort: '8-12 semanas', impactPts: 15,
    prefilledTitle: 'Iniciar reporte CSRD/ESRS',
    prefilledDescription: 'Verificar obrigação de aplicação da CSRD e, se aplicável, iniciar processo de recolha de dados ESG para relatório de sustentabilidade conforme ESRS.',
  },
  {
    questionId: 'set6', answer: 'nao', priority: 'critica', area: 'setorial',
    title: 'Implementar procedimentos CDD/KYC (AML)',
    effort: '4-8 semanas', impactPts: 20,
    prefilledTitle: 'Implementar procedimentos KYC/CDD',
    prefilledDescription: 'Definir e implementar procedimentos de Customer Due Diligence e Know Your Customer conforme Lei 83/2017 de prevenção de branqueamento de capitais.',
  },
];

const PRIORITY_ORDER: Record<Recommendation['priority'], number> = {
  critica: 0, alta: 1, media: 2, baixa: 3,
};

function generateRecommendations(
  answers: WizardAnswers,
  activeQuestionIds: Set<string>,
): Recommendation[] {
  const recs: Recommendation[] = [];
  const seen = new Set<string>();

  for (const entry of REC_MAP) {
    if (!activeQuestionIds.has(entry.questionId)) continue;
    if (answers[entry.questionId] === entry.answer) {
      const key = `${entry.questionId}-${entry.answer}`;
      if (!seen.has(key)) {
        seen.add(key);
        recs.push({
          id: key,
          priority: entry.priority,
          area: entry.area,
          title: entry.title,
          effort: entry.effort,
          impactPts: entry.impactPts,
          dismissed: false,
          taskCreated: false,
          prefilledTitle: entry.prefilledTitle,
          prefilledDescription: entry.prefilledDescription,
        });
      }
    }
  }

  return recs.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

function exportCsv(recommendations: Recommendation[]) {
  const header = ['Prioridade', 'Área', 'Título', 'Esforço', 'Impacto (pts)'];
  const rows = recommendations
    .filter((r) => !r.dismissed)
    .map((r) => [
      PRIORITY_LABEL[r.priority],
      CATEGORY_LABELS[r.area],
      r.title,
      r.effort,
      String(r.impactPts),
    ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plano_acao_compliance.csv';
  a.click();
  URL.revokeObjectURL(url);
}

const LS_KEY = 'icomply_diagnostic_v2';
const LS_FW_KEY = 'icomply_diagnostic_frameworks_v2';

function loadAnswersFromStorage(): WizardAnswers | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadFrameworksFromStorage(): FrameworkKey[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_FW_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveToStorage(answers: WizardAnswers) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(answers));
  } catch {
    // ignore
  }
}

function saveFrameworksToStorage(frameworks: FrameworkKey[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_FW_KEY, JSON.stringify(frameworks));
  } catch {
    // ignore
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-primary h-2 rounded-full transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const maturity = getMaturity(score);
  return (
    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', maturity.bg, maturity.color)}>
      {maturity.label}
    </span>
  );
}

// ─── Step 0: Framework Selector ──────────────────────────────────────────────

function FrameworkSelector({
  selected,
  onConfirm,
}: {
  selected: FrameworkKey[];
  onConfirm: (keys: FrameworkKey[]) => void;
}) {
  const [draft, setDraft] = useState<FrameworkKey[]>(selected);

  function toggle(key: FrameworkKey) {
    setDraft((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function selectAll() {
    setDraft(FRAMEWORKS.map((f) => f.key));
  }

  function clearAll() {
    setDraft([]);
  }

  const totalQuestionsForDraft = getAllFilteredQuestions(draft).length;

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Passo 1 — Selecione os Frameworks Aplicáveis
            </h2>
            <p className="text-sm text-gray-500">
              Selecione os regulamentos e normas que se aplicam à sua organização. O diagnóstico será filtrado para mostrar apenas as questões relevantes para os frameworks escolhidos.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="text-xs text-primary hover:underline font-medium"
            >
              Selecionar todos
            </button>
            <span className="text-gray-300">·</span>
            <button
              onClick={clearAll}
              className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
            >
              Limpar
            </button>
          </div>
          <div className="text-sm text-gray-500">
            {draft.length} framework{draft.length !== 1 ? 's' : ''} selecionado{draft.length !== 1 ? 's' : ''}
            {draft.length > 0 && (
              <span className="ml-2 text-primary font-medium">
                · {totalQuestionsForDraft} questões
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Framework grid — grouped by category */}
      <div className="space-y-5">
        {FRAMEWORK_CATEGORIES.map((cat) => {
          const catFrameworks = FRAMEWORKS.filter((fw) => fw.category === cat.key);
          if (catFrameworks.length === 0) return null;
          const allCatSelected = catFrameworks.every((fw) => draft.includes(fw.key));
          return (
            <div key={cat.key}>
              {/* Category header */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{cat.icon}</span>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{cat.label}</span>
                </div>
                <div className="flex-1 h-px bg-gray-100" />
                <button
                  onClick={() => {
                    const keys = catFrameworks.map((fw) => fw.key);
                    if (allCatSelected) {
                      setDraft((prev) => prev.filter((k) => !keys.includes(k)));
                    } else {
                      setDraft((prev) => [...new Set([...prev, ...keys])]);
                    }
                  }}
                  className="text-xs text-primary hover:underline shrink-0"
                >
                  {allCatSelected ? 'Remover todos' : 'Selecionar todos'}
                </button>
              </div>
              {/* Frameworks in category */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {catFrameworks.map((fw) => {
                  const isSelected = draft.includes(fw.key);
                  const qCount = getAllFilteredQuestions([fw.key]).length;
                  return (
                    <button
                      key={fw.key}
                      onClick={() => toggle(fw.key)}
                      className={cn(
                        'text-left rounded-xl border-2 p-3 transition-all duration-150 hover:shadow-sm',
                        isSelected
                          ? `${fw.bgColor} ${fw.borderColor}`
                          : 'bg-white border-gray-200 hover:border-gray-300',
                      )}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <span className="text-xl leading-none">{fw.icon}</span>
                        {isSelected && (
                          <CheckCircle2 className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', fw.color)} />
                        )}
                      </div>
                      <div className={cn('text-xs font-bold leading-tight', isSelected ? fw.color : 'text-gray-900')}>
                        {fw.name}
                      </div>
                      <p className={cn('text-xs mt-0.5 leading-tight', isSelected ? fw.color : 'text-gray-500')}>
                        {fw.subtitle}
                      </p>
                      <p className="text-xs text-gray-400 mt-1.5">
                        {qCount} questõe{qCount !== 1 ? 's' : ''}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4">
        <div className="text-sm text-gray-500">
          {draft.length === 0 ? (
            <span className="text-amber-600 font-medium">Selecione pelo menos um framework para continuar</span>
          ) : (
            <span>
              O diagnóstico incluirá{' '}
              <strong className="text-gray-900">{totalQuestionsForDraft} questões</strong>{' '}
              distribuídas por {getFilteredCategories(draft).length} categorias.
            </span>
          )}
        </div>
        <button
          onClick={() => {
            if (draft.length > 0) {
              saveFrameworksToStorage(draft);
              onConfirm(draft);
            }
          }}
          disabled={draft.length === 0}
          className={cn(
            'flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all',
            draft.length > 0
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          )}
        >
          Iniciar Diagnóstico
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Tab 1: Diagnóstico Rápido ────────────────────────────────────────────────

function WizardTab({
  answers,
  selectedFrameworks,
  onAnswersChange,
  onComplete,
}: {
  answers: WizardAnswers;
  selectedFrameworks: FrameworkKey[];
  onAnswersChange: (a: WizardAnswers) => void;
  onComplete: () => void;
}) {
  const tDiag = useTranslations('diagnostic');
  const [catIdx, setCatIdx] = useState(0);

  const filteredCategories = getFilteredCategories(selectedFrameworks);
  const allFilteredQuestions = getAllFilteredQuestions(selectedFrameworks);
  const TOTAL_QUESTIONS = allFilteredQuestions.length;

  const category = filteredCategories[catIdx] ?? filteredCategories[0];

  const answeredCount = allFilteredQuestions.filter((q) => answers[q.id] != null).length;
  const progress = TOTAL_QUESTIONS > 0 ? Math.round((answeredCount / TOTAL_QUESTIONS) * 100) : 0;

  const catAnswered = category?.questions.filter((q) => answers[q.id] != null).length ?? 0;
  const catDone = category ? catAnswered === category.questions.length : false;

  function handleAnswer(qId: string, val: Answer) {
    const next = { ...answers, [qId]: val };
    onAnswersChange(next);
    saveToStorage(next);
  }

  function handleNext() {
    if (catIdx < filteredCategories.length - 1) {
      setCatIdx((i) => i + 1);
    } else {
      onComplete();
    }
  }

  const catScore = category ? categoryScore(answers, category) : 0;
  const overall = overallScore(answers, filteredCategories);

  if (!category) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
        <p className="text-gray-500">Sem questões para os frameworks selecionados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selected frameworks pill row */}
      <div className="flex items-center gap-2 flex-wrap">
        {selectedFrameworks.map((fk) => {
          const fw = FRAMEWORKS.find((f) => f.key === fk)!;
          return (
            <span
              key={fk}
              className={cn('text-xs font-medium px-2.5 py-1 rounded-full', fw.bgColor, fw.color)}
            >
              {fw.icon} {fw.name}
            </span>
          );
        })}
      </div>

      {/* Overall progress */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">Progresso geral</span>
          <div className="flex items-center gap-3">
            {answeredCount > 0 && (
              <span className="text-sm text-gray-500">{answeredCount}/{TOTAL_QUESTIONS} questões</span>
            )}
            <span className="text-sm font-bold text-primary">{progress}%</span>
          </div>
        </div>
        <ProgressBar value={progress} />

        {/* Category pills */}
        <div className="flex gap-2 flex-wrap mt-4">
          {filteredCategories.map((c, i) => {
            const done = c.questions.every((q) => answers[q.id] != null);
            const active = i === catIdx;
            return (
              <button
                key={c.key}
                onClick={() => setCatIdx(i)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-full font-medium border transition-all',
                  active
                    ? 'bg-primary text-white border-primary'
                    : done
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300',
                )}
              >
                {done && !active && <CheckCircle2 className="inline w-3 h-3 mr-1" />}
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Categoria {catIdx + 1} de {filteredCategories.length}
            </p>
            <h3 className="text-xl font-bold text-gray-900">{category.label}</h3>
          </div>
          {catAnswered > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{catScore}</div>
              <div className="text-xs text-gray-400">/ 100</div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {category.questions.map((q) => {
            const val = answers[q.id];
            return (
              <div key={q.id} className="rounded-lg border border-gray-100 p-4 bg-gray-50/50">
                <p className="text-sm font-medium text-gray-800 mb-3">{q.text}</p>
                <div className="flex gap-2">
                  {([
                    { v: 'sim' as Answer, label: tDiag('answers.yes'), active: 'bg-green-500 text-white border-green-500', inactive: 'border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-700' },
                    { v: 'parcial' as Answer, label: tDiag('answers.partial'), active: 'bg-yellow-400 text-white border-yellow-400', inactive: 'border-gray-200 text-gray-600 hover:border-yellow-300 hover:text-yellow-700' },
                    { v: 'nao' as Answer, label: tDiag('answers.no'), active: 'bg-red-500 text-white border-red-500', inactive: 'border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600' },
                  ]).map(({ v, label, active, inactive }) => (
                    <button
                      key={v}
                      onClick={() => handleAnswer(q.id, v)}
                      className={cn(
                        'flex-1 py-2 text-sm font-medium rounded-lg border-2 transition-all',
                        val === v ? active : inactive,
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCatIdx((i) => Math.max(0, i - 1))}
          disabled={catIdx === 0}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>

        {answeredCount > 0 && (
          <div className="text-center">
            <div className="text-sm text-gray-500">Score geral</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">{overall}</span>
              <ScoreBadge score={overall} />
            </div>
          </div>
        )}

        <button
          onClick={handleNext}
          disabled={!catDone}
          className={cn(
            'flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all',
            catDone
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          )}
        >
          {catIdx === filteredCategories.length - 1 ? (
            <>Ver Análise <Zap className="w-4 h-4" /></>
          ) : (
            <>Próxima categoria <ChevronRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Tab 2: Análise de Gaps ───────────────────────────────────────────────────

function GapTab({
  answers,
  selectedFrameworks,
}: {
  answers: WizardAnswers;
  selectedFrameworks: FrameworkKey[];
}) {
  const filteredCategories = getFilteredCategories(selectedFrameworks);
  const allFilteredQuestions = getAllFilteredQuestions(selectedFrameworks);

  const radarData = filteredCategories.map((c) => {
    const score = categoryScore(answers, c);
    return {
      subject: CATEGORY_LABELS[c.key],
      'Score Diagnóstico': score,
      'Score Alvo': TARGET_SCORE,
    };
  });

  const rows = filteredCategories.map((c) => {
    const score = categoryScore(answers, c);
    const gap = Math.max(0, TARGET_SCORE - score);
    return { cat: c, score, gap };
  }).sort((a, b) => b.gap - a.gap);

  const noAnswers = allFilteredQuestions.every((q) => answers[q.id] == null);

  if (noAnswers) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Complete o Diagnóstico Rápido para ver a análise de gaps.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Radar chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Radar de Maturidade</h3>
        <p className="text-sm text-gray-500 mb-4">Score atual por área vs. score alvo (80)</p>
        <div className="min-w-0">
          <ResponsiveContainer width="100%" height={340} className="md:!h-[340px] !h-[256px]">
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Radar
                name="Score Diagnóstico"
                dataKey="Score Diagnóstico"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Radar
                name="Score Alvo"
                dataKey="Score Alvo"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.08}
                strokeWidth={2}
                strokeDasharray="5 3"
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Tooltip formatter={(value: number) => [`${value}`, '']} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gap table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Tabela de Gaps por Área</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3">Área</th>
                <th className="text-center px-4 py-3 hidden md:table-cell">Score Atual</th>
                <th className="text-center px-4 py-3 hidden md:table-cell">Score Alvo</th>
                <th className="text-center px-4 py-3">Gap</th>
                <th className="text-center px-4 py-3">Prioridade</th>
                <th className="text-right px-6 py-3 hidden md:table-cell">Progresso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(({ cat, score, gap }) => {
                const severity = gap > 30 ? 'red' : gap > 15 ? 'amber' : 'green';
                const severityColors = {
                  red: { badge: 'bg-red-100 text-red-700', bar: 'bg-red-500', text: 'text-red-700' },
                  amber: { badge: 'bg-yellow-100 text-yellow-700', bar: 'bg-yellow-400', text: 'text-yellow-700' },
                  green: { badge: 'bg-green-100 text-green-700', bar: 'bg-green-500', text: 'text-green-700' },
                };
                const sc = severityColors[severity];
                const priorityLabel = gap > 30 ? 'Alta' : gap > 15 ? 'Média' : 'Baixa';
                return (
                  <tr key={cat.key} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-900">{cat.label}</td>
                    <td className="px-4 py-4 text-center hidden md:table-cell">
                      <span className={cn('font-bold text-lg', sc.text)}>{score}</span>
                    </td>
                    <td className="px-4 py-4 text-center text-gray-500 hidden md:table-cell">{TARGET_SCORE}</td>
                    <td className="px-4 py-4 text-center">
                      {gap > 0 ? (
                        <span className={cn('font-semibold', sc.text)}>-{gap}</span>
                      ) : (
                        <span className="text-green-600 font-semibold">✓</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={cn('text-xs px-2 py-1 rounded-full font-medium', sc.badge)}>
                        {priorityLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-24 bg-gray-200 rounded-full h-1.5">
                          <div
                            className={cn('h-1.5 rounded-full transition-all', sc.bar)}
                            style={{ width: `${Math.min(score, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-8 text-right">{score}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overall summary */}
      <div className="grid grid-cols-3 gap-4">
        {(() => {
          const overall = overallScore(answers, filteredCategories);
          const maturity = getMaturity(overall);
          const criticalAreas = rows.filter((r) => r.gap > 30).length;
          const okAreas = rows.filter((r) => r.gap <= 15).length;
          return (
            <>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
                <div className={cn('text-3xl font-bold mb-1', maturity.color)}>{overall}</div>
                <div className="text-sm text-gray-500">Score Global</div>
                <ScoreBadge score={overall} />
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
                <div className="text-3xl font-bold text-red-600 mb-1">{criticalAreas}</div>
                <div className="text-sm text-gray-500">Áreas Críticas</div>
                <div className="text-xs text-gray-400">gap &gt;30 pts</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">{okAreas}</div>
                <div className="text-sm text-gray-500">Áreas OK</div>
                <div className="text-xs text-gray-400">gap ≤15 pts</div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

// ─── Tab 3: Score por Framework ───────────────────────────────────────────────

function FrameworkScoresTab({
  answers,
  selectedFrameworks,
}: {
  answers: WizardAnswers;
  selectedFrameworks: FrameworkKey[];
}) {
  const allFilteredQuestions = getAllFilteredQuestions(selectedFrameworks);
  const noAnswers = allFilteredQuestions.every((q) => answers[q.id] == null);

  if (noAnswers) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Complete o Diagnóstico Rápido para ver os scores por framework.</p>
      </div>
    );
  }

  const fwScores = selectedFrameworks.map((fk) => {
    const fw = FRAMEWORKS.find((f) => f.key === fk)!;
    const score = frameworkScore(answers, fk);
    const maturity = getMaturity(score);
    const relevantQs = CATEGORIES.flatMap((c) =>
      c.questions.filter((q) => q.frameworks.includes(fk)),
    );
    const answeredCount = relevantQs.filter((q) => answers[q.id] != null).length;
    const gap = Math.max(0, TARGET_SCORE - score);
    return { fw, score, maturity, relevantQs, answeredCount, gap };
  }).sort((a, b) => b.score - a.score);

  const overallAvg = fwScores.length > 0
    ? Math.round(fwScores.reduce((sum, f) => sum + f.score, 0) / fwScores.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
          <div className={cn('text-3xl font-bold mb-1', getMaturity(overallAvg).color)}>{overallAvg}</div>
          <div className="text-sm text-gray-500">Score Médio</div>
          <ScoreBadge score={overallAvg} />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
          <div className="text-3xl font-bold text-green-600 mb-1">
            {fwScores.filter((f) => f.score >= TARGET_SCORE).length}
          </div>
          <div className="text-sm text-gray-500">Frameworks OK</div>
          <div className="text-xs text-gray-400">score ≥ {TARGET_SCORE}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
          <div className="text-3xl font-bold text-red-600 mb-1">
            {fwScores.filter((f) => f.score < 60).length}
          </div>
          <div className="text-sm text-gray-500">Atenção Urgente</div>
          <div className="text-xs text-gray-400">score &lt; 60</div>
        </div>
      </div>

      {/* Per-framework cards */}
      <div className="space-y-3">
        {fwScores.map(({ fw, score, maturity, relevantQs, answeredCount, gap }) => (
          <div
            key={fw.key}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
          >
            <div className="flex items-center gap-4">
              {/* Icon + name */}
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0', fw.bgColor)}>
                {fw.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-gray-900">{fw.name}</div>
                    <div className={cn('text-xs font-medium', fw.color)}>{fw.subtitle}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={cn('text-2xl font-bold', maturity.color)}>{score}</div>
                    <div className="text-xs text-gray-400">/ 100</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>{answeredCount} de {relevantQs.length} questões respondidas</span>
                    {gap > 0 ? (
                      <span className={cn(
                        'font-medium',
                        gap > 30 ? 'text-red-600' : gap > 15 ? 'text-amber-600' : 'text-yellow-600',
                      )}>
                        Gap: -{gap} pts para o alvo
                      </span>
                    ) : (
                      <span className="text-green-600 font-medium">Acima do alvo</span>
                    )}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 relative">
                    {/* Target marker at 80% */}
                    <div
                      className="absolute top-0 h-2.5 w-0.5 bg-gray-400 rounded-full z-10"
                      style={{ left: `${TARGET_SCORE}%` }}
                    />
                    <div
                      className={cn(
                        'h-2.5 rounded-full transition-all duration-500',
                        score >= TARGET_SCORE ? 'bg-green-500' : score >= 60 ? 'bg-yellow-400' : 'bg-red-500',
                      )}
                      style={{ width: `${Math.min(score, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <ScoreBadge score={score} />
                    {score >= TARGET_SCORE && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-1" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Export note */}
      <p className="text-xs text-gray-400 text-center">
        Os scores por framework são calculados com base nas questões respondidas no diagnóstico que se aplicam a cada norma.
        A linha vertical cinzenta na barra indica o score alvo de {TARGET_SCORE} pontos.
      </p>
    </div>
  );
}

// ─── Tab 4: Plano de Ação ─────────────────────────────────────────────────────

function ActionPlanTab({
  answers,
  selectedFrameworks,
}: {
  answers: WizardAnswers;
  selectedFrameworks: FrameworkKey[];
}) {
  const tDiag = useTranslations('diagnostic');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [creatingTaskFor, setCreatingTaskFor] = useState<string | null>(null);
  const [createdTasks, setCreatedTasks] = useState<Set<string>>(new Set());
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list-for-diagnostic'],
    queryFn: () => projectsApi.list({ limit: 100 }).then((r: any) => r.data?.data ?? []),
  });

  const activeQuestionIds = new Set(getAllFilteredQuestions(selectedFrameworks).map((q) => q.id));

  useEffect(() => {
    setRecommendations(generateRecommendations(answers, activeQuestionIds));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, selectedFrameworks.join(',')]);

  const createTaskMutation = useMutation({
    mutationFn: (rec: Recommendation) =>
      tasksApi.create({
        title: rec.prefilledTitle,
        description: rec.prefilledDescription,
        priority: rec.priority === 'critica' ? 'HIGH' : rec.priority === 'alta' ? 'HIGH' : rec.priority === 'media' ? 'MEDIUM' : 'LOW',
        projectId: selectedProjectId || undefined,
      }),
    onSuccess: (_, rec) => {
      setCreatedTasks((prev) => new Set([...prev, rec.id]));
      setRecommendations((prev) =>
        prev.map((r) => (r.id === rec.id ? { ...r, taskCreated: true } : r)),
      );
      setCreatingTaskFor(null);
    },
    onError: () => {
      setCreatingTaskFor(null);
    },
  });

  function dismiss(id: string) {
    setRecommendations((prev) => prev.map((r) => (r.id === id ? { ...r, dismissed: true } : r)));
  }

  function createTask(rec: Recommendation) {
    setCreatingTaskFor(rec.id);
    createTaskMutation.mutate(rec);
  }

  const visible = recommendations.filter((r) => !r.dismissed);
  const noAnswers = getAllFilteredQuestions(selectedFrameworks).every((q) => answers[q.id] == null);

  if (noAnswers) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
        <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Complete o Diagnóstico Rápido para gerar o plano de ação.</p>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <p className="text-gray-700 font-semibold">Excelente! Nenhuma ação pendente.</p>
        <p className="text-gray-400 text-sm mt-1">Todos os itens foram tratados ou ignorados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">
            {visible.length} recomendaç{visible.length === 1 ? 'ão' : 'ões'} pendente{visible.length !== 1 ? 's' : ''}
          </h3>
          <p className="text-sm text-gray-500">Ordenadas por prioridade</p>
        </div>
        <button
          onClick={() => exportCsv(recommendations)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors font-medium text-gray-700"
        >
          <Download className="w-4 h-4" /> {tDiag('exportPlan')}
        </button>
      </div>

      {/* Project selector — required to create tasks */}
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <Briefcase className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <label className="text-sm font-medium text-blue-800 whitespace-nowrap">Adicionar tarefas ao projeto:</label>
        {projects.length === 0 ? (
          <span className="text-sm text-blue-600 italic">Sem projetos disponíveis — crie um projeto primeiro em <a href="/action-plans" className="underline">Planos de Ação</a></span>
        ) : (
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="flex-1 border border-blue-200 bg-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">— Selecionar projeto —</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {visible.map((rec) => (
        <div
          key={rec.id}
          className={cn(
            'bg-white rounded-xl border border-gray-100 shadow-sm p-5 border-l-4',
            PRIORITY_BORDER[rec.priority],
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  className={cn(
                    'text-xs font-semibold px-2.5 py-0.5 rounded-full border',
                    PRIORITY_COLORS[rec.priority],
                  )}
                >
                  {PRIORITY_LABEL[rec.priority]}
                </span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
                  {CATEGORY_LABELS[rec.area]}
                </span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">{rec.title}</h4>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>
                  <span className="font-medium text-gray-700">Esforço:</span> {rec.effort}
                </span>
                <span>
                  <span className="font-medium text-gray-700">Impacto:</span>{' '}
                  <span className="text-primary font-semibold">+{rec.impactPts} pts</span> em{' '}
                  {CATEGORY_LABELS[rec.area]}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {rec.taskCreated || createdTasks.has(rec.id) ? (
                <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tarefa criada
                </span>
              ) : (
                <button
                  onClick={() => createTask(rec)}
                  disabled={creatingTaskFor === rec.id || !selectedProjectId}
                  title={!selectedProjectId ? 'Selecione um projeto acima primeiro' : undefined}
                  className="flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-1.5 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {creatingTaskFor === rec.id ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  {tDiag('createTask')}
                </button>
              )}
              <button
                onClick={() => dismiss(rec.id)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Ignorar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {recommendations.filter((r) => r.dismissed).length > 0 && (
        <p className="text-xs text-gray-400 text-center pt-2">
          {recommendations.filter((r) => r.dismissed).length} recomendaç
          {recommendations.filter((r) => r.dismissed).length === 1 ? 'ão ignorada' : 'ões ignoradas'}
          {' '}— não incluída{recommendations.filter((r) => r.dismissed).length !== 1 ? 's' : ''} na exportação
        </p>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = 'wizard' | 'gaps' | 'frameworks' | 'plan';
type Step = 'selector' | 'diagnostic';

function platformHealthToAnswers(health: any): WizardAnswers {
  const a: WizardAnswers = {};
  const { risks, policies, evidence, tasks, audits, training } = health ?? {};

  // ── Riscos ──────────────────────────────────────────────────
  if (risks) {
    if (risks.total > 0) a['r1'] = 'sim';
    if (risks.total > 0 && risks.reviewedRecently > 0) a['r2'] = 'sim';
    else if (risks.total > 0) a['r2'] = 'parcial';
    if (risks.total > 0) {
      const pct = risks.withMitigation / risks.total;
      a['r3'] = pct >= 0.8 ? 'sim' : pct > 0 ? 'parcial' : 'nao';
    }
    if (risks.total > 0) {
      a['r4'] = risks.withOwner / risks.total >= 0.8 ? 'sim' : risks.withOwner > 0 ? 'parcial' : 'nao';
    }
  }

  // ── Evidências ───────────────────────────────────────────────
  if (evidence) {
    if (evidence.total > 5) a['e1'] = 'sim';
    else if (evidence.total > 0) a['e1'] = 'parcial';
    if (evidence.total > 0 && evidence.withExpiry > 0) a['e2'] = 'sim';
    if (evidence.total > 0) a['e3'] = evidence.validPercent >= 80 ? 'sim' : evidence.validPercent >= 50 ? 'parcial' : 'nao';
  }

  // ── Tarefas ──────────────────────────────────────────────────
  if (tasks) {
    if (tasks.total > 0) a['t1'] = 'parcial';
    if (tasks.completionRate >= 70) a['t2'] = 'sim';
    else if (tasks.completionRate >= 40) a['t2'] = 'parcial';
    else if (tasks.total > 0) a['t2'] = 'nao';
  }

  // ── Auditorias ───────────────────────────────────────────────
  if (audits) {
    if (audits.internal > 0) a['a1'] = 'sim';
    if (audits.external > 0) a['a2'] = 'sim';
    if (audits.internal > 0 && audits.open === 0) a['a3'] = 'sim';
    else if (audits.internal > 0) a['a3'] = 'parcial';
  }

  // ── Políticas ────────────────────────────────────────────────
  if (policies) {
    if (policies.approved > 0) a['p1'] = 'sim';
    else if (policies.total > 0) a['p1'] = 'parcial';
    if (policies.reviewedRecently > 0) a['p2'] = 'sim';
  }

  // ── Formação ─────────────────────────────────────────────────
  if (training) {
    if (training.total > 0) { a['f1'] = 'sim'; a['f3'] = 'sim'; }
  }

  return a;
}

export default function DiagnosticPage() {
  const t = useTranslations('diagnostic');
  const [step, setStep] = useState<Step>(() =>
    loadFrameworksFromStorage() ? 'diagnostic' : 'selector',
  );
  const [selectedFrameworks, setSelectedFrameworks] = useState<FrameworkKey[]>(
    () => loadFrameworksFromStorage() ?? [],
  );
  const [activeTab, setActiveTab] = useState<Tab>('wizard');
  const [answers, setAnswers] = useState<WizardAnswers>(() => loadAnswersFromStorage() ?? {});
  const [wizardDone, setWizardDone] = useState(false);
  const [autoFilledCount, setAutoFilledCount] = useState(0);

  const { data: healthData } = useQuery({
    queryKey: ['diagnostic-platform-health'],
    queryFn: () => diagnosticsApi.platformHealth().then((r: any) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!healthData) return;
    const platformAnswers = platformHealthToAnswers(healthData);
    setAnswers((prev) => {
      const merged: WizardAnswers = { ...platformAnswers };
      // Manual answers always override platform-derived ones
      for (const [k, v] of Object.entries(prev)) {
        merged[k] = v;
      }
      const newCount = Object.keys(platformAnswers).filter(k => !(k in prev)).length;
      if (newCount > 0) setAutoFilledCount(newCount);
      return merged;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [healthData]);

  const filteredCategories = getFilteredCategories(selectedFrameworks);
  const allFilteredQuestions = getAllFilteredQuestions(selectedFrameworks);
  const answeredCount = allFilteredQuestions.filter((q) => answers[q.id] != null).length;
  const TOTAL_QUESTIONS = allFilteredQuestions.length;
  const isComplete = answeredCount === TOTAL_QUESTIONS && TOTAL_QUESTIONS > 0;
  const overall = overallScore(answers, filteredCategories);
  const maturity = getMaturity(overall);

  const handleComplete = useCallback(() => {
    setWizardDone(true);
    setActiveTab('gaps');
  }, []);

  function handleFrameworkConfirm(keys: FrameworkKey[]) {
    setSelectedFrameworks(keys);
    setStep('diagnostic');
    setAnswers({});
    setWizardDone(false);
    setActiveTab('wizard');
    if (typeof window !== 'undefined') localStorage.removeItem(LS_KEY);
  }

  function resetAll() {
    setAnswers({});
    setWizardDone(false);
    setActiveTab('wizard');
    setSelectedFrameworks([]);
    setStep('selector');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(LS_FW_KEY);
    }
  }

  function changeFrameworks() {
    setStep('selector');
    setAnswers({});
    setWizardDone(false);
    setActiveTab('wizard');
    if (typeof window !== 'undefined') localStorage.removeItem(LS_KEY);
  }

  const recCount = answeredCount > 0
    ? generateRecommendations(answers, new Set(allFilteredQuestions.map((q) => q.id))).filter((r) => !r.dismissed).length
    : 0;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'wizard', label: t('tabs.wizard'), icon: <ClipboardList className="w-4 h-4" /> },
    { key: 'gaps', label: t('tabs.gaps'), icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'frameworks', label: 'Por Framework', icon: <Shield className="w-4 h-4" /> },
    { key: 'plan', label: t('tabs.plan'), icon: <Zap className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Avalie o estado atual do seu programa de compliance e obtenha recomendações personalizadas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {answeredCount > 0 && (
            <div className={cn('text-center px-4 py-2 rounded-xl', maturity.bg)}>
              <div className={cn('text-xl font-bold', maturity.color)}>{overall}</div>
              <div className="text-xs text-gray-500">{maturity.label}</div>
            </div>
          )}
          {step === 'diagnostic' && (
            <button
              onClick={changeFrameworks}
              className="text-xs text-primary hover:text-primary/80 px-3 py-1.5 border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
            >
              Mudar frameworks
            </button>
          )}
          {answeredCount > 0 && (
            <button
              onClick={resetAll}
              className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('restart')}
            </button>
          )}
        </div>
      </div>

      {/* Auto-fill notice */}
      {autoFilledCount > 0 && step === 'diagnostic' && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          <span className="text-blue-500 mt-0.5 flex-shrink-0">⚡</span>
          <span>
            <span className="font-semibold">{autoFilledCount} respostas pré-preenchidas automaticamente</span> com base nos dados reais da plataforma (riscos, políticas, evidências, tarefas, auditorias e formações).
            As suas respostas manuais têm sempre prioridade.
          </span>
          <button onClick={() => setAutoFilledCount(0)} className="ml-auto text-blue-400 hover:text-blue-600 flex-shrink-0">✕</button>
        </div>
      )}

      {/* Step indicator — always visible */}
      <div className="flex items-center gap-3">
        <div className={cn(
          'flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full border',
          step === 'selector'
            ? 'bg-primary text-white border-primary'
            : 'bg-green-50 text-green-700 border-green-200',
        )}>
          {step === 'selector' ? (
            <span>1</span>
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          <span>Seleção de Frameworks</span>
          {step !== 'selector' && selectedFrameworks.length > 0 && (
            <span className="text-green-600 font-normal">
              ({selectedFrameworks.length})
            </span>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <div className={cn(
          'flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full border',
          step === 'diagnostic'
            ? 'bg-primary text-white border-primary'
            : 'bg-gray-50 text-gray-400 border-gray-200',
        )}>
          <span>2</span>
          <span>Diagnóstico</span>
        </div>
      </div>

      {/* ── Step 0: Framework Selector ── */}
      {step === 'selector' && (
        <FrameworkSelector
          selected={selectedFrameworks}
          onConfirm={handleFrameworkConfirm}
        />
      )}

      {/* ── Step 1+: Diagnostic tabs ── */}
      {step === 'diagnostic' && (
        <>
          {/* Resume banner */}
          {answeredCount > 0 && !isComplete && !wizardDone && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>
                  Diagnóstico em progresso — {answeredCount} de {TOTAL_QUESTIONS} questões respondidas.
                </span>
              </div>
              <button
                onClick={() => setActiveTab('wizard')}
                className="text-xs text-blue-700 underline hover:no-underline"
              >
                Continuar
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-1 overflow-x-auto whitespace-nowrap scrollbar-none">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px',
                    activeTab === tab.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                  )}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.key === 'plan' && answeredCount > 0 && recCount > 0 && (
                    <span className="text-xs bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center">
                      {recCount}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab content */}
          {activeTab === 'wizard' && (
            <WizardTab
              answers={answers}
              selectedFrameworks={selectedFrameworks}
              onAnswersChange={setAnswers}
              onComplete={handleComplete}
            />
          )}
          {activeTab === 'gaps' && (
            <GapTab answers={answers} selectedFrameworks={selectedFrameworks} />
          )}
          {activeTab === 'frameworks' && (
            <FrameworkScoresTab answers={answers} selectedFrameworks={selectedFrameworks} />
          )}
          {activeTab === 'plan' && (
            <ActionPlanTab answers={answers} selectedFrameworks={selectedFrameworks} />
          )}
        </>
      )}
    </div>
  );
}
