# iComply — Persona Test Report
**Data:** 2026-06-18
**Scope:** 5 specialist personas × 15+ modules

## Executive Summary
This report documents usability testing from 5 specialist professional personas across the iComply GRC platform. Each persona reviewed modules relevant to their role and reported issues from their professional perspective.

**Personas tested:** CEO/Direção, DPO, CISO, Auditor Interno, Gestor de Risco

---

## CEO / Direção Executiva

### Critical Issues (blocking daily use)

**1. ScoreTrendChart uses hardcoded static data — never shows real compliance evolution**
`SCORE_TREND_6M` in `dashboard/page.tsx` (line 532–539) and `SCORE_TREND_6M` in `board-reports/page.tsx` (lines 50–57) are hardcoded arrays (`Jan: 62%, Fev: 68%...`). A CEO reviewing performance trends is seeing fabricated data, not actual organisational history. This is a blocker: the primary governance KPI shown to management is fictional. There is no API call backing these charts.

**2. `ScoreTrendChart` in Dashboard has no real data source — silently misleads**
The dashboard `ScoreTrendChart` component (lines 541–599) renders with hardcoded `SCORE_TREND` regardless of what the org has actually achieved. There is no prop or query feeding it real data. A CEO could make board decisions on false premises.

**3. Board Pack "Período" field is a free-text input — no date picker, no validation**
In `board-reports/page.tsx` the "Novo Board Pack" modal (line 1083) accepts `period` as a plain text `<input>`. A CEO entering "Q3 2025", "3T 2025", or "Julho–Setembro 2025" creates inconsistent identifiers. There is no quarter picker, no ISO period selector. Filtering and sorting reports by period becomes unreliable.

**4. Board Pack has no PDF export button on the actual pack detail view**
The "Relatórios" tab detail panel (lines 798–907) shows signoffs and stats but has no download/export button. The only print is a global `window.print()` on the page header. A CEO cannot extract an individual board pack as a standalone PDF for distribution to board members or regulators. The print CSS includes a hidden div with tables but that prints the entire page, not a specific pack.

**5. ESG module requires manual "Inicializar Métricas CSRD" seed — no automatic setup**
`esg/page.tsx` lines 351–355 show a seed button that only appears when `dashboard.totalMetrics === 0`. A new organisation or one after a data reset sees a blank state and must click an initialisation button before any metric data appears. In a real Portuguese organisation required to comply with CSRD by 2025, arriving at the ESG module and seeing "Sem métricas ESG" with no pre-populated framework structure would immediately block reporting work.

---

### High Issues (significant friction)

**6. Portfolio page has no sorting — projects appear in API insertion order**
`portfolio/page.tsx` fetches projects with `limit: 100` (line 162) but there is no sort control. A CEO with 20+ projects cannot order by RAG status (RED first), by compliance score, or by target date. The `filterRag` state only filters; no `sortBy` state exists.

**7. Board Reports "Itens de Ação" tab — "Delegar" links navigate to module list pages, not the specific item**
`actionItems` in `board-reports/page.tsx` (lines 221–242) set `href` values to `/capa`, `/risks`, `/audits` — top-level module pages. Clicking "Delegar" drops the CEO into a full module list. There is no deep link to the specific overdue CAPA or unowned risk in question.

**8. Dashboard `KpiCard` "trend" prop is passed but no API returns actual month-over-month delta**
`KpiCard` (line 108) accepts a `trend` and `vsLastMonth` prop, but none of the `KpiCard` invocations in the main page (lines 1189–1264) pass a `trend` value. The trend arrows are never shown. A CEO expecting "↑3 vs. mês anterior" on overdue tasks or open risks sees no comparative context at all.

**9. ESG MetricRow edit button is hover-only (`opacity-0 group-hover:opacity-100`)**
`esg/page.tsx` line 226: the pencil edit button has `opacity-0 group-hover:opacity-100`. On touch devices (iPad commonly used in board rooms) hover states do not trigger. A CEO or board member reviewing ESG metrics on a tablet cannot edit values.

**10. Board Reports trend chart hardcoded to ISO 27001 / GDPR / NIS2 regardless of organisation's frameworks**
`SCORE_TREND_6M` in `board-reports/page.tsx` (line 50–57) names three specific frameworks. An organisation using only DORA and ISO 22301 would see a trend chart for frameworks they do not use. The `LineChart` (lines 472–487) is bound to `iso27001`, `gdpr`, `nis2` keys in the static data object.

**11. Portfolio RAG narrative field — no character limit, no save confirmation**
`RagEditor` is used in `portfolio/page.tsx` (lines 69–74, 127–132) but the narrative text field has no visible character limit. There is no toast or inline confirmation after saving a status update. A CEO updating project status gets no feedback that the change persisted.

---

### Medium Issues (improvements)

**12. Dashboard "Personalizar" widget config is stored in localStorage, not user profile**
`LS_KEY = 'icomply-dashboard-widgets'` (line 65). Widget preferences are lost when the user switches browser, clears cache, or logs in from a different machine. A CEO's tailored view is not persistent across devices.

**13. `ModuleStatus` widget shows raw counts (e.g. "4 aprovadas") but no click-through to filtered view**
`module.href` in `ModuleStatus` (line 408) links to the top-level module, not a pre-filtered view. Clicking "Políticas — 4 aprovadas" opens `/policies` unfiltered. A CEO expects to land on the filtered "APPROVED" list.

**14. Board Reports "Sumário Executivo" tab — executive narrative/commentary field is absent**
There is no text field for the CEO or DPO to write a management commentary paragraph for the board pack. Board packs in Portuguese organisations typically require a formal CEO statement. The only narrative-like input is the title and period fields in the creation modal.

**15. ESG Reports list — no status-change workflow (from DRAFT to IN_REVIEW to PUBLISHED)**
`esg/page.tsx` lines 531–553: reports are displayed with their status badge but there is no button to advance the status. A CEO cannot approve and publish an ESG report from this screen; the status appears to be immutable after creation.

**16. Portfolio page has no "create new project" button**
`portfolio/page.tsx` contains only filter and view-toggle controls in the header. There is no `+ Novo Projeto` button. A CEO or their assistant cannot initiate a new compliance project from the portfolio view.

**17. Dashboard greeting uses emoji (`👋`) in a professional GRC platform context**
Line 1136: `{greeting()}, {user?.firstName} 👋`. In a tool used to generate board reports and regulatory documentation, emoji in the main interface header creates an inconsistent tone for enterprise and regulated-sector customers.

**18. ESG MetricModal "Período" field is a plain year text input**
`esg/page.tsx` line 43: `period: metric.period ?? String(new Date().getFullYear())` — shown as a text input in MetricModal line 67 (absent from the rendered form, it is set but not exposed to the user). The period is silently set to the current year; there is no field shown for the user to change it within the modal, making multi-year data entry ambiguous.

---

### Missing Features a CEO / Direção Executiva would expect

**19. No executive summary PDF export for a single board pack**
Individual packs cannot be exported as standalone PDFs with the organisation's letterhead, period cover page, and signoff page. `window.print()` prints the entire browser page including navigation.

**20. No comparison view between two reporting periods (e.g. Q1 2025 vs Q2 2025)**
The dashboard and board reports show only the current snapshot with a static 6-month trend based on hardcoded data. A CEO cannot select "compare Q1 to Q2" against real data.

