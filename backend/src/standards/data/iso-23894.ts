import { StandardDefinition } from '../standards.types';
import { fromRows } from './helpers';

const CHAPTERS: Record<string, string> = {
  '4': 'Cláusula 4 — Princípios',
  '5': 'Cláusula 5 — Enquadramento de gestão do risco',
  '6': 'Cláusula 6 — Processo de gestão do risco',
};

// ISO/IEC 23894:2023 — guidance on AI risk management (built on ISO 31000). Clause structure of
// the guidance; titles are plain-language paraphrases.
export const ISO_23894: StandardDefinition = {
  key: 'ISO_23894',
  name: 'ISO 23894',
  fullName: 'ISO/IEC 23894:2023 — Orientações para a gestão do risco de IA',
  domain: 'ai',
  module: 'aiGovernance',
  description: 'Orientações para integrar a gestão do risco nas atividades de IA, com base na ISO 31000.',
  scope: 'Checklist da estrutura da ISO/IEC 23894 (orientações, não certificável). Os riscos de cada sistema registam-se no módulo de Governação de IA.',
  requirements: fromRows(CHAPTERS, [
    ['4', 'Princípios da gestão do risco aplicados à IA'],
    ['5.2', 'Liderança e compromisso'],
    ['5.3', 'Integração da gestão do risco nas atividades da organização'],
    ['5.4.1', 'Conceção — compreender a organização e o seu contexto'],
    ['5.4.2', 'Conceção — articular o compromisso com a gestão do risco'],
    ['5.4.3', 'Conceção — atribuir funções, autoridades, responsabilidades e responsabilização'],
    ['5.4.4', 'Conceção — afetar recursos'],
    ['5.4.5', 'Conceção — estabelecer comunicação e consulta'],
    ['5.5', 'Implementação do enquadramento'],
    ['5.6', 'Avaliação do enquadramento'],
    ['5.7', 'Melhoria do enquadramento'],
    ['6.2', 'Comunicação e consulta'],
    ['6.3', 'Âmbito, contexto e critérios do risco'],
    ['6.4.2', 'Apreciação do risco — identificação do risco'],
    ['6.4.3', 'Apreciação do risco — análise do risco'],
    ['6.4.4', 'Apreciação do risco — avaliação do risco'],
    ['6.5', 'Tratamento do risco'],
    ['6.6', 'Monitorização e revisão'],
    ['6.7', 'Registo e relato'],
  ]),
};
