# PACOTE COMPLETO PARA O CLAUDE CO-WORK — atualização do website icomply.pt

> **Este ficheiro é autónomo**: contém, na íntegra, todos os documentos de que o brief precisa (os nomes de ficheiro citados dentro de cada parte referem-se às secções abaixo). Não é preciso nenhum outro ficheiro. Gerado a partir de docs/website/ em 2026-10-05.

## Índice
- 1. Brief (ler primeiro)  (origem: BRIEF-COWORK.md)
- 2. Textos: novas normas, plataforma, KYC, formulários, FAQ  (origem: novas-normas-e-plataforma-1-1.md)
- 3. Textos: ESG e ISO 14001 (já aplicado; incluído para referência)  (origem: esg-iso-14001-gestao-ambiental.md)
- 4. Ligação técnica dos formulários  (origem: INTEGRATION.md)
- 5. Lacunas: o que o site diz vs o que a aplicação faz  (origem: lacunas-site-vs-app.md)



---

# PARTE 1. Brief (ler primeiro)

_(origem: BRIEF-COWORK.md)_

## Brief para o Claude Co-work — atualizar o website icomply.pt

> Documento autónomo: pode ser entregue tal como está. Data: 2026-10-02 (versão 1.1.0 do produto).

## 1. Objetivo e regras

O site promove o que a aplicação iComply faz e destaca, em termos comerciais, as vantagens para o cliente (comprar, usar e crescer à medida das necessidades). **Escrever pelo benefício, mas só afirmar o que a aplicação já faz.** Sem números de clientes, certificações ou resultados que não possam ser comprovados.

- Fonte de verdade do que existe: `GET https://api.icomply.pt/api/v1/public/catalog` (JSON, público). Cada norma tem `status`: `available` (existe), `partial` (existe em parte — ler `note`), `roadmap` (ainda não existe).
- Textos já escritos (PT-PT + EN) estão neste repositório, em `docs/website/`:
  - `esg-iso-14001-gestao-ambiental.md` — ISO 14001 dentro do domínio ESG (página ESG existente).
  - `novas-normas-e-plataforma-1-1.md` — 7 normas novas, Gestão Documental (incl. documentos partilhados entre normas), Pesquisa global, "comece com um domínio e cresça", formulários, notícia/LinkedIn, FAQ + JSON-LD, Verificação de Identidade.
  - `INTEGRATION.md` — como ligar os formulários do site à aplicação.
  - `lacunas-site-vs-app.md` — o que o site diz e a aplicação ainda não faz (e vice-versa).
- **Não criar domínios nem páginas duplicadas.** O preço do site é por domínio (Starter 1 domínio, Professional 3, Enterprise ilimitado; domínio extra desde 79 €/mês). Qualquer norma nova entra num domínio existente.

## 2. Alterações por página (resumo; os textos estão nos ficheiros acima)

| Onde | O que fazer | Texto em |
|---|---|---|
| Home — cartão 07 ESG | Acrescentar "Sistema de Gestão Ambiental ISO 14001" à descrição | `esg-iso-14001…` §1 |
| Home — bloco novo | "Comece com um domínio. Cresça à medida das suas necessidades." + botões [Pedir demonstração] [Sugerir uma funcionalidade] | `novas-normas…` topo e §5 |
| Página ESG | Título/meta, 4 cartões novos, secção "ISO 14001", frase "Meça uma vez, reporte duas", FAQ + JSON-LD | `esg-iso-14001…` §2–5, §9 |
| Página Qualidade e Operações | Acrescentar ISO 22000 e ISO 13485; "Controlo de documentos" para todas as normas | `novas-normas…` §1–2 |
| Página Segurança | Acrescentar ISO/IEC 20000-1 (gestão de serviços de TI) | `novas-normas…` §1 |
| Página Privacidade | Acrescentar ISO/IEC 27018 | `novas-normas…` §1 |
| Página Governança de IA | Acrescentar NIST AI RMF e ISO/IEC 23894 | `novas-normas…` §1 |
| Página Terceiros | Acrescentar ISO/IEC 27036 | `novas-normas…` §1 |
| Página Ética & Integridade | Verificação de identidade (KYC/KYB/sanções): "comece em modo manual, ative a verificação automática quando precisar" | `novas-normas…` (última secção) |
| Página de funcionalidades / plataforma | Gestão Documental, Pesquisa global | `novas-normas…` §2–3 |
| Preços | FAQ "Posso começar só com um domínio?" | `novas-normas…` §8 |
| Documentação → Domínios | Descrições dos domínios afetados | `esg-iso-14001…` §6 |
| Formulários (demonstração, sugerir funcionalidade, novidades) | Ligar a `POST /api/v1/public/leads` com consentimento RGPD e campo anti-bot | `INTEGRATION.md` |
| Notícias / LinkedIn | Publicar a notícia da versão 1.1 | `novas-normas…` §7 |
| EN (/en/) | Equivalente em inglês de tudo o acima | cada ficheiro, secção EN |

## 3. Corrigir o que o site diz e a aplicação ainda não faz (lacunas)

### 3.1 Taxonomia da UE — **não existe na aplicação (roadmap)**
O site lista a "Taxonomia UE" entre as normas do domínio ESG. A aplicação ainda não tem esse módulo.
- **Ação recomendada:** mantê-la na lista, mas marcada "em breve" (PT) / "coming soon" (EN); não usar em argumentos de venda nem em "O que está incluído".
- Texto sugerido (PT): "Taxonomia UE — em breve." / (EN): "EU Taxonomy — coming soon."
- Alternativa: retirar da lista até estar pronta.

### 3.2 ePrivacy e RGPC — **existem só em parte**
Há diagnóstico e mapeamento de controlos, mas não um módulo dedicado com checklist.
- **Ação:** descrever como diagnóstico, não como módulo completo.
- Texto sugerido (PT): "ePrivacy — diagnóstico e mapeamento de controlos." · "RGPC (Regime Geral de Prevenção da Corrupção) — diagnóstico e plano de ação."
- (EN): "ePrivacy — diagnostic and control mapping." · "Portuguese Anti-Corruption Regime (RGPC) — diagnostic and action plan."

