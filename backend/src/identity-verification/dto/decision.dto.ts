import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** A person's decision on a verification (manual checks, or an automated one flagged for review). */
export class DecisionDto {
  @IsIn(['APPROVED', 'REJECTED'])
  decision!: 'APPROVED' | 'REJECTED';

  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000)
  note?: string;

  @IsOptional() @IsInt() @Min(0) @Max(100)
  riskScore?: number;
}
