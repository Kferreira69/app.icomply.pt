import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MailService } from '../common/mail/mail.service';

@Injectable()
export class AuditorPortalService {
  constructor(private prisma: PrismaService, private mail: MailService) {}

  // ── Management (authenticated) ────────────────────────────────

  async listSessions(organizationId: string) {
    return (this.prisma as any).auditorSession.findMany({
      where: { organizationId },
      include: { requests: { orderBy: { createdAt: 'desc' }, take: 3 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSession(organizationId: string, userId: string, dto: any) {
    const session = await (this.prisma as any).auditorSession.create({
      data: {
        organizationId,
        createdById: userId,
        auditorName:  dto.auditorName,
        auditorFirm:  dto.auditorFirm,
        auditorEmail: dto.auditorEmail,
        scope:        dto.scope,
        permissions:  dto.permissions || ['EVIDENCE', 'CONTROLS', 'FINDINGS', 'POLICIES'],
        expiresAt:    dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + 30 * 86400000),
        notes:        dto.notes,
      },
    });

    // Send invite email to auditor
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    const url = `${process.env.FRONTEND_URL || 'https://app.icomply.pt'}/auditor/${session.token}`;
    await this.mail.sendAuditorInvite(dto.auditorEmail, dto.auditorName, org?.name || 'iComply', url, session.expiresAt);

    return session;
  }

  async deactivateSession(id: string, organizationId: string) {
    const s = await (this.prisma as any).auditorSession.findFirst({ where: { id, organizationId } });
    if (!s) throw new NotFoundException('Session not found');
    return (this.prisma as any).auditorSession.update({ where: { id }, data: { isActive: false } });
  }

  // ── Public portal (no auth — token-based) ────────────────────

  async getPortal(token: string) {
    const session = await (this.prisma as any).auditorSession.findUnique({ where: { token } });
    if (!session || !session.isActive) throw new ForbiddenException('Invalid or expired session');
    if (new Date(session.expiresAt) < new Date()) {
      await (this.prisma as any).auditorSession.update({ where: { token }, data: { isActive: false } });
      throw new ForbiddenException('Session expired');
    }

    // Update last access
    await (this.prisma as any).auditorSession.update({ where: { token }, data: { lastAccessAt: new Date() } });

    const orgId = session.organizationId;
    const perms: string[] = session.permissions || [];

    // Fetch data based on permissions
    const [evidence, controls, findings, policies, risks] = await Promise.all([
      perms.includes('EVIDENCE') ? this.prisma.evidence.findMany({
        where: { project: { organizationId: orgId } },
        select: { id: true, title: true, status: true, createdAt: true, expiresAt: true, mimeType: true, s3Url: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }) : Promise.resolve([]),
      perms.includes('CONTROLS') ? this.prisma.soaControl.findMany({
        where: { organizationId: orgId },
        select: { id: true, controlCode: true, title: true, status: true, theme: true },
        orderBy: { controlCode: 'asc' },
      }) : Promise.resolve([]),
      perms.includes('FINDINGS') ? this.prisma.finding.findMany({
        where: { audit: { project: { organizationId: orgId } } },
        include: { audit: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }) : Promise.resolve([]),
      perms.includes('POLICIES') ? this.prisma.policy.findMany({
        where: { organizationId: orgId, status: 'APPROVED' },
        select: { id: true, title: true, category: true, version: true, createdAt: true },
        orderBy: { title: 'asc' },
      }) : Promise.resolve([]),
      perms.includes('RISKS') ? this.prisma.risk.findMany({
        where: { organizationId: orgId },
        select: { id: true, title: true, status: true, inherentScore: true, residualScore: true },
        orderBy: { inherentScore: 'desc' },
        take: 100,
      }) : Promise.resolve([]),
    ]);

    return {
      session: { auditorName: session.auditorName, auditorFirm: session.auditorFirm, permissions: perms, expiresAt: session.expiresAt },
      data: { evidence, controls, findings, policies, risks },
      requests: await (this.prisma as any).auditorRequest.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: 'desc' } }),
    };
  }

  async createRequest(token: string, dto: any) {
    const session = await (this.prisma as any).auditorSession.findUnique({ where: { token } });
    if (!session || !session.isActive) throw new ForbiddenException('Invalid session');
    return (this.prisma as any).auditorRequest.create({
      data: { sessionId: session.id, type: dto.type || 'CLARIFICATION', subject: dto.subject, message: dto.message, entityType: dto.entityType, entityId: dto.entityId, status: 'OPEN' },
    });
  }

  async respondToRequest(id: string, organizationId: string, response: string) {
    const req = await (this.prisma as any).auditorRequest.findFirst({ where: { id, session: { organizationId } } });
    if (!req) throw new NotFoundException('Request not found');
    return (this.prisma as any).auditorRequest.update({ where: { id }, data: { response, status: 'RESPONDED', respondedAt: new Date() } });
  }
}
