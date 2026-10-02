import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupportTicketsService } from '../support-tickets.service';
import { PermissionsService } from '../../permissions/permissions.service';

const CC = { name: 'Contemporary Constellation' };
const CUSTOMER = { name: 'Cliente SA' };

const users: Record<string, any> = {
  agent:    { id: 'agent', role: 'SUPPORT', status: 'ACTIVE', email: 'agent@cc.pt', organization: CC },
  boss:     { id: 'boss', role: 'SUPER_ADMIN', status: 'ACTIVE', email: 'boss@cc.pt', organization: CC },
  rogue:    { id: 'rogue', role: 'SUPER_ADMIN', status: 'ACTIVE', email: 'rogue@x.pt', organization: CUSTOMER }, // SUPER_ADMIN inside a customer org
  suspendedAgent: { id: 'suspendedAgent', role: 'SUPPORT', status: 'SUSPENDED', email: 'sa@cc.pt', organization: CC },
  rogueAgent: { id: 'rogueAgent', role: 'SUPPORT', status: 'ACTIVE', email: 'ra@x.pt', organization: CUSTOMER },
  author:   { id: 'author', role: 'ADMIN', status: 'ACTIVE', email: 'ana@cliente.pt', organization: CUSTOMER },
  other:    { id: 'other', role: 'ADMIN', status: 'ACTIVE', email: 'rui@cliente.pt', organization: CUSTOMER },
};

const ticket = (over: any = {}) => ({
  id: 't1', ticketNumber: '#0007', userId: 'author', subject: 'Erro <b>no</b> login', description: 'Não consigo entrar',
  category: 'TECHNICAL_ISSUE', priority: 'HIGH', status: 'OPEN', assignedToId: null,
  user: { id: 'author', firstName: 'Ana', lastName: 'Silva', email: 'ana@cliente.pt' },
  organization: CUSTOMER, replies: [], attachments: [], ...over,
});

function make(opts: { env?: string; staffUsers?: any[] } = {}) {
  const prisma: any = {
    user: {
      findUnique: jest.fn(async ({ where }: any) => users[where.id] ?? null),
      findMany: jest.fn(async ({ where }: any) =>
        (opts.staffUsers ?? []).filter(u => u.role === where.role)),
    },
    supportTicket: {
      count: jest.fn().mockResolvedValue(6),
      findFirst: jest.fn().mockResolvedValue({ ticketNumber: '#0006' }),
      findUniqueOrThrow: jest.fn(async () => ticket()),
      create: jest.fn(async ({ data }: any) => ticket({ ...data, id: 't1' })),
      findUnique: jest.fn(async () => ticket()),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(async ({ data }: any) => ticket({ ...data })),
    },
    ticketReply: { findUnique: jest.fn().mockResolvedValue({ ticketId: 't1' }), create: jest.fn(async ({ data }: any) => ({ id: 'r1', ...data, author: { id: data.authorId, firstName: 'X', lastName: 'Y', role: 'ADMIN' }, attachments: [] })) },
    ticketAttachment: { findUnique: jest.fn() },
    $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
  };
  const storage: any = { getPresignedUrl: jest.fn().mockResolvedValue('http://s/x') };
  const mail: any = { sendTicketEmail: jest.fn().mockResolvedValue(undefined), appLink: (p: string) => `https://app.test${p}` };
  const config: any = { get: jest.fn((k: string, d?: any) => (k === 'SUPPORT_NOTIFY_EMAIL' ? opts.env ?? d : d)) };
  const service = new SupportTicketsService(prisma, storage, mail, config);
  return { service, prisma, mail, storage };
}
const flush = () => new Promise(r => setImmediate(r));

