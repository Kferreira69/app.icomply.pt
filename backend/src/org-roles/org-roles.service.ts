import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateOrgRoleDto } from './dto/create-org-role.dto';
import { UpdateOrgRoleDto } from './dto/update-org-role.dto';

@Injectable()
export class OrgRolesService {
  constructor(private prisma: PrismaService) {}

  async list(organizationId: string) {
    return this.prisma.orgRole.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(organizationId: string, dto: CreateOrgRoleDto) {
    const exists = await this.prisma.orgRole.findFirst({
      where: { organizationId, name: dto.name },
    });
    if (exists) throw new ConflictException('Já existe um role personalizado com esse nome');

    return this.prisma.orgRole.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        permissions: dto.permissions ?? {},
      },
    });
  }

  async update(id: string, organizationId: string, dto: UpdateOrgRoleDto) {
    const role = await this.prisma.orgRole.findFirst({ where: { id, organizationId } });
    if (!role) throw new NotFoundException('Role personalizado não encontrado');

    return this.prisma.orgRole.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.permissions !== undefined && { permissions: dto.permissions }),
      },
    });
  }

  async remove(id: string, organizationId: string) {
    const role = await this.prisma.orgRole.findFirst({ where: { id, organizationId } });
    if (!role) throw new NotFoundException('Role personalizado não encontrado');

    const usersCount = await this.prisma.user.count({ where: { orgRoleId: id } });
    if (usersCount > 0) {
      throw new ConflictException(
        `Não é possível eliminar: ${usersCount} utilizador(es) têm este role atribuído. Reatribua-os primeiro.`,
      );
    }

    return this.prisma.orgRole.delete({ where: { id } });
  }
}