**21. No "top management decisions required" notification/email digest**
The `SmartAlerts` component (lines 471–501) shows alerts in-app, but there is no mechanism to send a scheduled executive digest by email (weekly/monthly) summarising compliance status, overdue CAPAs, and critical risks for a CEO who does not log in daily.

**22. No calendar / regulatory deadline view**
There is no calendar widget or timeline showing upcoming regulatory deadlines (e.g. CSRD first reporting deadline, NIS2 notification windows, annual audit dates). The `ProximasAuditoriasWidget` shows next audits but not external regulatory milestones.

**23. No role-based CEO view — same dashboard shown to all users**
The dashboard is not adapted to the user's role. A CEO sees "My Tasks" (`MyTasksWidget` line 139) which is only relevant to operational users. A CEO would expect a role-filtered view showing no operational tasks but instead an escalations panel.

**24. ESG module lacks a materiality assessment tool**
CSRD and GRI require a double materiality assessment. There is no module, form, or structured input for recording stakeholder consultation results or material topics. The ESG module jumps straight to metric data entry without the upstream materiality step that Portuguese companies subject to CSRD must document.

**25. No board member user role — signoff recipients cannot access the platform**
In `board-reports/page.tsx` the `signerForm` (lines 873–878) collects name, email, and role for signatories. However, there is no indication that these external signatories can access a read-only board view or sign digitally through the platform. The `requestSignoffMutation` sends to `boardReportsApi.requestSignoff` but the signoff workflow (email link, signing portal) is opaque from the UI.

**26. Portfolio page shows no financial or budget information per project**
`PortfolioCard` and `PortfolioRow` show tasks count, risks count, compliance score, and target date. A CEO needs budget spent vs. allocated, estimated cost of non-compliance, and resource headcount per project.

---

### Quick Wins (easy to implement, high value)

**27. Replace hardcoded `SCORE_TREND` arrays with real API data**
Both `dashboard/page.tsx` (line 532) and `board-reports/page.tsx` (line 50) need the `SCORE_TREND_6M` constants replaced with data from `reportsApi.summary()` or a dedicated `/reports/trend` endpoint. This single fix removes the most serious misleading data issue and is purely a data-wiring change with no UI redesign needed.

**28. Add sort controls to Portfolio page**
Add a `sortBy` state (defaulting to `ragStatus` so RED appears first) with a simple `<select>` dropdown. Sort the `projects` array before rendering. Two-hour implementation, significant CEO value.

**29. Change "Delegar" action item links to deep links**
Pass the specific risk/CAPA ID in the `href` field of `actionItems` (lines 221–242) so clicking "Delegar" opens `/risks/{id}` or `/capa/{id}`. Zero UI change, just update the `href` construction.

**30. Add an "Exportar PDF" button to the board pack detail panel**
In the selected pack detail view (lines 798–907), add a button that triggers `window.print()` scoped to that pack's content section only (using a print-specific CSS class already partially present). The print layout tables are already coded at lines 914–1001; the gap is exposing this as a targeted action.

**31. Add `+ Novo Projeto` button to Portfolio page header**
A single `<Link href="/projects/new">` button in the Portfolio page header (around line 172) gives CEOs and project managers the ability to create projects from the portfolio view without navigating away.

**32. Show ESG status-advance buttons on report list items**
In the ESG Reports tab (lines 531–553), add "Submeter para Revisão" and "Publicar" buttons alongside each report card depending on current status. This unblocks the CSRD reporting workflow with a minimal UI addition.

**33. Persist dashboard widget config to user profile via API**
Replace the `localStorage.setItem(LS_KEY, ...)` call (line 1075) with a `PATCH /users/me/preferences` API call. The UI state management code is already correct; only the persistence layer needs updating.

---

## DPO (Data Protection Officer)

### Critical Issues (blocking daily use)

**1. ROPA — Dados de entrada por CSV livre impossibilitam qualidade dos dados**
O `ActivityModal` aceita `dataCategories`, `dataSubjects` e `recipients` como texto livre separado por vírgulas (ex: `form.dataCategories` com `splitCsv()`). Na prática, o DPO vai ter "dados pessoais, nome, email" de um utilizador e "Dados Pessoais, Nome, Email" de outro — sem normalização. Não existe picker/dropdown com categorias RGPD padronizadas (Art. 9 para dados especiais, Art. 4 para categorias comuns). O ROPA torna-se inutilizável para auditoria da CNPD.

**2. Violações de dados — Sem campo para data/hora de notificação à CNPD (Art. 33 RGPD)**
O `BreachModal` não tem campo `supervisoryAuthorityNotifiedAt`. A coluna "Notif. CNPD" existe na tabela `BreachesTab` (linha 686: `b.supervisoryAuthorityNotifiedAt`) mas não há forma de registar essa data. Não é possível provar cumprimento do prazo de 72h sem este campo. Bloqueia toda a evidência documental perante a autoridade.

**3. Violações de dados — Sem campo "Notificação aos titulares" (Art. 34 RGPD)**
O `BreachModal` não inclui: se os titulares foram notificados, quando, por que meio, e texto da comunicação. Para violações de risco elevado, a notificação aos titulares é obrigatória. O sistema não permite registar esta etapa.

**4. DSARs — Sem possibilidade de registar verificação de identidade**
O campo `PENDING_VERIFICATION` existe como estado, mas o `DsarModal` não inclui campos para: método de verificação utilizado, documento apresentado, data de verificação, ou quem verificou. Sem evidência documental de verificação de identidade, qualquer DSAR de acesso pode expor dados a terceiros não autorizados.

**5. ISO 27701 — Transferências e sub-processadores guardam em localStorage**
`useLocalStorage<DataTransfer>('iso27701_transfers', [])` e `useLocalStorage<SubProcessor>('iso27701_subprocessors', [])` — estes dados críticos de compliance existem apenas no browser local. Apagar cache, mudar de computador ou abrir em incógnito apaga tudo. Não existe backend para estas entidades. Para uma auditoria ISO 27701 ou inspeção CNPD, estes registos seriam considerados inexistentes.

**6. Consentimentos — Sem suporte a recolha granular por finalidade**
O `ConsentModal` tem um campo `purpose` (texto livre). Na realidade, uma organização tem múltiplas finalidades (marketing, newsletter, analytics, remarketing) e o titular deve poder consentir em cada uma separadamente (Art. 7 RGPD + Recital 32). O modelo actual regista um consentimento por finalidade como entradas separadas sem relação entre si — não há visão agregada do perfil de consentimento de um titular.

---

### High Issues (significant friction)

**7. ROPA — Sem campo "Responsável pelo tratamento" e "DPO da atividade"**
O `ActivityModal` tem `processorName` (subcontratante) mas não tem: nome do responsável pelo tratamento interno (controller), departamento responsável, e DPO responsável pela atividade. O Art. 30 RGPD exige identificação do responsável. O campo `dpoConsulted` (checkbox) não substitui o registo do DPO.

**8. ROPA — Sem campo para medidas de segurança técnicas e organizacionais**
O Art. 30(1)(g) exige "descrição geral das medidas de segurança técnicas e organizacionais". O `ActivityModal` não tem este campo. O ROPA está incompleto para efeitos legais.

