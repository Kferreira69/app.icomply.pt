import { IsUUID, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateManualEntryDto {
  @ApiProperty({ description: 'ID of the task to log time for' })
  @IsUUID()
  taskId: string;

  @ApiProperty({ description: 'When work started (ISO 8601)' })
  @IsDateString()
  startedAt: string;

  @ApiProperty({ description: 'When work ended (ISO 8601)' })
  @IsDateString()
  endedAt: string;

  @ApiPropertyOptional({ description: 'Optional description of work done' })
  @IsOptional()
  @IsString()
  description?: string;
}
