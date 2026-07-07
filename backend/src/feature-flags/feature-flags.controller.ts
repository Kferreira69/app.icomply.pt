import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../generated/prisma/client';
import { FeatureFlagsService } from './feature-flags.service';

@UseGuards(JwtAuthGuard)
@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly svc: FeatureFlagsService) {}

  /** Public-facing: returns { key -> requiredPlan } map (no superadmin check) */
  @Get('public')
  getPublic() {
    return this.svc.getPublic();
  }

  /** Superadmin: full list with all fields */
  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  listAll() {
    return this.svc.listAll();
  }

  /** Superadmin: update a single flag */
  @Patch(':key')
  @Roles(UserRole.SUPER_ADMIN)
  update(
    @Param('key') key: string,
    @Body() body: { requiredPlan?: string; isActive?: boolean; label?: string; description?: string },
  ) {
    return this.svc.updateFlag(key, body);
  }

  /** Superadmin: bulk update plan assignments */
  @Patch()
  @Roles(UserRole.SUPER_ADMIN)
  bulkUpdate(@Body() body: { updates: { key: string; requiredPlan: string }[] }) {
    return this.svc.bulkUpdate(body.updates);
  }
}
