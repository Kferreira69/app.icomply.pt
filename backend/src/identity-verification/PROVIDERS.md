# KYC / KYB / AML — providers

The module is **vendor-neutral**: the service, controller and database never mention a vendor by
name. Everything vendor-specific lives in one file per provider in `providers/`, behind the
`KycProvider` interface (`providers/kyc-provider.interface.ts`).

## How a provider is chosen

1. **Platform**: a provider is *available* when its credentials are in the environment. Several can
   be available at once. `KYC_PROVIDER` (optional) names the platform default; otherwise the first
   configured one in `PROVIDER_DEFINITIONS` wins.
2. **Organisation**: an organisation with the `identity_verification` add-on may pick one of the
   available providers (`PUT /identity-verification/provider`, stored in the add-on's `metadata.kycProvider`);
   with no choice it uses the platform default. If a chosen provider later loses its credentials the
   platform default is used.
3. Every verification stores the provider that produced it (`IdentityVerification.provider`), so
   results stay traceable after a switch.

`GET /identity-verification/providers` lists the providers, their capabilities, whether each one is
configured, the organisation's choice and the provider in effect.

## Environment

| Variable | Provider | Purpose |
|---|---|---|
| `KYC_PROVIDER` | — | Optional platform default (e.g. `SUMSUB`) |
| `SUMSUB_APP_TOKEN`, `SUMSUB_SECRET_KEY` | Sumsub | API credentials (both required) |
| `SUMSUB_WEBHOOK_SECRET` | Sumsub | Secret used to verify webhook signatures — **without it every Sumsub webhook is rejected** |
| `SUMSUB_LEVEL_INDIVIDUAL`, `SUMSUB_LEVEL_BUSINESS` | Sumsub | Verification level names (defaults `basic-kyc-level`, `basic-kyb-level`) |
| `TRULIOO_API_KEY` | Trulioo | API key |

## Webhooks

`POST /identity-verification/webhook/:provider` is unauthenticated by design; **the provider
authenticates the call itself** inside `handleWebhook(payload, { rawBody, headers })` and must throw
`ForbiddenException` when the signature is missing or wrong (fail closed). `rawBody` is the exact
bytes received (`rawBody: true` in `main.ts`). Providers with `capabilities.webhooks = false` answer
404. Unknown references are acknowledged and ignored; the response never contains stored data.

## Adding a provider (4 steps)

1. Create `providers/<vendor>-provider.service.ts` with a class implementing `KycProvider`
   (`id` in capitals, `displayName`, `capabilities`, the three verification methods and
   `handleWebhook`).
2. In the same file export a `ProviderDefinition` (`id`, `displayName`, `capabilities`,
   `isConfigured(config)`, `create(config)`).
3. Add the definition to `PROVIDER_DEFINITIONS` in `providers/kyc-provider.registry.ts`.
4. Add its variables to `.env.example` / the deployment secrets and a spec next to
   `tests/sumsub-webhook.spec.ts` covering the signature scheme.

No other file needs to change. Remember to add the new vendor to the website/help text only if it is
offered to customers.

## Status

Written from the vendors' public documentation and **not yet exercised against a real (sandbox)
account** — applicant creation, the Sumsub AML endpoint and the webhook digest must be verified
before production use. The capture step (document / selfie upload via the vendor's web SDK) is not
built yet.

## Providers shipped (2026-10-02) and how to switch between them

| Provider | id | Does | Webhook | Env vars |
|---|---|---|---|---|
| **Didit** (default when configured) | `DIDIT` | KYC (hosted link), KYB (hosted link), sanctions/PEP (synchronous) | `/identity-verification/webhook/didit` — `X-Signature-V2` / `X-Signature` + 5-min timestamp | `DIDIT_API_KEY`, `DIDIT_WEBHOOK_SECRET`, `DIDIT_WORKFLOW_KYC`, `DIDIT_WORKFLOW_KYB` (optional), `DIDIT_CALLBACK_URL` (optional) |
| **OpenSanctions** | `OPENSANCTIONS` | sanctions / PEP only (a possible match always goes to a person) | — | `OPENSANCTIONS_API_KEY`, `OPENSANCTIONS_DATASET` (default `default`) |
| **Stripe Identity** | `STRIPE_IDENTITY` | KYC only (document + selfie, hosted link) | `/identity-verification/webhook/stripe_identity` — `Stripe-Signature` | `STRIPE_IDENTITY_SECRET_KEY`, `STRIPE_IDENTITY_WEBHOOK_SECRET`, `STRIPE_IDENTITY_RETURN_URL` (optional) |
| **Sumsub** | `SUMSUB` | KYC, KYB, sanctions | `/identity-verification/webhook/sumsub` | see below |
| **Trulioo** | `TRULIOO` | KYC, KYB, sanctions (synchronous) | — | `TRULIOO_API_KEY` |

**Routing is per feature** (`individual`, `business`, `sanctions`) and is changed by the platform operator at any time, with no deploy:
Backoffice → *KYC · Condições* → **Fornecedores (quem faz o quê)** — for one customer or **for all customers at once**
(`PUT /identity-verification/admin/:orgId/routing`, `PUT /identity-verification/admin/routing/all`).
Examples: everything on Didit; documents on Stripe Identity + sanctions on OpenSanctions; back to Sumsub.
If the chosen provider is not configured or cannot do a feature, the platform default is used, then any configured
provider that can, and finally manual mode. Customers never choose the vendor and what they pay does not change with it.

**Going live with a provider (e.g. Didit):** create the account and the workflows in its console (sandbox first) →
set the env vars above on the server (`.env.*`) → create the webhook in the provider console pointing at the URL above with the
secret you set → test in the sandbox → propose commercial terms to the customer (*KYC · Condições*) → the customer's admin accepts.
Until then everything keeps working in manual mode.

**Adding another vendor:** one file in `providers/` implementing `KycProvider` + one line in `PROVIDER_DEFINITIONS`.

## Provider-independent operation: manual mode and commercial terms

The module does not wait for any vendor. Once the `identity_verification` add-on is active an
organisation can use it **manually**: a request is recorded (`provider = MANUAL`, status `REVIEW`) and
a person decides it (`PATCH /identity-verification/:id/decision`, `aml` write access). A document
number is stored masked (last 4 digits). No external cost.

**Automated** checks (an external provider) are used only when ALL of these hold:

1. a provider is configured on the platform (credentials in the environment — see below);
2. the platform operator proposed **commercial terms** for the organisation
   (`PUT /identity-verification/admin/:orgId/terms`, super-admin; backoffice page *KYC · Condições*):
   one-off set-up fee + pay-as-you-go price per feature (`individual`, `business`, `sanctions`);
3. an **ADMIN of the customer accepted exactly that version** (`POST /identity-verification/terms/accept`).

Otherwise — or for a feature not priced in the accepted terms, or one the provider cannot do — the
request silently falls back to manual. A new version of the terms invalidates the previous acceptance.
Each automated check stores the price in force (`unitPrice`, `currency`, `termsVersion`) so history is
never rewritten; `GET /identity-verification/providers` shows the month's usage. Invoicing (set-up fee and
PAYG total) is done by the operator in Backoffice → Licenciamento.

So going live with a vendor is: set its credentials → propose terms → customer accepts. No code change.