### 3.3 Continuidade e Resiliência (ISO 22301) — **existe na aplicação e não aparece no site**
A aplicação tem planos de continuidade de negócio e recuperação de desastres (BCP/DR), com testes e ativos críticos, mas o site não tem cartão nem página.
- **Decisão de produto necessária (não decidir sozinho):** criar um 11.º domínio mudaria a unidade de preço do site (que é o domínio). **Recomendação por omissão: não criar domínio novo** — apresentá-la dentro do domínio 01 "Governança de Segurança" como capacidade.
- Texto sugerido para o domínio 01 (PT): **"Continuidade de negócio (ISO 22301)** — Planos de continuidade e de recuperação de desastres, ativos críticos e testes registados no mesmo sítio dos restantes controlos de segurança, para mostrar ao auditor que sabe o que fazer quando algo falha."
- (EN): **"Business continuity (ISO 22301)** — Continuity and disaster-recovery plans, critical assets and tests recorded alongside your other security controls, so you can show an auditor what happens when something fails."
- Acrescentar também "ISO 22301" à linha de normas do domínio 01 e ao FAQ/JSON-LD se existir.

### 3.4 Verificação de identidade (KYC/KYB/sanções)
Disponível em **modo manual** (pedido registado, decisão humana com fundamentação, sem custo adicional). A verificação **automática** por um fornecedor especializado depende de ligar um fornecedor e do cliente aceitar as condições (taxa de arranque + preço por verificação). **Apresentar a automática como "disponível mediante condições", nunca como incluída.**

## 4. Verificação final antes de publicar

- [ ] Nenhuma norma `roadmap` (Taxonomia UE) apresentada como disponível.
- [ ] ePrivacy/RGPC descritas como diagnóstico.
- [ ] Continuidade/ISO 22301 aparece dentro do domínio 01 (se não houver decisão em contrário).
- [ ] Nenhum domínio novo; preços inalterados.
- [ ] Formulários com política de privacidade, caixa de consentimento por marcar e campo anti-bot escondido.
- [ ] Versão EN equivalente.
- [ ] Comparar a lista final de normas com `GET /public/catalog`.

## 5. Para a equipa técnica (não é para o Co-work)

A API já aceita pedidos do browser vindos de `https://icomply.pt` e `https://www.icomply.pt` (nada a configurar). Os avisos de novos leads vão para `LEADS_NOTIFY_EMAIL` (opcional); os de suporte técnico para `support@icomply.pt`. Detalhes em `INTEGRATION.md`.


---

# PARTE 2. Textos: novas normas, plataforma, KYC, formulários, FAQ

_(origem: novas-normas-e-plataforma-1-1.md)_

## Website — Novas normas e plataforma (versão 1.1.0)

> Conteúdo **comercial**: cada texto fala do benefício para quem compra e assenta no que a aplicação faz hoje. Sem números de clientes, certificações ou resultados que não possam ser comprovados. Estado exato de cada norma: `GET /api/v1/public/catalog` (ver `INTEGRATION.md`).
> Português (PT-PT) primeiro, English a seguir.

## Mensagem central (usar na home, em preços e em todas as páginas de domínio)

**Comece com um domínio. Cresça à medida das suas necessidades.**
O iComply organiza a conformidade em 10 domínios de governança. Contrate o que precisa hoje — ISO 27001, RGPD, ISO 9001, ESG… — e acrescente outro domínio quando o negócio o pedir, sem migrar dados nem mudar de ferramenta: riscos, tarefas, evidências, documentos e auditorias já são partilhados por todos.

Três razões para escolher:
1. **Uma plataforma, não dez ferramentas.** Os mesmos riscos, evidências e controlos servem várias normas — trabalha uma vez, demonstra em várias.
2. **Pronto para o auditor.** Checklists por norma, documentos com versões e aprovação, evidência ligada ao requisito e portal para auditores externos.
3. **A plataforma cresce consigo — e consigo.** Diga-nos que norma ou funcionalidade falta (formulário "Sugerir funcionalidade"): o que pedir entra no roteiro.

---

# 🇵🇹 PORTUGUÊS

## 1. Sete novas normas (todas dentro dos domínios existentes — sem páginas nem domínios novos)

Cada norma chega com a checklist de requisitos completa, criada automaticamente para a sua organização, estado e evidência por requisito, responsável e prazo, score de conformidade e Gestão Documental própria.

| Norma | Domínio onde entra | Mensagem comercial |
|---|---|---|
| **ISO 22000** — Segurança alimentar | 08 Qualidade e Operações | Do plano HACCP à melhoria contínua: todos os requisitos da ISO 22000 com evidência à mão para a auditoria de certificação. |
| **ISO 13485** — Dispositivos médicos | 08 Qualidade e Operações | Sistema de gestão da qualidade para dispositivos médicos com rastreabilidade documental — controlo de registos e documentos sem folhas de cálculo soltas. |
| **ISO/IEC 20000-1** — Gestão de serviços de TI | 01 Segurança | Mostre que os seus serviços de TI são geridos por processos: checklist da norma ao lado de incidentes, problemas e mudanças. |
| **ISO/IEC 27018** — Proteção de dados pessoais na cloud | 02 Privacidade | Controlos para quem trata dados pessoais como prestador de serviços cloud — um argumento forte nos concursos e questionários de clientes. |
| **ISO/IEC 27036** — Segurança na cadeia de fornecimento | 06 Terceiros | Relações com fornecedores TIC com requisitos de segurança acordados e acompanhados, em linha com a gestão de risco de terceiros. |
| **NIST AI RMF** — Gestão de risco de IA | 03 Governança de IA | Estruture a gestão de risco dos seus sistemas de IA pelas quatro funções do NIST (governar, mapear, medir, gerir). |
| **ISO/IEC 23894** — Risco de IA | 03 Governança de IA | Processo de gestão de risco de IA alinhado com a ISO 31000, ligado ao inventário e às avaliações de impacto. |

**Texto curto para as páginas de cada domínio (exemplo — Governança de IA):** *Para além do EU AI Act e da ISO 42001, o domínio de IA inclui agora o NIST AI RMF e a ISO 23894: três referenciais, um só inventário de sistemas de IA e um único registo de riscos.*

