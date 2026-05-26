import { Module } from '@nestjs/common';
import { WhistleblowController } from './whistleblow.controller';
import { WhistleblowService } from './whistleblow.service';

@Module({
  controllers: [WhistleblowController],
  providers: [WhistleblowService],
  exports: [WhistleblowService],
})
export class WhistleblowModule {}
