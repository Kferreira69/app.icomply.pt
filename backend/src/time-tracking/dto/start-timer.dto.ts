import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartTimerDto {
  @ApiProperty({ description: 'ID of the task to track time for' })
  @IsUUID()
  taskId: string;

  @ApiPropertyOptional({ description: 'Optional description of work being done' })
  @IsOptional()
  @IsString()
  description?: string;
}
