import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class OrgProfileService {
  constructor(private prisma: PrismaService) {}

  // ── Profile ───────────────────────────────────────────────────

  async getProfile(organizationId: string) {
    const org = await (this.prisma as any).organization.findUnique({
      where: { id: organizationId },
      include: {
        orgAddresses: true,
        orgContacts:  true,
        _count: { select: { users: true } },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async updateProfile(organizationId: string, dto: any) {
    const {
      legalName, tradeName, industry, size, country, vatNumber,
      employeeCount, annualRevenue, groupName, address, logoUrl,
      website, phone, billingEmail,
    } = dto;

    return (this.prisma as any).organization.update({
      where: { id: organizationId },
      data: {
        legalName, tradeName, industry, size,
        country: country || 'PT',
        vatNumber, employeeCount,
        annualRevenue: annualRevenue ? Number(annualRevenue) : undefined,
        groupName, address, logoUrl, website, phone, billingEmail,
      },
    });
  }

  // ── Addresses ─────────────────────────────────────────────────

  async listAddresses(organizationId: string) {
    return (this.prisma as any).orgAddress.findMany({
      where: { organizationId },
      orderBy: { type: 'asc' },
    });
  }

  async upsertAddress(organizationId: string, dto: any) {
    const { type, street, city, postalCode, region, country, isPrimary } = dto;
    const existing = await (this.prisma as any).orgAddress.findFirst({
      where: { organizationId, type },
    });
    if (existing) {
      return (this.prisma as any).orgAddress.update({
        where: { id: existing.id },
        data: { street, city, postalCode, region, country: country || 'PT', isPrimary: isPrimary ?? false },
      });
    }
    return (this.prisma as any).orgAddress.create({
      data: { organizationId, type, street, city, postalCode, region, country: country || 'PT', isPrimary: isPrimary ?? false },
    });
  }

  async removeAddress(id: string, organizationId: string) {
    const record = await (this.prisma as any).orgAddress.findFirst({ where: { id, organizationId } });
    if (!record) throw new NotFoundException('Address not found');
    return (this.prisma as any).orgAddress.delete({ where: { id } });
  }

  // ── Contacts ──────────────────────────────────────────────────

  async listContacts(organizationId: string) {
    return (this.prisma as any).orgContact.findMany({
      where: { organizationId },
      orderBy: { role: 'asc' },
    });
  }

  async upsertContact(organizationId: string, dto: any) {
    const { role, name, title, email, phone, isPrimary } = dto;
    const existing = await (this.prisma as any).orgContact.findFirst({
      where: { organizationId, role },
    });
    if (existing) {
      return (this.prisma as any).orgContact.update({
        where: { id: existing.id },
        data: { name, title, email, phone, isPrimary: isPrimary ?? false },
      });
    }
    return (this.prisma as any).orgContact.create({
      data: { organizationId, role, name, title, email, phone, isPrimary: isPrimary ?? false },
    });
  }

  async removeContact(id: string, organizationId: string) {
    const record = await (this.prisma as any).orgContact.findFirst({ where: { id, organizationId } });
    if (!record) throw new NotFoundException('Contact not found');
    return (this.prisma as any).orgContact.delete({ where: { id } });
  }
}
