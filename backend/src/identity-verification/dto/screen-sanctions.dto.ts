import { IsOptional, IsString } from 'class-validator';

export class ScreenSanctionsDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;
}
