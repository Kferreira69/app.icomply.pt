import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailService } from '../../common/mail/mail.service';
import { TokenBlacklistService } from '../../common/security/token-blacklist.service';

// ── Mocks ─────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  auditLog: { create: jest.fn() },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn(),
};

const mockMail   = { sendPasswordReset: jest.fn(), sendInvite: jest.fn() };
const mockBlacklist = { isBlacklisted: jest.fn().mockResolvedValue(false), add: jest.fn() };
const mockConfig = { get: jest.fn((key: string, def?: any) => def) };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService,         useValue: mockPrisma },
        { provide: JwtService,            useValue: mockJwt },
        { provide: ConfigService,         useValue: mockConfig },
        { provide: MailService,           useValue: mockMail },
        { provide: TokenBlacklistService, useValue: mockBlacklist },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── validateUser ──────────────────────────────────────────────

  describe('validateUser', () => {
    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.validateUser('notfound@test.com', 'pass');
      expect(result).toBeNull();
    });

    it('should return null when user is SUSPENDED', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1', email: 'test@test.com', status: 'SUSPENDED',
        passwordHash: '$argon2id$v=19$test', organizationId: 'org1',
        organization: { id: 'org1', name: 'Test', slug: 'test' },
      });
      const result = await service.validateUser('test@test.com', 'pass');
      expect(result).toBeNull();
    });
  });

  // ── hashPassword ──────────────────────────────────────────────

  describe('hashPassword', () => {
    it('should produce a hash starting with $argon2', async () => {
      const hash = await service.hashPassword('TestPassword123!');
      expect(hash).toMatch(/^\$argon2/);
    });

    it('should produce different hashes for the same password', async () => {
      const hash1 = await service.hashPassword('same-pass');
      const hash2 = await service.hashPassword('same-pass');
      expect(hash1).not.toBe(hash2);
    });
  });

  // ── get2FAStatus ──────────────────────────────────────────────

  describe('get2FAStatus', () => {
    it('should return enabled=false when 2FA not set up', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ totpEnabled: false });
      const status = await service.get2FAStatus('user-123');
      expect(status.enabled).toBe(false);
    });

    it('should return enabled=true when 2FA is active', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ totpEnabled: true });
      const status = await service.get2FAStatus('user-123');
      expect(status.enabled).toBe(true);
    });
  });
});
