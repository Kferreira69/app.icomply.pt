# Fornecedores de KYC / KYB / AML — comparação para o iComply

Pesquisa web de **2026-10-02**. **[V]** verificado numa página oficial do fornecedor; **[V-3P]** só em terceiros/comparadores; **[N/V]** não verificado. Os preços mudam: confirmar por escrito antes de decidir. Os cálculos de custo abaixo são estimativas feitas a partir dos preços [V], não cotações.

Objetivo: poder **trocar de fornecedor a qualquer momento** (o módulo `backend/src/identity-verification` já é neutro: acrescentar um fornecedor = 1 ficheiro + 1 linha, ver `PROVIDERS.md`) e preferir **PAYG puro**. Referência: Sumsub — arranque 2.000 € por módulo, ID 0,75 €, liveness+face match 0,33 €, AML 0,38 € (≈ 1,46 € por pessoa com ID + liveness + AML).

## 1. Tabela comparativa

| Fornecedor | Ajuste PAYG | Preços públicos | KYC | KYB | AML | Sandbox sem vendas | UE / PT | Reseller / multi-tenant | Veredicto |
|---|---|---|---|---|---|---|---|---|---|
| **Didit** | Excelente: sem setup, sem mínimo, sem contrato [V] | Full KYC 0,33 $; ID 0,15 $; AML 0,20 $; monitorização 0,07 $/ano; KYB 2/5/9 $ [V] | Sim | Sim (3 níveis) | Sim | Sim, em ~60 s [V] | Página própria para PT, Cartão de Cidadão por NFC (marketing do próprio) [V]; regiões de dados não especificadas | Organização → aplicações; faturação por cliente: N/V | **1.º** |
| **Veriff** | Bom, mas com mínimo mensal (49–209 $), cancelável [V] | 0,80 / 1,39 / 1,89 $ por verificação; PEP+sanções +0,64 $; monitorização +0,09 $ [V] | Sim | Não nos planos self-serve | Add-on | Sim, grátis [V] | Estónia; ISO 27001, SOC 2 II [V-3P] | Só Enterprise | **2.º/3.º** |
| **Persona** | Médio: Essential 250 $/mês, contrato anual [V] | 500 serviços incluídos, depois 1,50 $; trial 60 dias; programa startup: 500 grátis/mês durante 1 ano [V] | Sim | Sim (preço N/V) | Sim | Sim, no trial [V] | Residência UE/PT: N/V | Growth/Enterprise sob consulta | Alternativa |
| **iDenfy** | Médio: mínimo 135 $/mês (Basic) ou 325 $/mês (Premium) [V] | ~1,35 $ por verificação [V-3P] | Sim | Sim [V docs] | Sim, monitorização diária | Sim [V docs] | Lituânia (N/V) | N/V | Reserva |
| **Ondato** | Médio: mínimo ~259 €/mês [V-3P] | KYC 0,50–1,40 €; AML 0,04–0,45 €; KYB "desde 600 €" [V] | Sim | Sim, caro | Sim | N/V | Lituânia (N/V) | White-label 150 €/marca [V] | Reserva |
| **Shufti Pro** | Bom: sem mínimo declarado [V] | Free 10/mês; "desde 1,50 $" [V] | Sim | Sim | Sim (1700+ listas) | Sim [V] | SOC 2 II, ISO 27001 [V-3P]; PT N/V | Branding da hosted page | Reserva |
| **Stripe Identity** | Excelente: PAYG puro, 50 grátis [V] | 1,25 € documento+selfie; 0,40 € ID number [V] | Sim, PT suportado [V] | Não | Não | Sim | 120+ países; residência N/V | N/V | Só se KYC simples bastar |
| **Trulioo** | Fraco: só vendas, sem preços [V] | Nenhum | Sim | Sim [V docs] | Sim [V docs] | Via suporte/vendas | Cobertura global | N/V | Evitar no arranque |
| **Sardine** | Fraco: só demo [V]; contratos estimados 50–100 mil $/ano [V-3P, blog de concorrente] | Nenhum | Parcial | Sim | Sim | Docs atrás de login | N/V | N/V | Descartar |
| Onfido/Entrust, IDnow, Incode, Signicat | Contratos/sales-led, sem preços públicos (Signicat tem sandbox grátis [V]) | — | Sim | N/V | N/V | — | — | — | Descartar para já |
| **ComplyAdvantage** | Bom: mensal e cancelável [V] | Starter desde 99 $/mês (100–2.000 entidades monitorizadas) [V] | Não | Sim | Sim + adverse media | N/V | UK/UE | N/V | **Complemento AML (A)** |
| **OpenSanctions API** | Excelente: PAYG puro, trial 30 dias [V] | 0,10 € por consulta [V] | Não | Sim (/match) | Sanções + PEP; adverse media N/V | Sim | "Made across Europe" | Licença Reseller/OEM sob consulta [V] | **Complemento AML (B)** |
| Sanctions.io | Médio: contratos 1–3 anos [V] | Pacotes não confirmados no site | Não | N/V | Sanções, PEP, adverse media; SOC 2 [V] | Trial 7 dias | N/V | N/V | Alternativa AML |
| Dow Jones / LSEG World-Check | Licença enterprise | Nenhum | Não | Não | Sim | N/V | N/V | N/V | Fora do âmbito PAYG |

