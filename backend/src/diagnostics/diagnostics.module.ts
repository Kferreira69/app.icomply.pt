import { Module } from '@nestjs/common';
import { DiagnosticsService } from './diagnostics.service';
import { DiagnosticsController } from './diagnostics.controller';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PermissionsModule],
  providers: [DiagnosticsService],
  controllers: [DiagnosticsController],
  exports: [DiagnosticsService],
})
export class DiagnosticsModule {}
