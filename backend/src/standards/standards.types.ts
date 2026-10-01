export interface RequirementSeed {
  /** Clause or category as printed in the standard ("8.5.2", "GOVERN 1"). */
  clause: string;
  /** Group shown in the UI ("Cláusula 8 — Operação"). */
  chapter: string;
  title: string;
  description?: string;
}

export interface StandardDefinition {
  /** Stable key, also the document-control standard key (e.g. "ISO_22000"). */
  key: string;
  name: string;
  fullName: string;
  /** Governance domain on the website / sidebar. */
  domain: 'security' | 'privacy' | 'ai' | 'third-parties' | 'quality' | 'operations';
  /** Permission module that gates read (1) / write (2) access. */
  module: string;
  description: string;
  /** Honest scope note shown on the page (what the checklist is and is not). */
  scope: string;
  requirements: RequirementSeed[];
}