**9. ROPA — Sem campo para base legal de transferência quando `internationalTransfers: true`**
O modal mostra o campo `transferSafeguards` (textarea livre) apenas quando `internationalTransfers` está activo, mas não pergunta a safeguard específica de forma estruturada — não existe dropdown com SCC, BCR, Adequacy Decision, Art. 49. O campo `transferCountries` também é texto livre sem validação.

**10. DSARs — Sem registo do canal de entrada do pedido**
O `DsarModal` não tem campo para: canal de recepção (email, formulário web, carta, presencial), referência interna do pedido, ou número de processo. Numa organização portuguesa, cada DSAR precisa de número de registo para rastreabilidade.

**11. DPIA — Sem campo para "consulta prévia à autoridade" (Art. 36 RGPD)**
O `DpiaModal` não tem: resultado da DPIA (aprovada/rejeitada), campo para indicar se foi necessária consulta prévia à CNPD, referência à resposta da CNPD, ou campo para data de aprovação. O campo `outcome` é lido na tabela (`d.outcome`) mas não aparece no modal de criação/edição.

**12. DPIA — Sem ligação ao ROPA**
Não existe campo no `DpiaModal` para associar a DPIA a uma atividade do ROPA. As duas entidades são completamente desligadas, o que impede rastreabilidade entre atividades de risco elevado e as suas avaliações.

**13. Vendors — Assessment por slider (0-100) é cientificamente inválido**
O `AssessmentModal` usa `<input type="range">` para o score. Este mecanismo é subjetivo e não auditável. Uma avaliação de fornecedor para fins Art. 28 RGPD precisa de critérios específicos (gestão de incidentes, encriptação, controlo de acesso, subcontratantes, etc.). O score derivado automaticamente (`score >= 80 ? 'LOW'`) sem metodologia documentada não tem validade perante auditor.

**14. Denúncias — Sem atribuição de investigador**
No `AnalysisTab`, o campo "Responsável atribuído" é read-only (`r.assignedTo`). Não existe botão ou dropdown para atribuir um investigador a partir desta vista. O DPO não consegue delegar casos diretamente.

---

### Medium Issues (improvements)

**15. ROPA — Sem filtros ou pesquisa na lista de atividades**
A `RopaTab` mostra uma tabela sem pesquisa por texto, filtro por base legal, filtro por estado, ou filtro por transferências internacionais. Com 50+ atividades, encontrar uma entrada específica requer scroll manual.

**16. ROPA — Sem indicador visual de atividades com transferências internacionais**
A tabela do ROPA não tem coluna ou ícone a indicar quais atividades têm `internationalTransfers: true`. Para o DPO fazer revisão periódica de Chapter V, tem de abrir cada entrada.

**17. Consentimentos — Sem pesquisa ou filtro por titular**
A `ConsentTab` não tem barra de pesquisa. Quando um titular envia um pedido de revogação ou DSAR, o DPO não consegue localizar rapidamente os seus consentimentos. Criticamente, não existe filtro "a expirar nos próximos X dias" (embora exista o KPI, não filtra a tabela).

**18. DSARs — Sem exportação para Word/PDF para resposta ao titular**
O `DsarTab` não tem botão de exportação. Para cumprir Art. 12(3), a resposta ao titular deve ser em formato compreensível. O DPO tem de criar manualmente o documento de resposta.

**19. Violações — Sem template de notificação à CNPD**
Não existe botão "Preparar notificação CNPD" que pré-preencha os campos obrigatórios do formulário da CNPD (descrição da violação, categorias, número estimado de titulares, consequências prováveis, medidas tomadas). O DPO tem de duplicar informação manualmente.

**20. Vendors — Campo `countries` é texto livre sem validação ISO**
`VendorModal` tem `transferCountries` como input de texto com placeholder "PT, ES, EUA". Não existe picker de países com códigos ISO, não diferencia EEE de terceiros países, e não alerta quando um país não tem decisão de adequação.

**21. Denúncias — MENAC export é JSON, não o formato oficial**
O botão "Exportar JSON" no `MenacTab` gera `menac-${year}.json`. O sistema MENAC da CNPD e do MEIC aceita formatos específicos. Um JSON genérico não é o ficheiro de reporte oficial.

**22. ISO 27701 — Sem campo de data de última revisão nos controlos**
O `EditModal` para controlos ISO 27701 não tem campo de data de última verificação/revisão. Para auditoria de certificação, cada controlo precisa de data de implementação e data de verificação.

---

### Missing Features a DPO (Data Protection Officer) would expect

**23. Registo de consultas à CNPD**
Não existe módulo para registar comunicações com a autoridade de supervisão: consultas prévias (Art. 36), respostas a pedidos de informação, notificações de violação enviadas, e decisões recebidas.

**24. Modelo de Políticas de Privacidade com versionamento**
Não existe módulo para gerir versões de Políticas de Privacidade, Avisos de Privacidade, e Políticas de Retenção. O DPO precisa de rastrear qual versão estava em vigor em cada data (relevante para DSARs históricos).

**25. Ligação entre Consentimentos e DSARs**
Quando chega um DSAR de apagamento, o DPO devia conseguir ver imediatamente todos os consentimentos ativos do titular. As duas entidades (`gdprApi.consent` e `gdprApi.dsar`) não têm relação visível no UI.

**26. Registo de Acordos de Processamento de Dados (DPA) como documentos**
O `SubProcessorModal` tem `dpaInPlace: boolean` (checkbox). Não é possível anexar o DPA, registar a data de assinatura, a versão SCCs utilizadas, ou a data de revisão. Para fornecedores que usam SCCs da Comissão Europeia de 2021, é necessário registar qual módulo (1, 2, 3, ou 4).

**27. Análise de impacto de violação por atividade ROPA**
Quando ocorre uma violação, o DPO devia conseguir selecionar quais atividades ROPA foram afetadas e o sistema calcular automaticamente o número máximo de titulares impactados, cruzando com `dataSubjects` da atividade.

**28. Dashboard de datas de revisão periódica**
Não existe calendário ou lista de próximas revisões obrigatórias: revisão anual do ROPA, revisão de DPIAs, renovação de contratos de fornecedores, expiração de SCCs, renovação de consentimentos.

**29. Relatório RGPD em formato PDF exportável**
Não existe botão "Gerar Relatório RGPD" que produza um PDF com: sumário do ROPA, status das DPIAs, violações do ano, estatísticas DSARs, e estado de compliance — para apresentar à Administração ou a auditores externos.

---

### Quick Wins (easy to implement, high value)

**30. Adicionar campo `supervisoryAuthorityNotifiedAt` ao `BreachModal`**
É um campo `datetime-local` simples. Sem custo de desenvolvimento elevado. Elimina o bloqueio crítico do ponto 2. A coluna já existe na tabela, apenas falta o campo de entrada.

**31. Converter `dataCategories` e `dataSubjects` no `ActivityModal` para chips/tags com lista predefinida**
Substituir o campo de texto livre por um multi-select com categorias RGPD standard (dados comuns: nome, email, NIF, morada; dados especiais Art. 9: saúde, origem racial, opiniões políticas, etc.). Mantém retrocompatibilidade — aceita texto livre mas sugere valores padronizados.

**32. Mover dados de transferências e sub-processadores do `localStorage` para o backend**
Criar endpoints equivalentes aos de `gdprApi.activities`. Impede perda de dados. É a alteração de maior impacto por menor esforço relativo dado que o padrão já existe no código.

