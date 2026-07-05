import { IsBoolean, IsInt, IsJSON, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeviceReportDto {
  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  agentVersion?: string;

  @ApiPropertyOptional({ example: '14.4.1' })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  diskEncryption?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  screenLock?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  antivirusEnabled?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  osUpToDate?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  passwordManager?: boolean;

  @ApiPropertyOptional({ example: 5, description: 'Screen lock timeout in minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  screenLockTimeout?: number;

  // Server-specific fields
  @ApiPropertyOptional({ example: true, description: 'SSH root login is disabled' })
  @IsOptional()
  @IsBoolean()
  sshRootLoginDisabled?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Firewall (UFW/iptables/Windows Firewall) is active' })
  @IsOptional()
  @IsBoolean()
  firewallActive?: boolean;

  @ApiPropertyOptional({ example: 3, description: 'Number of pending security patches' })
  @IsOptional()
  @IsInt()
  @Min(0)
  pendingPatches?: number;

  @ApiPropertyOptional({ example: ['22', '80', '443'], description: 'Open listening ports' })
  @IsOptional()
  openPorts?: string[];

  @ApiPropertyOptional({ description: 'Raw agent data payload' })
  @IsOptional()
  rawData?: any;
}
