import {
  Controller, Get, Put, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsService } from './permissions.service';

@UseGuards(JwtAuthGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly service: PermissionsService) {}

  // GET /permissions/me  — own permissions
  @Get('me')
  getMyPermissions(@Request() req: any) {
    return this.service.getUserPermissions(req.user.userId);
  }

  // GET /permissions/:userId  — another user's permissions (admin only)
  @Get(':userId')
  getUserPermissions(@Param('userId') userId: string) {
    return this.service.getUserPermissions(userId);
  }

  // PUT /permissions/:userId  — set permissions (admin only)
  @Put(':userId')
  setUserPermissions(
    @Request() req: any,
    @Param('userId') userId: string,
    @Body() body: { permissions: Array<{ module: string; level: number }> },
  ) {
    return this.service.setUserPermissions(req.user.id, userId, body.permissions);
  }
}
