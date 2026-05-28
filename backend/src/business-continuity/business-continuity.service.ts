import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class BusinessContinuityService {
  constructor(private prisma: PrismaService) {}

  // ── Dashboard ─────────────────────────────────────────────────

  async getDashboard(organizationId: string) {
    const now = new Date();
    const [plans, recentTests] = await Promise.all([
      this.prisma.bcpPlan.findMany({
        where: { organizationId },
        select: { id: true, status: true, lastTestedAt: true, nextTestAt: true },
      }),
      this.prisma.bcpTest.findMany({
        where: { plan: { organizationId } },
        orderBy: { testedAt: 'desc' },
        take: 5,
        include: { plan: { select: { id: true, name: true } } },
      }),
    ]);

    const totalPlans = plans.length;
    const activePlans = plans.filter(p => p.status === 'ACTIVE').length;
    const lastTestDate = recentTests[0]?.testedAt ?? null;
    const overduePlans = plans.filter(p => p.nextTestAt && new Date(p.nextTestAt) < now).length;

    return { totalPlans, activePlans, lastTestDate, overduePlans, recentTests };
  }

  // ── Plans ─────────────────────────────────────────────────────

  async listPlans(organizationId: string) {
    return this.prisma.bcpPlan.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
      include: {
        assets: true,
        tests: { orderBy: { testedAt: 'desc' }, take: 3 },
      },
    });
  }

  async createPlan(organizationId: string, dto: any, ownerId: string) {
    return this.prisma.bcpPlan.create({
      data: { ...dto, organizationId, ownerId },
      include: {
        assets: true,
        tests: { orderBy: { testedAt: 'desc' }, take: 3 },
      },
    });
  }

  async getPlan(id: string, organizationId: string) {
    const plan = await this.prisma.bcpPlan.findFirst({
      where: { id, organizationId },
      include: {
        assets: true,
        tests: { orderBy: { testedAt: 'desc' } },
      },
    });
    if (!plan) throw new NotFoundException('BCP Plan not found');
    return plan;
  }

  async updatePlan(id: string, organizationId: string, data: any) {
    const plan = await this.prisma.bcpPlan.findFirst({ where: { id, organizationId } });
    if (!plan) throw new NotFoundException('BCP Plan not found');
    return this.prisma.bcpPlan.update({
      where: { id },
      data,
      include: {
        assets: true,
        tests: { orderBy: { testedAt: 'desc' }, take: 3 },
      },
    });
  }

  // ── Assets ────────────────────────────────────────────────────

  async addAsset(planId: string, organizationId: string, dto: any) {
    const plan = await this.prisma.bcpPlan.findFirst({ where: { id: planId, organizationId } });
    if (!plan) throw new NotFoundException('BCP Plan not found');
    return this.prisma.bcpAsset.create({ data: { ...dto, planId } });
  }

  async updateAsset(assetId: string, planId: string, organizationId: string, data: any) {
    const plan = await this.prisma.bcpPlan.findFirst({ where: { id: planId, organizationId } });
    if (!plan) throw new NotFoundException('BCP Plan not found');
    return this.prisma.bcpAsset.update({ where: { id: assetId }, data });
  }

  async removeAsset(assetId: string, planId: string, organizationId: string) {
    const plan = await this.prisma.bcpPlan.findFirst({ where: { id: planId, organizationId } });
    if (!plan) throw new NotFoundException('BCP Plan not found');
    return this.prisma.bcpAsset.delete({ where: { id: assetId } });
  }

  // ── Tests ─────────────────────────────────────────────────────

  async addTest(planId: string, organizationId: string, dto: any, conductedBy: string) {
    const plan = await this.prisma.bcpPlan.findFirst({ where: { id: planId, organizationId } });
    if (!plan) throw new NotFoundException('BCP Plan not found');
    const [test] = await this.prisma.$transaction([
      this.prisma.bcpTest.create({
        data: {
          ...dto,
          planId,
          conductedBy,
          testedAt: dto.testedAt ? new Date(dto.testedAt) : new Date(),
        },
      }),
      this.prisma.bcpPlan.update({ where: { id: planId }, data: { lastTestedAt: new Date() } }),
    ]);
    return test;
  }

  async updateTest(testId: string, planId: string, organizationId: string, data: any) {
    const plan = await this.prisma.bcpPlan.findFirst({ where: { id: planId, organizationId } });
    if (!plan) throw new NotFoundException('BCP Plan not found');
    return this.prisma.bcpTest.update({ where: { id: testId }, data });
  }

  async removeTest(testId: string, planId: string, organizationId: string) {
    const plan = await this.prisma.bcpPlan.findFirst({ where: { id: planId, organizationId } });
    if (!plan) throw new NotFoundException('BCP Plan not found');
    return this.prisma.bcpTest.delete({ where: { id: testId } });
  }
}
