import {
  IsString, IsOptional, IsEnum, IsEmail, IsUrl, IsBoolean,
  IsDateString, MaxLength, MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VendorStatus, VendorRiskLevel } from '@prisma/client';

export class CreateVendorDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'website must be a valid URL' })
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  countries?: string;

  @ApiPropertyOptional({ enum: VendorStatus })
  @IsOptional()
  @IsEnum(VendorStatus)
  status?: VendorStatus;

  @ApiPropertyOptional({ enum: VendorRiskLevel })
  @IsOptional()
  @IsEnum(VendorRiskLevel)
  riskLevel?: VendorRiskLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  contractStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  contractEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dataProcessor?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  dataShared?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
