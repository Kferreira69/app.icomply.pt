import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateReplyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  body: string;

  @IsBoolean()
  @IsOptional()
  isInternal?: boolean;
}
