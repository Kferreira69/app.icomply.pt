import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../common/mail/mail.service';
import { v4 as uuid } from 'uuid';
import { MoloniClient } from './moloni/moloni.client';
import { MoloniBilling, vatTreatment, planReference, BillingCustomer } from './moloni/moloni.billing';

// ── Module catalogue ─────────────────────────────────────────

export const MODULE_CATALOGUE = [
  { key: 'dashboard',       label: 'Dashboard',                   monthlyPrice: 0,    annualPrice: 0    },
  { key: 'diagnostic',      label: 'Diagnóstico',                 monthlyPrice: 0,    annualPrice: 0    },
  { key: 'projects',        label: 'Projetos & Tarefas',          monthlyPrice: 49,   annualPrice: 490  },
  { key: 'risks',           label: 'Gestão de Riscos',            monthlyPrice: 49,   annualPrice: 490  },
  { key: 'evidence',        label: 'Evidências',                  monthlyPrice: 29,   annualPrice: 290  },
  { key: 'audits',          label: 'Auditorias & Findings',       monthlyPrice: 49,   annualPrice: 490  },
  { key: 'capa',            label: 'CAPA',                        monthlyPrice: 29,   annualPrice: 290  },
  { key: 'reports',         label: 'Relatórios PDF',              monthlyPrice: 29,   annualPrice: 290  },
  { key: 'policies',        label: 'Gestão de Políticas',         monthlyPrice: 39,   annualPrice: 390  },
  { key: 'gdpr',            label: 'GDPR / ROPA / DPIA',         monthlyPrice: 79,   annualPrice: 790  },
  { key: 'nis2',            label: 'NIS2 Compliance',             monthlyPrice: 69,   annualPrice: 690  },
  { key: 'dora',            label: 'DORA',                        monthlyPrice: 79,   annualPrice: 790  },
  { key: 'soa',             label: 'ISO 27001 SoA',               monthlyPrice: 59,   annualPrice: 590  },
  { key: 'vendors',         label: 'Gestão de Fornecedores',      monthlyPrice: 49,   annualPrice: 490  },
  { key: 'whistleblow',     label: 'Canal de Denúncias (RGPC)',   monthlyPrice: 89,   annualPrice: 890  },
  { key: 'hr_compliance',   label: 'HR Compliance & Workforce',   monthlyPrice: 99,   annualPrice: 990  },
  { key: 'ai_governance',   label: 'AI Governance Suite',         monthlyPrice: 129,  annualPrice: 1290 },
  { key: 'aiAssistant',     label: 'AI Assistant',                monthlyPrice: 39,   annualPrice: 390  },
  { key: 'trustCenter',     label: 'Trust Center Público',        monthlyPrice: 29,   annualPrice: 290  },
  { key: 'excelImport',     label: 'Importação Excel',            monthlyPrice: 0,    annualPrice: 0    },
  { key: 'translations',    label: 'Gestão de Traduções',         monthlyPrice: 0,    annualPrice: 0    },
];

// ── Governance Suites (comercial) ─────────────────────────────

export const GOVERNANCE_SUITES = [
  {
    key: 'security_suite',
    label: 'Security Governance Suite',
    description: 'ISO 27001 · NIS2 · DORA · TISAX · CIS Controls',
    modules: ['soa', 'nis2', 'dora'],
    monthlyPrice: 199,
    annualPrice: 1990,
    color: 'blue',
  },
  {
    key: 'privacy_suite',
    label: 'Privacy Governance Suite',
    description: 'GDPR · ROPA · DPIA · DSAR · Cookie Governance',
    modules: ['gdpr'],
    monthlyPrice: 119,
    annualPrice: 1190,
    color: 'violet',
  },
  {
    key: 'ai_suite',
    label: 'AI Governance Suite',
    description: 'EU AI Act · ISO 42001 · FRIA · Model Monitoring',
    modules: ['ai_governance'],
    monthlyPrice: 149,
    annualPrice: 1490,
    color: 'emerald',
  },
  {
    key: 'risk_suite',
    label: 'Risk & Audit Suite',
    description: 'Riscos · Auditorias · CAPA · Findings',
    modules: ['risks', 'audits', 'capa'],
    monthlyPrice: 129,
    annualPrice: 1290,
    color: 'amber',
  },
  {
    key: 'third_party_suite',
    label: 'Third-Party Governance Suite',
    description: 'Fornecedores · Due Diligence · Contratos',
    modules: ['vendors'],
    monthlyPrice: 79,
    annualPrice: 790,
    color: 'rose',
  },
  {
    key: 'workforce_suite',
    label: 'Workforce & HR Compliance Suite',
    description: 'ISO 45001 · GDPR HR · Pay Transparency · Contratos',
    modules: ['hr_compliance'],
    monthlyPrice: 119,
    annualPrice: 1190,
    color: 'cyan',
  },
];