## 2. Gestão Documental — para todas as normas ISO

**Título:** Os documentos do seu sistema de gestão, sempre sob controlo.
**Texto:** Manual, procedimentos, instruções, formulários e registos organizados por norma e cláusula, com o ficheiro real (Word, PDF, Excel…), histórico de versões e fluxo de aprovação — rascunho, em revisão, aprovado, obsoleto. **Quem carrega a versão não a pode aprovar**: separação de funções que o auditor espera ver.
**Benefícios:**
- **Um documento, várias normas.** O procedimento de controlo de documentos serve a ISO 9001, a ISO 14001 e a ISO 45001? Arquive-o uma só vez e partilhe-o: um só ficheiro, uma só versão, uma só aprovação — e aparece na lista de cada norma. Alterar um sítio atualiza todos; nunca mais cópias desencontradas por sistema de gestão.
- **Do módulo de cada norma, um clique.** As páginas de ISO 27001, 45001, 22301, 37001, 27701, 42001 e 14001 (e as checklists das normas novas) abrem diretamente os documentos dessa norma.
- Chega de "qual é a versão em vigor?": a versão aprovada é a única que aparece como vigente.
- Um auditor pede o procedimento da cláusula 7.5 e encontra-o em dois cliques.
- Cada pessoa vê apenas os documentos das normas a que o seu perfil dá acesso.
- As políticas também aceitam anexos com versões e aprovação.

## 3. Pesquisa global

**Título:** Encontre qualquer coisa em segundos.
**Texto:** Uma só pesquisa em toda a plataforma — páginas, políticas, documentos, riscos, tarefas, evidências, requisitos de cada norma, ajuda e vídeos. Perdoa gralhas e acentos, entende sinónimos e mostra primeiro as correspondências exatas, depois as parciais e por fim os assuntos relacionados. **Só mostra o que o seu perfil pode ver.**

## 4. ESG ↔ ISO 14001: meça uma vez, reporte duas

Ver `esg-iso-14001-gestao-ambiental.md` (secções 4 e 5). Frase de destaque: *O número que reporta na CSRD é o mesmo que o auditor da ISO 14001 vê no objetivo ambiental.*

## 5. Uma plataforma que cresce consigo (bloco para a home e para a página de preços)

**Título:** Pague pelo que usa hoje. Acrescente o que precisar amanhã.
**Texto:** Comece pelo domínio mais urgente. Quando surgir uma nova obrigação — uma certificação, um cliente que exige a ISO 27001, uma diretiva nova — acrescente o domínio correspondente e aproveite tudo o que já preencheu. A cada versão acrescentamos normas e funcionalidades, e muitas nascem de pedidos de clientes.
**Botões:** [Pedir demonstração] · [Sugerir uma funcionalidade]

## 6. Formulários do site (ligam diretamente à aplicação)

Detalhes técnicos em `INTEGRATION.md`. Textos:

**Pedir demonstração** — "Diga-nos o que precisa e mostramos-lhe o iComply com os seus casos reais."
Campos: nome*, email*, empresa, cargo, telefone, domínios de interesse (lista de 10), mensagem.
**Sugerir funcionalidade** — "Falta uma norma ou funcionalidade? Diga-nos. O que for pedido por várias organizações sobe no roteiro."
Campos: nome*, email*, empresa, domínio relacionado, descrição* da funcionalidade.
**Novidades** — "Receba as novidades do iComply (uma vez por mês, no máximo)." Campos: nome*, email*.

**Texto de consentimento (obrigatório, caixa por marcar):** *Li e aceito a [Política de Privacidade]. Autorizo a Contemporary Constellation a tratar os meus dados para responder a este pedido.* (O formulário de novidades deve ter consentimento próprio para comunicações.)
**Mensagem de sucesso:** *Recebemos o seu pedido. Entraremos em contacto em breve.*

## 7. Notícia / LinkedIn — versão 1.1.0

**Título:** iComply 1.1: sete novas normas, gestão documental e pesquisa global
**Texto:** A versão 1.1 acrescenta ao iComply a ISO 22000, ISO 13485, ISO/IEC 20000-1, ISO/IEC 27018, ISO/IEC 27036, o NIST AI RMF e a ISO/IEC 23894, a ISO 14001 no domínio ESG — com objetivos ambientais ligados às métricas CSRD/GRI —, a Gestão Documental com versões e aprovação para todas as normas ISO e uma pesquisa global. Cada norma entra num domínio existente: comece com um e cresça à medida das suas necessidades.
**LinkedIn (curto):** 🚀 iComply 1.1: ISO 22000, 13485, 20000-1, 27018, 27036, NIST AI RMF e ISO 23894; ISO 14001 ligada às métricas ESG; gestão documental com versões e aprovação; pesquisa global. Comece com um domínio e cresça consigo. Peça uma demonstração. #Compliance #ISO #GRC #iComply

## 8. FAQ (acrescentar à página de preços / geral) + JSON-LD

