import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus,
  UploadedFile, UseInterceptors, UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetOrgRoleDto } from './dto/set-org-role.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @RequireModule('users', 2)
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
  @RequireModule('users', 1)
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
  @RequireModule('users', 1)
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @RequireModule('users', 2)
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') requesterId: string,
    @CurrentUser('role') requesterRole: UserRole,
    @Body() dto: UpdateUserDto,
  ) {
    return this.service.update(id, orgId, dto, requesterId, requesterRole);
  }

  @Patch(':id/org-role')
  @Roles(UserRole.ADMIN)
  @RequireModule('users', 2)
  @ApiOperation({ summary: 'Assign or remove a custom org role for a user' })
  setOrgRole(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: SetOrgRoleDto,
  ) {
    return this.service.setOrgRole(id, orgId, dto.orgRoleId ?? null);
  }

  @Patch(':id/suspend')
  @Roles(UserRole.ADMIN)
  @RequireModule('users', 2)
  suspend(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') requesterId: string,
  ) {
    return this.service.suspend(id, orgId, requesterId);
  }

  @Patch(':id/reactivate')
  @Roles(UserRole.ADMIN)
  @RequireModule('users', 2)
  @ApiOperation({ summary: 'Reactivate a suspended user' })
  reactivate(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') requesterId: string,
  ) {
    return this.service.reactivate(id, orgId, requesterId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @RequireModule('users', 2)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete a user with no activity (ADMIN/SUPER_ADMIN only)' })
  remove(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') requesterId: string,
  ) {
    return this.service.remove(id, orgId, requesterId);
  }

  @Post(':id/set-password')
  @Roles(UserRole.ADMIN)
  @RequireModule('users', 2)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin sets a new password for a user' })
  adminSetPassword(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body('password') password: string,
  ) {
    return this.service.adminSetPassword(id, orgId, password);
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Self-service password change' })
  selfChangePassword(
    @CurrentUser('id') id: string,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.service.selfChangePassword(id, currentPassword, newPassword);
  }

  @Post(':id/resend-invite')
  @Roles(UserRole.ADMIN)
  @RequireModule('users', 2)
  resendInvite(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.resendInvite(id, orgId);
  }

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload avatar image for the current user' })
  uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadAvatar(userId, file);
  }
}
