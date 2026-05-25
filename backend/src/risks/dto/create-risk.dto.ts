import { IsString, IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RiskLikelihood, RiskImpact, RiskStatus } from '@prisma/client';

const emptyToUndefined = ({ value }: { value: any }) =>
  value === '' || value === null ? undefined : value;

export class CreateRiskDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ enum: RiskLikelihood })
  @IsEnum(RiskLikelihood)
  likelihood: RiskLikelihood;

  @ApiProperty({ enum: RiskImpact })
  @IsEnum(RiskImpact)
  impact: RiskImpact;

  @ApiPropertyOptional({ enum: RiskStatus })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(RiskStatus)
  status?: RiskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mitigationPlan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  reviewDate?: string;
}
