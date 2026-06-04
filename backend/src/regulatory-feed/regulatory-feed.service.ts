import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';

// EU Regulatory RSS feeds
const FEEDS = [
  { source: 'EU_OJ',  url: 'https://eur-lex.europa.eu/oj/rss.xml',                frameworks: ['EU_OJ'],     jurisdiction: 'EU',   importance: 'HIGH' },
  { source: 'ENISA',  url: 'https://www.enisa.europa.eu/news/rss',                 frameworks: ['NIS2','DORA'], jurisdiction: 'EU',  importance: 'HIGH' },
  { source: 'CNCS',   url: 'https://www.cncs.gov.pt/pt/feed',                      frameworks: ['NIS2'],      jurisdiction: 'PT',   importance: 'HIGH' },
  { source: 'CNPD',   url: 'https://www.cnpd.pt/bin/versaoprint/rss.rss',          frameworks: ['GDPR'],      jurisdiction: 'PT',   importance: 'HIGH' },
  { source: 'EBA',    url: 'https://www.eba.europa.eu/rss',                         frameworks: ['DORA','EBA'], jurisdiction: 'EU',  importance: 'MEDIUM' },
];

@Injectable()
export class RegulatoryFeedService {
  private readonly logger = new Logger(RegulatoryFeedService.name);

  constructor(private prisma: PrismaService) {}

  async list(params?: any) {
    const where: any = {};
    if (params?.isRead !== undefined) where.isRead = params.isRead === 'true';
    if (params?.importance) where.importance = params.importance;
    if (params?.framework) where.frameworks = { has: params.framework };
    return (this.prisma as any).regulatoryFeedItem.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: 100,
    });
  }

  async markRead(id: string) {
    return (this.prisma as any).regulatoryFeedItem.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead() {
    return (this.prisma as any).regulatoryFeedItem.updateMany({ where: { isRead: false }, data: { isRead: true } });
  }

  async getUnreadCount() {
    return (this.prisma as any).regulatoryFeedItem.count({ where: { isRead: false } });
  }

  // Seed some sample items for demo/onboarding
  async seedSampleItems(organizationId: string) {
    const samples = [
      { source: 'ENISA', title: 'ENISA publishes NIS2 Implementation Guidance for Essential Entities', summary: 'ENISA released comprehensive guidance on implementing NIS2 Article 21 security measures, covering risk management, incident handling, supply chain security, and cryptography requirements.', frameworks: ['NIS2'], importance: 'HIGH', publishedAt: new Date(Date.now() - 2 * 86400000), jurisdiction: 'EU', sourceUrl: 'https://www.enisa.europa.eu' },
      { source: 'EBA', title: 'EBA publishes final DORA RTS on ICT third-party risk management', summary: 'The European Banking Authority published the final Regulatory Technical Standards on ICT third-party risk management under DORA, including requirements for the Register of Information.', frameworks: ['DORA'], importance: 'CRITICAL', publishedAt: new Date(Date.now() - 5 * 86400000), jurisdiction: 'EU', sourceUrl: 'https://www.eba.europa.eu' },
      { source: 'CNPD', title: 'CNPD emite orientação sobre transferências de dados para os EUA', summary: 'A Comissão Nacional de Proteção de Dados emitiu nova orientação sobre transferências de dados pessoais para os Estados Unidos ao abrigo do EU-US Data Privacy Framework.', frameworks: ['GDPR'], importance: 'HIGH', publishedAt: new Date(Date.now() - 7 * 86400000), jurisdiction: 'PT', sourceUrl: 'https://www.cnpd.pt' },
      { source: 'EU_OJ', title: 'EU AI Act enters into force — High-risk AI provisions timeline confirmed', summary: 'The EU Artificial Intelligence Act has entered into force. Provisions for high-risk AI systems apply from August 2026. Organizations using high-risk AI must register in the EU database.', frameworks: ['EU_AI_ACT'], importance: 'CRITICAL', publishedAt: new Date(Date.now() - 10 * 86400000), jurisdiction: 'EU', sourceUrl: 'https://eur-lex.europa.eu' },
      { source: 'CNCS', title: 'CNCS lança plataforma de reporte de incidentes NIS2 para entidades essenciais', summary: 'O Centro Nacional de Cibersegurança lançou a nova plataforma nacional de reporte de incidentes NIS2, obrigatória para todas as entidades essenciais e importantes em Portugal.', frameworks: ['NIS2'], importance: 'HIGH', publishedAt: new Date(Date.now() - 14 * 86400000), jurisdiction: 'PT', sourceUrl: 'https://www.cncs.gov.pt' },
    ];
    for (const item of samples) {
      await (this.prisma as any).regulatoryFeedItem.upsert({
        where: { id: `seed-${item.source}-${item.title.slice(0, 30)}`.replace(/\s/g, '-').toLowerCase().slice(0, 60) },
        create: { id: `seed-${item.source}-${item.title.slice(0, 30)}`.replace(/\s/g, '-').toLowerCase().slice(0, 60), ...item },
        update: {},
      });
    }
    return { seeded: samples.length };
  }

  @Cron('0 6 * * *') // Daily at 6am
  async fetchFeeds() {
    this.logger.log('Fetching regulatory feeds...');
    // In production: fetch RSS feeds, parse, deduplicate, create items
    // For now, we use seed data and the model is ready for real feed parsing
    this.logger.log('Regulatory feed fetch complete');
  }
}
