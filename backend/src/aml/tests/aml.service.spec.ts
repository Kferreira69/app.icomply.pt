import { BadRequestException } from '@nestjs/common';
import { AmlService } from '../aml.service';

const ORG = 'org-1';

function make() {
  const db: any = {
    amlScreening: { create: jest.fn(async ({ data }: any) => ({ id: 'scr-1', createdAt: new Date(), ...data })) },
    amlCase: { findFirst: jest.fn().mockResolvedValue({ id: 'case-1' }) },
  };
  const iv: any = {
    verifyIndividual: jest.fn().mockResolvedValue({ id: 'v1', status: 'PENDING', provider: 'DIDIT', automated: true, providerRefId: 'ref-1', actionUrl: 'https://verify.example/s/1' }),
    verifyBusiness: jest.fn().mockResolvedValue({ id: 'v2', status: 'PENDING', provider: 'DIDIT', automated: true, providerRefId: 'ref-2', actionUrl: null }),
    screenSanctions: jest.fn().mockResolvedValue({ id: 'v3', status: 'APPROVED', provider: 'OPENSANCTIONS', automated: true, providerRefId: 'ref-3' }),
    linkAmlScreening: jest.fn().mockResolvedValue(undefined),
  };
  return { service: new AmlService(db, iv), db, iv };
}

describe('AmlService.createScreening — manual', () => {
  it('stores only the known fields: nothing else from the body reaches the database', async () => {
    const { service, db } = make();
    await service.createScreening(ORG, {
      subjectName: ' Ana Silva ', subjectType: 'INDIVIDUAL', screeningType: 'PEP', result: 'HIT', notes: 'nota',
      organizationId: 'evil-org', id: 'forced', createdAt: '1999-01-01', screenedBy: 'someone-else', country: 'PT', automated: false,
    }, 'u1');
    const data = db.amlScreening.create.mock.calls[0][0].data;
    expect(Object.keys(data).sort()).toEqual(['caseId', 'notes', 'organizationId', 'result', 'screenedAt', 'screenedBy', 'screeningType', 'subjectName', 'subjectType']);
    expect(data).toMatchObject({ organizationId: ORG, screenedBy: 'u1', subjectName: 'Ana Silva', result: 'HIT', screeningType: 'PEP' });
  });

  it('validates the values and refuses a case of another organisation', async () => {
    const { service, db } = make();
    await expect(service.createScreening(ORG, { subjectName: '' }, 'u1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createScreening(ORG, { subjectName: 'X', result: 'MATCH' }, 'u1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createScreening(ORG, { subjectName: 'X', screeningType: 'HACK' }, 'u1')).rejects.toBeInstanceOf(BadRequestException);
    db.amlCase.findFirst.mockResolvedValue(null);
    await expect(service.createScreening(ORG, { subjectName: 'X', caseId: 'other-orgs-case' }, 'u1')).rejects.toBeInstanceOf(BadRequestException);
    expect(db.amlCase.findFirst.mock.calls[0][0].where).toEqual({ id: 'other-orgs-case', organizationId: ORG });
    expect(db.amlScreening.create).not.toHaveBeenCalled();
  });
});

describe('AmlService.createScreening — automated (the form sends the country: this used to crash after the paid check)', () => {
  it('a person KYC goes to document verification and the screening is saved with only its own fields', async () => {
    const { service, db, iv } = make();
    const out: any = await service.createScreening(ORG, { subjectName: 'Ana Silva', subjectType: 'INDIVIDUAL', screeningType: 'KYC', country: 'pt', automated: true, result: 'CLEAR', notes: 'cliente novo' }, 'u1');
    expect(iv.verifyIndividual).toHaveBeenCalledWith(ORG, 'u1', { fullName: 'Ana Silva', country: 'PT', documentNumber: undefined });
    const data = db.amlScreening.create.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('country');
    expect(data).not.toHaveProperty('automated');
    expect(data.result).toBe('PENDING'); // the manual "result" field is ignored in automated mode
    expect(data.notes).toContain('cliente novo');
    expect(data.notes).toContain('Verificação automática (DIDIT)');
    expect(iv.linkAmlScreening).toHaveBeenCalledWith(ORG, 'v1', 'scr-1');
    expect(out.verification).toMatchObject({ id: 'v1', actionUrl: 'https://verify.example/s/1' });
  });

  it('sanctions / PEP / adverse media on a person is a screening, not a document check', async () => {
    const { service, iv, db } = make();
    for (const t of ['SANCTIONS', 'PEP', 'ADVERSE_MEDIA']) {
      await service.createScreening(ORG, { subjectName: 'Ana Silva', screeningType: t, country: 'PT', dateOfBirth: '1990-05-17', automated: true }, 'u1');
    }
    expect(iv.verifyIndividual).not.toHaveBeenCalled();
    expect(iv.screenSanctions).toHaveBeenCalledTimes(3);
    expect(iv.screenSanctions).toHaveBeenCalledWith(ORG, 'u1', { name: 'Ana Silva', country: 'PT', dateOfBirth: '1990-05-17' });
    expect(db.amlScreening.create.mock.calls[0][0].data.result).toBe('CLEAR'); // an approved screening reads CLEAR in the AML list
  });

  it('a company or entity goes to KYB, whatever the screening type', async () => {
    const { service, iv } = make();
    await service.createScreening(ORG, { subjectName: 'ACME Lda', subjectType: 'ENTITY', screeningType: 'SANCTIONS', country: 'PT', vatNumber: '500000000', automated: true }, 'u1');
    expect(iv.verifyBusiness).toHaveBeenCalledWith(ORG, 'u1', { legalName: 'ACME Lda', country: 'PT', vatNumber: '500000000' });
    expect(iv.screenSanctions).not.toHaveBeenCalled();
  });

  it('needs a valid country and refuses before anything is requested (nothing is created or charged)', async () => {
    const { service, iv, db } = make();
    for (const country of [undefined, '', 'P', 'PRT', '12']) {
      await expect(service.createScreening(ORG, { subjectName: 'Ana', automated: true, country }, 'u1')).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(iv.verifyIndividual).not.toHaveBeenCalled();
    expect(db.amlScreening.create).not.toHaveBeenCalled();
  });

  it('if the verification fails, no screening record is left behind', async () => {
    const { service, iv, db } = make();
    iv.verifyIndividual.mockRejectedValue(new Error('provider down'));
    await expect(service.createScreening(ORG, { subjectName: 'Ana', screeningType: 'KYC', country: 'PT', automated: true }, 'u1')).rejects.toThrow('provider down');
    expect(db.amlScreening.create).not.toHaveBeenCalled();
  });

  it('the AML list only gets values its screen knows (no more MATCH / REVIEW / ERROR)', async () => {
    const { service, iv, db } = make();
    const seen = new Set<string>();
    for (const status of ['APPROVED', 'REJECTED', 'REVIEW', 'PENDING', 'ERROR']) {
      iv.verifyIndividual.mockResolvedValue({ id: 'v', status, provider: 'MANUAL', automated: false, providerRefId: null });
      await service.createScreening(ORG, { subjectName: 'Ana', screeningType: 'KYC', country: 'PT', automated: true }, 'u1');
      seen.add(db.amlScreening.create.mock.calls.at(-1)[0].data.result);
    }
    expect([...seen].sort()).toEqual(['CLEAR', 'HIT', 'PENDING', 'POTENTIAL_MATCH']);
    expect(db.amlScreening.create.mock.calls.at(-1)[0].data.notes).toContain('Verificação manual (MANUAL)');
  });
});
