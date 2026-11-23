import { MoloniClient, MoloniError } from './moloni.client';

/**
 * Regras fiscais e emissão de documentos no Moloni para as subscrições iComply.
 *
 * Enquadramento (decisão do utilizador, 2026-11-23, assume emitente estabelecido em Portugal e licença = subscrição
 * de acesso ao software online):
 *  - Cliente em Portugal ................ IVA 23 %.
 *  - Empresa/profissional UE ou fora UE . M40 «IVA – autoliquidação», sem IVA português (art. 6.º n.º 6 a) do CIVA,
 *                                          a contrario), com o NIF/VAT do cliente na fatura.
 *  - Estrangeiro sem NIF/VAT ............ não emitir: pode ser particular (limiar OSS de 10 000 € ou M44) — decidir à mão.
 */

export const MOLONI_DEFAULT_RATE = 23;
export const MOLONI_SELF_ASSESSMENT_CODE = 'M40';

export type VatTreatment =
  | { kind: 'PT'; rate: number }
  | { kind: 'EXEMPT'; rate: 0; code: string }
  | { kind: 'REVIEW'; reason: string };

const PT_NAMES = new Set(['PT', 'PRT', 'PORTUGAL']);

export function isPortugal(country?: string | null): boolean {
  return PT_NAMES.has(String(country ?? 'PT').trim().toUpperCase());
}

export function vatTreatment(country?: string | null, vat?: string | null): VatTreatment {
  if (isPortugal(country)) return { kind: 'PT', rate: MOLONI_DEFAULT_RATE };
  if (vat && vat.trim().length >= 5) return { kind: 'EXEMPT', rate: 0, code: MOLONI_SELF_ASSESSMENT_CODE };
  return { kind: 'REVIEW', reason: 'Cliente fora de Portugal sem NIF/VAT: classificar à mão (empresa → M40; particular → OSS ou M44).' };
}

/** Referência do artigo (ver a lista-mestre de artigos do Moloni) e quantidade conforme o ciclo. */
export function planReference(plan: string, billingCycle: string): { reference: string; qty: number } {
  const key = ({ STARTER: 'STARTER', PROFESSIONAL: 'PRO', ENTERPRISE: 'ENT' } as Record<string, string>)[String(plan).toUpperCase()];
  if (!key) throw new MoloniError(`Plano ${plan} não tem artigo no Moloni (só Starter, Professional e Enterprise são faturáveis).`);
  const annual = ['ANNUAL', 'MULTI_YEAR'].includes(String(billingCycle).toUpperCase());
  const quarterly = String(billingCycle).toUpperCase() === 'QUARTERLY';
  return { reference: `ICY-PLANO-${key}-${annual ? 'A' : 'M'}`, qty: quarterly ? 3 : 1 };
}

export interface BillingCustomer {
  moloniCustomerId?: string | null;
  vat?: string | null;
  name: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  zipCode?: string | null;
  country?: string | null;
}

export interface BillingOptions {
  documentSetName: string;
  /** '0' rascunho (omissão, seguro até validar no Moloni) ou '1' fechado (comunicado à AT). */
  status: 0 | 1;
  taxId23?: number;
  languageId: number;
  defaultPaymentMethodId?: number;
  defaultMaturityDateId?: number;
  cardPaymentMethodId?: number;
}

export interface EmitInput {
  customer: BillingCustomer;
  treatment: Exclude<VatTreatment, { kind: 'REVIEW' }>;
  reference: string;
  qty: number;
  /** Preço total s/IVA da linha. */
  netAmount: number;
  description: string;
  ourReference?: string;
  dueDate?: Date;
  /** Pagamento já confirmado (cartão): emite fatura-recibo em vez de fatura. */
  paidNow?: boolean;
}

export interface EmitResult {
  documentId: string;
  documentNumber: string;
  kind: 'FT' | 'FR';
  closed: boolean;
  total: number;
}

