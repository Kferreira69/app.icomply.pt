import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { SupportCategory, SupportPriority } from '@prisma/client';

export class CreateTicketDto {
  @IsEnum(SupportCategory)
  @IsOptional()
  category?: SupportCategory;

  @IsEnum(SupportPriority)
  @IsOptional()
  priority?: SupportPriority;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;
}
