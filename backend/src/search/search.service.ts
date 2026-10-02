import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { DOC_STANDARDS, standardLabel } from '../quality-documents/document-standards';
import { findStandard } from '../standards/standards.registry';
import {
  ParsedQuery, SearchField, TIER_ORDER, Tier, makeSnippet, matchFields, parseQuery,
} from './search-text';

// Field weights: how much a hit in each kind of field counts.
const W = { TITLE: 10, CODE: 8, TAG: 6, FILE: 5, SUB: 4, DESC: 3, NOTE: 2, LONG: 1.5 };

// Row caps per entity — the search scans (and ranks) rows in memory so that it can be
// accent-insensitive and typo-tolerant, which Postgres LIKE cannot do without the
// `unaccent` extension. Newest rows first; long-text entities get a smaller cap.
const CAP = 1000;
const CAP_LONG = 300;

const STATUS_PT: Record<string, string> = {
  DRAFT: 'Rascunho', IN_REVIEW: 'Em revisão', APPROVED: 'Aprovado', ARCHIVED: 'Arquivado', OBSOLETE: 'Obsoleto',
  TODO: 'A fazer', IN_PROGRESS: 'Em curso', DONE: 'Concluída', CANCELLED: 'Cancelada',
  OPEN: 'Aberto', CLOSED: 'Fechado', PLANNED: 'Planeado', COMPLETED: 'Concluído', ACTIVE: 'Ativo',
};

const FIELD_LABEL: Record<string, string> = {
  title: 'título', code: 'código', tags: 'etiquetas', file: 'ficheiro', category: 'categoria', sub: 'detalhe',
  description: 'descrição', note: 'nota', content: 'conteúdo', body: 'conteúdo',
};

const st = (s?: string | null) => (s ? STATUS_PT[s] ?? s : undefined);
const dot = (...parts: Array<string | null | undefined>) => parts.filter(Boolean).join(' · ') || undefined;
const words = (a?: string[] | null) => (a ?? []).join(' ');
const hl = (title: string) => `hl=${encodeURIComponent(title.slice(0, 80))}`;
const link = (path: string, title: string, query = '') => `${path}?${query ? `${query}&` : ''}${hl(title)}`;

export interface SearchHit {
  id: string;
  type: string;
  typeLabel: string;
  title: string;
  subtitle?: string;
  href: string;
  tier: Tier;
  score: number;
  snippet?: string;
  matchedIn?: string;
}

export interface SearchResponse {
  query: string;
  tokens: string[];
  total: number;
  counts: Record<Tier, number>;
  hits: SearchHit[];
}

interface EntityDef {
  type: string;
  label: string;
  /** Permission module the user needs (read) to see these rows; '*' = decided per row (rowAllowed). */
  module: string;
  rowAllowed?(row: any, perms: Record<string, number>): boolean;
  find(orgId: string): Promise<any[]>;
  fields(r: any): SearchField[];
  title(r: any): string;
  subtitle?(r: any): string | undefined;
  href(r: any): string;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly entities: EntityDef[];

  constructor(private readonly prisma: PrismaService, private readonly permissions: PermissionsService) {
    this.entities = this.buildEntities();
  }

  async search(userId: string, orgId: string, rawQuery: string, limit = 30): Promise<SearchResponse> {
    const q = parseQuery(rawQuery);
    const empty: SearchResponse = {
      query: q.raw, tokens: q.tokens, total: 0, counts: { exact: 0, partial: 0, related: 0 }, hits: [],
    };
    if (!q.tokens.length) return empty;

    const perms = await this.permissions.getUserPermissions(userId);
    const allowed = this.entities.filter(d => d.module === '*' || (perms[d.module] ?? 0) >= 1);
    const lists = await Promise.all(allowed.map(d => this.searchEntity(d, orgId, q, perms)));
    const all = lists.flat();
    all.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || b.score - a.score);

    const counts: Record<Tier, number> = { exact: 0, partial: 0, related: 0 };
    for (const h of all) counts[h.tier]++;

    const caps: Record<Tier, number> = { exact: limit, partial: Math.ceil(limit / 2), related: Math.ceil(limit / 2) };
    const taken: Record<Tier, number> = { exact: 0, partial: 0, related: 0 };
    const hits = all.filter(h => taken[h.tier]++ < caps[h.tier]);

