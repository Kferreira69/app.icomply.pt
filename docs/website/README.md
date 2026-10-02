# Conteúdos para o website

Uma pasta com os textos prontos a publicar no website (PT-PT + EN), **um ficheiro por domínio ou funcionalidade nova**.

**Objetivo do site:** promover o que a aplicação faz e realçar, em termos comerciais, as vantagens para o cliente — para convencer a comprar, usar e contribuir para o crescimento da aplicação à medida das suas necessidades. Escrever sempre pelo **benefício** (o que o cliente ganha), assente em funcionalidades que existem.

| Ficheiro | Conteúdo | Versão |
|---|---|---|
| `esg-iso-14001-gestao-ambiental.md` | ISO 14001 **dentro do domínio ESG**: o que alterar na página ESG, cartões, secção, FAQ, notícia (PT + EN); objetivos ligados às métricas ESG | 1.1.0 |
| `novas-normas-e-plataforma-1-1.md` | 7 normas novas (ISO 22000, 13485, 20000-1, 27018, 27036, NIST AI RMF, ISO 23894), Gestão Documental, Pesquisa global, mensagem "comece com um domínio e cresça", formulários, notícia, FAQ (PT + EN) | 1.1.0 |
| `BRIEF-COWORK.md` | **Brief autónomo para o Claude Co-work**: regras, alterações por página, correções de lacunas (Taxonomia UE, ePrivacy/RGPC, Continuidade/ISO 22301) e lista de verificação | 1.1.0 |
| `INTEGRATION.md` | Ligação site ↔ aplicação: catálogo público e receção de leads/sugestões (API, CORS, RGPD) | 1.1.0 |
| `lacunas-site-vs-app.md` | Registo do que o site diz vs o que a aplicação faz (e vice-versa) | 1.1.0 |

> Antes de criar conteúdos para um novo domínio, confirmar na análise (`2_FUNCIONALIDADES iComply App.docx`) e no website se já existe um domínio que o deve acolher — evitar páginas ou domínios duplicados.

## Regra: sempre que sair uma novidade

Cada novo domínio de governação, módulo ou funcionalidade relevante entrega, na mesma altura:

1. **Aplicação:** ajuda (`frontend/src/lib/content/help-kb.ts`, `frontend/src/components/help/helpContent.ts`), changelog (`frontend/src/app/(dashboard)/changelog/page.tsx`), documentação da API (`frontend/src/app/(dashboard)/docs/api/page.tsx`) e índice da pesquisa (`frontend/src/lib/search/pages.ts`).
2. **Repositório:** `README.md` (módulos e domínios), os documentos de estado/funcionalidades e **o catálogo público** (`backend/src/public-catalog/catalog.data.ts`).
3. **Website:** um novo ficheiro nesta pasta com os conteúdos (página, cartão, notícia, FAQ, SEO) e atualização de `lacunas-site-vs-app.md`.

Só descrever o que existe na aplicação: sem números de clientes, certificações ou resultados que não possam ser comprovados.
