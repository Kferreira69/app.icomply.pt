import { MoloniClient } from './moloni.client';
import { MoloniBilling, vatTreatment, planReference } from './moloni.billing';

const ok = (data: any) => ({ ok: true, status: 200, json: async () => data });

function fakeFetch(routes: Record<string, any>) {
  const calls: { url: string; init: any }[] = [];
  const fn = async (url: string, init: any) => {
    calls.push({ url, init });
    const path = new URL(url).pathname.replace('/v1/', '').replace(/\/$/, '');
    if (!(path in routes)) return { ok: false, status: 404, json: async () => ({ error: 'nope ' + path }) };
    const r = routes[path];
    return ok(typeof r === 'function' ? r(JSON.parse(init?.body ?? '{}')) : r);
  };
  return { fn, calls };
}

const CFG = { clientId: 'cid', clientSecret: 'sec', username: 'u', password: 'p', companyId: 7 };
const OPTS = { documentSetName: 'ICY', status: 0 as const, languageId: 1, defaultPaymentMethodId: 5, defaultMaturityDateId: 9, cardPaymentMethodId: 6, taxId23: 101 };
const CUSTOMER = { vat: '501234567', name: 'ACME', address: 'Rua A', city: 'Lisboa', zipCode: '1000-001', country: 'PT', email: 'a@b.pt' };

const baseRoutes = () => ({
  grant: { access_token: 'tok', refresh_token: 'ref', expires_in: 3600 },
  'documentSets/getAll': [{ document_set_id: 3, name: 'ICY' }],
  'products/getByReference': [{ product_id: 55, reference: 'ICY-PLANO-PRO-M' }],
  'customers/getByVat': [{ customer_id: 77 }],
  'invoices/insert': { valid: 1, document_id: 900 },
  'invoiceReceipts/insert': { valid: 1, document_id: 901 },
  'receipts/insert': { valid: 1, document_id: 902 },
});

describe('vatTreatment', () => {
  it('Portugal -> 23 %', () => expect(vatTreatment('PT', '501234567')).toEqual({ kind: 'PT', rate: 23 }));
  it('sem país assume Portugal', () => expect(vatTreatment(undefined, undefined).kind).toBe('PT'));
  it('estrangeiro com VAT -> M40', () => expect(vatTreatment('ES', 'ESB12345678')).toEqual({ kind: 'EXEMPT', rate: 0, code: 'M40' }));
  it('fora da UE com VAT -> M40', () => expect(vatTreatment('BR', '12.345.678/0001-95').kind).toBe('EXEMPT'));
  it('estrangeiro sem VAT -> revisão manual', () => expect(vatTreatment('DE', '').kind).toBe('REVIEW'));
});

describe('planReference', () => {
  it('mensal e anual', () => {
    expect(planReference('PROFESSIONAL', 'MONTHLY')).toEqual({ reference: 'ICY-PLANO-PRO-M', qty: 1 });
    expect(planReference('STARTER', 'ANNUAL')).toEqual({ reference: 'ICY-PLANO-STARTER-A', qty: 1 });
    expect(planReference('ENTERPRISE', 'QUARTERLY')).toEqual({ reference: 'ICY-PLANO-ENT-M', qty: 3 });
  });
  it('planos sem artigo recusam', () => expect(() => planReference('FREE', 'MONTHLY')).toThrow(/não tem artigo/));
});

describe('MoloniClient', () => {
  it('autentica por GET, envia access_token na query e JSON com json=true', async () => {
    const { fn, calls } = fakeFetch(baseRoutes());
    const c = new MoloniClient(CFG, fn);
    await c.post('documentSets/getAll');
    expect(calls[0].init.method).toBe('GET');
    expect(calls[0].url).toContain('/grant/?');
    expect(calls[0].url).toContain('grant_type=password');
    expect(calls[1].init.method).toBe('POST');
    expect(calls[1].url).toContain('access_token=tok');
    expect(calls[1].url).toContain('json=true');
    expect(JSON.parse(calls[1].init.body).company_id).toBe(7);
  });

  it('reutiliza o token e o renova com refresh_token', async () => {
    const { fn, calls } = fakeFetch(baseRoutes());
    const c = new MoloniClient(CFG, fn);
    await c.post('documentSets/getAll');
    await c.post('documentSets/getAll');
    expect(calls.filter(x => x.url.includes('/grant/')).length).toBe(1);
    (c as any).expiresAt = 0;
    await c.post('documentSets/getAll');
    expect(calls.filter(x => x.url.includes('grant_type=refresh_token')).length).toBe(1);
  });

  it('insert recusado (valid != 1) lança erro', async () => {
    const { fn } = fakeFetch({ ...baseRoutes(), 'invoices/insert': ['1 name'] });
    await expect(new MoloniClient(CFG, fn).insert('invoices/insert', {})).rejects.toThrow(/recusado/);
  });
});

