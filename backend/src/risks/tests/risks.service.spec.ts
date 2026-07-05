import { Test, TestingModule } from '@nestjs/testing';
import { RisksService } from '../risks.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

const mockPrisma = {
  risk: {
    create:    jest.fn(),
    findMany:  jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update:    jest.fn(),
    count:     jest.fn(),
    groupBy:   jest.fn(),
  },
  notification: { create: jest.fn(), findFirst: jest.fn() },
};

const mockNotifications = { create: jest.fn() };

describe('RisksService', () => {
  let service: RisksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RisksService,
        { provide: PrismaService,          useValue: mockPrisma },
        { provide: NotificationsService,   useValue: mockNotifications },
      ],
    }).compile();
    service = module.get<RisksService>(RisksService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── create ────────────────────────────────────────────────────

  describe('create', () => {
    it('should calculate inherentScore correctly (5×5=25)', async () => {
      const mockRisk = {
        id: 'r1', title: 'Test', inherentScore: 25,
        owner: { id: 'u1', firstName: 'John', lastName: 'Doe' },
      };
      mockPrisma.risk.create.mockResolvedValue(mockRisk);

      await service.create(
        { title: 'Test', likelihood: 'ALMOST_CERTAIN', impact: 'CATASTROPHIC' } as any,
        'org1', 'user1',
      );

      expect(mockPrisma.risk.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ inherentScore: 25 }),
        }),
      );
    });

    it('should notify owner for HIGH risk (score ≥12)', async () => {
      const mockRisk = { id: 'r1', title: 'High Risk', inherentScore: 15, owner: { id: 'u1', firstName: 'Jane', lastName: 'Smith' } };
      mockPrisma.risk.create.mockResolvedValue(mockRisk);

      await service.create(
        { title: 'High Risk', likelihood: 'LIKELY', impact: 'MAJOR' } as any,
        'org1', 'user1',
      );

      expect(mockNotifications.create).toHaveBeenCalled();
    });

    it('should NOT notify for LOW risk (score <12)', async () => {
      const mockRisk = { id: 'r1', title: 'Low Risk', inherentScore: 4, owner: { id: 'u1', firstName: 'Jane', lastName: 'Smith' } };
      mockPrisma.risk.create.mockResolvedValue(mockRisk);

      await service.create(
        { title: 'Low Risk', likelihood: 'RARE', impact: 'MINOR' } as any,
        'org1', 'user1',
      );

      expect(mockNotifications.create).not.toHaveBeenCalled();
    });
  });

  // ── getRiskLevel ──────────────────────────────────────────────

  describe('risk level calculation', () => {
    const cases = [
      { score: 25, expected: 'CRITICAL' },
      { score: 20, expected: 'CRITICAL' },
      { score: 15, expected: 'HIGH' },
      { score: 12, expected: 'HIGH' },
      { score: 8,  expected: 'MEDIUM' },
      { score: 6,  expected: 'MEDIUM' },
      { score: 4,  expected: 'LOW' },
      { score: 1,  expected: 'LOW' },
    ];

    cases.forEach(({ score, expected }) => {
      it(`score ${score} → ${expected}`, async () => {
        const mockRisk = { id: 'r1', inherentScore: score, likelihood: 'POSSIBLE', impact: 'MODERATE', status: 'IDENTIFIED' };
        mockPrisma.risk.findFirst.mockResolvedValue({ ...mockRisk, owner: null, project: null, evidences: [] });
        const result = await service.findOne('r1', 'org1');
        expect(result.riskLevel).toBe(expected);
      });
    });
  });
});
