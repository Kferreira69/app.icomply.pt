import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddDependencyDto {
  @ApiProperty({ description: 'ID of the task that must complete first (blocks the current task)' })
  @IsUUID()
  blockingTaskId: string;
}