describe('MoloniBilling.emit', () => {
  it('fatura a cliente português: 23 % com tax_id e rascunho', async () => {
    const { fn, calls } = fakeFetch(baseRoutes());
    const b = new MoloniBilling(new MoloniClient(CFG, fn), OPTS);
    const res = await b.emit({
      customer: CUSTOMER, treatment: { kind: 'PT', rate: 23 }, reference: 'ICY-PLANO-PRO-M', qty: 1,
      netAmount: 399, description: 'iComply PROFESSIONAL', ourReference: 'abc12345',
    }, new Date('2026-11-23T10:00:00Z'));
    expect(res).toMatchObject({ documentId: '900', kind: 'FT', closed: false, total: 490.77 });
    const sent = JSON.parse(calls.find(c => c.url.includes('invoices/insert'))!.init.body);
    expect(sent).toMatchObject({ document_set_id: 3, customer_id: 77, status: 0, date: '2026-11-23', expiration_date: '2026-11-23' });
    expect(sent.products[0]).toMatchObject({ product_id: 55, qty: 1, price: 399, taxes: [{ tax_id: 101, value: 23 }] });
    expect(sent.products[0].exemption_reason).toBeUndefined();
    expect(sent.payments).toBeUndefined();
  });

  it('cliente estrangeiro: sem imposto e com exemption_reason M40', async () => {
    const { fn, calls } = fakeFetch(baseRoutes());
    const b = new MoloniBilling(new MoloniClient(CFG, fn), OPTS);
    const res = await b.emit({
      customer: { ...CUSTOMER, country: 'ES', vat: 'ESB12345678' }, treatment: { kind: 'EXEMPT', rate: 0, code: 'M40' },
      reference: 'ICY-PLANO-PRO-M', qty: 1, netAmount: 399, description: 'x',
    });
    expect(res.total).toBe(399);
    const sent = JSON.parse(calls.find(c => c.url.includes('invoices/insert'))!.init.body);
    expect(sent.products[0].taxes).toEqual([]);
    expect(sent.products[0].exemption_reason).toBe('M40');
  });

  it('pagamento já confirmado: fatura-recibo com pagamento do total', async () => {
    const { fn, calls } = fakeFetch(baseRoutes());
    const b = new MoloniBilling(new MoloniClient(CFG, fn), OPTS);
    const res = await b.emit({
      customer: CUSTOMER, treatment: { kind: 'PT', rate: 23 }, reference: 'ICY-PLANO-PRO-M', qty: 1,
      netAmount: 100, description: 'x', paidNow: true,
    });
    expect(res.kind).toBe('FR');
    const sent = JSON.parse(calls.find(c => c.url.includes('invoiceReceipts/insert'))!.init.body);
    expect(sent.payments).toEqual([expect.objectContaining({ payment_method_id: 6, value: 123 })]);
  });

  it('trimestral: quantidade 3 e preço unitário repartido', async () => {
    const { fn, calls } = fakeFetch(baseRoutes());
    const b = new MoloniBilling(new MoloniClient(CFG, fn), OPTS);
    await b.emit({ customer: CUSTOMER, treatment: { kind: 'PT', rate: 23 }, reference: 'ICY-PLANO-PRO-M', qty: 3, netAmount: 1197, description: 'x' });
    const sent = JSON.parse(calls.find(c => c.url.includes('invoices/insert'))!.init.body);
    expect(sent.products[0]).toMatchObject({ qty: 3, price: 399 });
  });

  it('artigo inexistente dá erro claro', async () => {
    const { fn } = fakeFetch({ ...baseRoutes(), 'products/getByReference': [] });
    const b = new MoloniBilling(new MoloniClient(CFG, fn), OPTS);
    await expect(b.emit({ customer: CUSTOMER, treatment: { kind: 'PT', rate: 23 }, reference: 'ICY-PLANO-PRO-M', qty: 1, netAmount: 1, description: 'x' }))
      .rejects.toThrow(/não existe no Moloni/);
  });

  it('série inexistente dá erro claro', async () => {
    const { fn } = fakeFetch({ ...baseRoutes(), 'documentSets/getAll': [{ document_set_id: 1, name: 'OUTRA' }] });
    const b = new MoloniBilling(new MoloniClient(CFG, fn), OPTS);
    await expect(b.documentSetId()).rejects.toThrow(/Série "ICY"/);
  });

  it('cria o cliente quando não existe (PT) com os valores por omissão', async () => {
    const routes: any = { ...baseRoutes(), 'customers/getByVat': [], 'customers/getNextNumber': { number: 'C12' }, 'customers/insert': { valid: 1, customer_id: 88 } };
    const { fn, calls } = fakeFetch(routes);
    const b = new MoloniBilling(new MoloniClient(CFG, fn), OPTS);
    expect(await b.customerId(CUSTOMER)).toBe(88);
    const sent = JSON.parse(calls.find(c => c.url.includes('customers/insert'))!.init.body);
    expect(sent).toMatchObject({ vat: '501234567', number: 'C12', country_id: 1, language_id: 1, maturity_date_id: 9, payment_method_id: 5 });
  });

  it('cliente novo sem morada não é inventado: erro claro', async () => {
    const { fn } = fakeFetch({ ...baseRoutes(), 'customers/getByVat': [] });
    const b = new MoloniBilling(new MoloniClient(CFG, fn), OPTS);
    await expect(b.customerId({ ...CUSTOMER, address: null })).rejects.toThrow(/morada/);
  });

  it('usa o moloniCustomerId guardado sem consultar o Moloni', async () => {
    const { fn, calls } = fakeFetch(baseRoutes());
    const b = new MoloniBilling(new MoloniClient(CFG, fn), OPTS);
    expect(await b.customerId({ ...CUSTOMER, moloniCustomerId: '1234' })).toBe(1234);
    expect(calls.length).toBe(0);
  });

  it('recibo associa a fatura e paga o total', async () => {
    const { fn, calls } = fakeFetch(baseRoutes());
    const b = new MoloniBilling(new MoloniClient(CFG, fn), OPTS);
    await b.receipt('900', CUSTOMER, 490.77, 'Pagamento', new Date('2026-11-23T10:00:00Z'));
    const sent = JSON.parse(calls.find(c => c.url.includes('receipts/insert'))!.init.body);
    expect(sent).toMatchObject({ net_value: 490.77, associated_documents: [{ associated_id: 900, value: 490.77 }] });
  });
});
