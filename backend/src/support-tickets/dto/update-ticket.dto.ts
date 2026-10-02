import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SupportPriority, TicketStatus } from '../../generated/prisma/client';

export class UpdateTicketDto {
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsEnum(SupportPriority)
  @IsOptional()
  priority?: SupportPriority;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  assignedToId?: string;
}
