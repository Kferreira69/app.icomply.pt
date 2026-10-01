import { StandardDefinition } from '../standards.types';

const CH = 'Ciclo de vida da relação com fornecedores';

// ISO/IEC 27036 (information security for supplier relationships). The series is long and its
// clauses are normative text; this checklist follows the life-cycle processes the series is
// built around, without reproducing its clauses.
export const ISO_27036: StandardDefinition = {
  key: 'ISO_27036',
  name: 'ISO 27036',
  fullName: 'ISO/IEC 27036 — Segurança da informação nas relações com fornecedores',
  domain: 'third-parties',
  module: 'vendors',
  description: 'Segurança da informação ao longo do ciclo de vida da relação com fornecedores, incluindo cadeia de fornecimento TIC e nuvem.',
  scope: 'Checklist por processos do ciclo de vida da relação com fornecedores, alinhada com a série ISO/IEC 27036 (não reproduz as suas cláusulas). A avaliação dos fornecedores faz-se no módulo de Fornecedores.',
  requirements: [
    { clause: 'S1', chapter: CH, title: 'Estratégia e política para as relações com fornecedores' },
    { clause: 'S2', chapter: CH, title: 'Seleção do fornecedor e due diligence de segurança' },
    { clause: 'S3', chapter: CH, title: 'Requisitos de segurança da informação nos acordos e contratos' },
    { clause: 'S4', chapter: CH, title: 'Gestão da cadeia de fornecimento TIC e dos subcontratantes do fornecedor' },
    { clause: 'S5', chapter: CH, title: 'Acesso do fornecedor à informação e aos sistemas (privilégio mínimo)' },
    { clause: 'S6', chapter: CH, title: 'Monitorização do desempenho e da conformidade do fornecedor' },
    { clause: 'S7', chapter: CH, title: 'Gestão de incidentes de segurança que envolvem fornecedores' },
    { clause: 'S8', chapter: CH, title: 'Gestão de alterações do fornecedor e dos serviços prestados' },
    { clause: 'S9', chapter: CH, title: 'Serviços em nuvem: responsabilidades partilhadas e controlos do prestador' },
    { clause: 'S10', chapter: CH, title: 'Continuidade e saída: cessação, devolução e eliminação de dados' },
    { clause: 'S11', chapter: CH, title: 'Revisão periódica e melhoria da relação' },
  ],
};
