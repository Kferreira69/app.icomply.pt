import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Commercial terms for automated checks, proposed by the platform operator for one organisation. */
export class ProposeTermsDto {
  @IsIn(['EUR'])
  currency: 'EUR' = 'EUR';

  /** One-off set-up fee charged when the customer accepts the terms. */
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1_000_000)
  setupFee!: number;

  /** Pay-as-you-go price per automated check, per feature. Leave out a feature to not offer it. */
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100_000)
  priceIndividual?: number;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100_000)
  priceBusiness?: number;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100_000)
  priceSanctions?: number;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000)
  note?: string;
}

export class AcceptTermsDto {
  /** The version of the terms the customer is accepting (so they cannot accept terms they have not seen). */
  @IsInt() @Min(1)
  version!: number;
}
