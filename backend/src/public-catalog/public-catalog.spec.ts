import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ALL_MODULES } from '../permissions/permissions.service';
import { STANDARDS } from '../standards/standards.registry';
import { CATALOG_DOMAINS } from './catalog.data';
import { PublicCatalogService } from './public-catalog.service';
import { LeadsService, esc } from './leads.service';
import { CreateLeadDto } from './leads.dto';

describe('product catalog (what the website may promise)', () => {
  const standards = CATALOG_DOMAINS.flatMap(d => d.standards);

  it('lists every checklist standard of the generic engine as available', () => {
    for (const s of STANDARDS) {
      const entry = standards.find(x => x.appPath === `/standards/${s.key}`);
      expect(entry).toBeDefined();
      expect(entry!.status).toBe('available');
    }
  });

  it('only references real permission modules', () => {
    for (const d of CATALOG_DOMAINS) {
      for (const m of d.modules) expect((ALL_MODULES as readonly string[]).includes(m)).toBe(true);
    }
  });

  it('has unique domain ids and website numbers', () => {
    const ids = CATALOG_DOMAINS.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    const numbers = CATALOG_DOMAINS.map(d => d.number).filter(Boolean);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers).toHaveLength(10);
  });

  it('explains every non-available standard', () => {
    for (const s of standards.filter(x => x.status === 'partial')) expect(s.note).toBeTruthy();
  });

  it('keeps the roadmap honest: EU Taxonomy is not claimed as available', () => {
    expect(standards.find(s => s.name.includes('Taxonomia'))?.status).toBe('roadmap');
  });

  it('exposes only public fields (no internal paths or module keys)', () => {
    const out = new PublicCatalogService().get();
    const json = JSON.stringify(out);
    expect(json).not.toContain('appPath');
    expect(json).not.toContain('"modules"');
    expect(out.totals.domains).toBe(CATALOG_DOMAINS.length);
    expect(out.totals.standardsAvailable).toBeGreaterThan(20);
    expect(out.totals.standardsRoadmap).toBeGreaterThanOrEqual(1);
  });
});

describe('LeadsService', () => {
  const base: CreateLeadDto = { type: 'DEMO', name: 'Ana Silva', email: 'Ana@Empresa.PT', consent: true };
  let prisma: any;
  let mail: any;
  let config: any;
  let svc: LeadsService;

  beforeEach(() => {
    prisma = {
      productLead: {
        create: jest.fn(async ({ data }: any) => ({ id: 'l1', ...data, company: data.company ?? null, message: data.message ?? null })),
        findMany: jest.fn(async () => []),
        groupBy: jest.fn(async () => [{ status: 'NEW', _count: { _all: 2 } }]),
        findUnique: jest.fn(async () => ({ id: 'l1' })),
        update: jest.fn(async ({ data }: any) => ({ id: 'l1', ...data })),
      },
    };
    mail = { sendNotification: jest.fn(async () => undefined) };
    config = { get: jest.fn(() => 'vendas@icomply.pt') };
    svc = new LeadsService(prisma, mail, config);
  });

  it('refuses a submission without consent', async () => {
    await expect(svc.create({ ...base, consent: false })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.productLead.create).not.toHaveBeenCalled();
  });

  it('drops honeypot hits silently with the same response', async () => {
    const out = await svc.create({ ...base, website: 'http://spam.example' });
    expect(out).toEqual({ received: true });
    expect(prisma.productLead.create).not.toHaveBeenCalled();
  });

  it('stores a lead with a normalised email and consent timestamp', async () => {
    const out = await svc.create({ ...base, domains: [' ESG ', ''] });
    expect(out).toEqual({ received: true });
    const data = prisma.productLead.create.mock.calls[0][0].data;
    expect(data.email).toBe('ana@empresa.pt');
    expect(data.domains).toEqual(['ESG']);
    expect(data.consentAt).toBeInstanceOf(Date);
  });

  it('a feature request needs a description', async () => {
    await expect(svc.create({ ...base, type: 'FEATURE_REQUEST' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('notifies the sales mailbox with escaped content', async () => {
    await svc.create({ ...base, message: '<script>alert(1)</script>' });
    await new Promise(r => setImmediate(r));
    expect(mail.sendNotification).toHaveBeenCalledTimes(1);
    const [to, , body] = mail.sendNotification.mock.calls[0];
    expect(to).toBe('vendas@icomply.pt');
    expect(body).not.toContain('<script>');
    expect(body).toContain('&lt;script&gt;');
  });

  it('does not lose the lead when the notification fails', async () => {
    mail.sendNotification.mockRejectedValue(new Error('smtp down'));
    await expect(svc.create(base)).resolves.toEqual({ received: true });
    expect(prisma.productLead.create).toHaveBeenCalled();
  });

  it('skips the notification when no mailbox is configured', async () => {
    config.get.mockReturnValue(undefined);
    await svc.create(base);
    await new Promise(r => setImmediate(r));
    expect(mail.sendNotification).not.toHaveBeenCalled();
  });

  it('ignores unknown filter values when listing', async () => {
    await svc.list({ status: 'HACK', type: 'DEMO' });
    expect(prisma.productLead.findMany.mock.calls[0][0].where).toEqual({ type: 'DEMO' });
  });

  it('updates only status and notes', async () => {
    await svc.update('l1', { status: 'CONTACTED', notes: 'ligar' });
    expect(prisma.productLead.update.mock.calls[0][0].data).toEqual({ status: 'CONTACTED', notes: 'ligar' });
    prisma.productLead.findUnique.mockResolvedValue(null);
    await expect(svc.update('x', { status: 'CLOSED' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('escapes html', () => {
    expect(esc(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });
});
