import { StandardDefinition } from '../standards.types';

const G = 'GOVERN — Governar';
const MP = 'MAP — Mapear';
const ME = 'MEASURE — Medir';
const MA = 'MANAGE — Gerir';

// NIST AI Risk Management Framework 1.0 — four functions and their categories. Titles are
// plain-language paraphrases; the framework text holds the subcategories.
export const NIST_AI_RMF: StandardDefinition = {
  key: 'NIST_AI_RMF',
  name: 'NIST AI RMF',
  fullName: 'NIST AI Risk Management Framework 1.0',
  domain: 'ai',
  module: 'aiGovernance',
  description: 'Gestão do risco de IA em quatro funções: governar, mapear, medir e gerir.',
  scope: 'Checklist das 19 categorias do NIST AI RMF 1.0 (voluntário). Complementa o EU AI Act e a ISO 42001; as subcategorias constam do documento do NIST.',
  requirements: [
    { clause: 'GOVERN 1', chapter: G, title: 'Políticas, processos e práticas para mapear, medir e gerir o risco de IA estão implementados' },
    { clause: 'GOVERN 2', chapter: G, title: 'Estruturas de responsabilização: equipas e pessoas capacitadas, responsáveis e formadas' },
    { clause: 'GOVERN 3', chapter: G, title: 'Diversidade, equidade, inclusão e acessibilidade na gestão do risco de IA' },
    { clause: 'GOVERN 4', chapter: G, title: 'Cultura organizacional que considera e comunica o risco de IA' },
    { clause: 'GOVERN 5', chapter: G, title: 'Envolvimento das partes relevantes (AI actors) e partes interessadas' },
    { clause: 'GOVERN 6', chapter: G, title: 'Políticas para riscos de software, dados e cadeia de fornecimento de terceiros' },
    { clause: 'MAP 1', chapter: MP, title: 'O contexto é estabelecido e compreendido' },
    { clause: 'MAP 2', chapter: MP, title: 'Categorização do sistema de IA' },
    { clause: 'MAP 3', chapter: MP, title: 'Capacidades, utilização prevista, objetivos, benefícios e custos esperados' },
    { clause: 'MAP 4', chapter: MP, title: 'Riscos e benefícios mapeados para todos os componentes, incluindo software e dados de terceiros' },
    { clause: 'MAP 5', chapter: MP, title: 'Impactos em pessoas, grupos, comunidades, organizações e sociedade' },
    { clause: 'MEASURE 1', chapter: ME, title: 'Métodos e métricas adequados identificados e aplicados' },
    { clause: 'MEASURE 2', chapter: ME, title: 'Avaliação das características de fiabilidade do sistema de IA (trustworthy)' },
    { clause: 'MEASURE 3', chapter: ME, title: 'Mecanismos para acompanhar os riscos de IA ao longo do tempo' },
    { clause: 'MEASURE 4', chapter: ME, title: 'Feedback sobre a eficácia da medição é recolhido e avaliado' },
    { clause: 'MANAGE 1', chapter: MA, title: 'Riscos de IA priorizados, tratados e geridos com base nas avaliações' },
    { clause: 'MANAGE 2', chapter: MA, title: 'Estratégias para maximizar benefícios e minimizar impactos negativos' },
    { clause: 'MANAGE 3', chapter: MA, title: 'Riscos e benefícios de entidades terceiras são geridos' },
    { clause: 'MANAGE 4', chapter: MA, title: 'Tratamentos de risco, resposta, recuperação e comunicação documentados e monitorizados' },
  ],
};