// ── Add-on catalogue ──────────────────────────────────────────

export const ADDON_CATALOGUE = [
  // Preços alinhados com o site público (icomply.pt/precos) — decisão de 2026-11-23: prevalece o site.
  { key: 'ai_copilot',          label: 'AI Copilot',               monthlyPrice: 99,  annualPrice: 990  },
  { key: 'api_access',          label: 'API Access',               monthlyPrice: 79,  annualPrice: 790  },
  { key: 'white_label',         label: 'White Label',              monthlyPrice: 199, annualPrice: 1990 },
  { key: 'multi_entity',        label: 'Multi-Entity / Group',     monthlyPrice: 149, annualPrice: 1490 },
  { key: 'advanced_reporting',  label: 'Advanced Reporting',       monthlyPrice: 59,  annualPrice: 590  },
  { key: 'regulatory_monitoring', label: 'Regulatory Monitoring',  monthlyPrice: 129, annualPrice: 1290 },
  { key: 'dpia_wizard',         label: 'DPIA Wizard',              monthlyPrice: 29,  annualPrice: 290  },
  { key: 'dsar_workflows',      label: 'DSAR Workflows',           monthlyPrice: 29,  annualPrice: 290  },
  { key: 'cookie_governance',   label: 'Cookie Governance',        monthlyPrice: 19,  annualPrice: 190  },
  { key: 'vulnerability_tracking', label: 'Vulnerability Tracking', monthlyPrice: 39, annualPrice: 390  },
  { key: 'vendor_security',     label: 'Vendor Security Assessments', monthlyPrice: 49, annualPrice: 490 },
  { key: 'ai_inventory',        label: 'AI Inventory',             monthlyPrice: 29,  annualPrice: 290  },
  { key: 'fria_engine',         label: 'FRIA Engine',              monthlyPrice: 39,  annualPrice: 390  },
  { key: 'model_monitoring',    label: 'Model Monitoring',         monthlyPrice: 49,  annualPrice: 490  },
  { key: 'identity_verification', label: 'Verificação de Identidade (KYC/KYB/AML)', monthlyPrice: 0, annualPrice: 0 },
];

// ── Plans (bundles) ───────────────────────────────────────────

export const PLANS = {
  FREE:         { label: 'Free',         monthlyPrice: 0,    annualPrice: 0,    modules: ['dashboard', 'diagnostic'] },
  STARTER:      { label: 'Starter',      monthlyPrice: 149,  annualPrice: 1490, modules: ['dashboard', 'diagnostic', 'projects', 'risks', 'reports'] },
  PROFESSIONAL: { label: 'Professional', monthlyPrice: 399,  annualPrice: 3990, modules: ['dashboard', 'diagnostic', 'projects', 'risks', 'evidence', 'audits', 'capa', 'reports', 'policies', 'gdpr', 'soa'] },
  ENTERPRISE:   { label: 'Enterprise',   monthlyPrice: 999,  annualPrice: 9990, modules: MODULE_CATALOGUE.map(m => m.key) },
  CUSTOM:       { label: 'Custom',       monthlyPrice: 0,    annualPrice: 0,    modules: [] },
};