const day = (d: Date) => d.toISOString().slice(0, 10);
const datetime = (d: Date) => `${day(d)} ${d.toISOString().slice(11, 19)}`;
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export class MoloniBilling {
  constructor(private readonly client: MoloniClient, private readonly opts: BillingOptions) {}

  async documentSetId(): Promise<number> {
    const sets = await this.client.list<any>('documentSets/getAll');
    const hit = sets.find(s => String(s.name).trim().toUpperCase() === this.opts.documentSetName.toUpperCase());
    if (!hit) throw new MoloniError(`Série "${this.opts.documentSetName}" não existe no Moloni.`);
    return Number(hit.document_set_id);
  }

  async taxId(rate: number): Promise<number> {
    if (rate === MOLONI_DEFAULT_RATE && this.opts.taxId23) return this.opts.taxId23;
    const taxes = await this.client.list<any>('taxes/getAll');
    const candidates = taxes.filter(t => Number(t.value) === rate && String(t.fiscal_zone ?? 'PT').toUpperCase() === 'PT');
    const hit = candidates.find(t => /iva|normal/i.test(String(t.name))) ?? candidates[0];
    if (!hit) throw new MoloniError(`Imposto de ${rate} % não encontrado no Moloni (definir MOLONI_TAX_ID_23).`);
    return Number(hit.tax_id);
  }

  async product(reference: string): Promise<{ id: number }> {
    const found = await this.client.list<any>('products/getByReference', { reference, exact: 1 });
    const hit = found.find(p => String(p.reference).toUpperCase() === reference.toUpperCase());
    if (!hit) throw new MoloniError(`Artigo ${reference} não existe no Moloni: criar a partir da lista-mestre de artigos.`);
    return { id: Number(hit.product_id) };
  }

  async customerId(c: BillingCustomer): Promise<number> {
    if (c.moloniCustomerId && Number(c.moloniCustomerId)) return Number(c.moloniCustomerId);
    const vat = (c.vat || '').trim();
    if (!vat) throw new MoloniError('Cliente sem NIF/VAT.');
    const existing = await this.client.list<any>('customers/getByVat', { vat });
    if (existing[0]?.customer_id) return Number(existing[0].customer_id);

    if (!c.address || !c.city) throw new MoloniError('Cliente sem morada ou cidade: preencher na organização antes de faturar.');
    if (!this.opts.defaultPaymentMethodId || !this.opts.defaultMaturityDateId) {
      throw new MoloniError('Faltam MOLONI_DEFAULT_PAYMENT_METHOD_ID e MOLONI_DEFAULT_MATURITY_DATE_ID para criar clientes.');
    }
    const country = await this.countryId(c.country);
    const next = await this.client.post<any>('customers/getNextNumber');
    const created = await this.client.insert<any>('customers/insert', {
      vat,
      number: String(next?.number ?? ''),
      name: c.name,
      language_id: this.opts.languageId,
      address: c.address,
      city: c.city,
      zip_code: c.zipCode || undefined,
      country_id: country,
      email: c.email || undefined,
      maturity_date_id: this.opts.defaultMaturityDateId,
      payment_method_id: this.opts.defaultPaymentMethodId,
      copies: [],
    });
    return Number(created.customer_id);
  }

  private async countryId(country?: string | null): Promise<number> {
    if (isPortugal(country)) return 1;
    const iso = String(country ?? '').trim().toUpperCase();
    const all = await this.client.list<any>('countries/getAll');
    const hit = all.find(x => String(x.iso_3166_1 ?? '').toUpperCase() === iso);
    if (!hit) throw new MoloniError(`País "${country}" não encontrado no Moloni.`);
    return Number(hit.country_id);
  }

  async emit(input: EmitInput, now = new Date()): Promise<EmitResult> {
    const [setId, customerId, product] = await Promise.all([
      this.documentSetId(), this.customerId(input.customer), this.product(input.reference),
    ]);
    const exempt = input.treatment.kind === 'EXEMPT';
    const rate = input.treatment.rate;
    const taxes = exempt ? [] : [{ tax_id: await this.taxId(rate), value: rate, order: 1, cumulative: 0 }];
    const unit = round2(input.netAmount / input.qty);
    const total = round2(input.netAmount * (1 + rate / 100));

    const body: Record<string, unknown> = {
      date: day(now),
      expiration_date: day(input.dueDate ?? now),
      document_set_id: setId,
      customer_id: customerId,
      our_reference: input.ourReference,
      notes: input.description,
      status: this.opts.status,
      products: [{
        product_id: product.id,
        name: input.description,
        qty: input.qty,
        price: unit,
        order: 1,
        taxes,
        ...(exempt ? { exemption_reason: (input.treatment as any).code } : {}),
      }],
    };

    const fr = !!input.paidNow;
    if (fr) {
      const method = this.opts.cardPaymentMethodId ?? this.opts.defaultPaymentMethodId;
      if (!method) throw new MoloniError('Falta MOLONI_STRIPE_PAYMENT_METHOD_ID (ou o método por omissão) para fatura-recibo.');
      body.payments = [{ payment_method_id: method, date: datetime(now), value: total }];
    }

    const res = await this.client.insert<any>(fr ? 'invoiceReceipts/insert' : 'invoices/insert', body);
    const closed = this.opts.status === 1;
    return {
      documentId: String(res.document_id),
      documentNumber: closed ? await this.documentNumber(fr ? 'invoiceReceipts' : 'invoices', res.document_id) : '',
      kind: fr ? 'FR' : 'FT',
      closed,
      total,
    };
  }

  /** Recibo sobre uma fatura já emitida e fechada (pagamento confirmado depois). */
  async receipt(invoiceDocumentId: string, customer: BillingCustomer, total: number, notes: string, now = new Date()) {
    const method = this.opts.defaultPaymentMethodId;
    if (!method) throw new MoloniError('Falta MOLONI_DEFAULT_PAYMENT_METHOD_ID para emitir o recibo.');
    const [setId, customerId] = await Promise.all([this.documentSetId(), this.customerId(customer)]);
    const res = await this.client.insert<any>('receipts/insert', {
      date: day(now),
      document_set_id: setId,
      customer_id: customerId,
      net_value: total,
      associated_documents: [{ associated_id: Number(invoiceDocumentId), value: total }],
      payments: [{ payment_method_id: method, date: day(now), value: total, notes }],
      status: this.opts.status,
    });
    return { documentId: String(res.document_id) };
  }

  /** Melhor esforço: o número oficial só existe depois de o documento fechar. */
  private async documentNumber(group: 'invoices' | 'invoiceReceipts', id: number): Promise<string> {
    try {
      const one = await this.client.post<any>(`${group}/getOne`, { document_id: Number(id) });
      const doc = Array.isArray(one) ? one[0] : one;
      return String(doc?.document_set_name && doc?.number ? `${doc.document_set_name}/${doc.number}` : doc?.number ?? '');
    } catch {
      return '';
    }
  }
}
