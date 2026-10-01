import { Injectable } from '@nestjs/common';
import {
  CATALOG_DOMAINS, CATALOG_PLATFORM_FEATURES, CATALOG_RELEASED, CATALOG_VERSION, RELEASE_HIGHLIGHTS,
} from './catalog.data';

@Injectable()
export class PublicCatalogService {
  /** Public product manifest the website renders. No tenant data, only what the product offers. */
  get() {
    const domains = CATALOG_DOMAINS.map(d => ({
      id: d.id,
      number: d.number,
      name: d.name,
      tagline: d.tagline,
      standards: d.standards.map(({ name, status, note }) => ({ name, status, ...(note ? { note } : {}) })),
      capabilities: d.capabilities,
    }));
    const all = domains.flatMap(d => d.standards);
    return {
      version: CATALOG_VERSION,
      released: CATALOG_RELEASED,
      highlights: RELEASE_HIGHLIGHTS,
      platform: CATALOG_PLATFORM_FEATURES,
      totals: {
        domains: domains.length,
        standardsAvailable: all.filter(s => s.status === 'available').length,
        standardsPartial: all.filter(s => s.status === 'partial').length,
        standardsRoadmap: all.filter(s => s.status === 'roadmap').length,
      },
      domains,
    };
  }
}
