import { PartialType } from '@nestjs/mapped-types';
import { CreateOrgRoleDto } from './create-org-role.dto';

export class UpdateOrgRoleDto extends PartialType(CreateOrgRoleDto) {}
