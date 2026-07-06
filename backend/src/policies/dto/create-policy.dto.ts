import { IsString, IsOptional, IsEnum, IsUUID, IsDateString, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PolicyCategory } from '../../generated/prisma/client';

const emptyToUndefined = ({ value }: { value: any }) =>
  value === '' || value === null ? undefined : value;

export class CreatePolicyDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ enum: PolicyCategory })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(PolicyCategory)
  category?: PolicyCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  frameworkId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  reviewDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];
}
