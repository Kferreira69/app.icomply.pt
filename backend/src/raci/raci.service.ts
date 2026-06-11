import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RaciRole, RaciEntityType } from '@prisma/client';

@Injectable()
export class RaciService {
  constructor(private prisma: PrismaService) {}

  /** Get all RACI assignments for a specific entity */
  async getForEntity(entityType: RaciEntityType, entityId: string, organizationId: string) {
    const assignments = await this.prisma.raciAssignment.findMany({
      where: { entityType, entityId, organizationId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, role: true },
        },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });

    // Group by role for easy rendering
    const grouped: Record<RaciRole, typeof assignments> = { R: [], A: [], C: [], I: [] };
    for (const a of assignments) grouped[a.role].push(a);
    return { assignments, grouped };
  }

  /** Assign a user to an entity with a RACI role */
  async assign(
    organizationId: string,
    entityType: RaciEntityType,
    entityId: string,
    userId: string,
    role: RaciRole,
    notes?: string,
  ) {
    // Verify user belongs to org
    const user = await this.prisma.user.findFirst({ where: { id: userId, organizationId } });
    if (!user) throw new NotFoundException('User not found in this organization');

    return this.prisma.raciAssignment.upsert({
      where: { entityType_entityId_userId_role: { entityType, entityId, userId, role } },
      create: { organizationId, entityType, entityId, userId, role, notes },
      update: { notes },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      },
    });
  }

  /** Remove a RACI assignment */
  async remove(id: string, organizationId: string) {
    const assignment = await this.prisma.raciAssignment.findFirst({ where: { id, organizationId } });
    if (!assignment) throw new NotFoundException('RACI assignment not found');
    await this.prisma.raciAssignment.delete({ where: { id } });
    return { success: true };
  }

  /** Bulk set RACI for an entity (replace all assignments) */
  async bulkSet(
    organizationId: string,
    entityType: RaciEntityType,
    entityId: string,
    assignments: Array<{ userId: string; role: RaciRole; notes?: string }>,
  ) {
    await this.prisma.raciAssignment.deleteMany({ where: { organizationId, entityType, entityId } });
    if (assignments.length === 0) return { assignments: [], grouped: { R: [], A: [], C: [], I: [] } };

    await this.prisma.raciAssignment.createMany({
      data: assignments.map(a => ({ organizationId, entityType, entityId, ...a })),
      skipDuplicates: true,
    });
    return this.getForEntity(entityType, entityId, organizationId);
  }

  /** Get all entities where a user has a RACI role ("O meu papel") */
  async getForUser(userId: string, organizationId: string, entityType?: RaciEntityType) {
    const where: any = { userId, organizationId };
    if (entityType) where.entityType = entityType;

    return this.prisma.raciAssignment.findMany({
      where,
      orderBy: [{ entityType: 'asc' }, { role: 'asc' }],
    });
  }

  /** Get matrix: all assignments for a given entityType in the org */
  async getMatrix(organizationId: string, entityType: RaciEntityType) {
    const assignments = await this.prisma.raciAssignment.findMany({
      where: { organizationId, entityType },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      },
      orderBy: [{ entityId: 'asc' }, { role: 'asc' }],
    });

    // Group by entityId → roles → users
    const matrix: Record<string, Record<RaciRole, typeof assignments[0]['user'][]>> = {};
    for (const a of assignments) {
      if (!matrix[a.entityId]) matrix[a.entityId] = { R: [], A: [], C: [], I: [] };
      matrix[a.entityId][a.role].push(a.user);
    }

    // Get unique users involved
    const userMap = new Map<string, (typeof assignments[0]['user'])>();
    for (const a of assignments) userMap.set(a.user.id, a.user);

    return {
      matrix,
      users: Array.from(userMap.values()),
      entityIds: Object.keys(matrix),
    };
  }

  /** Summary stats for dashboard */
  async getSummary(organizationId: string) {
    const [total, byEntityType, unassigned] = await Promise.all([
      this.prisma.raciAssignment.count({ where: { organizationId } }),
      this.prisma.raciAssignment.groupBy({
        by: ['entityType'],
        where: { organizationId },
        _count: { id: true },
      }),
      // Controls with no Accountable (A) person — compliance gap
      this.prisma.control.count({
        where: {
          organizationId,
          NOT: {
            id: {
              in: (await this.prisma.raciAssignment.findMany({
                where: { organizationId, entityType: 'CONTROL', role: 'A' },
                select: { entityId: true },
              })).map(r => r.entityId),
            },
          },
        },
      }).catch(() => 0),
    ]);

    return {
      total,
      byEntityType: Object.fromEntries(byEntityType.map(r => [r.entityType, r._count.id])),
      controlsWithoutAccountable: unassigned,
    };
  }
}
