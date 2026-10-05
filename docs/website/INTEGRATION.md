# Ligação site ↔ aplicação

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