**33. Adicionar pesquisa/filtro à `RopaTab` e `ConsentTab`**
Um `<input>` com `filter()` nos dados já carregados. Sem chamadas à API adicionais. Resolve o ponto 15 e 17 em menos de uma hora de desenvolvimento.

**34. Adicionar badge visual na coluna da tabela ROPA para transferências internacionais**
Um `<Globe className="w-3 h-3 text-blue-500" />` quando `a.internationalTransfers === true`. Zero lógica nova, dado já está na resposta da API.

**35. Adicionar campo "Notificação aos titulares" ao `BreachModal` como segunda secção condicionada à severidade**
Se `severity === 'HIGH' || severity === 'CRITICAL'`, mostrar campos: `dataSubjectsNotified: boolean`, `dataSubjectsNotifiedAt: datetime`, `notificationChannel: select`. Resolve o ponto 3.

**36. Substituir o slider de score no `AssessmentModal` por uma checklist de critérios**
5-8 perguntas com Sim/Não (DPA assinado?, Encriptação em trânsito?, Notificação de violação <72h?, Subcontratantes aprovados?). Score calculado automaticamente. Torna a avaliação auditável e reprodutível.

---

## CISO

### Critical Issues (blocking daily use)

**SOA (ISO 27001)**

1. **Sem campo "evidencia" no EditControlModal.** O campo `implementationNotes` serve de mistura para notas e evidências, mas num SoA real o auditor precisa de saber exactamente onde está a evidência (caminho de ficheiro, link SharePoint, número de documento). Não há campo separado para referência de evidência, o que torna o SoA inutilizável em auditorias formais ISO 27001:2022.

2. **Sem campo "owner" resolvido para utilizador do sistema.** O campo `owner` é um input de texto livre — não há ligação a utilizadores/departamentos reais. Numa organização portuguesa com 50+ colaboradores isso cria inconsistências (e.g. "João", "J. Silva", "jsilva@empresa.pt") que quebram qualquer dashboard de responsabilidades.

3. **Sem exportação PDF/Word.** Só existe `handleExportCsv`. O SoA ISO 27001 tem de ser submetido a auditores externos em formato documental (PDF/Word). Um CSV não é aceite por auditores certificados.

**Riscos**

4. **A `NewRiskModal` não tem campo "dono do risco" (risk owner).** ISO 27001 cláusula 8.2 exige explicitamente que cada risco tenha um owner. O `EditRiskModal` também não tem este campo — só aparece `treatmentOwner` no tratamento, mas não no registo do risco em si. Impossível cumprir 27001 sem owner obrigatório.

5. **Limite hard-coded de 100 riscos** (`limit: 100` na query da `RisksPage`). Uma organização com >100 riscos registados perde dados silenciosamente sem qualquer mensagem de aviso. Não há paginação visível.

**NIS2 - Prazos**

6. **Sem formulário para criar um novo incidente NIS2.** A tab "Prazos / Notificações" (`PrazosTab`) só lista incidentes existentes. Não há botão de criar incidente NIS2. Se um incidente ocorre às 3h da manhã e eu preciso de abrir o registo no telemóvel, não consigo.

---

### High Issues (significant friction)

**SOA**

7. **Filtro por tema em falta.** A barra de filtros só filtra por status (`statusFilter`). Não há filtro por tema (`Organizational`, `People`, `Physical`, `Technological`). Com 93 controlos ISO 27001:2022, o CISO precisa de ver só os tecnológicos quando está a trabalhar com a equipa de IT.

8. **Sem pesquisa de texto livre.** Não há campo de pesquisa por nome/código de controlo. Para encontrar o controlo A.8.15 tenho de percorrer a tabela visualmente. Bloqueador diário.

9. **Progressos de implementação calculados de forma simplista.** O score conta `implemented + partial*0.5`. Para uma auditoria ISO 27001, os controlos `PLANNED` com target date ultrapassada devem ser contados como `NOT_STARTED`, não como `PLANNED`. Não há detecção de overdue nos controlos SOA.

**NIS2**

10. **Sem campo "organismo notificado" e "referência de notificação" no registo de incidente.** O `IncidentCard` mostra pipeline de 3 etapas (Alerta 24h, Relatório 72h, Final 1 mês) mas não regista a quem foi notificado (CNCS? ANACOM? BdP?) nem o número de referência atribuído. Essencial para auditoria NIS2 em Portugal.

11. **Sem indicador visual de qual etapa está atrasada antes de abrir o cartão.** No dashboard de prazos, os `IncidentCard` mostram o `DeadlineBadge` apenas para o prazo de 72h do relatório inicial, mas não há sinalização se o alerta precoce de 24h já passou. Um CISO com 5 incidentes abertos precisa de ver tudo em glance.

**DORA**

12. **Os pilares DORA no Overview mostram 3 de 5 como "done" hard-coded** (linhas 628-630 do dora/page.tsx: `done: true` para Art. 5-16, 17-23, 24-27; `done: false` para Art. 28-44, 45-49). Isto não é dinâmico — mostra sempre o mesmo estado independentemente da implementação real. Um regulador do BdP que veja esta página vai ficar confuso.

13. **Sem timeline de resolução de incidente (RTO/RPO observado vs. target).** O `IncidentModal` tem `detectedAt` e `resolvedAt` mas o sistema não calcula nem exibe o tempo real de resolução vs. o target DORA. Para DORA Art. 12-13, o CISO precisa de saber se está dentro dos RTO/RPO contratados.

**Riscos**

14. **O `EditRiskModal` não tem campo `riskOwner` no tab "Risco"** — só aparece `treatmentOwner` no tab de tratamento. Na `NewRiskModal` também não existe. Para ISO 27001 e frameworks de GRC portugueses (BdP, CNCS), o owner do risco é obrigatório e diferente do owner do tratamento.

15. **O heatmap usa o `inherentScore` mas não mostra o score residual.** Um CISO precisa de ver ambos — o risco bruto e o risco após controlos. O heatmap é de utilidade limitada para tomada de decisão se só mostra o inerente.

---

### Medium Issues (improvements)

**SOA**

16. **`ThemeSection` colapsa grupos vazios** quando há filtro activo (linha 399: `grouped[theme]?.length > 0`), mas não informa o utilizador de que grupos foram ocultados pelo filtro. Confuso.

17. **Sem histórico de alterações por controlo.** Não é possível ver quando o status de um controlo mudou, quem o mudou, ou porquê. Essencial para evidência de auditoria contínua.

18. **A justificação de exclusão (`exclusionJustification`) não é obrigatória** quando `applicable` é desmarcado. ISO 27001:2022 cláusula A.5.1 exige justificação documentada para exclusões.

**CIS Controls**

19. **O `EditModal` (Visão Geral) não tem campos `assignedTo` e `targetDate`**, mas o `ImplementationModal` tem. Há dois modais diferentes para o mesmo controlo com campos inconsistentes — dependendo de qual tab estou, vejo campos diferentes para o mesmo item. Confuso e propenso a dados incompletos.

20. **Sem exportação do estado de implementação.** Os módulos SOA e CIS não têm exportação equivalente (o SOA tem CSV mas o CIS não tem nada). Para relatórios de board ou auditorias, o CISO precisa de exportar.

