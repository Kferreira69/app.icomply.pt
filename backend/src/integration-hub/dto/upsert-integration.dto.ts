import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class UpsertIntegrationDto {
  @IsString()
  key: string;

  @IsString()
  displayName: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  isConnected?: boolean;

  @IsObject()
  @IsOptional()
  credentials?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;
}
