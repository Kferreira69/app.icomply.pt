import { IsOptional, IsString } from 'class-validator';

export class VerifyBusinessDto {
  @IsString()
  legalName: string;

  @IsString()
  country: string;

  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;
}