@Injectable()
export class LicensingService {
  private moloniClientId     = this.config.get<string>('MOLONI_CLIENT_ID');
  private moloniClientSecret = this.config.get<string>('MOLONI_CLIENT_SECRET');
  private moloniUsername     = this.config.get<string>('MOLONI_USERNAME');
  private moloniPassword     = this.config.get<string>('MOLONI_PASSWORD');
  private moloniCompanyId    = this.config.get<string>('MOLONI_COMPANY_ID');
  private moloniBaseUrl      = 'https://api.moloni.pt/v1';
  private stripeSecretKey    = this.config.get<string>('STRIPE_SECRET_KEY');
  private stripeWebhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
  private appUrl             = this.config.get<string>('APP_URL', 'https://app.icomply.pt');

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mail: MailService,
  ) {}

  // ── Guard ────────────────────────────────────────────────────

  async assertSuperAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: { select: { name: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    if (
      user.role !== 'SUPER_ADMIN' ||
      !user.organization.name.toLowerCase().includes('contemporary constellation')
    ) {
      throw new ForbiddenException('Acesso restrito ao backoffice da Contemporary Constellation');
    }
  }

  // ── Catalogue ────────────────────────────────────────────────

  async getCatalogue() {
    const dbAddons = await (this.prisma as any).addonCatalogueItem.findMany({ where: { active: true } });
    const addons = dbAddons.length > 0
      ? dbAddons.map((a: any) => ({ key: a.key, label: a.label, monthlyPrice: Number(a.monthlyPrice), annualPrice: Number(a.annualPrice) }))
      : ADDON_CATALOGUE;
    return { modules: MODULE_CATALOGUE, plans: PLANS, suites: GOVERNANCE_SUITES, addons };
  }

  // ── Add-on catalogue (superadmin cost/price management) ───────

  async listAddonCatalogue() {
    const items = await (this.prisma as any).addonCatalogueItem.findMany({ orderBy: { key: 'asc' } });
    if (items.length > 0) return items;
    // Not seeded yet — surface the static defaults with costPrice=0 so the
    // superadmin UI has something to edit before the first real seed runs.
    return ADDON_CATALOGUE.map(a => ({
      key: a.key, label: a.label, costPrice: 0,
      monthlyPrice: a.monthlyPrice, annualPrice: a.annualPrice,
      marginMultiplier: 1.5, active: true,
    }));
  }

  async updateAddonCatalogueItem(
    key: string,
    dto: { costPrice?: number; marginMultiplier?: number; monthlyPrice?: number; annualPrice?: number; label?: string; active?: boolean },
  ) {
    const existing = await (this.prisma as any).addonCatalogueItem.findUnique({ where: { key } });
    const catalogEntry = ADDON_CATALOGUE.find(a => a.key === key);
    const label = dto.label ?? existing?.label ?? catalogEntry?.label ?? key;
    const marginMultiplier = dto.marginMultiplier ?? Number(existing?.marginMultiplier ?? 1.5);
    const costPrice = dto.costPrice ?? Number(existing?.costPrice ?? 0);

    // Sell price is auto-computed from cost × margin unless the superadmin
    // explicitly overrides it in the same request.
    const monthlyPrice = dto.monthlyPrice ?? Number((costPrice * marginMultiplier).toFixed(2));
    const annualPrice = dto.annualPrice ?? Number((monthlyPrice * 10).toFixed(2)); // 2 months free, same convention as existing catalogue entries

    return (this.prisma as any).addonCatalogueItem.upsert({
      where: { key },
      create: { key, label, costPrice, monthlyPrice, annualPrice, marginMultiplier, active: dto.active ?? true },
      update: { label, costPrice, monthlyPrice, annualPrice, marginMultiplier, ...(dto.active !== undefined ? { active: dto.active } : {}) },
    });
  }

  // ── List all orgs ─────────────────────────────────────────────

  async listAll() {
    const orgs = await this.prisma.organization.findMany({
      include: {
        license: {
          include: {
            modules: true,
            addons: true,
            invoices: { orderBy: { createdAt: 'desc' }, take: 5 },
            events:  { orderBy: { createdAt: 'desc' }, take: 10 },
          },
        },
        _count: { select: { users: true } },
        orgContacts: { where: { role: 'BILLING' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
    return orgs;
  }

  // ── Create new client org + optional first admin ──────────────

  async createClient(dto: {
    name: string; industry?: string; country?: string; vatNumber?: string;
    website?: string; billingEmail?: string; plan?: string; isDemoMode?: boolean;
    adminEmail?: string; adminFirstName?: string; adminLastName?: string;
  }, actorId?: string) {
    const slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const slugBase = slug || 'org';
    let finalSlug = slugBase;
    let suffix = 0;
    while (await this.prisma.organization.findUnique({ where: { slug: finalSlug } })) {
      suffix++;
      finalSlug = `${slugBase}-${suffix}`;
    }

    const org = await this.prisma.organization.create({
      data: {
        name: dto.name, slug: finalSlug,
        industry: dto.industry, country: dto.country || 'PT',
        vatNumber: dto.vatNumber, website: dto.website,
        billingEmail: dto.billingEmail,
        plan: dto.plan || 'FREE',
        isDemoMode: dto.isDemoMode ?? false,
      },
    });

    // Create initial license
    const license = await this.prisma.license.create({
      data: {
        organizationId: org.id,
        plan:   dto.plan || 'FREE',
        status: 'ACTIVE',
      },
    });

    await (this.prisma as any).subscriptionEvent.create({
      data: { licenseId: license.id, type: 'CREATED', toPlan: dto.plan || 'FREE', createdById: actorId },
    });

    let adminUser: any = null;
    if (dto.adminEmail) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.adminEmail.toLowerCase() } });
      if (existing) throw new ConflictException(`Email ${dto.adminEmail} já está em uso`);

      const inviteToken = uuid();
      adminUser = await this.prisma.user.create({
        data: {
          email:          dto.adminEmail.toLowerCase(),
          firstName:      dto.adminFirstName || '',
          lastName:       dto.adminLastName  || '',
          role:           'ADMIN',
          organizationId: org.id,
          inviteToken,
          inviteExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
          status: 'INVITED',
        },
      });

      await this.mail.sendInvite(adminUser.email, inviteToken, dto.adminFirstName || adminUser.email, org.name);
    }

    return { org, license, adminUser };
  }

  // ── Invite user to any org (backoffice) ──────────────────────

  async inviteUserToOrg(organizationId: string, dto: {
    email: string; firstName?: string; lastName?: string; role?: string;
  }) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException(`Email ${dto.email} já está em uso`);

    const inviteToken = uuid();
    const user = await this.prisma.user.create({
      data: {
        email:           dto.email.toLowerCase(),
        firstName:       dto.firstName || '',
        lastName:        dto.lastName  || '',
        role:            (dto.role as any) || 'ADMIN',
        organizationId,
        inviteToken,
        inviteExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        status:          'INVITED',
      },
    });

    await this.mail.sendInvite(user.email, inviteToken, dto.firstName || user.email, org.name);
    return user;
  }

  // ── List users of an org (backoffice) ────────────────────────

  async listOrgUsers(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, status: true, createdAt: true, lastLoginAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getByOrg(organizationId: string) {
    const license = await this.prisma.license.findUnique({
      where: { organizationId },
      include: {
        modules:  true,
        addons:   true,
        invoices: { orderBy: { createdAt: 'desc' } },
        events:   { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    return license;
  }

  // ── Upsert license ────────────────────────────────────────────

  async upsert(organizationId: string, dto: any, actorId?: string) {
    const {
      plan, status, billingCycle, trialEndsAt, startDate, endDate, nextBillingDate,
      autoRenew, gracePeriodDays, aiProvider, aiModel, maxUsers, maxStorageGb,
      maxAiCredits, maxApiCalls, contactName, contactEmail, notes,
      moloniClientId, moloniCustomerId, stripeCustomerId, stripeSubscriptionId,
      modules, addons, isDemoMode,
    } = dto;

    const existing = await this.prisma.license.findUnique({ where: { organizationId } });

    const license = await this.prisma.license.upsert({
      where: { organizationId },
      create: {
        organizationId,
        plan:           plan || 'FREE',
        status:         status || 'ACTIVE',
        billingCycle:   billingCycle || 'MONTHLY',
        trialEndsAt:    trialEndsAt    ? new Date(trialEndsAt)    : undefined,
        startDate:      startDate      ? new Date(startDate)      : new Date(),
        endDate:        endDate        ? new Date(endDate)        : undefined,
        nextBillingDate: nextBillingDate ? new Date(nextBillingDate) : undefined,
        autoRenew:      autoRenew ?? true,
        gracePeriodDays: gracePeriodDays ?? 7,
        aiProvider:     aiProvider || 'AUTO',
        aiModel,
        maxUsers:       maxUsers || 5,
        maxStorageGb:   maxStorageGb ?? 5,
        maxAiCredits:   maxAiCredits ?? 100,
        maxApiCalls:    maxApiCalls ?? 0,
        contactName,
        contactEmail,
        notes,
        moloniClientId,
        moloniCustomerId,
        stripeCustomerId,
        stripeSubscriptionId,
      },
      update: {
        plan, status, billingCycle,
        trialEndsAt:    trialEndsAt    ? new Date(trialEndsAt)    : undefined,
        endDate:        endDate        ? new Date(endDate)        : undefined,
        nextBillingDate: nextBillingDate ? new Date(nextBillingDate) : undefined,
        autoRenew, gracePeriodDays,
        aiProvider, aiModel,
        maxUsers, maxStorageGb, maxAiCredits, maxApiCalls,
        contactName, contactEmail, notes,
        moloniClientId, moloniCustomerId, stripeCustomerId, stripeSubscriptionId,
      },
    });

    // Log subscription event if plan changed
    if (existing && existing.plan !== plan && plan) {
      await (this.prisma as any).subscriptionEvent.create({
        data: {
          licenseId:   license.id,
          type:        existing.plan === 'FREE' || !existing.plan ? 'UPGRADED' :
                       (PLANS as any)[plan]?.monthlyPrice > (PLANS as any)[existing.plan]?.monthlyPrice ? 'UPGRADED' : 'DOWNGRADED',
          fromPlan:    existing.plan,
          toPlan:      plan,
          createdById: actorId,
        },
      });
    }
    if (!existing) {
      await (this.prisma as any).subscriptionEvent.create({
        data: { licenseId: license.id, type: 'CREATED', toPlan: plan || 'FREE', createdById: actorId },
      });
    }

    // Sync org
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        aiProvider: aiProvider || 'AUTO', aiModel, maxUsers: maxUsers || 5, plan: plan || 'FREE',
        ...(isDemoMode !== undefined && { isDemoMode }),
      },
    });

    // Sync modules
    if (modules && Array.isArray(modules)) {
      for (const mod of modules) {
        await this.prisma.licenseModule.upsert({
          where: { licenseId_module: { licenseId: license.id, module: mod.module } },
          create: {
            licenseId: license.id,
            module: mod.module,
            enabled: mod.enabled ?? true,
            monthlyPrice: mod.monthlyPrice ?? 0,
            annualPrice:  mod.annualPrice  ?? 0,
            submodules:   mod.submodules   ?? [],
          },
          update: {
            enabled:      mod.enabled ?? true,
            monthlyPrice: mod.monthlyPrice ?? 0,
            annualPrice:  mod.annualPrice  ?? 0,
            submodules:   mod.submodules   ?? [],
          },
        });
      }
    }

    // Sync add-ons
    if (addons && Array.isArray(addons)) {
      for (const addon of addons) {
        await (this.prisma as any).licenseAddon.upsert({
          where: { licenseId_addonKey: { licenseId: license.id, addonKey: addon.addonKey } },
          create: {
            licenseId: license.id,
            addonKey:  addon.addonKey,
            enabled:   addon.enabled ?? true,
            price:     addon.price ?? 0,
          },
          update: {
            enabled: addon.enabled ?? true,
            price:   addon.price ?? 0,
          },
        });
      }
    }

    return this.getByOrg(organizationId);
  }

  // ── Invoice creation ──────────────────────────────────────────

  calcInvoiceAmount(licenseId: string, modules: any[], billingCycle: string, taxRate = 23) {
    const subtotal = modules
      .filter(m => m.enabled)
      .reduce((sum, m) => sum + Number(billingCycle === 'ANNUAL' ? m.annualPrice : m.monthlyPrice), 0);
    const taxAmount = (subtotal * taxRate) / 100;
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  }

  async createInvoice(organizationId: string, dto: any) {
    const license = await this.prisma.license.findUnique({
      where: { organizationId },
      include: { modules: { where: { enabled: true } }, organization: { select: { country: true, vatNumber: true } } },
    });
    if (!license) throw new NotFoundException('License not found');

    // Clientes fora de Portugal com NIF/VAT: M40, sem IVA português. Os restantes casos mantêm 23 %.
    const treatment = vatTreatment(license.organization?.country, license.organization?.vatNumber);
    const taxRate = dto.taxRate ?? (treatment.kind === 'REVIEW' ? 23 : treatment.rate);
    const amounts = this.calcInvoiceAmount(license.id, license.modules, license.billingCycle, taxRate);

    const invoice = await this.prisma.licenseInvoice.create({
      data: {
        licenseId:   license.id,
        amount:      amounts.subtotal,
        taxRate,
        taxAmount:   amounts.taxAmount,
        totalAmount: amounts.total,
        currency:    'EUR',
        status:      'DRAFT',
        description: dto.description || `iComply ${license.plan} — ${license.billingCycle}`,
        periodStart: dto.periodStart ? new Date(dto.periodStart) : new Date(),
        periodEnd:   dto.periodEnd   ? new Date(dto.periodEnd)   : undefined,
        dueDate:     dto.dueDate     ? new Date(dto.dueDate)     : undefined,
      },
    });

    if (dto.sendToMoloni) {
      await this.emitMoloni(invoice.id, { paidNow: !!dto.paidNow });
    }

    return invoice;
  }

  async markPaid(invoiceId: string, dto: any = {}) {
    const before = await this.prisma.licenseInvoice.findUnique({ where: { id: invoiceId } });
    if (!before) throw new NotFoundException('Invoice not found');

    const invoice = await this.prisma.licenseInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        stripePaymentIntentId: dto.stripePaymentIntentId,
      },
      include: { license: true },
    });

    // Recibo no Moloni: só para faturas (FT) já fechadas e ainda não pagas. As faturas-recibo (FR) já nascem pagas
    // e as em rascunho não podem ter documentos associados.
    if (this.moloniBilling() && before.status !== 'PAID' && invoice.moloniId && invoice.moloniDocNo && !invoice.moloniReceiptId) {
      try {
        const customer = await this.moloniCustomer(invoice.license.organizationId);
        const receipt = await this.moloniBilling()!.receipt(
          invoice.moloniId, customer, Number(invoice.totalAmount), `Pagamento fatura ${invoice.moloniDocNo}`,
        );
        await this.prisma.licenseInvoice.update({ where: { id: invoiceId }, data: { moloniReceiptId: receipt.documentId } });
      } catch (e: any) {
        await this.recordMoloniError(invoice.licenseId, invoiceId, `recibo: ${e.message}`);
      }
    }

    // Log event
    await (this.prisma as any).subscriptionEvent.create({
      data: { licenseId: invoice.licenseId, type: 'PAYMENT_SUCCEEDED', metadata: { invoiceId } },
    });

    return invoice;
  }

  // ── Add-ons management ────────────────────────────────────────

  async listAddons(organizationId: string) {
    const license = await this.prisma.license.findUnique({ where: { organizationId } });
    if (!license) return [];
    return (this.prisma as any).licenseAddon.findMany({ where: { licenseId: license.id } });
  }

  async hasActiveAddon(organizationId: string, addonKey: string): Promise<boolean> {
    const license = await this.prisma.license.findUnique({ where: { organizationId } });
    if (!license) return false;
    const addon = await (this.prisma as any).licenseAddon.findUnique({
      where: { licenseId_addonKey: { licenseId: license.id, addonKey } },
    });
    return !!addon?.enabled;
  }

  async toggleAddon(organizationId: string, addonKey: string, enabled: boolean, actorId?: string) {
    const license = await this.prisma.license.findUnique({ where: { organizationId } });
    if (!license) throw new NotFoundException('License not found');

    const dbEntry = await (this.prisma as any).addonCatalogueItem.findUnique({ where: { key: addonKey } });
    const catalogEntry = ADDON_CATALOGUE.find(a => a.key === addonKey);
    const price = dbEntry ? Number(dbEntry.monthlyPrice) : (catalogEntry?.monthlyPrice ?? 0);
    const result = await (this.prisma as any).licenseAddon.upsert({
      where: { licenseId_addonKey: { licenseId: license.id, addonKey } },
      create: { licenseId: license.id, addonKey, enabled, price },
      update: { enabled },
    });

    await (this.prisma as any).subscriptionEvent.create({
      data: {
        licenseId: license.id,
        type: enabled ? 'ADDON_ADDED' : 'ADDON_REMOVED',
        metadata: { addonKey },
        createdById: actorId,
      },
    });

    return result;
  }

  // ── Stripe integration ────────────────────────────────────────

  async createStripeCheckoutSession(organizationId: string, planKey: string, billingCycle: string) {
    if (!this.stripeSecretKey) {
      throw new BadRequestException('Stripe not configured');
    }

    let stripe: any;
    try {
      const Stripe = require('stripe');
      stripe = new Stripe(this.stripeSecretKey, { apiVersion: '2024-06-20' });
    } catch {
      throw new BadRequestException('Stripe SDK not available');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { license: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const plan = (PLANS as any)[planKey];
    if (!plan) throw new BadRequestException('Invalid plan');

    const price = billingCycle === 'ANNUAL' ? plan.annualPrice : plan.monthlyPrice;

    // Create or get Stripe customer
    let customerId = org.license?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: org.license?.contactEmail || org.billingEmail,
        name:  org.name,
        metadata: { organizationId, icomplyPlan: planKey },
      });
      customerId = customer.id;
      if (org.license) {
        await this.prisma.license.update({
          where: { organizationId },
          data: { stripeCustomerId: customerId },
        });
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card', 'sepa_debit'],
      mode: billingCycle === 'ANNUAL' ? 'payment' : 'subscription',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `iComply ${plan.label}`,
            description: `Governance Operating System — ${billingCycle === 'ANNUAL' ? 'Anual' : 'Mensal'}`,
          },
          unit_amount: Math.round(price * 100), // cents
          ...(billingCycle !== 'ANNUAL' && { recurring: { interval: 'month' } }),
        },
        quantity: 1,
      }],
      metadata: { organizationId, planKey, billingCycle },
      success_url: `${this.appUrl}/settings/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${this.appUrl}/settings/billing?cancelled=1`,
      invoice_creation: billingCycle === 'ANNUAL' ? { enabled: true } : undefined,
    });

    return { sessionId: session.id, url: session.url };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    if (!this.stripeSecretKey || !this.stripeWebhookSecret) return;

    let stripe: any;
    try {
      const Stripe = require('stripe');
      stripe = new Stripe(this.stripeSecretKey, { apiVersion: '2024-06-20' });
    } catch { return; }

    let event: any;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, this.stripeWebhookSecret);
    } catch (e: any) {
      throw new BadRequestException(`Webhook error: ${e.message}`);
    }

    const obj = event.data.object;

    switch (event.type) {
      case 'checkout.session.completed': {
        const { organizationId, planKey, billingCycle } = obj.metadata || {};
        if (organizationId && planKey) {
          await this.upsert(organizationId, {
            plan: planKey,
            status: 'ACTIVE',
            billingCycle: billingCycle || 'MONTHLY',
            stripeCustomerId: obj.customer,
            stripeSubscriptionId: obj.subscription,
          });
          await this.createInvoice(organizationId, {
            description: `iComply ${planKey} — ${billingCycle}`,
            sendToMoloni: true,
            // Cartão confirmado pelo Stripe: fatura-recibo.
            paidNow: obj.payment_status === 'paid',
          });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const customerId = obj.customer;
        const license = await this.prisma.license.findFirst({
          where: { stripeCustomerId: customerId },
          include: { invoices: { where: { status: 'SENT' }, orderBy: { createdAt: 'desc' }, take: 1 } },
        });
        if (license?.invoices?.[0]) {
          await this.markPaid(license.invoices[0].id, {
            stripePaymentIntentId: obj.payment_intent,
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const customerId = obj.customer;
        const license = await this.prisma.license.findFirst({ where: { stripeCustomerId: customerId } });
        if (license) {
          await (this.prisma as any).subscriptionEvent.create({
            data: { licenseId: license.id, type: 'PAYMENT_FAILED', metadata: { stripeInvoiceId: obj.id } },
          });
          // Update to PAST_DUE after grace period
          const daysSinceStart = Math.floor((Date.now() - new Date(license.createdAt).getTime()) / 86400000);
          if (daysSinceStart > (license.gracePeriodDays || 7)) {
            await this.prisma.license.update({
              where: { id: license.id },
              data: { status: 'SUSPENDED', suspendedAt: new Date() },
            });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const customerId = obj.customer;
        const license = await this.prisma.license.findFirst({ where: { stripeCustomerId: customerId } });
        if (license) {
          await this.prisma.license.update({
            where: { id: license.id },
            data: { status: 'CANCELLED', cancelledAt: new Date() },
          });
          await (this.prisma as any).subscriptionEvent.create({
            data: { licenseId: license.id, type: 'CANCELLED', metadata: { reason: 'stripe_subscription_deleted' } },
          });
        }
        break;
      }
    }
  }

  async getStripePortalUrl(organizationId: string) {
    if (!this.stripeSecretKey) throw new BadRequestException('Stripe not configured');

    let stripe: any;
    try {
      const Stripe = require('stripe');
      stripe = new Stripe(this.stripeSecretKey, { apiVersion: '2024-06-20' });
    } catch {
      throw new BadRequestException('Stripe SDK not available');
    }

    const license = await this.prisma.license.findUnique({ where: { organizationId } });
    if (!license?.stripeCustomerId) throw new NotFoundException('No Stripe customer found');

    const session = await stripe.billingPortal.sessions.create({
      customer:    license.stripeCustomerId,
      return_url:  `${this.appUrl}/settings/billing`,
    });

    return { url: session.url };
  }

  // ── Moloni ────────────────────────────────────────────────────

  private moloni?: MoloniBilling | null;

  /** Cliente de faturação, ou null se o Moloni não estiver configurado neste ambiente. */
  private moloniBilling(): MoloniBilling | null {
    if (this.moloni !== undefined) return this.moloni;
    const num = (k: string) => { const v = Number(this.config.get<string>(k)); return Number.isFinite(v) && v > 0 ? v : undefined; };
    if (!(this.moloniClientId && this.moloniClientSecret && this.moloniUsername && this.moloniPassword && num('MOLONI_COMPANY_ID'))) {
      return (this.moloni = null);
    }
    const client = new MoloniClient({
      baseUrl: this.moloniBaseUrl,
      clientId: this.moloniClientId, clientSecret: this.moloniClientSecret,
      username: this.moloniUsername, password: this.moloniPassword,
      companyId: num('MOLONI_COMPANY_ID')!,
    });
    return (this.moloni = new MoloniBilling(client, {
      documentSetName: this.config.get<string>('MOLONI_DOCUMENT_SET') || 'ICY',
      // Rascunho por omissão: só passa a "1" (fechado e comunicado à AT) depois de validar no Moloni.
      status: this.config.get<string>('MOLONI_DOC_STATUS') === '1' ? 1 : 0,
      taxId23: num('MOLONI_TAX_ID_23'),
      languageId: num('MOLONI_LANGUAGE_ID') ?? 1,
      defaultPaymentMethodId: num('MOLONI_DEFAULT_PAYMENT_METHOD_ID'),
      defaultMaturityDateId: num('MOLONI_DEFAULT_MATURITY_DATE_ID'),
      cardPaymentMethodId: num('MOLONI_STRIPE_PAYMENT_METHOD_ID'),
    }));
  }

  private async moloniCustomer(organizationId: string): Promise<BillingCustomer> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { license: { select: { moloniCustomerId: true, contactEmail: true } }, orgAddresses: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    const addr = org.orgAddresses.find(a => a.type === 'BILLING') ?? org.orgAddresses.find(a => a.isPrimary) ?? org.orgAddresses[0];
    return {
      moloniCustomerId: org.license?.moloniCustomerId,
      vat: org.vatNumber,
      name: org.legalName || org.name,
      email: org.license?.contactEmail || org.billingEmail,
      address: addr?.street || org.address,
      city: addr?.city,
      zipCode: addr?.postalCode,
      country: org.country,
    };
  }

  private async recordMoloniError(licenseId: string, invoiceId: string, message: string) {
    console.error(`Moloni (fatura ${invoiceId}): ${message}`);
    await (this.prisma as any).subscriptionEvent.create({
      data: { licenseId, type: 'MOLONI_ERROR', metadata: { invoiceId, message: String(message).slice(0, 500) } },
    }).catch(() => undefined);
  }

  /**
   * Emite no Moloni o documento de uma fatura da app (FT, ou FR se já está paga). Idempotente: se a fatura já tem
   * documento não repete. Em caso de erro regista um evento MOLONI_ERROR e devolve ok:false (pode-se repetir).
   */
  async emitMoloni(invoiceId: string, opts: { paidNow?: boolean } = {}): Promise<{ ok: boolean; message?: string; documentId?: string }> {
    const billing = this.moloniBilling();
    if (!billing) return { ok: false, message: 'Moloni não configurado neste ambiente' };

    const invoice = await this.prisma.licenseInvoice.findUnique({
      where: { id: invoiceId },
      include: { license: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.moloniId) return { ok: true, documentId: invoice.moloniId, message: 'já emitida' };

    try {
      const customer = await this.moloniCustomer(invoice.license.organizationId);
      const treatment = vatTreatment(customer.country, customer.vat);
      if (treatment.kind === 'REVIEW') throw new Error(treatment.reason);
      const { reference, qty } = planReference(invoice.license.plan, invoice.license.billingCycle);

      const result = await billing.emit({
        customer, treatment, reference, qty,
        netAmount: Number(invoice.amount),
        description: invoice.description || `iComply ${invoice.license.plan}`,
        ourReference: invoice.id.slice(0, 8),
        dueDate: invoice.dueDate ?? undefined,
        paidNow: !!opts.paidNow,
      });

      await this.prisma.licenseInvoice.update({
        where: { id: invoice.id },
        data: {
          moloniId: result.documentId,
          moloniDocNo: result.documentNumber || null,
          ...(result.kind === 'FR'
            ? { status: 'PAID', paidAt: new Date() }
            : result.closed ? { status: 'SENT' } : {}),
        },
      });
      return { ok: true, documentId: result.documentId };
    } catch (e: any) {
      await this.recordMoloniError(invoice.licenseId, invoice.id, e.message);
      return { ok: false, message: e.message };
    }
  }

  // ── MRR / ARR analytics ───────────────────────────────────────

  async getStats() {
    const [totalOrgs, licenseStats, moduleStats, planDist, invoicePaid, invoicePending] =
      await Promise.all([
        this.prisma.organization.count(),
        this.prisma.license.groupBy({ by: ['status', 'plan'], _count: true }),
        this.prisma.licenseModule.groupBy({
          by: ['module'],
          where: { enabled: true },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
        }),
        this.prisma.license.groupBy({ by: ['plan'], _count: true }),
        this.prisma.licenseInvoice.aggregate({
          _sum: { totalAmount: true },
          where: { status: 'PAID' },
        }),
        this.prisma.licenseInvoice.aggregate({
          _sum: { totalAmount: true },
          where: { status: { in: ['SENT', 'OVERDUE'] } },
        }),
      ]);

    const activeOrgs  = licenseStats.filter(s => s.status === 'ACTIVE').reduce((s, x) => s + x._count, 0);
    const trialOrgs   = licenseStats.filter(s => s.status === 'TRIAL').reduce((s, x) => s + x._count, 0);
    const suspendedOrgs = licenseStats.filter(s => s.status === 'SUSPENDED').reduce((s, x) => s + x._count, 0);
    const totalRevenue  = Number(invoicePaid._sum.totalAmount ?? 0);
    const pendingRevenue = Number(invoicePending._sum.totalAmount ?? 0);

    // Estimate MRR from active licenses
    const activeLicenses = await this.prisma.license.findMany({
      where: { status: { in: ['ACTIVE', 'TRIAL'] } },
      include: { modules: { where: { enabled: true } } },
    });

    const mrr = activeLicenses.reduce((sum, lic) => {
      const monthly = lic.modules.reduce((s, m) => s + Number(m.monthlyPrice), 0);
      return sum + (lic.billingCycle === 'ANNUAL' ? monthly : monthly);
    }, 0);

    return {
      totalOrgs,
      activeOrgs,
      trialOrgs,
      suspendedOrgs,
      totalRevenue,
      pendingRevenue,
      mrr:  Math.round(mrr),
      arr:  Math.round(mrr * 12),
      topModules:   moduleStats.slice(0, 8),
      planDistribution: planDist,
    };
  }

  // ── Subscription events ───────────────────────────────────────

  async getEvents(organizationId: string) {
    const license = await this.prisma.license.findUnique({ where: { organizationId } });
    if (!license) return [];
    return (this.prisma as any).subscriptionEvent.findMany({
      where: { licenseId: license.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ── Feature flags ─────────────────────────────────────────────

  async getFeatureFlags(organizationId: string) {
    const license = await this.prisma.license.findUnique({ where: { organizationId } });
    if (!license) return [];
    return (this.prisma as any).featureFlag.findMany({ where: { licenseId: license.id } });
  }

  async setFeatureFlag(organizationId: string, key: string, enabled: boolean, expiresAt?: Date) {
    const license = await this.prisma.license.findUnique({ where: { organizationId } });
    if (!license) throw new NotFoundException('License not found');
    return (this.prisma as any).featureFlag.upsert({
      where: { licenseId_key: { licenseId: license.id, key } },
      create: { licenseId: license.id, organizationId, key, enabled, expiresAt },
      update: { enabled, expiresAt },
    });
  }
}
