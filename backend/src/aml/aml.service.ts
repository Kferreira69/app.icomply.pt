import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AML_RESULT_OF_STATUS, IdentityVerificationService } from '../identity-verification/identity-verification.service';
import { date, oneOf, required, text } from '../common/utils/input';

const SUBJECT_TYPES = ['INDIVIDUAL', 'ENTITY', 'BUSINESS'] as const;
const SCREENING_TYPES = ['KYC', 'SANCTIONS', 'PEP', 'ADVERSE_MEDIA'] as const;
// what the AML screening list can show (see SCREENING_RESULT in the AML page)
const SCREENING_RESULTS = ['CLEAR', 'HIT', 'POTENTIAL_MATCH', 'FALSE_POSITIVE', 'PENDING'] as const;

@Injectable()
export class AmlService {
  constructor(
    private prisma: PrismaService,
    private identityVerification: IdentityVerificationService,
  ) {}

  async getDashboard(orgId: string) {
    const db = this.prisma as any;

    const [
      totalCases, openCases, highRiskCases, reportedToFiu, recentCases, screeningStats,
      highRiskEntities, pendingTraining, newRegulatoryUpdates, nonCompliantAuditItems,
    ] = await Promise.all([
      db.amlCase.count({ where: { organizationId: orgId } }),
      db.amlCase.count({ where: { organizationId: orgId, status: 'OPEN' } }),
      db.amlCase.count({ where: { organizationId: orgId, riskLevel: 'HIGH' } }),
      db.amlCase.count({ where: { organizationId: orgId, reportedToFIU: true } }),
      db.amlCase.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      db.amlScreening.groupBy({
        by: ['result'],
        where: { organizationId: orgId },
        _count: { result: true },
      }),
      db.amlRiskAssessment.count({ where: { organizationId: orgId, overallRisk: { in: ['HIGH', 'VERY_HIGH'] } } }),
      db.amlTrainingRecord.count({ where: { organizationId: orgId, status: 'PENDING' } }),
      db.amlRegulatoryUpdate.count({ where: { organizationId: orgId, status: 'NEW' } }),
      db.amlAuditItem.count({ where: { organizationId: orgId, status: { in: ['NON_COMPLIANT', 'PARTIAL'] } } }),
    ]);

    return {
      totalCases,
      openCases,
      highRiskCases,
      reportedToFiu,
      recentCases,
      screeningStats,
      highRiskEntities,
      pendingTraining,
      newRegulatoryUpdates,
      nonCompliantAuditItems,
    };
  }

  async listCases(
    orgId: string,
    status?: string,
    caseType?: string,
    riskLevel?: string,
  ) {
    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    if (caseType) where.caseType = caseType;
    if (riskLevel) where.riskLevel = riskLevel;

    return (this.prisma as any).amlCase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCase(orgId: string, dto: any) {
    const caseId = 'AML-' + Date.now().toString().slice(-6);

    return (this.prisma as any).amlCase.create({
      data: {
        ...dto,
        caseId,
        organizationId: orgId,
      },
    });
  }

  async updateCase(id: string, orgId: string, data: any) {
    const existing = await (this.prisma as any).amlCase.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      throw new Error(`AML case ${id} not found for this organization`);
    }

    const updateData: any = { ...data };

    if (data.status === 'CLOSED') {
      updateData.closedAt = new Date();
    }

    if (data.reportedToFIU === true) {
      updateData.reportedAt = new Date();
    }

    return (this.prisma as any).amlCase.update({
      where: { id },
      data: updateData,
    });
  }

  async listScreenings(orgId: string, screeningType?: string) {
    const where: any = { organizationId: orgId };
    if (screeningType) where.screeningType = screeningType;

    return (this.prisma as any).amlScreening.findMany({
      where,
      orderBy: { screenedAt: 'desc' },
    });
  }

  /**
   * A screening is recorded by hand (the person states the result) or, with `automated`, run through the
   * identity-verification module (needs the `identity_verification` add-on). Only the fields below are accepted:
   * the body used to be spread into the database call, so any extra field (e.g. the country sent by the automated
   * form) made it fail AFTER a paid check had been created.
   *
   *  - company / entity            → KYB (registry, beneficial owners, AML)
   *  - person, type KYC            → document + selfie verification
   *  - person, SANCTIONS/PEP/MEDIA → sanctions / PEP screening
   *
   * The screening then follows the verification: when the provider (or a person) decides it, the result shown in the
   * AML list is updated.
   */
  async createScreening(orgId: string, dto: any, screenedBy: string) {
    const db = this.prisma as any;
    const subjectName = required(dto?.subjectName, 'Nome', 200);
    const subjectType = oneOf(dto?.subjectType ?? 'INDIVIDUAL', SUBJECT_TYPES, 'Tipo');
    const screeningType = oneOf(dto?.screeningType ?? 'KYC', SCREENING_TYPES, 'Tipo de screening');
    const notes = text(dto?.notes, 1500);

    let caseId: string | null = null;
    if (dto?.caseId) {
      const c = await db.amlCase.findFirst({ where: { id: String(dto.caseId), organizationId: orgId }, select: { id: true } });
      if (!c) throw new BadRequestException('Caso inválido');
      caseId = c.id;
    }

    if (!dto?.automated) {
      return db.amlScreening.create({
        data: {
          organizationId: orgId, screenedBy, screenedAt: new Date(), subjectName, subjectType, screeningType, notes, caseId,
          result: oneOf(dto?.result ?? 'CLEAR', SCREENING_RESULTS, 'Resultado'),
        },
      });
    }

    const country = String(dto?.country ?? '').trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) throw new BadRequestException('Indique o país (2 letras, ex.: PT).');

