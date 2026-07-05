import { IsString, IsOptional, IsEnum, IsDateString, IsInt, Min, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MeetingTypeDto {
  ORDINARY = 'ORDINARY',
  EXTRAORDINARY = 'EXTRAORDINARY',
  COMMITTEE = 'COMMITTEE',
}

export class CreateMeetingDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ enum: MeetingTypeDto })
  @IsOptional()
  @IsEnum(MeetingTypeDto)
  type?: MeetingTypeDto;

  @ApiProperty()
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agenda?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  quorumRequired?: number;
}
