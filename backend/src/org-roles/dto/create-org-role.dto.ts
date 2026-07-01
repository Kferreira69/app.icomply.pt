import { IsString, IsOptional, IsObject, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrgRoleDto {
  @ApiProperty({ example: 'Auditor Externo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Acesso de leitura a auditorias e evidências' })
  @IsOptional()
  @IsString()
  description?: string;

  // Shape: { [moduleKey: string]: 'none' | 'read' | 'write' }
  @ApiPropertyOptional({
    example: { risks: 'read', evidence: 'write' },
    description: "Map of module key to permission level ('none' | 'read' | 'write')",
  })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, 'none' | 'read' | 'write'>;
}
