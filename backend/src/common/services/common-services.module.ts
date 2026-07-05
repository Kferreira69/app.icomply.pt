import { Global, Module } from '@nestjs/common';
import { ComplianceMetricsService } from './compliance-metrics.service';

/**
 * Global module that exports ComplianceMetricsService as a
 * shared single source of truth for compliance KPIs.
 * Marked @Global() so any module can inject it without adding
 * CommonServicesModule to their own imports array.
 */
@Global()
@Module({
  providers: [ComplianceMetricsService],
  exports: [ComplianceMetricsService],
})
export class CommonServicesModule {}
