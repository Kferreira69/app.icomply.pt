// Management-system standards a controlled document can belong to.
//
// ISO management-system standards (9001, 14001, 45001, 27001, 22301, 37001, 27701, 42001…)
// are all built on the same high-level structure — clauses 4 to 10, with §7.5 "documented
// information" — so one document-control module serves every domain. Which people may see or
// change a document is decided by the permission module of its standard (a quality consultant
// reads ISO 9001 documents, the environment team reads ISO 14001 ones, …).

export interface DocStandard {
  key: string;
  label: string;
  /** Permission module (see permissions.service MODULE_MATRIX) governing access. */
  module: string;
}

export const DOC_STANDARDS: DocStandard[] = [
  { key: 'ISO_9001',  label: 'ISO 9001 · Qualidade',                  module: 'quality' },
  { key: 'ISO_14001', label: 'ISO 14001 · Ambiente',                  module: 'environment' },
  { key: 'ISO_45001', label: 'ISO 45001 · Saúde e Segurança',         module: 'workforce' },
  { key: 'ISO_27001', label: 'ISO 27001 · Segurança da Informação',   module: 'soa' },
  { key: 'ISO_22301', label: 'ISO 22301 · Continuidade de Negócio',   module: 'bcp' },
  { key: 'ISO_37001', label: 'ISO 37001 · Anti-Suborno',              module: 'antiBribery' },
  { key: 'ISO_27701', label: 'ISO 27701 · Privacidade',               module: 'iso27701' },
  { key: 'ISO_42001', label: 'ISO 42001 · Inteligência Artificial',   module: 'aiGovernance' },
  { key: 'GENERAL',   label: 'Geral (outros sistemas)',               module: 'policies' },
];

export const DOC_STANDARD_KEYS: string[] = DOC_STANDARDS.map(s => s.key);

export const DEFAULT_DOC_STANDARD = 'ISO_9001';

export function standardLabel(key: string): string {
  return DOC_STANDARDS.find(s => s.key === key)?.label ?? key;
}