describe('SupportTicketsService — who is support staff', () => {
  it('SUPPORT agents and SUPER_ADMINs of the platform organisation are staff; nobody else is', async () => {
    const { service } = make();
    expect(await service.isStaff('agent')).toBe(true);
    expect(await service.isStaff('boss')).toBe(true);
    expect(await service.isStaff('author')).toBe(false);
    expect(await service.isStaff('ghost')).toBe(false);
  });

  it('a SUPER_ADMIN or SUPPORT user inside a customer organisation is NOT staff (cannot read other customers\' tickets)', async () => {
    const { service, prisma } = make();
    expect(await service.isStaff('rogue')).toBe(false);
    expect(await service.isStaff('rogueAgent')).toBe(false);
    await service.findAll('rogue', 'SUPER_ADMIN' as any);
    expect(prisma.supportTicket.findMany.mock.calls[0][0].where).toEqual({ userId: 'rogue' });
  });

  it('staff see every ticket and the internal notes; customers only their own, without internal notes', async () => {
    const { service, prisma } = make();
    await service.findAll('agent', 'SUPPORT' as any);
    expect(prisma.supportTicket.findMany.mock.calls[0][0].where).toEqual({});
    await service.findOne('t1', 'agent');
    expect(prisma.supportTicket.findUnique.mock.calls[0][0].include.replies.where).toEqual({});
    await service.findOne('t1', 'author');
    expect(prisma.supportTicket.findUnique.mock.calls[1][0].include.replies.where).toEqual({ isInternal: false });
    await expect(service.findOne('t1', 'other')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('stats are zeros for non-staff', async () => {
    const { service } = make();
    expect(await service.getStats('author')).toEqual({ open: 0, inProgress: 0, waitingUser: 0, resolved: 0, total: 0 });
  });
});

describe('SupportTicketsService — notifications', () => {
  it('a new ticket emails the support mailbox with a summary and a direct link', async () => {
    const { service, mail } = make({ env: 'suporte@icomply.pt' });
    await service.create('author', 'org1', { subject: 'Erro <b>no</b> login', description: 'Não consigo entrar', priority: 'HIGH' } as any);
    await flush();
    expect(mail.sendTicketEmail).toHaveBeenCalledTimes(1);
    const [to, subject, body] = mail.sendTicketEmail.mock.calls[0];
    expect(to).toBe('suporte@icomply.pt');
    expect(subject).toContain('Novo ticket');
    expect(body.url).toBe('https://app.test/admin/support?ticket=t1');
    expect(body.facts).toEqual(expect.arrayContaining([['Organização', 'Cliente SA'], ['Prioridade', 'Alta']]));
    expect(body.excerpt).toBe('Não consigo entrar');
  });

  it('without SUPPORT_NOTIFY_EMAIL it goes to the support agents; with none, to the platform super-admins', async () => {
    const withAgents = make({ staffUsers: [{ role: 'SUPPORT', email: 'a1@cc.pt' }, { role: 'SUPPORT', email: 'a2@cc.pt' }] });
    await withAgents.service.create('author', 'org1', { subject: 's', description: 'd' } as any);
    await flush();
    expect(withAgents.mail.sendTicketEmail.mock.calls.map((c: any) => c[0]).sort()).toEqual(['a1@cc.pt', 'a2@cc.pt']);
    const onlyBoss = make({ staffUsers: [{ role: 'SUPER_ADMIN', email: 'boss@cc.pt' }] });
    await onlyBoss.service.create('author', 'org1', { subject: 's', description: 'd' } as any);
    await flush();
    expect(onlyBoss.mail.sendTicketEmail.mock.calls.map((c: any) => c[0])).toEqual(['boss@cc.pt']);
  });

  it('never fails the ticket when the email fails', async () => {
    const { service, mail } = make({ env: 'suporte@icomply.pt' });
    mail.sendTicketEmail.mockRejectedValue(new Error('smtp down'));
    await expect(service.create('author', 'org1', { subject: 's', description: 'd' } as any)).resolves.toMatchObject({ id: 't1' });
    await flush();
  });

  it('a support reply tells the author; an internal note tells nobody; a customer reply tells support', async () => {
    const { service, mail, prisma } = make({ env: 'suporte@icomply.pt' });
    await service.addReply('t1', 'agent', 'SUPPORT' as any, { body: 'Já corrigimos' } as any);
    await flush();
    expect(mail.sendTicketEmail.mock.calls.map((c: any) => c[0])).toEqual(['ana@cliente.pt']);
    mail.sendTicketEmail.mockClear();
    await service.addReply('t1', 'agent', 'SUPPORT' as any, { body: 'nota interna', isInternal: true } as any);
    await flush();
    expect(mail.sendTicketEmail).not.toHaveBeenCalled();
    await service.addReply('t1', 'author', 'ADMIN' as any, { body: 'Continua igual', isInternal: true } as any);
    await flush();
    expect(mail.sendTicketEmail.mock.calls.map((c: any) => c[0])).toEqual(['suporte@icomply.pt']);
    // a customer cannot create internal notes
    expect(prisma.ticketReply.create.mock.calls.pop()[0].data.isInternal).toBe(false);
  });

  it('resolving a ticket tells the author once', async () => {
    const { service, mail } = make();
    await service.update('t1', 'agent', 'SUPPORT' as any, { status: 'RESOLVED' } as any);
    await flush();
    expect(mail.sendTicketEmail.mock.calls.map((c: any) => c[0])).toEqual(['ana@cliente.pt']);
  });
});

describe('SupportTicketsService — numbering, internal notes, staff status', () => {
  it('numbers from the highest existing ticket, so deleting old tickets cannot cause collisions', async () => {
    const { service, prisma } = make();
    prisma.supportTicket.findFirst.mockResolvedValue({ ticketNumber: '#0042' }); // #0001.. were deleted, count() would say 3
    await service.create('author', 'org1', { subject: 's', description: 'd' } as any);
    expect(prisma.supportTicket.create.mock.calls[0][0].data.ticketNumber).toBe('#0043');
  });

  it('retries with the next number when a concurrent create took it (P2002)', async () => {
    const { service, prisma } = make();
    const taken: any = Object.assign(new Error('unique'), { code: 'P2002' });
    prisma.supportTicket.create.mockRejectedValueOnce(taken).mockImplementation(async ({ data }: any) => ticket({ ...data }));
    await service.create('author', 'org1', { subject: 's', description: 'd' } as any);
    const numbers = prisma.supportTicket.create.mock.calls.map((c: any) => c[0].data.ticketNumber);
    expect(numbers).toEqual(['#0007', '#0008']);
  });

  it('gives up on errors that are not a number collision', async () => {
    const { service, prisma } = make();
    prisma.supportTicket.create.mockRejectedValue(Object.assign(new Error('db down'), { code: 'P1001' }));
    await expect(service.create('author', 'org1', { subject: 's', description: 'd' } as any)).rejects.toThrow('db down');
  });

  it('an internal note does not change the status the customer sees; a visible reply does', async () => {
    const { service, prisma } = make({ env: 'suporte@icomply.pt' });
    await service.addReply('t1', 'agent', 'SUPPORT' as any, { body: 'nota', isInternal: true } as any);
    expect(prisma.supportTicket.update).not.toHaveBeenCalled();
    await service.addReply('t1', 'agent', 'SUPPORT' as any, { body: 'resposta' } as any);
    expect(prisma.supportTicket.update.mock.calls[0][0].data.status).toBe('WAITING_USER');
  });

  it('a suspended support agent is not staff and cannot be assigned tickets', async () => {
    const { service } = make();
    expect(await service.isStaff('suspendedAgent')).toBe(false);
    await expect(service.update('t1', 'agent', 'SUPPORT' as any, { assignedToId: 'suspendedAgent' } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('an attachment cannot be hooked to a reply of another ticket', async () => {
    const { service, prisma } = make();
    prisma.ticketReply.findUnique.mockResolvedValue({ ticketId: 'other-ticket' });
    await expect(service.uploadAttachment('t1', 'org', { buffer: Buffer.from('x'), originalname: 'a.txt', mimetype: 'text/plain', size: 1 } as any, 'r-foreign', 'author'))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('SupportTicketsService — updates and attachments', () => {
  it('only staff update tickets, and only assign them to staff', async () => {
    const { service } = make();
    await expect(service.update('t1', 'author', 'ADMIN' as any, { status: 'CLOSED' } as any)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.update('t1', 'agent', 'SUPPORT' as any, { assignedToId: 'author' } as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update('t1', 'agent', 'SUPPORT' as any, { assignedToId: 'boss' } as any)).resolves.toBeDefined();
  });

  it('attachments follow the ticket\'s visibility; internal notes\' files are staff-only', async () => {
    const { service, prisma } = make();
    const res = { redirect: jest.fn() };
    prisma.ticketAttachment.findUnique.mockResolvedValue({ s3Key: 'k', ticket: { userId: 'author' }, reply: null });
    await service.downloadAttachment('a1', 'author', res);
    await service.downloadAttachment('a1', 'agent', res);
    expect(res.redirect).toHaveBeenCalledTimes(2);
    await expect(service.downloadAttachment('a1', 'other', res)).rejects.toBeInstanceOf(NotFoundException);
    prisma.ticketAttachment.findUnique.mockResolvedValue({ s3Key: 'k', ticket: { userId: 'author' }, reply: { isInternal: true } });
    await expect(service.downloadAttachment('a1', 'author', res)).rejects.toBeInstanceOf(NotFoundException);
    await service.downloadAttachment('a1', 'agent', res);
  });

  it('only the author or staff can attach files to a ticket', async () => {
    const { service } = make();
    await expect(service.uploadAttachment('t1', 'org', { buffer: Buffer.from('x'), originalname: 'a.txt', mimetype: 'text/plain', size: 1 } as any, undefined, 'other'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('SUPPORT role — no access to the platform modules', () => {
  it('has level 0 on every module regardless of matrix defaults, overrides or custom roles', async () => {
    const prisma: any = {
      user: { findUnique: jest.fn().mockResolvedValue({
        role: 'SUPPORT', permissions: [{ module: 'risks', level: 2 }], orgRoleId: 'r', orgRole: { isActive: true, permissions: { risks: 'write' } },
      }) },
    };
    const perms = await new PermissionsService(prisma).getUserPermissions('u');
    expect(Object.keys(perms).length).toBeGreaterThan(30);
    expect(Object.values(perms).every(v => v === 0)).toBe(true);
  });
});
