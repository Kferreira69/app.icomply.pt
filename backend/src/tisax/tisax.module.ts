import { Module } from '@nestjs/common';
import { TisaxService } from './tisax.service';
import { TisaxController } from './tisax.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TisaxController],
  providers: [TisaxService],
  exports: [TisaxService],
})
export class TisaxModule {}
