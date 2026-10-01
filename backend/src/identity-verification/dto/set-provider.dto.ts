import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SetProviderDto {
  /** Provider id (e.g. "SUMSUB"); null / omitted clears the choice and uses the platform default. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  provider?: string | null;
}
