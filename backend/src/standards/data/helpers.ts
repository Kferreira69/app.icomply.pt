import { RequirementSeed } from '../standards.types';

/** Chapter names of the ISO high-level structure (clauses 4-10), shared by 22000, 20000-1, 14001… */
export const HLS_CHAPTERS: Record<string, string> = {
  '4': 'Cláusula 4 — Contexto da organização',
  '5': 'Cláusula 5 — Liderança',
  '6': 'Cláusula 6 — Planeamento',
  '7': 'Cláusula 7 — Suporte',
  '8': 'Cláusula 8 — Operação',
  '9': 'Cláusula 9 — Avaliação do desempenho',
  '10': 'Cláusula 10 — Melhoria',
};

/**
 * Build seeds from compact rows: [clause, title, description?]. The chapter is derived from the
 * top-level clause number with `chapters`.
 */
export function fromRows(
  chapters: Record<string, string>,
  rows: Array<[string, string] | [string, string, string]>,
): RequirementSeed[] {
  return rows.map(([clause, title, description]) => {
    const top = clause.split('.')[0];
    const chapter = chapters[top];
    if (!chapter) throw new Error(`No chapter for clause ${clause}`);
    return { clause, chapter, title, ...(description ? { description } : {}) };
  });
}
