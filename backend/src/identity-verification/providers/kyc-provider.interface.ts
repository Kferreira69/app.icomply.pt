import type { ConfigService } from '@nestjs/config';

export type VerificationSubjectType = 'INDIVIDUAL' | 'BUSINESS';
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVIEW' | 'ERROR';

export interface IndividualVerificationInput {
  fullName: string;
  country: string;
  documentNumber?: string;
  documentType?: string;
  email?: string;
}

export interface BusinessVerificationInput {
  legalName: string;
  country: string;
  vatNumber?: string;
  registrationNumber?: string;
}

export interface SanctionsScreeningInput {
  name: string;
  country?: string;
  dateOfBirth?: string;
}

export interface VerificationResult {
  status: VerificationStatus;
  providerRefId?: string;
  riskScore?: number;
  rawResult: Record<string, unknown>;
}

export interface NormalizedWebhookResult {
  providerRefId: string;
  status: VerificationStatus;
  riskScore?: number;
  rawResult: Record<string, unknown>;
}

/** What a provider can do. The service refuses a request the chosen provider cannot serve. */
export interface KycCapabilities {
  individual: boolean;
  business: boolean;
  sanctions: boolean;
  /** Sends asynchronous result notifications to /identity-verification/webhook/:id. */
  webhooks: boolean;
}

export interface WebhookContext {
  /** Exact bytes received — signatures are computed over these, not over re-serialised JSON. */
  rawBody?: Buffer;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * A KYC / KYB / AML provider (Sumsub, Trulioo, …). Everything provider-specific stays behind
 * this interface so that the service, the controller and the database never mention a vendor.
 * To add one, see PROVIDERS.md.
 */
export interface KycProvider {
  /** Stable key, stored in IdentityVerification.provider and used in the webhook URL (e.g. "SUMSUB"). */
  readonly id: string;
  readonly displayName: string;
  readonly capabilities: KycCapabilities;
  verifyIndividual(input: IndividualVerificationInput): Promise<VerificationResult>;
  verifyBusiness(input: BusinessVerificationInput): Promise<VerificationResult>;
  screenSanctions(input: SanctionsScreeningInput): Promise<VerificationResult>;
  /** Authenticate the call (signature) and normalise it. Must throw ForbiddenException when it is not authentic. */
  handleWebhook(payload: unknown, ctx: WebhookContext): NormalizedWebhookResult;
}

/** How the registry discovers a provider: whether it has credentials, and how to build it. */
export interface ProviderDefinition {
  id: string;
  displayName: string;
  capabilities: KycCapabilities;
  isConfigured(config: ConfigService): boolean;
  create(config: ConfigService): KycProvider;
}
