import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const LEAD_TYPES = ['DEMO', 'CONTACT', 'FEATURE_REQUEST', 'NEWSLETTER'] as const;
export type LeadType = (typeof LEAD_TYPES)[number];

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** What the website's forms send. Anything not listed here is dropped by the ValidationPipe whitelist. */
export class CreateLeadDto {
  @IsIn(LEAD_TYPES as unknown as string[])
  type!: LeadType;

  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120)
  name!: string;

  @Transform(trim) @IsEmail() @MaxLength(200)
  email!: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(160)
  company?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(120)
  role?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(40)
  phone?: string;

  /** Governance domains / standards the visitor is interested in (free labels, bounded). */
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(80, { each: true })
  domains?: string[];

  @IsOptional() @Transform(trim) @IsString() @MaxLength(4000)
  message?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(500)
  sourceUrl?: string;

  @IsOptional() @IsIn(['pt', 'en'])
  locale?: string;

  /** GDPR: the form must show the privacy notice and the visitor must tick the box. */
  @IsBoolean()
  consent!: boolean;

  /** Honeypot. Hidden on the site; real people leave it empty, bots fill it. */
  @IsOptional() @IsString() @MaxLength(200)
  website?: string;
}

export class UpdateLeadDto {
  @IsOptional() @IsIn(LEAD_STATUSES as unknown as string[])
  status?: LeadStatus;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(4000)
  notes?: string;
}