**Posso começar só com um domínio?** Sim. Contrate o domínio de que precisa agora e acrescente outros quando precisar — mantém tudo o que já registou.
**As novas normas custam extra?** Fazem parte do domínio onde entram (ver preços). *(Confirmar com a política de preços antes de publicar.)*
**Como peço uma norma ou funcionalidade que não existe?** Pelo formulário "Sugerir funcionalidade" ou através do suporte dentro da aplicação.
**O iComply certifica a minha organização?** Não. Ajuda a implementar, manter e demonstrar o sistema; a certificação é decidida por um organismo certificador acreditado.

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "Posso começar só com um domínio?",
      "acceptedAnswer": { "@type": "Answer", "text": "Sim. Contrate o domínio de que precisa agora e acrescente outros quando precisar, mantendo tudo o que já registou." } },
    { "@type": "Question", "name": "Como peço uma norma ou funcionalidade que não existe?",
      "acceptedAnswer": { "@type": "Answer", "text": "Através do formulário Sugerir funcionalidade no website ou do suporte dentro da aplicação." } }
  ]
}
```

---

# 🇬🇧 ENGLISH

**Core message:** *Start with one domain. Grow as your needs grow.* iComply organises compliance into 10 governance domains. Buy what you need today — ISO 27001, GDPR, ISO 9001, ESG — and add a domain when the business asks for it, with no data migration: risks, tasks, evidence, documents and audits are shared across all of them.

## 1. Seven new standards (inside existing domains)
Each comes with its full requirement checklist created automatically for your organisation, status and evidence per requirement, owner and due date, a compliance score and its own document control.
- **ISO 22000** (Food safety) — Quality & Operations: from the HACCP plan to continual improvement, with evidence at hand for your certification audit.
- **ISO 13485** (Medical devices) — Quality & Operations: a quality management system with document and record traceability, without loose spreadsheets.
- **ISO/IEC 20000-1** (IT service management) — Security: prove your IT services run on managed processes — checklist next to incidents, problems and changes.
- **ISO/IEC 27018** (PII protection in public clouds) — Privacy: controls for cloud service providers processing personal data — a strong answer to customer questionnaires.
- **ISO/IEC 27036** (Supplier relationships security) — Third Parties: agreed and tracked security requirements for ICT suppliers, alongside third-party risk management.
- **NIST AI RMF** — AI Governance: structure AI risk management around the four NIST functions (govern, map, measure, manage).
- **ISO/IEC 23894** (AI risk management) — AI Governance: an AI risk process aligned with ISO 31000, linked to the AI inventory and impact assessments.

## 2. Document Control for every ISO standard
Manual, procedures, instructions, forms and records organised by standard and clause, with the real file (Word, PDF, Excel…), version history and an approval workflow — draft, in review, approved, obsolete. **Whoever uploads a version cannot approve it.** Everyone sees only the documents of the standards their role allows. **One document, several standards:** a procedure shared by ISO 9001, ISO 14001 and ISO 45001 (document control, for instance) is filed once and shared — one file, one version history, one approval, listed under every standard it serves. Each standard's page links straight to its documents.

## 3. Global search
One search across the platform — pages, policies, documents, risks, tasks, evidence, each standard's requirements, help and videos. Forgives typos and accents, understands synonyms, and shows exact matches first, then partial ones, then related topics. It only shows what your role is allowed to see.

## 4. Grow with us (home / pricing block)
**Pay for what you use today. Add what you need tomorrow.** Start with your most urgent domain. When a new obligation appears — a certification, a customer asking for ISO 27001, a new directive — add the matching domain and keep everything you have already filled in. With every release we add standards and features, many of them requested by customers. [Request a demo] · [Suggest a feature]

## 5. News — version 1.1.0
**iComply 1.1: seven new standards, document control and global search.** Version 1.1 adds ISO 22000, ISO 13485, ISO/IEC 20000-1, ISO/IEC 27018, ISO/IEC 27036, NIST AI RMF and ISO/IEC 23894, ISO 14001 within the ESG domain — environmental objectives linked to CSRD/GRI metrics — plus document control with versions and approval for every ISO standard and a global search. Each standard joins an existing domain: start with one and grow as you need.

---

## Checklist
- [ ] Home — bloco "Comece com um domínio. Cresça à medida das suas necessidades" + botões
- [ ] Páginas dos domínios 01, 02, 03, 06 e 08 — acrescentar a(s) norma(s) nova(s) (secção 1)
- [ ] Página de Gestão Documental / funcionalidades (secção 2) e Pesquisa (secção 3)
- [ ] Formulários (demonstração, sugerir funcionalidade, novidades) ligados a `POST /api/v1/public/leads` + política de privacidade
- [ ] Renderização opcional dos cartões a partir de `GET /api/v1/public/catalog`
- [ ] Notícia / LinkedIn (secção 7), FAQ + JSON-LD (secção 8)
- [ ] Versão EN equivalente
- [ ] Rever lacunas em `lacunas-site-vs-app.md`

---

# Verificação de identidade (KYC · KYB · Sanções) — conteúdo comercial

**Título:** Conheça os seus clientes e parceiros sem depender de ninguém.
**Texto (PT):** Verifique pessoas e empresas e rastreie sanções e PEP a partir do iComply. **Comece já em modo manual** — o pedido fica registado, a sua equipa decide com fundamentação e tudo fica auditável, sem custos adicionais. Quando precisar de escala, **ative a verificação automática** por um fornecedor especializado: paga uma taxa de arranque única e depois apenas por verificação (pay-as-you-go), com preços claros e aceites por si antes de qualquer custo.
**Benefícios:**
- Sem fornecedor obrigatório: o módulo funciona desde o primeiro dia; a automatização é um passo opcional.
- Sem surpresas: as verificações automáticas só começam depois de um administrador aceitar as condições; as manuais nunca têm custo.
- Auditável: quem pediu, quem decidiu, quando e porquê; documento guardado mascarado.
**Rigor:** a verificação automática depende de ligar um fornecedor (em escolha) — apresentar como "disponível mediante condições", não como incluída.
**EN:** Know your customers and partners without depending on anyone. Start in manual mode today — requests are logged and your team decides with a documented rationale, at no extra cost. When you need scale, switch on automated verification: a one-off set-up fee, then pay-as-you-go per check, with clear prices you accept before any cost applies.


---

# PARTE 3. Textos: ESG e ISO 14001 (já aplicado; incluído para referência)

_(origem: esg-iso-14001-gestao-ambiental.md)_

## Website — ISO 14001 (Gestão Ambiental) dentro do domínio ESG & Sustentabilidade

> **Não é um domínio novo.** Na análise de desenvolvimento a ISO 14001 pertence ao domínio **ESG & Sustainability Governance** e o website já a lista no **Domínio de Governance 07 — Governança ESG e Sustentabilidade**. O que muda é que a aplicação passou a *ter* a ISO 14001 (versão **1.1.0**, outubro de 2026): este ficheiro traz os textos para **atualizar a página ESG existente** e os pontos afetados — sem criar página, cartão nem domínio duplicado.
> Português (PT-PT) primeiro, English a seguir. Só se descreve o que existe na aplicação.

## O que o site diz hoje e o que fazer

| Onde | Texto atual (resumo) | Ação |
|---|---|---|
| Home — cartão **07 Governança ESG e Sustentabilidade** | "Divulgações CSRD/ESRS, dupla materialidade, KPI ambientais e sociais." · "CSRD · ESRS · ISO 14001" | Atualizar a descrição (secção 1). A linha de normas **já está certa** |
| Página ESG — "Normas & leis cobertas" | CSRD, ESRS, ISO 14001, GRI, EU Taxonomy… | **Manter** |
| Página ESG — subtítulo | "Corra reporte CSRD e ESRS, dupla materialidade, KPI ambientais e sociais…" | Acrescentar o SGA (secção 2) |
| Página ESG — "O que está incluído" | 8 cartões; o único ambiental é "KPIs ambientais" | Acrescentar 4 cartões (secção 3) |
| Página ESG — legenda "Controlos partilhados: uma métrica de sustentabilidade evidencia a CSRD, os ESRS e a ISO 14001 — de uma só vez" | Promete ligação entre métricas e ISO 14001 | **Mantém-se verdadeira desde a 1.1.0**: os objetivos ambientais ligam-se às métricas ESG (secção 4 traz o texto comercial) |
| Página ESG — nova secção | — | Acrescentar "Sistema de Gestão Ambiental ISO 14001" (secção 5) |
| Documentação → Domínios de governança → ESG | "…Frameworks: CSRD, ESRS, ISO 14001, GRI, Taxonomia UE" | Atualizar o parágrafo (secção 6) |
| Página Qualidade & Operações — "Controlo de documentos" | "Documentos controlados versionados e aprovações" | Passa a servir **todas** as normas ISO (secção 7) |
| Preços | Domínio = unidade de preço | **Sem alteração**: a ISO 14001 faz parte do domínio ESG, não consome um domínio extra |
| Home — "Domínios" / menu | 10 domínios | **Sem alteração** |

### Pontos a confirmar antes de publicar
1. **Plano:** na aplicação o módulo ISO 14001 está no plano *Professional* (como o ESG). Confirmar que o texto de preços não o trata como domínio à parte.
2. **A frase dos "controlos partilhados"** (secção 4) — já é verdadeira: na aplicação um objetivo ambiental pode ser ligado a uma métrica ESG (CSRD/GRI) e passa a mostrar o valor atual dessa métrica.
3. **Capturas de ecrã** com dados fictícios (secção 8).

---

# 🇵🇹 PORTUGUÊS

## 1. Cartão 07 na home (descrição)
- **Atual:** Divulgações CSRD/ESRS, dupla materialidade, KPI ambientais e sociais.
- **Novo:** Divulgações CSRD/ESRS, dupla materialidade, KPI ambientais e sociais e Sistema de Gestão Ambiental ISO 14001.
- **Linha de normas:** `CSRD · ESRS · ISO 14001` *(já correta)*

## 2. Página ESG — metadados e subtítulo
- **Título da página (≤ 60 car.):** `ESG, CSRD e ISO 14001 | Governança ESG | iComply`
- **Meta descrição (≤ 155 car.):** `Reporte CSRD/ESRS e GRI e gira o seu Sistema de Gestão Ambiental ISO 14001: aspetos e impactos, objetivos e requisitos legais num só domínio.`
- **Subtítulo (substitui o atual):** Corra reporte CSRD e ESRS, dupla materialidade, KPI ambientais e sociais, divulgações de governança **e o seu Sistema de Gestão Ambiental ISO 14001** com evidência pronta para auditoria.

## 3. "O que está incluído" — 4 cartões novos
(acrescentar aos 8 existentes; manter o cartão "KPIs ambientais")

1. **Requisitos ISO 14001** — Checklist das cláusulas 4 a 10 com estado, evidência e score de conformidade.
2. **Aspetos e impactos ambientais** — Registo por atividade, com avaliação de significância (severidade × probabilidade) e controlos operacionais.
3. **Objetivos e metas ambientais** — Indicador, valor de partida, meta e prazo, com progresso à vista.
4. **Requisitos legais ambientais** — Leis e licenças aplicáveis, avaliação do cumprimento e alertas de avaliações em atraso.

## 4. Legenda "Controlos partilhados" — texto de substituição
- **Texto (verdadeiro desde a 1.1.0):** Meça uma vez, reporte duas. Ligue cada objetivo ambiental ISO 14001 à métrica ESG correspondente (energia, emissões, resíduos…): o valor que reporta na CSRD/GRI é o mesmo que o auditor da ISO 14001 vê no objetivo — sem reintroduzir números, sem divergências.
- *Rigor:* a ligação é feita por objetivo (escolhe a métrica); não é automática para todas as métricas. Quem não tem acesso ao ESG vê o valor guardado no objetivo, sem aceder aos dados ESG.

## 5. Nova secção na página ESG — "Sistema de Gestão Ambiental ISO 14001"

**Etiqueta:** ISO 14001
**Título:** Do KPI ao sistema de gestão ambiental
**Texto de abertura:** Para além do reporte de sustentabilidade, o domínio ESG inclui o Sistema de Gestão Ambiental (SGA): os registos que o auditor da ISO 14001 pede, num só lugar e sem folhas de Excel dispersas.

### 5.1 Requisitos ISO 14001
Checklist completa das cláusulas 4 a 10, criada automaticamente para a sua organização. Estado, evidência e notas por requisito, e score de conformidade sempre visível.
- 27 requisitos · implementado / parcial / não implementado / não aplicável · evidência e notas

### 5.2 Aspetos e impactos ambientais
Registe atividade, aspeto e impacto, em condição normal, anormal ou de emergência, e avalie severidade e probabilidade (1 a 5). A significância calcula-se automaticamente e os aspetos significativos ficam em destaque.
- Significativo a partir de 12 pontos (severidade × probabilidade), ou em emergência com severidade 4 ou mais · controlos operacionais, ciclo de vida, responsável e data de revisão

### 5.3 Objetivos e metas
Objetivos mensuráveis com indicador, unidade, valor de partida, meta e prazo. Atualize o valor atual e acompanhe o progresso — a reduzir (energia, resíduos) ou a aumentar (reciclagem).
- Barra de progresso · estados planeado, em curso, alcançado, não alcançado · objetivos fora de prazo destacados
- **Ligado às métricas ESG:** associe o objetivo a uma métrica CSRD/GRI e o valor atual passa a ser o da métrica — o mesmo número no reporte e no sistema de gestão.

### 5.4 Requisitos legais e outros requisitos
Leis, licenças e outros requisitos por categoria (resíduos, emissões, água, ruído, energia, químicos, licenças), com avaliação periódica do cumprimento.
- Cumpre / cumpre em parte / não cumpre · data da última avaliação registada automaticamente · avisos de avaliações em atraso

### 5.5 Documentos do SGA
Manual, procedimentos, instruções, formulários e registos organizados por cláusula, com ficheiro real (Word, PDF, Excel…), histórico de versões e aprovação (rascunho → em revisão → aprovado → obsoleto). **Quem carrega a versão não a pode aprovar.** A política ambiental gere-se em Políticas, com anexos e versões.

### Cobertura da ISO 14001:2015
| Cláusula | O que a norma pede | Onde no iComply |
|---|---|---|
| 4.1 – 4.4 | Contexto, partes interessadas, âmbito, sistema | Checklist de requisitos |
| 5.2 | Política ambiental | Políticas (anexos, versões, aprovação) |
| 5.3 | Funções e responsabilidades | Responsáveis nos registos; perfis e permissões |
| 6.1.1 | Riscos e oportunidades | Registo de Riscos |
| 6.1.2 | Aspetos ambientais | Aspetos e Impactos (significância) |
| 6.1.3 | Requisitos legais e outros | Requisitos Legais |
| 6.2 | Objetivos ambientais e planeamento | Objetivos e Metas |
| 7.2 – 7.3 | Competência e consciencialização | Formação (Pessoas) e Centro de Formação |
| 7.5 | Informação documentada | Gestão Documental (norma ISO 14001) |
| 8.1 | Planeamento e controlo operacionais | Controlos operacionais nos aspetos; Terceiros |
| 8.2 | Preparação e resposta a emergências | Aspetos em condição de emergência; checklist |
| 9.1.1 | Monitorização e medição | Indicadores e valor atual dos objetivos; KPIs ESG |
| 9.1.2 | Avaliação do cumprimento | Requisitos Legais |
| 9.2 | Auditoria interna | Auditoria & Garantia |
| 9.3 | Revisão pela gestão | Órgão de Gestão (reuniões e atas) |
| 10.2 | Não conformidade e ação corretiva | CAPA e Não Conformidades |
| 10.3 | Melhoria contínua | Objetivos, auditorias e CAPA |

*O iComply apoia a implementação e a manutenção do sistema; a certificação é concedida por um organismo certificador acreditado.*

## 6. Documentação → Domínios de governança → ESG & Sustentabilidade
**Descrição (substitui a atual):** Divulgações CSRD mapeadas a datapoints ESRS, dupla materialidade, KPI ambientais, métricas sociais e de governance, elegibilidade da Taxonomia UE e evidência pronta para assurance. Inclui o Sistema de Gestão Ambiental ISO 14001: requisitos, aspetos e impactos, objetivos e requisitos legais.
**Frameworks:** CSRD, ESRS, ISO 14001, GRI, Taxonomia UE. *(sem alteração)*

## 7. Gestão Documental — páginas dos outros domínios
- **Qualidade & Operações** ("Controlo de documentos"): *Documentos controlados com versões e aprovação, para a ISO 9001 e para todas as normas ISO de gestão (14001, 45001, 27001, 22301, 37001, 27701, 42001).*
- **Funcionalidades / plataforma** (se existir lista): Gestão Documental por norma ISO · Anexos nas Políticas (Word, PDF…) com versões e aprovação · Pesquisa global.

## 8. Material visual
1. Módulo ISO 14001 — painel com score, aspetos significativos, objetivos em atraso e requisitos legais (`/environment`).
2. Aspetos e Impactos — tabela com as etiquetas de significância e o cálculo em tempo real.
3. Objetivos e Metas — cartões com barras de progresso.
4. Gestão Documental — seletor "ISO 14001 · Ambiente" e documentos por cláusula.
Usar dados fictícios (ex.: "Consumo de energia elétrica", "Gestão de resíduos de embalagens").

## 9. Perguntas frequentes (acrescentar à página ESG)
**O iComply cobre a ISO 14001?** Sim, no domínio ESG & Sustentabilidade: checklist das cláusulas 4 a 10 e os registos centrais do sistema — aspetos e impactos, objetivos e requisitos legais. Documentos, auditorias internas, ações corretivas, riscos e revisão pela gestão usam os restantes módulos da plataforma.

**Como é calculada a significância dos aspetos ambientais?** Multiplicando a severidade pela probabilidade (escala de 1 a 5, máximo 25). Significativo a partir de 12 pontos, ou em emergência com severidade 4 ou superior. Os critérios estão visíveis no ecrã.

**Preciso de um domínio extra para a ISO 14001?** Não. Faz parte do domínio ESG & Sustentabilidade. *(confirmar com a política de preços)*

**Posso gerir a ISO 14001 e a ISO 9001 no mesmo sistema?** Sim, e é a grande vantagem. A Gestão Documental é única: manual, procedimentos e registos de todas as normas ficam no mesmo sítio, organizados por norma e cláusula, com versões e aprovação. Chega-se lá a partir de cada domínio (Ambiente, Qualidade, Segurança…), já filtrado pela norma em que está a trabalhar. Um procedimento comum a várias normas — por exemplo, o controlo de documentos — guarda-se uma só vez e é partilhado: um só ficheiro, uma só versão e uma só aprovação, visível nas listas de cada norma. Cada pessoa só vê os documentos que o seu perfil permite.

**Garante a certificação?** Não. A plataforma ajuda a implementar, manter e demonstrar o sistema; a certificação é decidida pelo organismo certificador.

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "O iComply cobre a ISO 14001?",
      "acceptedAnswer": { "@type": "Answer", "text": "Sim, no domínio ESG & Sustentabilidade: checklist das cláusulas 4 a 10 e os registos centrais do sistema — aspetos e impactos, objetivos e requisitos legais." } },
    { "@type": "Question", "name": "Como é calculada a significância dos aspetos ambientais?",
      "acceptedAnswer": { "@type": "Answer", "text": "Multiplicando a severidade pela probabilidade (escala de 1 a 5, máximo 25). Um aspeto é significativo a partir de 12 pontos, ou em emergência com severidade 4 ou superior." } },
    { "@type": "Question", "name": "O iComply garante a certificação ISO 14001?",
      "acceptedAnswer": { "@type": "Answer", "text": "Não. A plataforma ajuda a implementar, manter e demonstrar o sistema; a certificação é decidida por um organismo certificador acreditado." } }
  ]
}
```

