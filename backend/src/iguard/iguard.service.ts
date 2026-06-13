import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { DeviceReportDto } from './dto/device-report.dto';
import { DeviceAgent, DeviceReport } from '@prisma/client';

@Injectable()
export class IGuardService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Admin methods (JWT-auth, scoped to org) ─────────────────

  async listDevices(orgId: string): Promise<Omit<DeviceAgent, 'deviceToken'>[]> {
    const devices = await this.prisma.deviceAgent.findMany({
      where: { organizationId: orgId },
      orderBy: { lastSeenAt: 'desc' },
    });
    return devices.map(({ deviceToken: _token, ...rest }) => rest);
  }

  async getDevice(
    id: string,
    orgId: string,
  ): Promise<Omit<DeviceAgent, 'deviceToken'> & { reports: DeviceReport[] }> {
    const device = await this.prisma.deviceAgent.findFirst({
      where: { id, organizationId: orgId },
      include: {
        reports: {
          orderBy: { reportedAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const { deviceToken: _token, ...rest } = device;
    return rest as Omit<DeviceAgent, 'deviceToken'> & { reports: DeviceReport[] };
  }

  async revokeDevice(id: string, orgId: string): Promise<void> {
    const device = await this.prisma.deviceAgent.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.prisma.deviceAgent.update({
      where: { id },
      data: { status: 'REVOKED' },
    });
  }

  async getOrgStats(orgId: string): Promise<{
    total: number;
    active: number;
    compliant: number;
    nonCompliant: number;
    avgScore: number;
    checkStats: {
      diskEncryption: number;
      screenLock: number;
      antivirusEnabled: number;
      osUpToDate: number;
    };
  }> {
    const devices = await this.prisma.deviceAgent.findMany({
      where: { organizationId: orgId, status: { not: 'REVOKED' } },
      select: {
        status: true,
        complianceScore: true,
        diskEncryption: true,
        screenLock: true,
        antivirusEnabled: true,
        osUpToDate: true,
      },
    });

    const total = devices.length;
    const active = devices.filter((d) => d.status === 'ACTIVE').length;
    const withScore = devices.filter((d) => d.complianceScore !== null);
    const compliant = withScore.filter((d) => (d.complianceScore ?? 0) >= 80).length;
    const nonCompliant = withScore.filter((d) => (d.complianceScore ?? 0) < 80).length;
    const avgScore =
      withScore.length > 0
        ? Math.round(
            withScore.reduce((sum, d) => sum + (d.complianceScore ?? 0), 0) / withScore.length,
          )
        : 0;

    const reported = devices.filter((d) => d.status === 'ACTIVE');
    const pct = (field: keyof typeof reported[0]): number => {
      if (reported.length === 0) return 0;
      const passing = reported.filter((d) => d[field] === true).length;
      return Math.round((passing / reported.length) * 100);
    };

    return {
      total,
      active,
      compliant,
      nonCompliant,
      avgScore,
      checkStats: {
        diskEncryption: pct('diskEncryption'),
        screenLock: pct('screenLock'),
        antivirusEnabled: pct('antivirusEnabled'),
        osUpToDate: pct('osUpToDate'),
      },
    };
  }

  // ─── Employee methods (JWT-auth) ─────────────────────────────

  async registerDevice(
    orgId: string,
    userId: string,
    dto: RegisterDeviceDto,
  ): Promise<{ deviceToken: string; deviceId: string }> {
    const device = await this.prisma.deviceAgent.create({
      data: {
        organizationId: orgId,
        userId,
        deviceName: dto.deviceName,
        hostname: dto.hostname,
        os: dto.os,
        osVersion: dto.osVersion,
        arch: dto.arch,
        agentVersion: dto.agentVersion,
        status: 'PENDING',
      },
    });

    return { deviceToken: device.deviceToken, deviceId: device.id };
  }

  async getMyDevice(
    userId: string,
    orgId: string,
  ): Promise<Omit<DeviceAgent, 'deviceToken'> | null> {
    const device = await this.prisma.deviceAgent.findFirst({
      where: { userId, organizationId: orgId, status: { not: 'REVOKED' } },
      orderBy: { registeredAt: 'desc' },
    });

    if (!device) return null;

    const { deviceToken: _token, ...rest } = device;
    return rest;
  }

  // ─── Agent method (device-token auth) ────────────────────────

  async submitReport(
    deviceToken: string,
    dto: DeviceReportDto,
  ): Promise<{ ok: boolean }> {
    const device = await this.prisma.deviceAgent.findUnique({
      where: { deviceToken },
    });

    if (!device || device.status === 'REVOKED') {
      throw new UnauthorizedException('Invalid or revoked device token');
    }

    // Compute compliance score: 5 checks × 20 pts each (max 100)
    // diskEncryption, screenLock, antivirusEnabled, osUpToDate, passwordManager
    let score = 0;
    if (dto.diskEncryption) score += 20;
    if (dto.screenLock) score += 20;
    if (dto.antivirusEnabled) score += 20;
    if (dto.osUpToDate) score += 20;
    if (dto.passwordManager === true) score += 20;

    // Create report record
    await this.prisma.deviceReport.create({
      data: {
        deviceId: device.id,
        agentVersion: dto.agentVersion,
        osVersion: dto.osVersion,
        diskEncryption: dto.diskEncryption,
        screenLock: dto.screenLock,
        antivirusEnabled: dto.antivirusEnabled,
        osUpToDate: dto.osUpToDate,
        passwordManager: dto.passwordManager,
        screenLockTimeout: dto.screenLockTimeout,
        complianceScore: score,
        rawData: dto.rawData ?? undefined,
      },
    });

    // Update agent with latest state
    await this.prisma.deviceAgent.update({
      where: { id: device.id },
      data: {
        status: 'ACTIVE',
        lastSeenAt: new Date(),
        agentVersion: dto.agentVersion ?? device.agentVersion,
        osVersion: dto.osVersion ?? device.osVersion,
        diskEncryption: dto.diskEncryption,
        screenLock: dto.screenLock,
        antivirusEnabled: dto.antivirusEnabled,
        osUpToDate: dto.osUpToDate,
        passwordManager: dto.passwordManager,
        screenLockTimeout: dto.screenLockTimeout,
        complianceScore: score,
      },
    });

    return { ok: true };
  }
}
