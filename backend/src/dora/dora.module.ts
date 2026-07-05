import { Module } from '@nestjs/common';
import { DoraController } from './dora.controller';
import { DoraService } from './dora.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PermissionsModule],
  controllers: [DoraController],
  providers: [DoraService],
  exports: [DoraService],
})
export class DoraModule {}