21. **Labels misturadas PT/EN.** O `EditModal` usa "Evidence", "Notes" (inglês), o `ImplementationModal` usa "Evidência", "Notas" (português). O `ScoreBar` usa "Overall Score", "Implemented", "Partial", "Not Implemented" em inglês. Inconsistência que parece pouco profissional em demos a clientes portugueses.

**DORA**

22. **O `TestModal` não tem campo para upload ou referência do relatório do pentest/TLPT.** Para DORA Art. 26 (TLPT), é obrigatório arquivar o relatório. O campo `findings` é texto livre — não há link para documento externo.

23. **Sem mapeamento dos incidentes DORA para os incidentes NIS2.** Um incidente que seja simultaneamente DORA-relevante e NIS2-relevante tem de ser registado em dois sítios separados. Não há ligação entre os módulos.

**Riscos**

24. **Sem categoria padronizada de risco (select vs. texto livre).** O campo `category` na `NewRiskModal` é texto livre com placeholder "Segurança de Informação, Operacional...". Isto leva a dados inconsistentes — "Segurança", "Segurança de Informação", "InfoSec" ficam como três categorias distintas no filtro.

---

### Missing Features a CISO Would Expect

25. **Sem módulo de Gestão de Ativos** (Asset Inventory). O CIS Controls v8 começa no Controlo 1 (Inventário de Activos de Hardware) e Controlo 2 (Inventário de Software), mas não há onde registar activos. O CIS score é calculado sem base em activos reais.

26. **Sem módulo de Plano de Tratamento de Riscos (RTP/POA&M) exportável.** O tab "Tratamentos" na página de riscos mostra a tabela mas não gera o documento formal "Plano de Tratamento de Riscos" em PDF com assinaturas, que é o que a gestão de topo e auditores pedem.

27. **Sem ligação entre Riscos e Controlos SOA.** Um risco identificado devia poder ser associado ao(s) controlo(s) SOA que o mitiga. Esta rastreabilidade bidirecional (risco → controlo → evidência) é o coração de qualquer GRC system sério e está completamente ausente.

28. **Sem módulo de Não-Conformidades / Ações Corretivas (NC/CAPA).** Quando uma auditoria interna identifica uma não-conformidade contra ISO 27001 ou NIS2, não há onde a registar, atribuir, acompanhar resolução, e fechar. Sem CAPA, o ciclo de melhoria contínua (cláusula 10 ISO 27001) não é suportado.

29. **Sem calendário de revisão periódica.** ISO 27001 exige revisão anual dos controlos e do SoA. Não há qualquer mecanismo de agenda/reminder para "este controlo foi revisto há mais de 12 meses".

30. **Sem gestão de fornecedores / terceiros críticos.** O DORA menciona "Prestadores Críticos" no overview mas o valor vem de `registerDashboard` sem interface para gerir o registo. NIS2 tem categoria `SUPPLY_CHAIN`. Não há módulo dedicado a gestão de risco de terceiros que seja uma lacuna crítica para organizações financeiras portuguesas.

31. **Sem notificações / alertas in-app ou por email.** Não há sistema de alertas para: prazo de controlo SOA ultrapassado, incidente NIS2 prestes a exceder 72h, risco CRITICAL sem tratamento há >30 dias. O CISO dependeria de verificar manualmente todos os dias.

---

### Quick Wins (easy to implement, high value)

32. **Tornar `justification` obrigatória no `EditControlModal` (SOA) quando `applicable` é falso.** Uma linha de validação: `if (!form.applicable && !form.justification) return alert(...)`. Cumpre requisito ISO 27001.

33. **Adicionar campo `owner` (select de utilizadores) ao `EditControlModal` SOA** em vez de texto livre. Reutilizar o mesmo componente de select de utilizadores que presumivelmente existe noutros módulos.

34. **Adicionar `assignedTo` ao `EditModal` da tab Visão Geral do CIS Controls.** O campo já existe no `ImplementationModal` — basta copiar o bloco `<div>Responsável</div>` para o outro modal.

35. **Mostrar score residual no heatmap ao fazer hover numa célula.** Já há o tooltip `selectedRisks` — basta adicionar `r.residualScore` ao display do `<div key={r.id}>` no `selectedRisks.map`.

36. **Filtro por tema na barra de filtros SOA.** Adicionar um `<select>` com `THEMES` ao lado dos filtros de status existentes. O `grouped` já existe — basta um `themeFilter` adicional no `useMemo`.

37. **Corrigir os pilares DORA para serem dinâmicos.** Remover os `done: true/false` hard-coded e calcular com base em `dashboard?.complianceScore` ou criar campos específicos no endpoint de dashboard.

38. **Adicionar botão "Novo Incidente" na `PrazosTab` do NIS2**, com modal mínimo (título, severidade, data de detecção). O modal de incidente DORA já existe e tem estrutura similar — pode ser adaptado em <2h.

39. **Adicionar campo de pesquisa de texto livre ao SOA.** Um `<input type="search">` que filtra `controls.filter(c => c.controlCode.includes(q) || c.title.toLowerCase().includes(q))` no `useMemo`. 30 minutos de trabalho, impacto diário enorme.

---

## Auditor Interno

### Critical Issues (blocking daily use)

**1. Findings completamente desligadas das CAPAs — fluxo quebrado**
O módulo de Audits regista findings com severidade e data limite, e o módulo de CAPA tem um campo `colFinding` na tabela. Contudo, no `NewCapaModal` (capa/page.tsx) não existe nenhum campo para associar uma CAPA a um finding existente. O `EditCapaModal` também não tem esse campo. A coluna "colFinding" na tabela é lida do dado `c.finding?.title`, o que implica que a ligação existe no backend, mas a UI não permite criá-la nem editá-la. Na prática, um auditor cria um finding, e depois cria uma CAPA separada sem a poder ligar ao finding de origem — quebra a cadeia de rastreabilidade obrigatória em qualquer norma ISO.

**2. Finding não tem campo de "responsável pela correção" (owner)**
No `FindingModal` (audits/page.tsx), os campos disponíveis são: auditId, title, description, severity, status, requirement (textarea com label "Recomendação"), dueDate. Não existe campo `assignee` nem `responsável`. Sem saber quem é responsável por cada não-conformidade, a auditoria não pode ser encerrada em conformidade com a ISO 19011.

**3. Evidências não podem ser associadas a auditorias ou findings**
No `UploadModal` (evidence/page.tsx), os únicos campos são: ficheiro, title (nome), description. Não há campo para associar a evidência a uma auditoria, a um finding, ou a uma CAPA específica. A coluna `colLinkedTo` na tabela mostra `e.project?.name || e.task?.title || e.control?.code`, sem menção a audits/findings. Um auditor não consegue anexar uma prova de implementação de uma ação corretiva ao finding correspondente.

**4. Não existe página de detalhe utilizável para auditorias via esta página**
A tabela de auditorias tem um `Link href={/audits/${a.id}}` com um `ChevronRight`, mas toda a gestão de findings é feita na tab global "Findings" e não numa view contextualizada por auditoria. Se existir uma página `/audits/[id]`, o auditor tem de navegar para lá e depois voltar. Não há breadcrumb nem navegação contextual visível nesta página.

**5. Impossível gerar relatório de auditoria em si (Audit Report)**
Em reports/page.tsx, os 4 tipos de relatório disponíveis são: COMPLIANCE_SUMMARY, RISK_REGISTER, TASK_STATUS, EVIDENCE_GAP. Não existe nenhum tipo "AUDIT_REPORT" ou "FINDINGS_REPORT" que produza o relatório formal de uma auditoria específica — o documento que um auditor entrega à gestão com os findings, severidades, e estado das ações. Este é o entregável central do trabalho de um auditor.

