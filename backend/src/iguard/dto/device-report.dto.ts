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

  @ApiProperty({ example: true })
  @IsBoolean()
  diskEncryption: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  screenLock: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  antivirusEnabled: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  osUpToDate: boolean;

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

  @ApiPropertyOptional({ description: 'Raw agent data payload' })
  @IsOptional()
  rawData?: any;
}
