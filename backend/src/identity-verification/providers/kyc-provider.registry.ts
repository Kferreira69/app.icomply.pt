import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KycCapabilities, KycFeature, KycProvider, ProviderDefinition } from './kyc-provider.interface';
import { DIDIT_DEFINITION } from './didit-provider.service';
import { OPENSANCTIONS_DEFINITION } from './opensanctions-provider.service';
import { STRIPE_IDENTITY_DEFINITION } from './stripe-identity-provider.service';
import { SUMSUB_DEFINITION } from './sumsub-provider.service';
import { TRULIOO_DEFINITION } from './trulioo-provider.service';

/**
 * Every provider the platform knows. To support a new vendor add its definition here
 * (see PROVIDERS.md) — nothing else in the module mentions a vendor by name.
 * Order matters: the first *configured* provider is the default when KYC_PROVIDER is not set
 * (Didit first: pay-as-you-go, no set-up fee).
 */
export const PROVIDER_DEFINITIONS: ProviderDefinition[] = [
  DIDIT_DEFINITION, SUMSUB_DEFINITION, TRULIOO_DEFINITION, STRIPE_IDENTITY_DEFINITION, OPENSANCTIONS_DEFINITION,
];

export interface ProviderInfo {
  id: string;
  displayName: string;
  capabilities: KycCapabilities;
  /** Credentials present in the environment, i.e. selectable. */
  configured: boolean;
}

@Injectable()
export class KycProviderRegistry {
  private readonly logger = new Logger(KycProviderRegistry.name);
  private readonly instances = new Map<string, KycProvider>();

  constructor(private readonly config: ConfigService) {
    for (const def of PROVIDER_DEFINITIONS) {
      if (def.isConfigured(config)) this.instances.set(def.id, def.create(config));
    }
    const ids = [...this.instances.keys()];
    if (ids.length) this.logger.log(`KYC/KYB providers available: ${ids.join(', ')} (default: ${this.defaultId()})`);
    else this.logger.warn('KYC/KYB: no provider configured — verification requests are handled manually.');
  }

  /** All known providers and whether each one can be used right now (capabilities reflect the live configuration). */
  list(): ProviderInfo[] {
    return PROVIDER_DEFINITIONS.map(d => ({
      id: d.id,
      displayName: d.displayName,
      capabilities: this.instances.get(d.id)?.capabilities ?? d.capabilities,
      configured: this.instances.has(d.id),
    }));
  }

  /** A configured provider by id (case-insensitive), or undefined. */
  get(id: string | null | undefined): KycProvider | undefined {
    return id ? this.instances.get(id.toUpperCase()) : undefined;
  }

  isKnown(id: string): boolean {
    return PROVIDER_DEFINITIONS.some(d => d.id === id.toUpperCase());
  }

  /** Platform default: KYC_PROVIDER if it is configured, otherwise the first configured provider. */
  defaultId(): string | null {
    const forced = (this.config.get<string>('KYC_PROVIDER', '') || '').toUpperCase();
    if (forced && this.instances.has(forced)) return forced;
    return this.instances.keys().next().value ?? null;
  }

  /** The provider an organisation should use: its own choice, else the platform default. */
  resolve(preferredId?: string | null): KycProvider {
    const preferred = this.get(preferredId);
    if (preferred) return preferred;
    if (preferredId) {
      this.logger.warn(`Preferred KYC provider "${preferredId}" is not configured — using the platform default.`);
    }
    const fallback = this.get(this.defaultId());
    if (!fallback) {
      throw new ServiceUnavailableException('Nenhum fornecedor de verificação de identidade está configurado.');
    }
    return fallback;
  }

  /**
   * The provider that will serve ONE feature: the requested provider if it is configured and can do it,
   * else the platform default if it can, else the first configured provider that can (e.g. sanctions
   * screening goes to OpenSanctions even though Didit is the default for documents). `null` = nobody can.
   */
  resolveFor(feature: KycFeature, preferredId?: string | null): KycProvider | null {
    const can = (p?: KycProvider) => (p && p.capabilities[feature] ? p : null);
    const chosen = can(this.get(preferredId));
    if (chosen) return chosen;
    if (preferredId) {
      this.logger.warn(`KYC provider "${preferredId}" cannot serve ${feature} (not configured or unsupported) — falling back.`);
    }
    return can(this.get(this.defaultId())) ?? [...this.instances.values()].find(p => p.capabilities[feature]) ?? null;
  }
}
