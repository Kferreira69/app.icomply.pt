import { IsEmail, IsOptional, IsString } from 'class-validator';

export class VerifyIndividualDto {
  @IsString()
  fullName: string;

  @IsString()
  country: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
