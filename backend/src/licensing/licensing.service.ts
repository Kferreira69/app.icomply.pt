import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../common/mail/mail.service';
import { v4 as uuid } from 'uuid';

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
  { key: 'ai_copilot',          label: 'AI Copilot',               monthlyPrice: 49,  annualPrice: 490  },
  { key: 'api_access',          label: 'API Access',               monthlyPrice: 99,  annualPrice: 990  },
  { key: 'white_label',         label: 'White Label',              monthlyPrice: 199, annualPrice: 1990 },
  { key: 'multi_entity',        label: 'Multi-Entity / Group',     monthlyPrice: 149, annualPrice: 1490 },
  { key: 'advanced_reporting',  label: 'Advanced Reporting',       monthlyPrice: 29,  annualPrice: 290  },
  { key: 'regulatory_monitoring', label: 'Regulatory Monitoring',  monthlyPrice: 49,  annualPrice: 490  },
  { key: 'dpia_wizard',         label: 'DPIA Wizard',              monthlyPrice: 29,  annualPrice: 290  },
  { key: 'dsar_workflows',      label: 'DSAR Workflows',           monthlyPrice: 29,  annualPrice: 290  },
  { key: 'cookie_governance',   label: 'Cookie Governance',        monthlyPrice: 19,  annualPrice: 190  },
  { key: 'vulnerability_tracking', label: 'Vulnerability Tracking', monthlyPrice: 39, annualPrice: 390  },
  { key: 'vendor_security',     label: 'Vendor Security Assessments', monthlyPrice: 49, annualPrice: 490 },
  { key: 'ai_inventory',        label: 'AI Inventory',             monthlyPrice: 29,  annualPrice: 290  },
  { key: 'fria_engine',         label: 'FRIA Engine',              monthlyPrice: 39,  annualPrice: 390  },
  { key: 'model_monitoring',    label: 'Model Monitoring',         monthlyPrice: 49,  annualPrice: 490  },
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

  getCatalogue() {
    return { modules: MODULE_CATALOGUE, plans: PLANS, suites: GOVERNANCE_SUITES, addons: ADDON_CATALOGUE };
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
      include: { modules: { where: { enabled: true } } },
    });
    if (!license) throw new NotFoundException('License not found');

    const taxRate = dto.taxRate ?? 23;
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

    if (this.moloniClientId && this.moloniCompanyId && dto.sendToMoloni) {
      try {
        const moloniResult = await this.sendToMoloni(invoice, license, dto);
        await this.prisma.licenseInvoice.update({
          where: { id: invoice.id },
          data: { moloniId: moloniResult.id, moloniDocNo: moloniResult.number, status: 'SENT' },
        });
      } catch (e: any) {
        console.error('Moloni error:', e.message);
      }
    }

    return invoice;
  }

  async markPaid(invoiceId: string, dto: any = {}) {
    const invoice = await this.prisma.licenseInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        stripePaymentIntentId: dto.stripePaymentIntentId,
      },
      include: { license: true },
    });

    // Auto-create Moloni receipt when marked as paid
    if (this.moloniClientId && this.moloniCompanyId && invoice.moloniId) {
      try {
        const receiptResult = await this.createMoloniReceipt(invoice);
        await this.prisma.licenseInvoice.update({
          where: { id: invoiceId },
          data: { moloniReceiptId: receiptResult.id, moloniReceiptNo: receiptResult.number },
        });
      } catch (e: any) {
        console.error('Moloni receipt error:', e.message);
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

  async toggleAddon(organizationId: string, addonKey: string, enabled: boolean, actorId?: string) {
    const license = await this.prisma.license.findUnique({ where: { organizationId } });
    if (!license) throw new NotFoundException('License not found');

    const catalogEntry = ADDON_CATALOGUE.find(a => a.key === addonKey);
    const result = await (this.prisma as any).licenseAddon.upsert({
      where: { licenseId_addonKey: { licenseId: license.id, addonKey } },
      create: { licenseId: license.id, addonKey, enabled, price: catalogEntry?.monthlyPrice ?? 0 },
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

  private async getMoloniToken(): Promise<string> {
    const res = await fetch(`${this.moloniBaseUrl}/grant/`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'password',
        client_id:     this.moloniClientId!,
        client_secret: this.moloniClientSecret!,
        username:      this.moloniUsername!,
        password:      this.moloniPassword!,
      }),
    });
    if (!res.ok) throw new Error('Moloni auth failed');
    const data = await res.json() as any;
    return data.access_token;
  }

  private async sendToMoloni(invoice: any, license: any, dto: any): Promise<{ id: string; number: string }> {
    const token = await this.getMoloniToken();
    const org = await this.prisma.organization.findUnique({
      where: { id: license.organizationId },
      select: { name: true, vatNumber: true, billingEmail: true, address: true },
    });

    const payload = {
      company_id:        this.moloniCompanyId,
      date:              new Date().toISOString().split('T')[0],
      expiration_date:   dto.dueDate ? new Date(dto.dueDate).toISOString().split('T')[0] : undefined,
      document_set_name: 'ICY',
      customer_name:     org?.name,
      customer_vat:      org?.vatNumber || '999999990',
      customer_email:    license.contactEmail || org?.billingEmail,
      notes:             invoice.description,
      products: [{
        name:  invoice.description,
        qty:   1,
        price: Number(invoice.amount),
        exemption_reason: null,
        taxes: [{ value: Number(invoice.taxRate), order: 1, cumulative: 0 }],
      }],
    };

    const res = await fetch(`${this.moloniBaseUrl}/invoices/insert/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Moloni invoice failed: ${await res.text()}`);
    const data = await res.json() as any;
    return { id: String(data.document_id), number: data.document_number || '' };
  }

  private async createMoloniReceipt(invoice: any): Promise<{ id: string; number: string }> {
    const token = await this.getMoloniToken();
    const payload = {
      company_id:        this.moloniCompanyId,
      date:              new Date().toISOString().split('T')[0],
      document_set_name: 'ICY',
      associated_documents: [{ document_id: invoice.moloniId, value: Number(invoice.totalAmount) }],
      payments: [{
        payment_method_id: 1, // Transferência bancária — to be configurable
        date:  new Date().toISOString().split('T')[0],
        value: Number(invoice.totalAmount),
        notes: `Pagamento fatura ${invoice.moloniDocNo}`,
      }],
    };

    const res = await fetch(`${this.moloniBaseUrl}/receipts/insert/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Moloni receipt failed: ${await res.text()}`);
    const data = await res.json() as any;
    return { id: String(data.document_id), number: data.document_number || '' };
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
