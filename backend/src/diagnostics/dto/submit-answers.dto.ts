import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class AnswerItemDto {
  @ApiProperty()
  @IsString()
  questionId: string;

  @ApiProperty()
  value: any;
}

export class SubmitAnswersDto {
  @ApiProperty({ type: [AnswerItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerItemDto)
  answers: AnswerItemDto[];

  @ApiProperty({ description: 'Set to true to finalize and generate recommendations' })
  @IsOptional()
  @IsBoolean()
  complete?: boolean;
}
