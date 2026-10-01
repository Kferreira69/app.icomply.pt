import { ALL_MODULES } from '../../permissions/permissions.service';
import { DOC_STANDARDS } from '../../quality-documents/document-standards';
import { requirementCode, STANDARDS } from '../standards.registry';

describe('standards data', () => {
  it('has the standards the website promises through the generic engine', () => {
    expect(STANDARDS.map(s => s.key).sort()).toEqual(
      ['ISO_13485', 'ISO_20000', 'ISO_22000', 'ISO_23894', 'ISO_27018', 'ISO_27036', 'NIST_AI_RMF'],
    );
  });

  it('has a sensible number of requirements per standard', () => {
    const size = Object.fromEntries(STANDARDS.map(s => [s.key, s.requirements.length]));
    expect(size.ISO_22000).toBeGreaterThanOrEqual(30);
    expect(size.ISO_13485).toBeGreaterThanOrEqual(60);
    expect(size.ISO_20000).toBeGreaterThanOrEqual(40);
    expect(size.ISO_27018).toBe(10);
    expect(size.ISO_27036).toBe(11);
    expect(size.NIST_AI_RMF).toBe(19); // 6 GOVERN + 5 MAP + 4 MEASURE + 4 MANAGE
    expect(size.ISO_23894).toBeGreaterThanOrEqual(15);
  });

  it.each(STANDARDS.map(s => [s.key, s] as const))('%s: complete, unique and well-formed', (_k, s) => {
    const codes = s.requirements.map(r => requirementCode(s.key, r.clause));
    expect(new Set(codes).size).toBe(codes.length); // one row per clause per organisation
    for (const r of s.requirements) {
      expect(r.clause.trim()).not.toBe('');
      expect(r.title.trim()).not.toBe('');
      expect(r.chapter.trim()).not.toBe('');
    }
    expect(s.name && s.fullName && s.description && s.scope).toBeTruthy();
  });

  it('every standard is gated by a real permission module and can hold documents in Gestão Documental', () => {
    for (const s of STANDARDS) {
      expect(ALL_MODULES).toContain(s.module as any);
      const doc = DOC_STANDARDS.find(d => d.key === s.key);
      expect(doc).toBeDefined();
      expect(doc!.module).toBe(s.module); // same people see the checklist and its documents
    }
  });

  it('NIST AI RMF is grouped in its four functions', () => {
    const nist = STANDARDS.find(s => s.key === 'NIST_AI_RMF')!;
    const per = (p: string) => nist.requirements.filter(r => r.clause.startsWith(p)).length;
    expect([per('GOVERN'), per('MAP'), per('MEASURE'), per('MANAGE')]).toEqual([6, 5, 4, 4]);
  });

  it('ISO 27018 follows the eleven Annex A categories (A.2 … A.11, with A.1 not used)', () => {
    const s = STANDARDS.find(x => x.key === 'ISO_27018')!;
    expect(s.requirements.map(r => r.clause)).toEqual(['A.2', 'A.3', 'A.4', 'A.5', 'A.6', 'A.7', 'A.8', 'A.9', 'A.10', 'A.11']);
  });
});
