import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty({ example: 'MacBook Pro de João' })
  @IsString()
  deviceName: string;

  @ApiPropertyOptional({ example: 'joao-mbp.local' })
  @IsOptional()
  @IsString()
  hostname?: string;

  @ApiProperty({ enum: ['macos', 'windows', 'linux'], example: 'macos' })
  @IsString()
  @IsIn(['macos', 'windows', 'linux'])
  os: string;

  @ApiPropertyOptional({ example: '14.4.1' })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional({ enum: ['arm64', 'amd64'], example: 'arm64' })
  @IsOptional()
  @IsString()
  arch?: string;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  agentVersion?: string;
}