## 10. Notícia / LinkedIn
**Título:** O domínio ESG do iComply passa a incluir a ISO 14001

O domínio ESG & Sustentabilidade deixa de ser só reporte: além das métricas CSRD/ESRS e GRI, inclui agora o Sistema de Gestão Ambiental ISO 14001 — checklist das cláusulas 4 a 10, aspetos e impactos ambientais com avaliação de significância, objetivos e metas, e requisitos legais com avaliação do cumprimento.

A mesma versão traz uma **Gestão Documental** única para todas as normas ISO (versões e aprovação) e uma **pesquisa global** que encontra qualquer palavra do conteúdo.

**LinkedIn (curto):**
🌿 O domínio ESG do iComply passa a incluir a ISO 14001: checklist das cláusulas 4 a 10, aspetos e impactos com significância, objetivos e metas, requisitos legais — e Gestão Documental com versões e aprovação para todas as normas ISO. Peça uma demonstração. #ISO14001 #ESG #GestãoAmbiental #iComply

---

# 🇬🇧 ENGLISH (for /en/ pages)

## 1. Home card 07 (description)
**New:** CSRD/ESRS disclosures, double materiality, environmental and social KPIs, and an ISO 14001 Environmental Management System. *(standards line "CSRD · ESRS · ISO 14001" stays)*