---

### High Issues (significant friction)

**6. NewCapaModal não tem campo `assignee`**
O `EditCapaModal` tem um campo `preventiveAction` (textarea) mas não há seletor de utilizador para assignee, apesar de a tabela de CAPA mostrar `c.assignee?.firstName`. Para atribuir a CAPA a alguém, o utilizador não tem interface — presumivelmente o backend ignora ou o campo foi omitido.

**7. Findings tab não tem filtros de severidade nem de auditoria**
Na tab "Findings" (audits/page.tsx), a toolbar apenas mostra o botão "Novo Finding". Não há filtro por severidade (CRITICAL/MAJOR/MINOR/OBSERVATION), por estado (OPEN/IN_PROGRESS/RESOLVED), nem por auditoria. Numa organização com múltiplas auditorias ativas, a lista de findings torna-se imediatamente inutilizável sem filtros.

**8. Findings tab não tem pesquisa**
A tab "Audits" tem um `<input>` de pesquisa ligado ao state `search`. A tab "Findings" não tem nenhum campo de pesquisa. Encontrar um finding específico numa lista longa exige scroll manual.

**9. CAPA não tem campo de `tipo` (Corretiva vs Preventiva vs Melhoria)**
O formulário distingue `correctiveAction` e `preventiveAction` como dois textareas, mas não há um campo de tipo (CA/PA/OFI) que é a classificação standard em ISO 9001:2015 e ISO 27001. Os auditores classificam formalmente cada CAPA por tipo.

**10. Status "OVERDUE" está em CAPA_STATUS_LABELS como opção selecionável pelo utilizador**
No `EditCapaModal`, o `<select {...register('status')}>` inclui "OVERDUE" como opção. Um auditor não deve poder marcar manualmente uma CAPA como "vencida" — esse estado deve ser calculado automaticamente a partir da `dueDate`. Ter isto como opção manual é um dado de qualidade que pode ser manipulado.

**11. Relatórios automáticos: sem campo de hora de envio nem fuso horário**
No `ScheduledReportsPanel`, o formulário de agendamento tem: name, type, frequency, recipients. Não há campo para definir a hora de envio (ex: "enviar às 08:00 da segunda-feira"). Para relatórios diários ou semanais, a ausência de hora torna o agendamento opaco.

**12. Download de relatório usa `alert()` nativo para erros**
A função `triggerDownload` em reports/page.tsx usa `alert(...)` em caso de erro. Isto é inconsistente com o design system da aplicação e bloqueia o browser num diálogo nativo.

---

### Medium Issues (improvements)

**13. Campo "Recomendação" no FindingModal está mapeado para `requirement`**
O label diz "Recomendação" mas o campo `register('requirement')` sugere que este campo armazena o requisito normativo violado — que é diferente de uma recomendação de ação. Um auditor precisa de ambos: qual o requisito violado (ex: ISO 27001 A.9.1.1) e qual a recomendação de correção.

**14. NewAuditModal: o label do campo projectId diz `tCommon('name')`**
Na linha 94 de audits/page.tsx, o `<label>` do seletor de projeto está a usar `{tCommon('name')}` em vez de uma chave de tradução adequada como `t('project')`. Apresenta "Nome" como label de um campo de seleção de projeto — confuso para o utilizador.

**15. Findings summary cards estão hardcoded em inglês**
Os cards de sumário das findings (linhas 373–387) têm labels hardcoded: 'Total Findings', 'Críticos em Aberto', 'Major em Aberto', 'Resolvidos'. Mistura inglês e português. O restante da página usa `useTranslations`.

**16. Auditoria sem campo de norma/framework**
O `NewAuditModal` não tem campo para indicar a norma ou framework que está a ser auditada (ISO 27001, ISO 9001, GDPR, NIS2, etc.). Sem este campo, não é possível filtrar auditorias por framework nem associar findings a cláusulas específicas.

**17. Relatório de histórico limitado a 10 entradas sem paginação**
Em reports/page.tsx linha 358: `reportsList.slice(0, 10)`. Sem botão "ver mais" nem paginação, relatórios anteriores ficam inacessíveis.

**18. Evidence page: sem campo de data de validade**
As evidências têm status "EXPIRED" como opção de filtro, mas o `UploadModal` não tem campo `expiryDate`. Se a evidência não tem data de validade definida, como é que o sistema determina que expirou?

---

### Missing Features a Auditor Interno would expect

**19. Plano de Auditoria (Audit Plan / Checklist)**
Não existe nenhum mecanismo para criar uma checklist de itens a verificar durante a auditoria. Em auditorias ISO, o auditor prepara um plano com as cláusulas a auditar, as perguntas a fazer, e os entrevistados. Nada disto existe.

**20. Entrevistados e departamentos auditados**
Não há campos para registar quem foi entrevistado, que departamento foi auditado, nem quem acompanhou a auditoria do lado do auditado. Este é um requisito de rastreabilidade da ISO 19011.

**21. Ciclo de vida formal da auditoria (fases)**
As 4 fases clássicas (Abertura, Execução, Encerramento, Follow-up) não estão representadas. O estado vai de PLANNED diretamente para IN_PROGRESS e COMPLETED sem substados ou gates de aprovação.

**22. Assinatura eletrónica / aprovação formal do relatório**
Não existe mecanismo para o auditado reconhecer formalmente os findings, nem para o auditor-líder assinar o relatório antes de emissão. Sem isto, o relatório não tem validade formal perante um organismo certificador.

**23. Exportação do relatório de auditoria por auditoria específica**
O botão "Download" no item do audit (`Download` icon importado em audits/page.tsx linha 7) existe no módulo mas não está visível na tabela de auditorias. Não há forma de exportar o relatório formal de uma auditoria específica com os seus findings, evidências e estado das CAPAs como um único documento.

**24. Histórico de alterações (audit trail) de findings e CAPAs**
Não existe log de quem alterou o estado de um finding ou CAPA, quando, e porquê. Essencial para auditorias de certificação onde o auditor externo vai verificar o histórico de tratamento das não-conformidades.

**25. Ligação entre CAPAs e riscos**
Um finding pode dar origem tanto a uma CAPA como a um novo risco. Não existe ligação entre o módulo CAPA e o módulo de riscos.

---

### Quick Wins (easy to implement, high value)

**QW1. Adicionar seletor `findingId` ao `NewCapaModal`**
Carregar a lista de findings abertos via query e adicionar um `<select>` com `register('findingId')`. Resolve o problema crítico #1 com menos de 20 linhas.

**QW2. Adicionar filtros de severidade e auditoria à tab Findings**
Adicionar dois `<select>` no toolbar da tab "findings" em audits/page.tsx (junto ao botão "Novo Finding") para filtrar por `severity` e por `auditId`. A query `listFindings` provavelmente já aceita estes parâmetros no backend.

**QW3. Adicionar campo `assignee` ao `NewCapaModal`**
Reutilizar o padrão já usado noutros modais para carregar utilizadores e adicionar um `<select>` de assignee. O `EditCapaModal` já tem o campo de dados mas falta no modal de criação.

