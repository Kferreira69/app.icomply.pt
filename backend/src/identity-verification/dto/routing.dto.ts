import { IsOptional, IsString, Matches } from 'class-validator';

const ID = /^[A-Za-z][A-Za-z0-9_]{1,30}$/;

/**
 * Which provider serves what. Each field: a provider id to choose it, `null` to clear the choice
 * (the platform default / automatic fallback is used), absent to leave it unchanged.
 */
export class RoutingDto {
  /** Default for every feature that has no choice of its own. */
  @IsOptional() @IsString() @Matches(ID)
  default?: string | null;

  @IsOptional() @IsString() @Matches(ID)
  individual?: string | null;

  @IsOptional() @IsString() @Matches(ID)
  business?: string | null;

  @IsOptional() @IsString() @Matches(ID)
  sanctions?: string | null;
}