    return { query: q.raw, tokens: q.tokens, total: all.length, counts, hits };
  }

  private async searchEntity(
    def: EntityDef, orgId: string, q: ParsedQuery, perms: Record<string, number>,
  ): Promise<SearchHit[]> {
    try {
      const rows = await def.find(orgId);
      const hits: SearchHit[] = [];
      for (const row of rows) {
        if (def.rowAllowed && !def.rowAllowed(row, perms)) continue;
        const fields = def.fields(row);
        const m = matchFields(fields, q);
        if (!m) continue;
        const matched = fields.find(f => f.key === m.field);
        const snippet = matched && matched.key !== 'title' ? makeSnippet(matched.text, q) : '';
        hits.push({
          id: row.id,
          type: def.type,
          typeLabel: def.label,
          title: def.title(row),
          subtitle: def.subtitle?.(row),
          href: def.href(row),
          tier: m.tier,
          score: Math.round(m.score * 10) / 10,
          snippet: snippet || undefined,
          matchedIn: m.field === 'title' ? undefined : FIELD_LABEL[m.field] ?? m.field,
        });
      }
      return hits;
    } catch (err) {
      // One broken entity must never take the whole search down.
      this.logger.warn(`search: ${def.type} skipped — ${(err as Error).message}`);
      return [];
    }
  }

  // ── what can be searched ──────────────────────────────────────────────────
  private buildEntities(): EntityDef[] {
    const p = this.prisma;
    const orderBy = { createdAt: 'desc' as const };

    return [
      {
        type: 'policy', label: 'Política', module: 'policies',
        find: org => p.policy.findMany({
          where: { organizationId: org }, orderBy, take: CAP_LONG,
          select: { id: true, title: true, description: true, content: true, tags: true, category: true, status: true, version: true },
        }),
        fields: r => [
          { key: 'title', text: r.title, weight: W.TITLE, fuzzy: true },
          { key: 'tags', text: words(r.tags), weight: W.TAG },
          { key: 'category', text: String(r.category ?? ''), weight: W.SUB },
          { key: 'description', text: r.description ?? '', weight: W.DESC },
          { key: 'content', text: r.content ?? '', weight: W.LONG, long: true },
        ],
        title: r => r.title,
        subtitle: r => dot(`v${r.version}`, st(r.status)),
        href: r => link('/policies', r.title),
      },
      {
        type: 'policy-attachment', label: 'Anexo de política', module: 'policies',
        find: org => p.policyAttachment.findMany({
          where: { policy: { organizationId: org } }, orderBy, take: CAP,
          select: {
            id: true, title: true, description: true, policy: { select: { title: true } },
            versions: { select: { fileName: true, changeNote: true } },
          },
        }),
        fields: r => [
          { key: 'title', text: r.title, weight: W.TITLE, fuzzy: true },
          { key: 'file', text: r.versions.map((v: any) => v.fileName).join(' '), weight: W.FILE, fuzzy: true },
          { key: 'description', text: r.description ?? '', weight: W.DESC },
          { key: 'note', text: r.versions.map((v: any) => v.changeNote ?? '').join(' '), weight: W.NOTE },
        ],
        title: r => r.title,
        subtitle: r => dot('Política', r.policy?.title),
        href: r => link('/policies', r.policy?.title ?? r.title),
      },
      {
        // Access is per management-system standard (ISO 9001 → quality, ISO 14001 → environment…)
        type: 'quality-document', label: 'Documento (ISO)', module: '*',
        // A document shared with other standards is visible to every team it serves; the link opens
        // the list of the first standard the reader can actually see.
        rowAllowed: (r, perms) => {
          const view = [r.standard, ...(r.alsoStandards ?? [])].find(k => {
            const mod = DOC_STANDARDS.find(s => s.key === k)?.module;
            return !!mod && (perms[mod] ?? 0) >= 1;
          });
          r.viewStandard = view;
          return !!view;
        },
        find: org => p.qualityDocument.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: {
            id: true, standard: true, alsoStandards: true, clause: true, code: true, title: true, docType: true, description: true,
            status: true, currentVersion: true, tags: true,
            versions: { select: { fileName: true, changeNote: true } },
          },
        }),
        fields: r => [
          { key: 'title', text: r.title, weight: W.TITLE, fuzzy: true },
          { key: 'code', text: r.code ?? '', weight: W.CODE, fuzzy: true },
          { key: 'tags', text: words(r.tags), weight: W.TAG },
          { key: 'file', text: r.versions.map((v: any) => v.fileName).join(' '), weight: W.FILE, fuzzy: true },
          { key: 'sub', text: `${[r.standard, ...(r.alsoStandards ?? [])].map(standardLabel).join(' ')} cláusula ${r.clause} ${r.docType}`, weight: W.SUB },
          { key: 'description', text: r.description ?? '', weight: W.DESC },
          { key: 'note', text: r.versions.map((v: any) => v.changeNote ?? '').join(' '), weight: W.NOTE },
        ],
        title: r => (r.code ? `${r.code} — ${r.title}` : r.title),
        subtitle: r => dot(standardLabel(r.standard).split(' · ')[0], `Cláusula ${r.clause}`, `v${r.currentVersion}`, st(r.status)),
        href: r => link('/quality/documents', r.title, `standard=${r.viewStandard ?? r.standard}`),
      },
      {
        type: 'task', label: 'Tarefa', module: 'tasks',
        find: org => p.task.findMany({
          where: { project: { organizationId: org } }, orderBy, take: CAP,
          select: { id: true, title: true, description: true, status: true, tags: true, project: { select: { name: true } } },
        }),
        fields: r => [
          { key: 'title', text: r.title, weight: W.TITLE, fuzzy: true },
          { key: 'tags', text: words(r.tags), weight: W.TAG },
          { key: 'description', text: r.description ?? '', weight: W.DESC },
        ],
        title: r => r.title,
        subtitle: r => dot(st(r.status), r.project?.name),
        href: r => link('/tasks', r.title),
      },
      {
        type: 'risk', label: 'Risco', module: 'risks',
        find: org => p.risk.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: {
            id: true, title: true, description: true, category: true, status: true, tags: true,
            treatmentPlan: true, mitigationPlan: true,
          },
        }),
        fields: r => [
          { key: 'title', text: r.title, weight: W.TITLE, fuzzy: true },
          { key: 'tags', text: words(r.tags), weight: W.TAG },
          { key: 'category', text: r.category ?? '', weight: W.SUB },
          { key: 'description', text: r.description ?? '', weight: W.DESC },
          { key: 'note', text: `${r.treatmentPlan ?? ''} ${r.mitigationPlan ?? ''}`, weight: W.NOTE },
        ],
        title: r => r.title,
        subtitle: r => dot(r.category, st(r.status)),
        href: r => link('/risks', r.title),
      },
      {
        type: 'evidence', label: 'Evidência', module: 'evidence',
        find: org => p.evidence.findMany({
          where: { OR: [{ project: { organizationId: org } }, { uploadedBy: { organizationId: org } }] },
          orderBy, take: CAP,
          select: { id: true, title: true, description: true, fileName: true, tags: true, status: true },
        }),
        fields: r => [
          { key: 'title', text: r.title, weight: W.TITLE, fuzzy: true },
          { key: 'file', text: r.fileName ?? '', weight: W.FILE, fuzzy: true },
          { key: 'tags', text: words(r.tags), weight: W.TAG },
          { key: 'description', text: r.description ?? '', weight: W.DESC },
        ],
        title: r => r.title,
        subtitle: r => dot(r.fileName, st(r.status)),
        href: r => link('/evidence', r.title),
      },
      {
        type: 'project', label: 'Projeto', module: 'projects',
        find: org => p.project.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: { id: true, name: true, description: true, status: true },
        }),
        fields: r => [
          { key: 'title', text: r.name, weight: W.TITLE, fuzzy: true },
          { key: 'description', text: r.description ?? '', weight: W.DESC },
        ],
        title: r => r.name,
        subtitle: r => st(r.status),
        href: r => `/projects/${r.id}`,
      },
      {
        type: 'audit', label: 'Auditoria', module: 'audits',
        find: org => p.audit.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: { id: true, title: true, scope: true, objectives: true, summary: true, status: true },
        }),
        fields: r => [
          { key: 'title', text: r.title, weight: W.TITLE, fuzzy: true },
          { key: 'description', text: `${r.scope ?? ''} ${r.objectives ?? ''}`, weight: W.DESC },
          { key: 'note', text: r.summary ?? '', weight: W.NOTE },
        ],
        title: r => r.title,
        subtitle: r => st(r.status),
        href: r => `/audits/${r.id}`,
      },
      {
        type: 'finding', label: 'Constatação de auditoria', module: 'audits',
        find: org => p.finding.findMany({
          where: { audit: { organizationId: org } }, orderBy, take: CAP,
          select: { id: true, auditId: true, title: true, description: true, requirement: true, status: true },
        }),
        fields: r => [
          { key: 'title', text: r.title, weight: W.TITLE, fuzzy: true },
          { key: 'description', text: r.description ?? '', weight: W.DESC },
          { key: 'note', text: r.requirement ?? '', weight: W.NOTE },
        ],
        title: r => r.title,
        subtitle: r => st(r.status),
        href: r => `/audits/${r.auditId}`,
      },
      {
        type: 'capa', label: 'Ação corretiva (CAPA)', module: 'capa',
        find: org => p.capa.findMany({
          where: { createdBy: { organizationId: org } }, orderBy, take: CAP,
          select: {
            id: true, title: true, description: true, rootCause: true, correctiveAction: true,
            preventiveAction: true, status: true,
          },
        }),
        fields: r => [
          { key: 'title', text: r.title, weight: W.TITLE, fuzzy: true },
          { key: 'description', text: r.description ?? '', weight: W.DESC },
          { key: 'note', text: `${r.rootCause ?? ''} ${r.correctiveAction ?? ''} ${r.preventiveAction ?? ''}`, weight: W.NOTE },
        ],
        title: r => r.title,
        subtitle: r => st(r.status),
        href: r => link('/capa', r.title),
      },
      {
        type: 'capa-record', label: 'CAPA (Qualidade)', module: 'quality',
        find: org => p.capaRecord.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: {
            id: true, capaId: true, title: true, description: true, rootCause: true, correctiveAction: true,
            preventiveAction: true, status: true,
          },
        }),
        fields: r => [
          { key: 'title', text: r.title, weight: W.TITLE, fuzzy: true },
          { key: 'code', text: r.capaId ?? '', weight: W.CODE },
          { key: 'description', text: r.description ?? '', weight: W.DESC },
          { key: 'note', text: `${r.rootCause ?? ''} ${r.correctiveAction ?? ''} ${r.preventiveAction ?? ''}`, weight: W.NOTE },
        ],
        title: r => `${r.capaId} — ${r.title}`,
        subtitle: r => st(r.status),
        href: r => link('/quality', r.title),
      },
      {
        type: 'non-conformance', label: 'Não conformidade', module: 'quality',
        find: org => p.nonConformance.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: { id: true, ncId: true, title: true, description: true, rootCause: true, correctiveAction: true, status: true },
        }),
        fields: r => [
          { key: 'title', text: r.title, weight: W.TITLE, fuzzy: true },
          { key: 'code', text: r.ncId ?? '', weight: W.CODE },
          { key: 'description', text: r.description ?? '', weight: W.DESC },
          { key: 'note', text: `${r.rootCause ?? ''} ${r.correctiveAction ?? ''}`, weight: W.NOTE },
        ],
        title: r => `${r.ncId} — ${r.title}`,
        subtitle: r => st(r.status),
        href: r => link('/quality', r.title),
      },
      {
        type: 'vendor', label: 'Fornecedor', module: 'vendors',
        find: org => p.vendor.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: {
            id: true, name: true, category: true, notes: true, contactName: true, website: true, dataShared: true, status: true,
          },
        }),
        fields: r => [
          { key: 'title', text: r.name, weight: W.TITLE, fuzzy: true },
          { key: 'category', text: r.category ?? '', weight: W.SUB },
          { key: 'sub', text: `${r.contactName ?? ''} ${r.website ?? ''}`, weight: W.SUB },
          { key: 'description', text: `${r.dataShared ?? ''}`, weight: W.DESC },
          { key: 'note', text: r.notes ?? '', weight: W.NOTE },
        ],
        title: r => r.name,
        subtitle: r => dot(r.category, st(r.status)),
        href: r => link('/vendors', r.name),
      },
      {
        type: 'unified-control', label: 'Controlo unificado', module: 'soa',
        find: org => p.unifiedControl.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: {
            id: true, controlId: true, title: true, description: true, objective: true,
            implementationNotes: true, frameworkMappings: true, status: true,
          },
        }),
        fields: r => [
          { key: 'title', text: r.title, weight: W.TITLE, fuzzy: true },
          { key: 'code', text: r.controlId ?? '', weight: W.CODE },
          { key: 'tags', text: words(r.frameworkMappings), weight: W.TAG },
          { key: 'description', text: `${r.description ?? ''} ${r.objective ?? ''}`, weight: W.DESC },
          { key: 'note', text: r.implementationNotes ?? '', weight: W.NOTE },
        ],
        title: r => `${r.controlId} — ${r.title}`,
        subtitle: r => st(r.status),
        href: r => link('/unified-controls', r.title),
      },
      {
        type: 'ropa', label: 'Tratamento de dados (ROPA)', module: 'gdpr',
        find: org => p.dataProcessingActivity.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: { id: true, name: true, purpose: true, dataCategories: true, dataSubjects: true, recipients: true, retentionPeriod: true },
        }),
        fields: r => [
          { key: 'title', text: r.name, weight: W.TITLE, fuzzy: true },
          { key: 'tags', text: `${words(r.dataCategories)} ${words(r.dataSubjects)} ${words(r.recipients)}`, weight: W.TAG },
          { key: 'description', text: r.purpose ?? '', weight: W.DESC },
          { key: 'note', text: r.retentionPeriod ?? '', weight: W.NOTE },
        ],
        title: r => r.name,
        href: r => link('/gdpr', r.name),
      },
      {
        type: 'dpia', label: 'Avaliação de impacto (DPIA)', module: 'gdpr',
        find: org => p.dpia.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: { id: true, title: true, description: true, riskAssessment: true, mitigationMeasures: true, status: true },
        }),
        fields: r => [
          { key: 'title', text: r.title, weight: W.TITLE, fuzzy: true },
          { key: 'description', text: r.description ?? '', weight: W.DESC },
          { key: 'note', text: `${r.riskAssessment ?? ''} ${r.mitigationMeasures ?? ''}`, weight: W.NOTE },
        ],
        title: r => r.title,
        subtitle: r => st(r.status),
        href: r => link('/gdpr', r.title),
      },
      {
        type: 'regulatory-change', label: 'Alteração regulatória', module: 'regulatoryChange',
        find: org => p.regulatoryChange.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: {
            id: true, referenceId: true, title: true, description: true, source: true, jurisdiction: true,
            frameworks: true, impactAnalysis: true, implementationPlan: true, status: true,
          },
        }),
        fields: r => [
          { key: 'title', text: r.title, weight: W.TITLE, fuzzy: true },
          { key: 'code', text: r.referenceId ?? '', weight: W.CODE },
          { key: 'tags', text: `${words(r.frameworks)} ${r.source ?? ''} ${r.jurisdiction ?? ''}`, weight: W.TAG },
          { key: 'description', text: r.description ?? '', weight: W.DESC },
          { key: 'note', text: `${r.impactAnalysis ?? ''} ${r.implementationPlan ?? ''}`, weight: W.NOTE },
        ],
        title: r => `${r.referenceId} — ${r.title}`,
        href: r => link('/regulatory-change', r.title),
      },
      {
        type: 'ai-system', label: 'Sistema de IA', module: 'aiGovernance',
        find: org => p.aiSystem.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: { id: true, name: true, description: true, vendor: true, purpose: true, useCase: true, department: true },
        }),
        fields: r => [
          { key: 'title', text: r.name, weight: W.TITLE, fuzzy: true },
          { key: 'sub', text: `${r.vendor ?? ''} ${r.department ?? ''}`, weight: W.SUB },
          { key: 'description', text: `${r.description ?? ''} ${r.purpose ?? ''} ${r.useCase ?? ''}`, weight: W.DESC },
        ],
        title: r => r.name,
        subtitle: r => r.vendor ?? undefined,
        href: r => link('/ai-governance', r.name),
      },
      {
        type: 'hr-training', label: 'Formação (RH)', module: 'hrCompliance',
        find: org => p.hrTraining.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: { id: true, title: true, description: true, category: true, instructor: true, location: true },
        }),
        fields: r => [
          { key: 'title', text: r.title, weight: W.TITLE, fuzzy: true },
          { key: 'category', text: r.category ?? '', weight: W.SUB },
          { key: 'sub', text: `${r.instructor ?? ''} ${r.location ?? ''}`, weight: W.SUB },
          { key: 'description', text: r.description ?? '', weight: W.DESC },
        ],
        title: r => r.title,
        subtitle: r => r.category ?? undefined,
        href: r => link('/hr-compliance', r.title),
      },
      {
        type: 'whistleblow-training', label: 'Formação (Canal de denúncias)', module: 'denuncias',
        find: org => p.whistleblowTraining.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: { id: true, title: true, description: true, instructor: true },
        }),
        fields: r => [
          { key: 'title', text: r.title, weight: W.TITLE, fuzzy: true },
          { key: 'sub', text: r.instructor ?? '', weight: W.SUB },
          { key: 'description', text: r.description ?? '', weight: W.DESC },
        ],
        title: r => r.title,
        href: r => link('/denuncias', r.title),
      },
      {
        type: 'bcp-plan', label: 'Plano de continuidade', module: 'bcp',
        find: org => p.bcpPlan.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: { id: true, name: true, scope: true, status: true },
        }),
        fields: r => [
          { key: 'title', text: r.name, weight: W.TITLE, fuzzy: true },
          { key: 'description', text: r.scope ?? '', weight: W.DESC },
        ],
        title: r => r.name,
        subtitle: r => st(r.status),
        href: r => link('/business-continuity', r.name),
      },
      {
        type: 'itsm-incident', label: 'Incidente de TI', module: 'itsm',
        find: org => p.itsmIncident.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: { id: true, incidentId: true, title: true, description: true, category: true, affectedSystem: true, status: true },
        }),
        fields: r => [
          { key: 'title', text: r.title, weight: W.TITLE, fuzzy: true },
          { key: 'code', text: r.incidentId ?? '', weight: W.CODE },
          { key: 'sub', text: `${r.category ?? ''} ${r.affectedSystem ?? ''}`, weight: W.SUB },
          { key: 'description', text: r.description ?? '', weight: W.DESC },
        ],
        title: r => `${r.incidentId} — ${r.title}`,
        subtitle: r => st(r.status),
        href: r => link('/itsm', r.title),
      },
      {
        type: 'aml-case', label: 'Caso AML/KYC', module: 'aml',
        find: org => p.amlCase.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: { id: true, caseId: true, subjectName: true, description: true, findings: true, resolution: true, status: true },
        }),
        fields: r => [
          { key: 'title', text: r.subjectName, weight: W.TITLE, fuzzy: true },
          { key: 'code', text: r.caseId ?? '', weight: W.CODE },
          { key: 'description', text: r.description ?? '', weight: W.DESC },
          { key: 'note', text: `${r.findings ?? ''} ${r.resolution ?? ''}`, weight: W.NOTE },
        ],
        title: r => `${r.caseId} — ${r.subjectName}`,
        subtitle: r => st(r.status),
        href: r => link('/aml', r.subjectName),
      },
      {
        // Generic checklist standards (ISO 22000, 13485, 20000-1, 27018, 27036, NIST AI RMF, ISO 23894):
        // access is per standard, through the permission module of each one.
        type: 'standard-requirement', label: 'Requisito de norma', module: '*',
        rowAllowed: (r, perms) => {
          const def = findStandard(r.standardKey);
          return !!def && (perms[def.module] ?? 0) >= 1;
        },
        find: org => p.standardRequirement.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: { id: true, standardKey: true, clause: true, title: true, description: true, evidence: true, notes: true, status: true },
        }),
        fields: r => [
          { key: 'title', text: r.title, weight: W.TITLE, fuzzy: true },
          { key: 'code', text: `${findStandard(r.standardKey)?.name ?? ''} ${r.clause}`, weight: W.CODE },
          { key: 'description', text: r.description ?? '', weight: W.DESC },
          { key: 'note', text: `${r.evidence ?? ''} ${r.notes ?? ''}`, weight: W.NOTE },
        ],
        title: r => `${r.clause} — ${r.title}`,
        subtitle: r => dot(findStandard(r.standardKey)?.name, st(r.status)),
        href: r => link(`/standards/${r.standardKey}`, r.title),
      },
      {
        type: 'environmental-requirement', label: 'Requisito ISO 14001', module: 'environment',
        find: org => p.environmentalRequirement.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: { id: true, code: true, clauseNumber: true, title: true, description: true, evidence: true, notes: true, status: true },
        }),
        fields: r => [
          { key: 'title', text: r.title, weight: W.TITLE, fuzzy: true },
          { key: 'code', text: `${r.code} ${r.clauseNumber}`, weight: W.CODE },
          { key: 'description', text: r.description ?? '', weight: W.DESC },
          { key: 'note', text: `${r.evidence ?? ''} ${r.notes ?? ''}`, weight: W.NOTE },
        ],
        title: r => `${r.clauseNumber} — ${r.title}`,
        subtitle: r => dot('ISO 14001', st(r.status) ?? undefined),
        href: r => link('/environment', r.title, 'tab=requirements'),
      },
      {
        type: 'environmental-aspect', label: 'Aspeto ambiental', module: 'environment',
        find: org => p.environmentalAspect.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: { id: true, activity: true, aspect: true, impact: true, lifecycleStage: true, controls: true, isSignificant: true },
        }),
        fields: r => [
          { key: 'title', text: r.aspect, weight: W.TITLE, fuzzy: true },
          { key: 'sub', text: `${r.activity} ${r.lifecycleStage ?? ''}`, weight: W.SUB },
          { key: 'description', text: r.impact ?? '', weight: W.DESC },
          { key: 'note', text: r.controls ?? '', weight: W.NOTE },
        ],
        title: r => r.aspect,
        subtitle: r => dot(r.activity, r.isSignificant ? 'Significativo' : undefined),
        href: r => link('/environment', r.aspect, 'tab=aspects'),
      },
      {
        type: 'environmental-objective', label: 'Objetivo ambiental', module: 'environment',
        find: org => p.environmentalObjective.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: { id: true, title: true, description: true, indicator: true, actions: true, status: true },
        }),
        fields: r => [
          { key: 'title', text: r.title, weight: W.TITLE, fuzzy: true },
          { key: 'sub', text: r.indicator ?? '', weight: W.SUB },
          { key: 'description', text: r.description ?? '', weight: W.DESC },
          { key: 'note', text: r.actions ?? '', weight: W.NOTE },
        ],
        title: r => r.title,
        subtitle: r => st(r.status),
        href: r => link('/environment', r.title, 'tab=objectives'),
      },
      {
        type: 'environmental-obligation', label: 'Requisito legal (ambiente)', module: 'environment',
        find: org => p.environmentalObligation.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: { id: true, title: true, source: true, category: true, requirement: true, applicability: true, notes: true },
        }),
        fields: r => [
          { key: 'title', text: r.title, weight: W.TITLE, fuzzy: true },
          { key: 'code', text: r.source ?? '', weight: W.CODE },
          { key: 'category', text: r.category ?? '', weight: W.SUB },
          { key: 'description', text: `${r.requirement ?? ''} ${r.applicability ?? ''}`, weight: W.DESC },
          { key: 'note', text: r.notes ?? '', weight: W.NOTE },
        ],
        title: r => r.title,
        subtitle: r => r.source ?? undefined,
        href: r => link('/environment', r.title, 'tab=obligations'),
      },
      {
        type: 'report', label: 'Relatório', module: 'reports',
        find: org => p.report.findMany({
          where: { organizationId: org }, orderBy, take: CAP,
          select: { id: true, name: true, status: true },
        }),
        fields: r => [{ key: 'title', text: r.name, weight: W.TITLE, fuzzy: true }],
        title: r => r.name,
        subtitle: r => st(r.status),
        href: r => link('/reports', r.name),
      },
    ];
  }
}
