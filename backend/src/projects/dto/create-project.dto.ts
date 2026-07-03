import { IsString, IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus, RagStatus } from '../../generated/prisma/client';

const emptyToUndefined = ({ value }: { value: any }) =>
  value === '' || value === null ? undefined : value;

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsUUID()
  frameworkId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  diagnosticRunId?: string;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  targetDate?: string;

  @ApiPropertyOptional({ enum: RagStatus })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(RagStatus)
  ragStatus?: RagStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusNarrative?: string;
}
