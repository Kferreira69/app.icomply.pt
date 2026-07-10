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

export interface KycProvider {
  readonly name: 'SUMSUB' | 'TRULIOO';
  verifyIndividual(input: IndividualVerificationInput): Promise<VerificationResult>;
  verifyBusiness(input: BusinessVerificationInput): Promise<VerificationResult>;
  screenSanctions(input: SanctionsScreeningInput): Promise<VerificationResult>;
  handleWebhook(payload: unknown, signature?: string): NormalizedWebhookResult;
}