**QW4. Adicionar tipo de relatório AUDIT_REPORT ao array `REPORT_TYPES`**
Em reports/page.tsx, adicionar `{ type: 'AUDIT_REPORT', label: 'Relatório de Auditoria', format: 'PDF' }` ao array `REPORT_TYPES` (linha 239). Requer suporte backend, mas a UI está preparada para receber novos tipos trivialmente.

**QW5. Remover "OVERDUE" do select de status na `EditCapaModal`**
Filtrar a entrada OVERDUE do objeto `CAPA_STATUS_LABELS` quando usado dentro do `<select>` de edição manual, mantendo-o apenas para display na tabela. Uma linha de código resolve o problema de integridade de dados #10.

**QW6. Corrigir o label duplicado `tCommon('name')` no seletor de projeto**
Na linha 94 de audits/page.tsx, substituir `{tCommon('name')}` por `{t('project')}` (ou label hardcoded "Projeto" enquanto a chave de tradução não existe). Resolve a confusão #14 imediatamente.

**QW7. Adicionar campo `framework` / norma ao `NewAuditModal`**
Um `<select>` simples com as normas mais comuns (ISO 27001, ISO 9001, GDPR, NIS2, SOC2, Outro) permite filtrar e agrupar auditorias por framework sem grandes alterações de modelo.

---

## Gestor de Risco

### Critical Issues (blocking daily use)

**Risks module — `NewRiskModal` has no `dueDate` field.** The `NewRiskModal` form collects `title`, `category`, `description`, `likelihood`, `impact`, and `mitigationPlan`. There is no `dueDate` field at creation time, even though the list table sorts by `dueDate` and renders it as a column. A Gestor de Risco following an ISO 31000 process must assign a review/treatment deadline when registering the risk. The field only surfaces in the sort logic (`handleSort('dueDate')`) but is never writable in the create flow.

**Risks module — no `riskOwner` field anywhere.** Neither `NewRiskModal` nor `EditRiskModal` (tab `risk`) contains a field for the person responsible for the risk. In a Portuguese organization every risk in the register must have a named dono de risco for accountability purposes (required by ISO 31000, NP 4578, and most sector regulators). Without an owner field the register is incomplete for any formal audit.

**Risks module — `TreatmentEditModal` is missing the `treatmentOwner` field in the UI.** The `useForm` defaultValues include `treatmentOwner: risk.treatmentOwner || ''` but there is no corresponding `<input>` or `<label>` element rendered in the form body. The field is silently dropped. The `EditRiskModal` treatment tab also has no `treatmentOwner` input. A Gestor de Risco cannot record who is responsible for executing the treatment.

**Business Continuity — RTO/RPO unit inconsistency is a data-entry trap.** `PlanModal` labels the fields "RTO Alvo (horas)" and "RPO Alvo (horas)" and stores integers. `TestModal` (used from `PlanCard`) labels its fields "RTO Real (horas)" but `ExerciseModal` labels the same fields "RTO Real (minutos)" and stores raw integers. The `fmtMinutes()` helper treats stored values as minutes. The `ExercisesTab` table compares `rtoTargetMins = test.plan.rtoTarget * 60` (converting hours to minutes) against `test.rtoActual` (stored as minutes from `ExerciseModal`). But if the user registered the actual RTO via `TestModal` (inside `PlanCard`), they entered hours, not minutes, meaning the comparison is always off by 60x. This produces silent wrong data that would cause a Gestor de Risco to report the wrong RTO compliance status.

**Vendors module — assessment score is a free-range slider with no methodology.** `AssessmentModal` offers a single range input (0–100) with no breakdown by domain (security, financial, operational, regulatory). A Gestor de Risco evaluating a vendor under ISO 27001 Annex A or DORA cannot justify a score of "70" to an auditor — there are no sub-criteria. The score is opaque and not auditable.

---

### High Issues (significant friction)

**Risks module — list is capped at 100 risks (`limit: 100`) with no pagination UI.** The query `risksApi.list({ limit: 100 })` hardcodes the limit. An organization with more than 100 risks (common in banking, insurance, or health) will silently lose records from the list, heatmap, and treatments tabs. There is no page counter, "load more" button, or indication that results are truncated.

**Risks module — `status` values in the filter dropdown are raw English enum strings (IDENTIFIED, ASSESSED, etc.) because `uniqueStatuses` is built from `r.status` directly.** The `t(`status.${s}`)` translation is only used inside `EditRiskModal`, not in the filter `<select>`. A Portuguese user sees "IDENTIFIED" in the dropdown, which is inconsistent with "Identificado" shown elsewhere.

**Business Continuity — no Business Impact Analysis (BIA) section.** The `PlanModal` collects name, scope, version, status, RTO, RPO, and next test date. There is no BIA tab or section capturing: MTPD (Maximum Tolerable Period of Disruption), critical processes, minimum staffing requirements, or financial impact thresholds. ISO 22301 Clause 8.2 mandates BIA before defining recovery strategies. The plans tab therefore cannot satisfy an ISO 22301 certification audit.

**Business Continuity — no delete button on `PlanCard` or in `PlanModal`.** A Gestor de Risco cannot remove an obsolete plan. The `PlanCard` header only shows an edit (`Pencil`) button. There is no equivalent `deleteMutation` for plans (only `removeTestMut` for tests exists).

**Vendors module — `AssessmentModal` (triggered from row-level `Star` button) and `VendorAssessmentModal` (triggered from Assessments tab) are two separate components with slightly different forms.** `AssessmentModal` has only `score` and `findings`. `VendorAssessmentModal` additionally has a `riskLevel` override dropdown. A Gestor de Risco using the quick-assess button from the vendor list will produce an assessment without the risk-level override; using the Assessments tab produces a richer record. This dual-path creates inconsistent data depending on which entry point was used.

**Vendors module — contract expiry alert has no detail.** The `StatCard` "A Vencer" shows a count, but clicking it does nothing — there is no filtered view or list of which contracts are expiring. A Gestor de Risco needs to see which vendors are expiring in the next 30/60/90 days to trigger renewal or exit procedures.

**Risks module — sorting by `dueDate` sorts on `r.dueDate` but the treatment deadline is stored as `treatmentDueDate`.** The sort key `dueDate` references `a.dueDate` in the sort comparator. If the backend stores the deadline only as `treatmentDueDate`, the sort column will always show `—` and sort to `Infinity`, making the sort feature non-functional for treatment deadlines.

---

### Medium Issues (improvements)

**Risks module — `EditRiskModal` has no close/X button.** The modal can only be dismissed by clicking "Cancelar" or "Guardar". There is no `×` icon in the header like the BCP and vendor modals have. If a user opens the modal and wants to exit without making changes, they must scroll to find the Cancel button.

**Risks module — history tab shows only the last 5 entries (`slice(0, 5)`)** with no "ver mais" link. For a long-lived risk with many review cycles the audit trail is incomplete in the UI.

**Risks module — `riskAppetite` field exists in `EditRiskModal` treatment tab but is absent from `TreatmentEditModal` (which is used from the Treatments tab).** A Gestor de Risco editing a treatment from the Treatments tab cannot set or view the risk appetite alignment.

**Business Continuity — `AssetModal` has no edit path.** Assets can be added via `AssetModal` but the `PlanCard` expanded view renders assets as read-only rows with no edit button — only the plan-level edit (`Pencil`) is present. A Gestor de Risco cannot correct a wrongly entered RTO for an asset without deleting and re-adding it (and there is no delete button for assets either).

