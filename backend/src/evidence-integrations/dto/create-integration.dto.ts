import { IsString, IsEnum, IsObject, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EvidenceProvider } from '../../generated/prisma/client';

export class CreateIntegrationDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: EvidenceProvider })
  @IsEnum(EvidenceProvider)
  provider: EvidenceProvider;

  @ApiProperty({ description: 'Provider-specific configuration (API keys, regions, etc.)' })
  @IsObject()
  config: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
