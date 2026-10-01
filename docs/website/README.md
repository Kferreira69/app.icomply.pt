# Conteúdos para o website

Uma pasta com os textos prontos a publicar no website (PT-PT + EN), **um ficheiro por domínio ou funcionalidade nova**.

| Ficheiro | Conteúdo | Versão do produto |
|---|---|---|
| `dominio-ambiente-iso-14001.md` | Página do domínio Ambiente (ISO 14001), cartão do domínio, notícia/LinkedIn, FAQ + JSON-LD, checklist de onde atualizar | 1.1.0 |

## Regra: sempre que sair uma novidade

Cada novo domínio de governação, módulo ou funcionalidade relevante entrega, na mesma altura:

1. **Aplicação:** ajuda (`frontend/src/lib/content/help-kb.ts`, `frontend/src/components/help/helpContent.ts`), changelog (`frontend/src/app/(dashboard)/changelog/page.tsx`), documentação da API (`frontend/src/app/(dashboard)/docs/api/page.tsx`) e índice da pesquisa (`frontend/src/lib/search/pages.ts`).
2. **Repositório:** `README.md` (módulos e domínios) e os documentos de estado/funcionalidades.
3. **Website:** um novo ficheiro nesta pasta com os conteúdos (página, cartão, notícia, FAQ, SEO).

Só descrever o que existe na aplicação: sem números de clientes, certificações ou resultados que não possam ser comprovados.
