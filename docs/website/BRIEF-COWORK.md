# Brief para o Claude Co-work — atualizar o website icomply.pt

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
