import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Invite a new user to the organization' })
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.service.create(dto, orgId, role);
  }

  @Get()
  @Roles(UserRole.COMPLIANCE_MANAGER)
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(orgId, page, limit, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.service.update(id, orgId, dto);
  }

  @Patch(':id/suspend')
  @Roles(UserRole.ADMIN)
  suspend(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.suspend(id, orgId);
  }

  @Post(':id/resend-invite')
  @Roles(UserRole.ADMIN)
  resendInvite(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.resendInvite(id, orgId);
  }
}
