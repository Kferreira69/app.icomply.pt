# Registo de lacunas: o que o site diz vs o que a aplicação faz

Atualizado em 2026-10-01 (versão 1.1.0). Princípio do utilizador: **a aplicação faz tudo o que o site diz e muito mais; o que a aplicação faz a mais passa para o site.**

## O que o site diz e a aplicação faz (fechado na 1.1.0)
| Promessa do site | Estado |
|---|---|
| ISO 14001 no domínio ESG | Disponível (SGA completo) e ligado às métricas ESG |
| Qualidade: ISO 13485, ISO 22000 | Disponível (checklists + gestão documental) |
| Segurança: ISO 20000-1 | Disponível (checklist; incidentes/problemas/mudanças já existiam) |
| Privacidade: ISO 27018 | Disponível (checklist) |
| Terceiros: ISO 27036 | Disponível (checklist) |
| IA: NIST AI RMF, ISO 23894 | Disponível (checklists) |
| Controlo de documentos | Disponível para todas as normas ISO, com versões e aprovação |
| ISO 27002 | Disponível através da Declaração de Aplicabilidade (controlos do Anexo A) |

## O que o site diz e ainda **não** está completo
| Promessa do site | Estado real | Decisão |
|---|---|---|
| EU Taxonomy (domínio ESG) | **Roadmap** — não existe módulo | Marcar "em breve" no site, ou construir (próxima prioridade ESG) |
| ePrivacy (domínio Privacidade) | **Parcial** — diagnóstico e mapeamento de controlos, sem módulo dedicado | Descrever como "diagnóstico", ou construir checklist no motor genérico (baixo esforço) |
| RGPC (domínio Ética) | **Parcial** — diagnóstico e plano de ação | Idem |
| Verificação de identidade (KYC/KYB/sanções) | **Disponível em modo manual** (pedido registado e decidido por uma pessoa). Automática: depende de ligar um fornecedor (a escolher) e de o cliente aceitar as condições (taxa de arranque + preço por verificação) | Prometer o modo manual; a automática como "disponível mediante condições" |

## O que a aplicação faz e o site ainda **não** mostra
| Funcionalidade | Ação |
|---|---|
| **Continuidade e Resiliência** (ISO 22301, planos BCP/DR) — existe na aplicação, não tem cartão no site | Criar o cartão/página (domínio extra ou dentro de Segurança — decidir; pelo princípio de não duplicar, dentro de Segurança/Operações) |
| Gestão Documental, Pesquisa global, Anexos em Políticas | Conteúdo em `novas-normas-e-plataforma-1-1.md` |
| Gestão de Serviços de TI (incidentes, problemas, mudanças), iGuard, Automação, Aprovações, Trust Center, Portal de auditores externos | Confirmar se as páginas já os mencionam; senão, acrescentar nos domínios correspondentes |
| Catálogo público + formulários | Ligação em `INTEGRATION.md` |

## Como manter
Cada nova funcionalidade: alterar `catalog.data.ts`, escrever o conteúdo comercial em `docs/website/` e atualizar este registo. Rever o registo antes de cada versão.