## 2. ESG page — metadata and subtitle
- **Title:** `ESG, CSRD and ISO 14001 | ESG Governance | iComply`
- **Meta description:** `Run CSRD/ESRS and GRI reporting and manage your ISO 14001 Environmental Management System — aspects and impacts, objectives and legal requirements — in one domain.`
- **Subtitle:** Run CSRD and ESRS reporting, double materiality, environmental and social KPIs, governance disclosures **and your ISO 14001 Environmental Management System** with audit-ready evidence.

## 3. "What's included" — 4 new cards
1. **ISO 14001 requirements** — Clause 4–10 checklist with status, evidence and a compliance score.
2. **Environmental aspects and impacts** — Register by activity, with significance scoring (severity × likelihood) and operational controls.
3. **Environmental objectives and targets** — Indicator, baseline, target and deadline, with progress at a glance.
4. **Environmental legal requirements** — Applicable laws and permits, compliance evaluation, and alerts for overdue evaluations.

## 4. Caption "Shared controls" — replacement
Measure once, report twice. Link each ISO 14001 environmental objective to its ESG metric (energy, emissions, waste…): the figure you report under CSRD/GRI is the one the ISO 14001 auditor sees on the objective — no re-keying, no mismatches. (The link is set per objective; users without ESG access see the objective's stored value only.)

## 5. New section — "ISO 14001 Environmental Management System"
**Title:** From KPI to environmental management system
Beyond sustainability reporting, the ESG domain includes the Environmental Management System (EMS): the records an ISO 14001 auditor asks for, in one place and without scattered spreadsheets.

- **ISO 14001 requirements:** complete clause 4–10 checklist created automatically for your organisation; status, evidence and notes per requirement; compliance score. (27 requirements)
- **Aspects and impacts:** record activity, aspect and impact under normal, abnormal or emergency conditions; score severity and likelihood (1–5); significance is calculated automatically (significant from 12 points, or an emergency with severity 4+).
- **Objectives and targets:** indicator, unit, baseline, target and deadline; update the current value and follow progress, whether reducing or increasing.
- **Legal and other requirements:** laws, permits and other requirements by category (waste, emissions, water, noise, energy, chemicals, permits) with periodic compliance evaluation and overdue alerts.
- **EMS documents:** manual, procedures, instructions, forms and records by clause, with real files, version history and an approval workflow; whoever uploads a version cannot approve it. The environmental policy lives in Policies, with attachments and versions.

*iComply supports implementing and maintaining the system; certification is granted by an accredited certification body.* (Clause coverage table: same as the Portuguese one.)

## 6. Documentation → ESG & Sustainability
Description: CSRD disclosures mapped to ESRS datapoints, double materiality, environmental KPIs, social and governance metrics, EU Taxonomy eligibility and assurance-ready evidence. Includes the ISO 14001 Environmental Management System: requirements, aspects and impacts, objectives and legal requirements.

## 7. Document control on other domain pages
Controlled documents with versions and approval for ISO 9001 and for every ISO management-system standard (14001, 45001, 27001, 22301, 37001, 27701, 42001).

## 8. News / LinkedIn
**ESG domain now includes ISO 14001.** Beyond CSRD/ESRS and GRI reporting, the ESG & Sustainability domain now covers the ISO 14001 Environmental Management System — clause 4–10 checklist, aspects and impacts with significance scoring, objectives and targets, and legal requirements with compliance evaluation — plus a single Document Control for every ISO standard and a global search.

**LinkedIn:** 🌿 The iComply ESG domain now includes ISO 14001: clause 4–10 checklist, aspects and impacts with significance scoring, objectives and targets, legal requirements — plus Document Control with versions and approval for every ISO standard. Request a demo. #ISO14001 #ESG #EnvironmentalManagement #iComply

---

## Checklist
- [ ] Home — descrição do cartão 07 (secção 1)
- [ ] Página ESG — metadados, subtítulo, 4 cartões, legenda dos controlos partilhados, nova secção, FAQ e JSON-LD (secções 2–5, 9)
- [ ] Documentação → Domínios de governança → ESG (secção 6)
- [ ] Qualidade & Operações — "Controlo de documentos" (secção 7)
- [ ] Versão EN equivalente
- [ ] Notícia / newsletter / LinkedIn (secção 10)
- [ ] Sitemap/meta tags da página ESG


---

# PARTE 4. Ligação técnica dos formulários

_(origem: INTEGRATION.md)_

## Ligação site ↔ aplicação

O site (icomply.pt) e a aplicação alimentam-se nos dois sentidos:

| Sentido | Mecanismo | Para quê |
|---|---|---|
| **Aplicação → site** | `GET /api/v1/public/catalog` | O site mostra o que a aplicação *realmente* faz hoje (domínios, normas, estado). Uma novidade na aplicação passa ao site sem reescrever texto. |
| **Site → aplicação** | `POST /api/v1/public/leads` | Pedidos de demonstração, contactos, sugestões de funcionalidades e novidades chegam à aplicação (backoffice → *Leads do site*) e, opcionalmente, por email. |

A fonte única do catálogo é `backend/src/public-catalog/catalog.data.ts`. **Regra:** quem acrescenta um módulo, domínio ou norma altera esse ficheiro na mesma alteração; os testes garantem que cada norma do motor genérico consta como disponível e que os módulos indicados existem.

## 1. Catálogo (aplicação → site)

`GET https://api.icomply.pt/api/v1/public/catalog` — sem autenticação, `Cache-Control: public, max-age=300`.

```json
{
  "version": "1.1.0",
  "released": "2026-10-01",
  "highlights": ["…"],
  "platform": ["Gestão Documental por norma ISO …", "…"],
  "totals": { "domains": 11, "standardsAvailable": "<n>", "standardsPartial": "<n>", "standardsRoadmap": "<n>" },
  "domains": [
    { "id": "esg", "number": "07", "name": "Governança ESG e Sustentabilidade",
      "tagline": "…", "capabilities": ["…"],
      "standards": [
        { "name": "ISO 14001", "status": "available", "note": "…" },
        { "name": "Taxonomia UE", "status": "roadmap" }
      ] }
  ]
}
```

- `status`: `available` (existe na aplicação), `partial` (existe em parte — ver `note`), `roadmap` (prometido, ainda não existe).
- `number: null` = domínio que existe na aplicação mas ainda não tem cartão no site (hoje: *Continuidade e Resiliência*, ISO 22301).
- O site **não deve** apresentar `roadmap` como disponível; deve usar "em breve" ou omitir.
- Uso recomendado: renderizar as listas de normas dos cartões/páginas de domínio a partir deste endpoint (com texto estático como alternativa se o pedido falhar).

## 2. Formulários (site → aplicação)

`POST https://api.icomply.pt/api/v1/public/leads` (JSON). Responde `201 {"received": true}`.

| Campo | Obrigatório | Notas |
|---|---|---|
| `type` | sim | `DEMO`, `CONTACT`, `FEATURE_REQUEST`, `NEWSLETTER` |
| `name` | sim | 2–120 car. |
| `email` | sim | email válido |
| `consent` | sim | **tem de ser `true`** — caixa por marcar no formulário, ao lado do link para a Política de Privacidade |
| `company`, `role`, `phone` | não | |
| `domains` | não | lista até 20 etiquetas (ex.: `["ESG","ISO 27001"]`) |
| `message` | `FEATURE_REQUEST`: sim | até 4000 car. |
| `sourceUrl`, `locale` | não | `locale`: `pt` ou `en` |
| `website` | — | **honeypot**: campo escondido por CSS, deve ir vazio. Se vier preenchido o pedido é descartado em silêncio |

Limites e segurança: 5 envios por 10 minutos por IP (HTTP 429 acima disso); campos desconhecidos são rejeitados; o texto é guardado como texto (escapado nas notificações).

Exemplo:

```js
await fetch('https://api.icomply.pt/api/v1/public/leads', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    type: 'DEMO', name, email, company, domains: ['ESG'],
    message, consent: checkbox.checked, locale: 'pt',
    sourceUrl: location.href, website: honeypot.value,
  }),
});
```

### Configuração necessária (por ambiente)
- **CORS: nada a configurar para o site.** A API já aceita pedidos vindos de `https://icomply.pt` e de `https://www.icomply.pt` (lista fixa em `backend/src/main.ts`). A variável `CORS_ORIGINS` só serve para acrescentar outros domínios (por exemplo, um site de pré-visualização).
- `LEADS_NOTIFY_EMAIL` (opcional): caixa que recebe um email por cada lead. Sem esta variável os leads ficam apenas no backoffice.

### RGPD
- Mostrar a Política de Privacidade e a caixa de consentimento (sem pré-marcar). A aplicação guarda a data do consentimento (`consentAt`).
- Finalidade: responder ao pedido. Comunicações de marketing/newsletter exigem consentimento próprio (usar `type: "NEWSLETTER"` com texto específico).
- Retenção (decidida): **24 meses após a última atividade** do lead (criação, mudança de estado ou nota), salvo se o email pertencer a um utilizador ou a um contacto de um cliente (relação de cliente ou utilizador gratuito). A aplicação apaga automaticamente, todos os dias às 03:15. Indicar este prazo na Política de Privacidade.
- Direitos dos titulares (acesso/apagamento): backoffice → *Leads do site* tem o botão de apagar um lead e "apagar tudo deste email".

### Tratamento no backoffice
Menu *Ferramentas → Leads do site* (apenas super-administradores da Contemporary Constellation): filtrar por estado/tipo, mudar o estado (`NEW → CONTACTED → QUALIFIED → CLOSED`) e registar notas. As **sugestões de funcionalidades** (`FEATURE_REQUEST`) alimentam o roteiro: o que for pedido por várias organizações sobe na prioridade e, quando entregue, volta ao site através do catálogo.

API de backoffice: `GET /api/v1/backoffice/leads?status=&type=` e `PATCH /api/v1/backoffice/leads/:id` (`{status?, notes?}`).


---

# PARTE 5. Lacunas: o que o site diz vs o que a aplicação faz

_(origem: lacunas-site-vs-app.md)_

## Registo de lacunas: o que o site diz vs o que a aplicação faz

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
