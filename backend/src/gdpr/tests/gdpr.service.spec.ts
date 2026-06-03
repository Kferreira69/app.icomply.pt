import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GdprService } from '../gdpr.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailService } from '../../common/mail/mail.service';

const mockPrisma = {
  dataProcessingActivity: { groupBy: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  dpia:                   { groupBy: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  breachNotification:     { count: jest.fn().mockResolvedValue(0), findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  dataSubjectRequest:     { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  consentRecord:          { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  organization:           { findUnique: jest.fn() },
};

const mockMail = { sendDsarConfirmation: jest.fn() };

describe('GdprService', () => {
  let service: GdprService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService,   useValue: mockMail },
      ],
    }).compile();
    service = module.get<GdprService>(GdprService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── createDsar ────────────────────────────────────────────────

  describe('createDsar', () => {
    it('should set dueAt 30 days from now when not provided', async () => {
      const now = new Date();
      const mockDsar = { id: 'dsar1', requestType: 'ACCESS', organizationId: 'org1', dueAt: new Date(Date.now() + 30 * 86400000) };
      mockPrisma.dataSubjectRequest.create.mockResolvedValue(mockDsar);

      const result = await service.createDsar({ requestType: 'ACCESS', subjectEmail: 'user@test.com' }, 'org1');

      const callData = mockPrisma.dataSubjectRequest.create.mock.calls[0][0].data;
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const dueAt = new Date(callData.dueAt);
      expect(dueAt.getTime()).toBeGreaterThanOrEqual(now.getTime() + thirtyDaysMs - 1000);
    });
  });

  // ── getPublicDsarInfo ─────────────────────────────────────────

  describe('getPublicDsarInfo', () => {
    it('should throw NotFoundException for unknown slug', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.getPublicDsarInfo('unknown-slug')).rejects.toThrow(NotFoundException);
    });

    it('should return org info and 6 GDPR right types', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org1', name: 'Test Org', logoUrl: null, country: 'PT' });
      const result = await service.getPublicDsarInfo('test-org');
      expect(result.orgName).toBe('Test Org');
      expect(result.requestTypes).toHaveLength(6);
    });
  });

  // ── updateDsar ────────────────────────────────────────────────

  describe('updateDsar', () => {
    it('should set respondedAt when status changes to COMPLETED', async () => {
      const existingDsar = { id: 'dsar1', status: 'IN_PROGRESS', respondedAt: null };
      mockPrisma.dataSubjectRequest.findFirst.mockResolvedValue(existingDsar);
      mockPrisma.dataSubjectRequest.update.mockResolvedValue({ ...existingDsar, status: 'COMPLETED', respondedAt: new Date() });

      await service.updateDsar('dsar1', 'org1', { status: 'COMPLETED' });

      const updateCall = mockPrisma.dataSubjectRequest.update.mock.calls[0][0];
      expect(updateCall.data.respondedAt).toBeDefined();
    });
  });
});
