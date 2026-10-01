import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KycCapabilities, KycProvider, ProviderDefinition } from './kyc-provider.interface';
import { SUMSUB_DEFINITION } from './sumsub-provider.service';
import { TRULIOO_DEFINITION } from './trulioo-provider.service';

/**
 * Every provider the platform knows. To support a new vendor add its definition here
 * (see PROVIDERS.md) — nothing else in the module mentions a vendor by name.
 * Order matters: the first *configured* provider is the default when KYC_PROVIDER is not set.
 */
export const PROVIDER_DEFINITIONS: ProviderDefinition[] = [SUMSUB_DEFINITION, TRULIOO_DEFINITION];

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
    else this.logger.warn('KYC/KYB: no provider configured — verification requests will be refused.');
  }

  /** All known providers and whether each one can be used right now. */
  list(): ProviderInfo[] {
    return PROVIDER_DEFINITIONS.map(d => ({
      id: d.id,
      displayName: d.displayName,
      capabilities: d.capabilities,
      configured: this.instances.has(d.id),
    }));
  }

  /** A configured provider by id (case-insensitive), or undefined. */
  get(id: string | null | undefined): KycProvider | undefined {
    return id ? this.instances.get(id.toUpperCase()) : undefined;
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
}
