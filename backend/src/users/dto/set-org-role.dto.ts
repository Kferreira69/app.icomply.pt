import { IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SetOrgRoleDto {
  @ApiPropertyOptional({
    description: 'ID of the OrgRole to assign, or null to remove the custom role override',
    nullable: true,
  })
  @ValidateIf((o) => o.orgRoleId !== null)
  @IsOptional()
  @IsUUID()
  orgRoleId: string | null;
}
