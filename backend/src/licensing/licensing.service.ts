import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

// ── Module catalogue (all available modules + default pricing) ──────────────

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

// ── Plans (bundles) ──────────────────────────────────────────────────────────

export const PLANS = {
  FREE:         { label: 'Free',         modules: ['dashboard', 'diagnostic'] },
  STARTER:      { label: 'Starter',      modules: ['dashboard', 'diagnostic', 'projects', 'risks', 'reports'] },
  PROFESSIONAL: { label: 'Professional', modules: ['dashboard', 'diagnostic', 'projects', 'risks', 'evidence', 'audits', 'capa', 'reports', 'policies', 'gdpr', 'soa'] },
  ENTERPRISE:   { label: 'Enterprise',   modules: MODULE_CATALOGUE.map(m => m.key) },
  CUSTOM:       { label: 'Custom',       modules: [] },
};

@Injectable()
export class LicensingService {
  // Moloni API config — only available on VPS via env
  private moloniClientId     = this.config.get<string>('MOLONI_CLIENT_ID');
  private moloniClientSecret = this.config.get<string>('MOLONI_CLIENT_SECRET');
  private moloniUsername     = this.config.get<string>('MOLONI_USERNAME');
  private moloniPassword     = this.config.get<string>('MOLONI_PASSWORD');
  // company_id is the numeric Moloni company ID (different from the OAuth client_id)
  private moloniCompanyId    = this.config.get<string>('MOLONI_COMPANY_ID');
  private moloniBaseUrl      = 'https://api.moloni.pt/v1';

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  // ── Guard: only Contemporary Constellation admins ────────────

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
    return { modules: MODULE_CATALOGUE, plans: PLANS };
  }

  // ── List all organizations with license ──────────────────────

  async listAll() {
    const orgs = await this.prisma.organization.findMany({
      include: {
        license: { include: { modules: true, invoices: { orderBy: { createdAt: 'desc' }, take: 3 } } },
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return orgs;
  }

  // ── Get license for one org ──────────────────────────────────

  async getByOrg(organizationId: string) {
    const license = await this.prisma.license.findUnique({
      where: { organizationId },
      include: { modules: true, invoices: { orderBy: { createdAt: 'desc' } } },
    });
    return license;
  }

  // ── Upsert license ───────────────────────────────────────────

  async upsert(organizationId: string, dto: any) {
    const {
      plan, status, billingCycle, trialEndsAt, startDate, endDate,
      aiProvider, aiModel, maxUsers, contactName, contactEmail, notes,
      moloniClientId, modules,
    } = dto;

    // Upsert base license
    const license = await this.prisma.license.upsert({
      where: { organizationId },
      create: {
        organizationId,
        plan: plan || 'FREE',
        status: status || 'ACTIVE',
        billingCycle: billingCycle || 'MONTHLY',
        trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : undefined,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : undefined,
        aiProvider: aiProvider || 'AUTO',
        aiModel,
        maxUsers: maxUsers || 5,
        contactName,
        contactEmail,
        notes,
        moloniClientId,
      },
      update: {
        plan, status, billingCycle,
        trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        aiProvider, aiModel, maxUsers, contactName, contactEmail, notes, moloniClientId,
      },
    });

    // Sync aiProvider to organization
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { aiProvider: aiProvider || 'AUTO', aiModel, maxUsers: maxUsers || 5 },
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
            annualPrice: mod.annualPrice ?? 0,
            submodules: mod.submodules ?? [],
          },
          update: {
            enabled: mod.enabled ?? true,
            monthlyPrice: mod.monthlyPrice ?? 0,
            annualPrice: mod.annualPrice ?? 0,
            submodules: mod.submodules ?? [],
          },
        });
      }
    }

    return this.getByOrg(organizationId);
  }

  // ── Calculate invoice total ──────────────────────────────────

  calcInvoiceAmount(licenseId: string, modules: any[], billingCycle: string, taxRate = 23) {
    const subtotal = modules
      .filter(m => m.enabled)
      .reduce((sum, m) => sum + Number(billingCycle === 'ANNUAL' ? m.annualPrice : m.monthlyPrice), 0);
    const taxAmount = (subtotal * taxRate) / 100;
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  }

  // ── Create invoice ───────────────────────────────────────────

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
        taxRate:     taxRate,
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

    // Try Moloni if configured
    if (this.moloniClientId && this.moloniCompanyId && dto.sendToMoloni) {
      try {
        const moloniResult = await this.sendToMoloni(invoice, license, dto);
        await this.prisma.licenseInvoice.update({
          where: { id: invoice.id },
          data: { moloniId: moloniResult.id, moloniDocNo: moloniResult.number, status: 'SENT' },
        });
      } catch (e: any) {
        // Log but don't fail — invoice still created locally
        console.error('Moloni error:', e.message);
      }
    }

    return invoice;
  }

  // ── Moloni integration ───────────────────────────────────────

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

    // Get or create customer in Moloni
    const org = await this.prisma.organization.findUnique({
      where: { id: license.organizationId },
      select: { name: true, vatNumber: true, billingEmail: true, address: true },
    });

    const invoicePayload = {
      company_id:        this.moloniCompanyId,   // numeric company ID, NOT client_id
      date:              new Date().toISOString().split('T')[0],
      expiration_date:   dto.dueDate ? new Date(dto.dueDate).toISOString().split('T')[0] : undefined,
      document_set_name: 'ICY',
      customer_name:     org?.name,
      customer_vat:      org?.vatNumber || '999999990',
      customer_email:    license.contactEmail || org?.billingEmail,
      notes:             invoice.description,
      products: [{
        name:       invoice.description,
        qty:        1,
        price:      Number(invoice.amount),
        exemption_reason: null,
        taxes: [{ value: Number(invoice.taxRate), order: 1, cumulative: 0 }],
      }],
    };

    const res = await fetch(`${this.moloniBaseUrl}/invoices/insert/`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(invoicePayload),
    });

    if (!res.ok) throw new Error(`Moloni invoice failed: ${await res.text()}`);
    const data = await res.json() as any;
    return { id: String(data.document_id), number: data.document_number || '' };
  }

  // ── Mark invoice as paid ─────────────────────────────────────

  async markPaid(invoiceId: string) {
    return this.prisma.licenseInvoice.update({
      where: { id: invoiceId },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  // ── Stats ─────────────────────────────────────────────────────

  async getStats() {
    const [totalOrgs, activeOrgs, totalRevenue, moduleStats] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.license.count({ where: { status: 'ACTIVE' } }),
      this.prisma.licenseInvoice.aggregate({
        _sum: { totalAmount: true },
        where: { status: 'PAID' },
      }),
      this.prisma.licenseModule.groupBy({
        by: ['module'],
        where: { enabled: true },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    return {
      totalOrgs,
      activeOrgs,
      totalRevenue: totalRevenue._sum.totalAmount ?? 0,
      topModules: moduleStats.slice(0, 8),
    };
  }
}
