import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
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
  listAll(@CurrentUser('role') role: string) {
    if (role !== 'SUPER_ADMIN') return [];
    return this.svc.listAll();
  }

  /** Superadmin: update a single flag */
  @Patch(':key')
  update(
    @CurrentUser('role') role: string,
    @Param('key') key: string,
    @Body() body: { requiredPlan?: string; isActive?: boolean; label?: string; description?: string },
  ) {
    if (role !== 'SUPER_ADMIN') throw new Error('Forbidden');
    return this.svc.updateFlag(key, body);
  }

  /** Superadmin: bulk update plan assignments */
  @Patch()
  bulkUpdate(
    @CurrentUser('role') role: string,
    @Body() body: { updates: { key: string; requiredPlan: string }[] },
  ) {
    if (role !== 'SUPER_ADMIN') throw new Error('Forbidden');
    return this.svc.bulkUpdate(body.updates);
  }
}
