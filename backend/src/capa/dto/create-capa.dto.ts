import { IsString, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const emptyToUndefined = ({ value }: { value: any }) =>
  value === '' || value === null ? undefined : value;

export class CreateCapaDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  findingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rootCause?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  correctiveAction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preventiveAction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  dueDate?: string;
}
