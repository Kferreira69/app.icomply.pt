import { IsString, IsOptional, IsEnum, IsBoolean, IsArray, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LegalBasis } from '@prisma/client';

const emptyToUndefined = ({ value }: { value: any }) =>
  value === '' || value === null ? undefined : value;

export class CreateProcessingActivityDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  purpose: string;

  @ApiProperty({ enum: LegalBasis })
  @IsEnum(LegalBasis)
  legalBasis: LegalBasis;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  dataCategories?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  dataSubjects?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  recipients?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  internationalTransfers?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  transferCountries?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transferSafeguards?: string;

  @ApiProperty()
  @IsString()
  retentionPeriod: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  retentionJustification?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  technicalMeasures?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  organizationalMeasures?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dpoConsulted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  processorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  processorCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  reviewDate?: string;
}
