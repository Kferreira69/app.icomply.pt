import { StandardDefinition } from '../standards.types';

const CH = 'Anexo A — Controlos de proteção de dados pessoais em nuvem pública';

// ISO/IEC 27018:2019 — protection of PII in public clouds acting as PII processors. The checklist
// follows the eleven categories of the standard's Annex A; the individual controls are in the
// standard itself.
export const ISO_27018: StandardDefinition = {
  key: 'ISO_27018',
  name: 'ISO 27018',
  fullName: 'ISO/IEC 27018:2019 — Proteção de dados pessoais em nuvem pública (subcontratante)',
  domain: 'privacy',
  module: 'iso27701',
  description: 'Proteção de dados pessoais por prestadores de serviços em nuvem pública que atuam como subcontratantes.',
  scope: 'Checklist pelas 11 categorias do Anexo A da ISO/IEC 27018. Complementa a ISO 27701 e o RGPD; os controlos individuais constam da norma.',
  requirements: [
    { clause: 'A.2', chapter: CH, title: 'Consentimento e escolha', description: 'Apoiar o cliente no cumprimento dos direitos dos titulares dos dados.' },
    { clause: 'A.3', chapter: CH, title: 'Legitimidade e especificação da finalidade', description: 'Tratar os dados apenas para as finalidades do cliente, sem utilização comercial própria.' },
    { clause: 'A.4', chapter: CH, title: 'Limitação da recolha' },
    { clause: 'A.5', chapter: CH, title: 'Minimização de dados', description: 'Inclui a eliminação segura de ficheiros temporários.' },
    { clause: 'A.6', chapter: CH, title: 'Limitação de utilização, retenção e divulgação', description: 'Notificação e registo das divulgações de dados pessoais.' },
    { clause: 'A.7', chapter: CH, title: 'Exatidão e qualidade' },
    { clause: 'A.8', chapter: CH, title: 'Abertura, transparência e aviso', description: 'Divulgar ao cliente os subcontratantes envolvidos no tratamento.' },
    { clause: 'A.9', chapter: CH, title: 'Responsabilização', description: 'Notificação de violações, prazos de retenção de políticas, devolução, transferência e eliminação de dados.' },
    { clause: 'A.10', chapter: CH, title: 'Segurança da informação', description: 'Confidencialidade, cifra em trânsito, gestão de identificadores de utilizador, registos de restauro e suportes.' },
    { clause: 'A.11', chapter: CH, title: 'Conformidade com a privacidade', description: 'Localização geográfica e destino previsto dos dados pessoais.' },
  ],
};