**Business Continuity — `ExercisesTab` KPI "Próximo Teste" is calculated from `testedAt` of future-dated tests.** If a Gestor de Risco uses `testedAt` to record when a test happened (past), future test scheduling requires a different field. Using the same field for both planned and actual dates conflates planning with execution.

**Vendors module — category list is in English** (`Technology`, `Cloud Services`, `Security`, `Legal`, etc.) while the rest of the UI is in Portuguese. The `CATEGORIES` constant hardcodes English strings that appear both in the filter dropdown and as the default for new vendors. An organization following CNCS or BdP supplier classification frameworks will need sector-specific categories.

**Vendors module — `VendorPanel` side panel assessment history shows date from `a.createdAt`, not a dedicated `assessedAt` field.** If an assessment was created and later edited, the displayed date is the creation date, not the date the evaluation was actually conducted.

---

### Missing Features a Gestor de Risco would expect

1. **Registo de Incidentes module is entirely absent.** There is no `/incidents` page. A Gestor de Risco in Portugal must maintain a security incident register (RGPD Art. 33, NIS2, DORA). This is a standalone module gap — not a tweak to existing pages.

2. **Risk register PDF / Word export.** There is no export button on the risks page. Auditors, the board, and supervisory bodies (BdP, CNPD, CMVM) require the risk register in a printable, signed format. The vendor module has CSV export; risks have nothing.

3. **Escalation workflow / approval flow.** Risks with status IDENTIFIED cannot be submitted for management review within the tool. There is no "submeter para aprovação" button, no reviewer assignment, and no approval timestamp in the model. ISO 31000 and most sector frameworks require documented sign-off.

4. **Risk linkage to controls, processes, and assets.** The risk form has no field to link a risk to a specific process, control, or information asset. A Gestor de Risco cannot answer "which controls mitigate this risk?" directly in the tool.

5. **BCP — escalation contacts and crisis communication plan.** `PlanModal` and `AssetModal` have no fields for emergency contacts, alternate site locations, or communication trees. ISO 22301 Clause 8.4 requires these.

6. **Vendor re-assessment scheduling / reminders.** There is no field for "próxima data de avaliação" on a vendor. The only date signal is `lastAssessedAt`, which is read-only. A Gestor de Risco cannot schedule annual vendor reviews from within the tool.

7. **Vendor risk linked to the organization's risk register.** A vendor assessed as CRITICAL risk should generate or link to a risk entry. There is no bridge between the Vendors module and the Risks module.

8. **BCP — MtPD and BIA fields.** No Maximum Tolerable Period of Disruption, no minimum business continuity objective (MBCO), no financial impact per hour of downtime. These are mandatory for ISO 22301.

---

### Quick Wins (easy to implement, high value)

1. **Add `riskOwner` text input to `NewRiskModal` and `EditRiskModal` risk tab.** One `<input>` field. Unblocks the most common audit finding ("quem é o dono deste risco?").

2. **Add `dueDate` date input to `NewRiskModal`.** Already sortable and displayed in the list; just missing from the create form. One field added to the existing grid.

3. **Render the missing `treatmentOwner` input in `TreatmentEditModal`.** The `register('treatmentOwner')` call and defaultValue already exist — the `<input>` was simply never placed in the JSX. Add one labeled input between the score and due-date fields.

4. **Translate status values in the filter `<select>` on the risks list page.** Change `<option key={s} value={s}>{s}</option>` to `<option key={s} value={s}>{t(`status.${s}`)}</option>`. One-line fix; eliminates English leak in a Portuguese UI.

5. **Standardize RTO/RPO units across `PlanModal`, `TestModal`, and `ExerciseModal`.** Choose one unit (minutes throughout, or hours throughout), update all labels and conversion logic in `fmtMinutes`, and fix the `rtoTargetMins` multiplication in `ExercisesTab`. Prevents silent data corruption.

6. **Make the "A Vencer" stat card clickable** to pre-filter the vendor list to contracts expiring within 90 days. The filter infrastructure (`filterStatus`, etc.) already exists — this is a `setFilterStatus` + scroll call.

7. **Add an `×` close button to `EditRiskModal` header.** Copy the pattern from `PlanModal` (line 88) or `VendorModal` (line 144). Two lines of JSX.

8. **Add a "Exportar PDF" button to the risks list** using `window.print()` or a simple `react-to-pdf` call. Even a basic browser print stylesheet would satisfy the majority of reporting requests without a full PDF library integration.

---

## Recommended Action Plan

### Priority Matrix

| Priority | Category | Issues | Rationale |
|----------|----------|--------|-----------|
| P0 — Fix immediately | Data integrity bugs | CEO #1/#2 (hardcoded trend data), CISO #12 (hardcoded DORA pillars), Gestor de Risco BCP RTO/RPO unit mismatch, DPO #5 (localStorage for compliance data) | Silent data corruption or fabricated metrics that could mislead regulatory decisions |
| P1 — Sprint 1 | Critical field gaps | Gestor de Risco `riskOwner` + `dueDate` + `treatmentOwner` (invisible field), Auditor `findingId` linkage in NewCapaModal, DPO `supervisoryAuthorityNotifiedAt` in BreachModal, CISO `riskOwner` in NewRiskModal | Required fields for ISO 27001, ISO 31000, RGPD Art. 33 compliance — auditors will flag these immediately |
| P2 — Sprint 2 | High-friction UX | CEO board pack PDF export + deep links on action items, CISO SOA text search + theme filter + NIS2 new incident button, Auditor findings filters + assignee in NewCapaModal, DPO ROPA search/filter | Daily-use blockers that slow every workflow session |
| P3 — Sprint 3 | Data quality / consistency | DPO ROPA CSV-to-structured categories, CISO mandatory exclusion justification + label PT/EN consistency, Auditor OVERDUE status removal from manual select, Gestor de Risco English status leak in filter | Produces dirty data or unprofessional UI; lower urgency but compounds over time |
| P4 — Backlog | Missing modules | Incident register (Gestor de Risco), Materiality assessment (CEO/ESG), Board member read-only role, Asset inventory (CISO), CNPD communications register (DPO), Audit plan/checklist (Auditor), Risk-to-control linkage (CISO/Gestor) | Structural gaps requiring new backend entities; high value but high effort |
| QW — Any sprint | Quick wins | All items tagged "Quick Wins" across personas — typically 1-4 hours each | High ROI: resolve a critical or high issue with minimal code change |

### Cross-Persona Issues (affecting 3+ personas)

- **No `riskOwner` field**: affects CISO, Gestor de Risco, Auditor Interno — single fix, three personas unblocked
- **No PDF export for key documents**: affects CEO (board pack), CISO (SOA), Auditor (audit report), Gestor de Risco (risk register) — consistent gap across all operational personas
- **Hardcoded/static data presented as live**: affects CEO (trend charts), CISO (DORA pillars) — erodes trust in the platform for all C-level users
- **localStorage used for compliance data**: affects DPO (ISO 27701 transfers/sub-processors) — data loss risk undermines any audit trail claim
- **No inter-module linkage**: Findings-CAPA, DPIA-ROPA, Risk-Control, Vendor-Risk — affects every persona trying to trace an issue end-to-end

*Report generated by iComply AI Test Agent — 2026-06-18*
