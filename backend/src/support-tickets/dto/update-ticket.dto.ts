import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SupportPriority, TicketStatus } from '../../generated/prisma/client';

export class UpdateTicketDto {
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsEnum(SupportPriority)
  @IsOptional()
  priority?: SupportPriority;

  @IsString()
  @IsOptional()
  assignedToId?: string;
}
