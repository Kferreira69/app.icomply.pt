import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, IsOptional } from 'class-validator';
import { CreateRiskDto } from './create-risk.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRiskDto extends PartialType(CreateRiskDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  residualScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  acceptancePlan?: string;
}