## 2. Recomendação

**Para o primeiro adaptador (por ordem):**
1. **Didit** — único com PAYG puro e free tier em KYC + AML + KYB na mesma API. Por pessoa (ID + liveness + AML) ≈ 0,53 $ contra ≈ 1,46 € na Sumsub; KYB 2–9 $. Fluxo igual ao do nosso adaptador (sessão → URL hosted → webhook assinado → obter sessão). Riscos: empresa jovem (2023), avaliações mistas, regiões de dados por confirmar.
2. **Veriff (Essential)** — mais maduro, preços públicos; mínimo de 49 $/mês cancelável; ID + sanções ≈ 1,44 $. Perguntar por KYB e reseller.
3. **Persona** — melhor para workflows/KYB sofisticados; o programa startup torna os primeiros 12 meses quase gratuitos (depende de aprovação).

Reserva: **iDenfy**, **Stripe Identity** (se KYC simples bastar).
**AML isolado** para combinar com um KYC barato: **OpenSanctions** (0,10 €/consulta, sem adverse media) ou **ComplyAdvantage Starter** (99 $/mês, adverse media e monitorização).

Ponto de equilíbrio (estimativa): com ~3.000 verificações ID+liveness+AML, Didit ≈ 1.600 $ contra ≈ 4.400 € + 2.000 € de arranque na Sumsub; depende do mix real.

## 3. Perguntas a enviar a cada fornecedor

1. Conta de plataforma com **várias organizações cliente**, com utilização e faturação separadas (ou relatório de consumo por sub-conta)? Condições de reseller?
2. Por escrito: setup, mínimo mensal/anual, prazo de contrato, preço de KYB, AML e monitorização contínua; os preços públicos aplicam-se ao nosso volume?
3. Sandbox imediato com dados de teste e webhooks? Especificação OpenAPI?
4. **DPA**, subcontratantes, **regiões de dados** (armazenamento só na UE?), retenção configurável e eliminação por API, transferências para países terceiros.
5. Cobertura de **Cartão de Cidadão**, passaporte PT, título de residência (leitura NFC, taxa de aprovação); eIDAS/CMD se relevante.
6. Certificados atuais: ISO 27001, SOC 2 Type II (relatório sob NDA), iBeta PAD.
7. SLA, suporte em horário europeu, histórico de incidentes, política de reentrega e assinatura de webhooks.
8. Política de saída: exportação de dados e resultados, sem penalizações.

## 4. Riscos

- **Maturidade da Didit**: pedir referências e testar com documentos PT reais.
- **Marketing vs contrato**: várias afirmações (NFC em Portugal, preços de rivais) vêm do fornecedor ou de blogs de concorrentes — confirmar em contrato.
- **Discrepâncias a esclarecer**: certificações da Didit (SOC 2 Type I vs "I & II"); KYB da Ondato (600 € como preço ou setup); pacotes da sanctions.io e pré-pagos da OpenSanctions.
- **Residência de dados** (Didit, Stripe Identity) pode bloquear clientes regulados.
- **Multi-tenant/faturação por cliente**: nenhum fornecedor o confirmou; se não existir, o iComply imputa internamente a partir dos IDs de sessão (o módulo já guarda preço e fornecedor por verificação).
- **Mínimos fixos**: Veriff, iDenfy, Persona, ComplyAdvantage custam mesmo sem uso.
- **Biometria (RGPD art. 9.º)**: exige base legal e DPIA; definir quem é responsável e quem é subcontratante.
- **AML sem adverse media** (OpenSanctions) pode não chegar para clientes regulados.
- **Páginas inacessíveis na pesquisa** (403/404): Persona pricing, iDenfy pricing, Sardine, IDnow, Incode — ausência de dados não prova que não existam.

## 5. Próximos passos sugeridos

1. Abrir conta sandbox na Didit e na Veriff (self-serve, sem vendas) e enviar as perguntas da secção 3 a ambas e à Sumsub.
2. Escrever o segundo adaptador (`didit-provider.service.ts`) — trabalho de ~1 dia com o registo de fornecedores existente — e testar com documentos portugueses reais.
3. Decidir com base nas respostas (residência de dados, reseller, DPA) antes de propor condições comerciais a clientes (backoffice → *KYC · Condições*).

Fontes principais: didit.me/pricing e /solutions/countries/portugal; docs.didit.me; veriff.com/pricing e /plans/self-serve; help.withpersona.com; documentation.idenfy.com; ondato.com/pricing; shuftipro.com/pricing; stripe.com/identity; complyadvantage.com/pricing; opensanctions.org/api e /faq/api/metering; sanctions.io; trulioo.com/pricing e developer.trulioo.com; sardine.ai; signicat.com/pricing.
