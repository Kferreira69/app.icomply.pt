import { StandardDefinition } from './standards.types';
import { ISO_13485 } from './data/iso-13485';
import { ISO_20000 } from './data/iso-20000-1';
import { ISO_22000 } from './data/iso-22000';
import { ISO_23894 } from './data/iso-23894';
import { ISO_27018 } from './data/iso-27018';
import { ISO_27036 } from './data/iso-27036';
import { NIST_AI_RMF } from './data/nist-ai-rmf';

/**
 * Every checklist-style standard the platform offers through the generic engine. Adding one is
 * data only: a file in ./data, an entry here, and its key in quality-documents/document-standards.ts
 * (so documents can be filed under it). No migration, controller or page is needed.
 */
export const STANDARDS: StandardDefinition[] = [
  ISO_22000, ISO_13485, ISO_20000, ISO_27018, ISO_27036, NIST_AI_RMF, ISO_23894,
];

export const findStandard = (key: string): StandardDefinition | undefined =>
  STANDARDS.find(s => s.key === key);

/** Stable per-organisation code of a requirement. */
export const requirementCode = (standardKey: string, clause: string) => `${standardKey}-${clause.replace(/\s+/g, '_')}`;
