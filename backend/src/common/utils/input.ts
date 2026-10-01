import { BadRequestException } from '@nestjs/common';

// Tiny parsers for request bodies that are typed `any` (the global ValidationPipe cannot
// whitelist those): pick the fields you accept, coerce them, reject garbage. Never hand a raw
// body to Prisma — `{ organizationId, ...dto }` lets a caller overwrite organizationId.

export const text = (v: unknown, max = 4000): string | null => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};

export const required = (v: unknown, label: string, max = 500): string => {
  const s = text(v, max);
  if (!s) throw new BadRequestException(`${label} é obrigatório`);
  return s;
};

export const oneOf = <T extends string>(v: unknown, allowed: readonly T[], label: string): T => {
  if (!allowed.includes(v as T)) throw new BadRequestException(`${label} inválido. Permitidos: ${allowed.join(', ')}`);
  return v as T;
};

export const intBetween = (v: unknown, min: number, max: number, label: string): number => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new BadRequestException(`${label} deve ser um inteiro entre ${min} e ${max}`);
  }
  return n;
};

export const num = (v: unknown, label: string): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BadRequestException(`${label} deve ser numérico`);
  return n;
};

export const date = (v: unknown, label: string): Date | null => {
  if (v === undefined || v === null || v === '') return null;
  const d = new Date(String(v));
  if (isNaN(d.getTime())) throw new BadRequestException(`${label} inválida`);
  return d;
};