    let verification: any;
    if (subjectType !== 'INDIVIDUAL') {
      verification = await this.identityVerification.verifyBusiness(orgId, screenedBy, {
        legalName: subjectName, country, vatNumber: text(dto?.vatNumber, 40) ?? undefined,
      });
    } else if (screeningType === 'KYC') {
      verification = await this.identityVerification.verifyIndividual(orgId, screenedBy, {
        fullName: subjectName, country, documentNumber: text(dto?.documentNumber, 60) ?? undefined,
      });
    } else {
      const dob = date(dto?.dateOfBirth, 'Data de nascimento');
      verification = await this.identityVerification.screenSanctions(orgId, screenedBy, {
        name: subjectName, country, dateOfBirth: dob ? dob.toISOString().slice(0, 10) : undefined,
      });
    }

    const screening = await db.amlScreening.create({
      data: {
        organizationId: orgId, screenedBy, screenedAt: new Date(), subjectName, subjectType, screeningType, caseId,
        result: AML_RESULT_OF_STATUS[verification.status as keyof typeof AML_RESULT_OF_STATUS] ?? 'PENDING',
        notes: [notes, `Verificação ${verification.automated ? 'automática' : 'manual'} (${verification.provider}), ref: ${verification.providerRefId ?? verification.id}`]
          .filter(Boolean).join('\n'),
      },
    });
    await this.identityVerification.linkAmlScreening(orgId, verification.id, screening.id);
    return {
      ...screening,
      verification: { id: verification.id, status: verification.status, provider: verification.provider, automated: verification.automated, actionUrl: verification.actionUrl ?? null },
    };
  }

  async listPolicies(orgId: string) {
    return (this.prisma as any).amlPolicy.findMany({
      where: { organizationId: orgId },
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
    });
  }

  async createPolicy(orgId: string, dto: any) {
    return (this.prisma as any).amlPolicy.create({
      data: {
        ...dto,
        organizationId: orgId,
      },
    });
  }

  async updatePolicy(id: string, orgId: string, data: any) {
    const existing = await (this.prisma as any).amlPolicy.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      throw new Error(`AML policy ${id} not found for this organization`);
    }

    return (this.prisma as any).amlPolicy.update({
      where: { id },
      data,
    });
  }

  // ── Risk Assessments ──────────────────────────────────────────

  async listRiskAssessments(orgId: string, entityType?: string) {
    const where: any = { organizationId: orgId };
    if (entityType) where.entityType = entityType;
    return (this.prisma as any).amlRiskAssessment.findMany({
      where,
      orderBy: { assessedAt: 'desc' },
    });
  }

  async createRiskAssessment(orgId: string, dto: any) {
    return (this.prisma as any).amlRiskAssessment.create({
      data: { ...dto, organizationId: orgId },
    });
  }

  async updateRiskAssessment(id: string, orgId: string, data: any) {
    const existing = await (this.prisma as any).amlRiskAssessment.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new Error(`Risk assessment ${id} not found`);
    return (this.prisma as any).amlRiskAssessment.update({ where: { id }, data });
  }

  // ── Training Records ──────────────────────────────────────────

  async listTraining(orgId: string, status?: string) {
    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    return (this.prisma as any).amlTrainingRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTraining(orgId: string, dto: any) {
    return (this.prisma as any).amlTrainingRecord.create({
      data: { ...dto, organizationId: orgId },
    });
  }

  async updateTraining(id: string, orgId: string, data: any) {
    const existing = await (this.prisma as any).amlTrainingRecord.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new Error(`Training record ${id} not found`);
    return (this.prisma as any).amlTrainingRecord.update({ where: { id }, data });
  }

  // ── Regulatory Updates ────────────────────────────────────────

  async listRegulatoryUpdates(orgId: string, status?: string) {
    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    return (this.prisma as any).amlRegulatoryUpdate.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
    });
  }

  async createRegulatoryUpdate(orgId: string, dto: any) {
    return (this.prisma as any).amlRegulatoryUpdate.create({
      data: { ...dto, organizationId: orgId },
    });
  }

  async updateRegulatoryUpdate(id: string, orgId: string, data: any) {
    const existing = await (this.prisma as any).amlRegulatoryUpdate.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new Error(`Regulatory update ${id} not found`);
    return (this.prisma as any).amlRegulatoryUpdate.update({ where: { id }, data });
  }

  // ── Audit Items ───────────────────────────────────────────────

  async listAuditItems(orgId: string, category?: string) {
    const where: any = { organizationId: orgId };
    if (category) where.category = category;
    return (this.prisma as any).amlAuditItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createAuditItem(orgId: string, dto: any) {
    return (this.prisma as any).amlAuditItem.create({
      data: { ...dto, organizationId: orgId },
    });
  }

  async updateAuditItem(id: string, orgId: string, data: any) {
    const existing = await (this.prisma as any).amlAuditItem.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new Error(`Audit item ${id} not found`);
    return (this.prisma as any).amlAuditItem.update({ where: { id }, data });
  }
}
