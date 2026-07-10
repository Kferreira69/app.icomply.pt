import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KycProvider } from './kyc-provider.interface';
import { SumsubProviderService } from './sumsub-provider.service';
import { TruliooProviderService } from './trulioo-provider.service';

// Mirrors the graceful-degradation pattern used by MailService/Sentry init:
// missing credentials never crash boot — the factory just falls back to a
// stub provider that reports itself as unconfigured.
class StubKycProvider implements KycProvider {
  readonly name = 'SUMSUB' as const; // arbitrary — stub is never actually called for real checks
  private unavailable(): never {
    throw new Error('KYC/KYB provider not configured — set SUMSUB_APP_TOKEN+SUMSUB_SECRET_KEY or TRULIOO_API_KEY');
  }
  async verifyIndividual(): Promise<any> { this.unavailable(); }
  async verifyBusiness(): Promise<any> { this.unavailable(); }
  async screenSanctions(): Promise<any> { this.unavailable(); }
  handleWebhook(): any { this.unavailable(); }
}

@Injectable()
export class KycProviderFactory {
  private readonly logger = new Logger(KycProviderFactory.name);
  private readonly provider: KycProvider;
  readonly mode: 'sumsub' | 'trulioo' | 'stub';

  constructor(private config: ConfigService) {
    const forced = this.config.get<string>('KYC_PROVIDER', '').toLowerCase();
    const sumsubToken = this.config.get<string>('SUMSUB_APP_TOKEN', '');
    const sumsubSecret = this.config.get<string>('SUMSUB_SECRET_KEY', '');
    const truliooKey = this.config.get<string>('TRULIOO_API_KEY', '');

    const sumsubReady = !!(sumsubToken && sumsubSecret);
    const truliooReady = !!truliooKey;

    if (forced === 'trulioo' && truliooReady) {
      this.provider = new TruliooProviderService(truliooKey);
      this.mode = 'trulioo';
    } else if (forced === 'sumsub' && sumsubReady) {
      this.provider = new SumsubProviderService(sumsubToken, sumsubSecret);
      this.mode = 'sumsub';
    } else if (sumsubReady) {
      this.provider = new SumsubProviderService(sumsubToken, sumsubSecret);
      this.mode = 'sumsub';
    } else if (truliooReady) {
      this.provider = new TruliooProviderService(truliooKey);
      this.mode = 'trulioo';
    } else {
      this.provider = new StubKycProvider();
      this.mode = 'stub';
    }

    if (this.mode === 'stub') {
      this.logger.warn(
        'KYC/KYB: STUB mode — no provider configured. ' +
        'Set SUMSUB_APP_TOKEN+SUMSUB_SECRET_KEY or TRULIOO_API_KEY to enable real verification.',
      );
    } else {
      this.logger.log(`KYC/KYB: ${this.mode.toUpperCase()} provider active`);
    }
  }

  getProvider(): KycProvider {
    return this.provider;
  }
}
